import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { NotificationsService } from '../notifications/notifications.service';

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

  async findAllAdmin() {
    return this.prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
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
        date: (dto as any).date ? new Date((dto as any).date) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.event.delete({ where: { id } });
  }
}
