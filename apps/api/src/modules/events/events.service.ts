import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll() {
    return this.prisma.event.findMany({
      where: { isActive: true },
      orderBy: { date: 'asc' },
    });
  }

  // Próximos 3 eventos activos desde hoy — usado por el smartwatch
  async findUpcoming() {
    return this.prisma.event.findMany({
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
    return this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.event.delete({ where: { id } });
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

  async register(eventId: string, userId: string, role: string) {
    if (role !== 'USER') {
      throw new ForbiddenException('Solo los alumnos pueden inscribirse a eventos');
    }

    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          const event = await transaction.event.findUnique({
            where: { id: eventId },
          });
          if (!event || !event.isActive) {
            throw new NotFoundException('El evento no está disponible');
          }

          const user = await transaction.user.findUnique({
            where: { id: userId },
            select: { isActive: true },
          });
          if (!user?.isActive) {
            throw new ForbiddenException('La cuenta no está disponible para inscribirse');
          }

          const existingRegistration = await transaction.eventRegistration.findUnique({
            where: { eventId_userId: { eventId, userId } },
            select: { id: true },
          });
          if (existingRegistration) {
            throw new ConflictException('Ya estás inscrito en este evento');
          }

          const registrationCount = await transaction.eventRegistration.count({
            where: { eventId },
          });
          if (registrationCount >= event.capacity) {
            throw new ConflictException('El evento ya no tiene lugares disponibles');
          }

          return transaction.eventRegistration.create({
            data: { eventId, userId },
            select: { id: true, eventId: true, userId: true, createdAt: true },
          });
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
        throw new ConflictException('El último lugar acaba de ser ocupado; actualiza e inténtalo de nuevo');
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
