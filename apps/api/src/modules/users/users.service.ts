import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista todos los usuarios del sistema (sin exponer password ni PIN). */
  async findAll() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { medicalReminders: true, physicalActivities: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return users;
  }

  /** Edita nombre, email o isActive de un usuario. Registra el cambio en el log. */
  async update(
    id: string,
    data: { name?: string; email?: string; isActive?: boolean },
    adminId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Construir detalle de auditoría
    const changes: string[] = [];
    if (data.name !== undefined && data.name !== user.name)
      changes.push(`nombre: "${user.name}" → "${data.name}"`);
    if (data.email !== undefined && data.email !== user.email)
      changes.push(`email: "${user.email}" → "${data.email}"`);
    if (data.isActive !== undefined && data.isActive !== user.isActive) {
      changes.push(
        `estado: "${user.isActive ? 'Activo' : 'Inactivo'}" → "${data.isActive ? 'Activo' : 'Inactivo'}"`,
      );
    }

    const action = data.isActive === false ? 'BAJA_LOGICA' : data.isActive === true ? 'REACTIVACION' : 'EDICION';

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, isActive: true, updatedAt: true },
    });

    // Registrar en el log de auditoría (no crítico: si falla no revierte el update)
    try {
      await this.prisma.userAuditLog.create({
        data: {
          userId: id,
          adminId,
          action,
          detail: changes.length > 0 ? changes.join('; ') : 'Sin cambios detectados',
        },
      });
    } catch (auditErr) {
      console.error('Error al registrar auditoría:', auditErr);
    }

    return updated;
  }

  /** Devuelve el historial de auditoría de un usuario específico. */
  async getAuditLog(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    return this.prisma.userAuditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
