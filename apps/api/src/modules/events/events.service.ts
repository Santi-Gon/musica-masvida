import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CacheService } from '../../common/cache.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';

const CACHE_KEY_ALL = 'events:all';
const CACHE_KEY_UPCOMING = 'events:upcoming';
const DEFAULT_CACHE_TTL_MS = 15000;

@Injectable()
export class EventsService {
  private readonly cacheTtlMs = Number(
    process.env.EVENTS_CACHE_TTL_MS ?? DEFAULT_CACHE_TTL_MS,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly cache: CacheService = new CacheService(),
  ) {}

  async findAll() {
    const cached = this.cache.get<unknown[]>(CACHE_KEY_ALL);
    if (cached) return cached;

    const events = await this.prisma.event.findMany({
      where: { isActive: true },
      orderBy: { date: 'asc' },
    });
    this.cache.set(CACHE_KEY_ALL, events, this.cacheTtlMs);
    return events;
  }

  // Próximos 3 eventos activos desde hoy — usado por el smartwatch
  async findUpcoming() {
    const cached = this.cache.get<unknown[]>(CACHE_KEY_UPCOMING);
    if (cached) return cached;

    const events = await this.prisma.event.findMany({
      where: {
        isActive: true,
        date: { gte: new Date() },
      },
      orderBy: { date: 'asc' },
      take: 3,
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        time: true,
        location: true,
        capacity: true,
      },
    });
    this.cache.set(CACHE_KEY_UPCOMING, events, this.cacheTtlMs);
    return events;
  }

  cacheStats() {
    return { ttlMs: this.cacheTtlMs, ...this.cache.stats() };
  }

  private invalidateEventCaches() {
    this.cache.del(CACHE_KEY_ALL, CACHE_KEY_UPCOMING);
  }

  async findAllAdmin() {
    return this.prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { registrations: true } } },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException(`Evento con id ${id} no encontrado`);
    return event;
  }

  async create(dto: CreateEventDto) {
    const event = await this.prisma.event.create({
      data: {
        ...dto,
        date: new Date(dto.date),
      },
    });

    this.invalidateEventCaches();

    // Enviar notificación a todos de que hay un nuevo evento
    // No esperamos con await para que no bloquee la respuesta HTTP
    this.notificationsService.sendNotificationToAll(
      '¡Nuevo Evento Programado!',
      `${event.title} - ${new Date(event.date).toLocaleDateString('es-MX')}`,
      '/eventos'
    ).catch(err => console.error('Error sending event push notification', err));

    return event;
  }

  async update(id: string, dto: UpdateEventDto) {
    await this.findOne(id);
    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
    this.invalidateEventCaches();
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    const removed = await this.prisma.event.delete({ where: { id } });
    this.invalidateEventCaches();
    return removed;
  }

  async registrationStatus(eventId: string, userId: string, role: string) {
    if (role !== 'USER') {
      throw new ForbiddenException('Solo los alumnos pueden consultar sus inscripciones');
    }

    await this.findOne(eventId);
    const registration = await this.prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { id: true },
    });
    return { registered: registration !== null };
  }

  async register(
    eventId: string,
    userId: string,
    role: string,
    idempotencyKey?: string,
  ) {
    if (role !== 'USER') {
      throw new ForbiddenException('Solo los alumnos pueden inscribirse a eventos');
    }

    const payloadHash = createHash('sha256')
      .update(`${eventId}:${userId}`)
      .digest('hex');

    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          // 1. Idempotencia: reservar clave o devolver respuesta previa.
          if (idempotencyKey) {
            try {
              await transaction.idempotencyKey.create({
                data: {
                  key: idempotencyKey,
                  scope: 'event-registration',
                  payloadHash,
                  status: 'pending',
                  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                },
              });
            } catch (error) {
              if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
              ) {
                const existing = await transaction.idempotencyKey.findUnique({
                  where: { key: idempotencyKey },
                });
                if (existing?.status === 'completed' && existing.response) {
                  if (existing.payloadHash !== payloadHash) {
                    throw new ConflictException(
                      'Clave de idempotencia reutilizada con otros parámetros',
                    );
                  }
                  return existing.response;
                }
                throw new ConflictException(
                  'Operación en proceso; inténtalo de nuevo',
                );
              }
              throw error;
            }
          }

          // 2. Evento activo y conteo actual de inscripciones en una sola consulta.
          const event = await transaction.event.findFirst({
            where: { id: eventId, isActive: true },
            include: { _count: { select: { registrations: true } } },
          });
          if (!event) {
            throw new NotFoundException('El evento no está disponible');
          }

          // 3. Usuario activo.
          const user = await transaction.user.findUnique({
            where: { id: userId },
            select: { isActive: true },
          });
          if (!user?.isActive) {
            throw new ForbiddenException(
              'La cuenta no está disponible para inscribirse',
            );
          }

          // 4. Inscripción existente.
          const existingRegistration =
            await transaction.eventRegistration.findUnique({
              where: { eventId_userId: { eventId, userId } },
              select: {
                id: true,
                eventId: true,
                userId: true,
                createdAt: true,
              },
            });
          if (existingRegistration) {
            if (idempotencyKey) {
              await transaction.idempotencyKey.update({
                where: { key: idempotencyKey },
                data: {
                  status: 'completed',
                  httpStatus: 201,
                  response: existingRegistration as unknown as Prisma.InputJsonValue,
                },
              });
              return existingRegistration;
            }
            throw new ConflictException('Ya estás inscrito en este evento');
          }

          // 5. Capacidad.
          if (event._count.registrations >= event.capacity) {
            throw new ConflictException(
              'El evento ya no tiene lugares disponibles',
            );
          }

          // 6. Crear inscripción.
          const created = await transaction.eventRegistration.create({
            data: { eventId, userId },
            select: {
              id: true,
              eventId: true,
              userId: true,
              createdAt: true,
            },
          });

          if (idempotencyKey) {
            await transaction.idempotencyKey.update({
              where: { key: idempotencyKey },
              data: {
                status: 'completed',
                httpStatus: 201,
                response: created as unknown as Prisma.InputJsonValue,
              },
            });
          }

          return created;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya estás inscrito en este evento');
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'El último lugar acaba de ser ocupado; actualiza e inténtalo de nuevo',
        );
      }
      throw error;
    }
  }

  async adminRegistrations(eventId: string, role: string) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException('Solo un administrador puede consultar los inscritos');
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, capacity: true },
    });
    if (!event) throw new NotFoundException(`Evento con id ${eventId} no encontrado`);

    const registrations = await this.prisma.eventRegistration.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    });

    return { event, total: registrations.length, registrations };
  }
}
