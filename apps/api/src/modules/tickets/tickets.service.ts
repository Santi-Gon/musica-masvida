import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTicketDto, userId: string, role: string) {
    if (role !== 'USER') {
      throw new ForbiddenException('Solo los alumnos pueden crear tickets');
    }

    return this.prisma.supportTicket.create({
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        deviceInfo: dto.deviceInfo,
        userId,
      },
    });
  }

  async findAllAdmin(role: string) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException('Solo un administrador puede consultar los tickets');
    }

    return this.prisma.supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async updateAdmin(id: string, dto: UpdateTicketDto, role: string) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException('Solo un administrador puede actualizar los tickets');
    }

    if (dto.status === undefined && dto.priority === undefined) {
      throw new BadRequestException('Debe proporcionar status o priority');
    }

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket con id ${id} no encontrado`);
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: dto.status,
        priority: dto.priority,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}
