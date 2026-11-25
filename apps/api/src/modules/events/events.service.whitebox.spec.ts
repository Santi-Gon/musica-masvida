import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsService } from './events.service';

/**
 * Práctica 11 - White Box de EventsService.
 * Cubre caminos exitosos, errores de validación de negocio, autorización,
 * excepciones de Prisma y efectos secundarios (notificaciones).
 */
describe('EventsService (white box)', () => {
  const tx = {
    event: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    eventRegistration: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  const prisma = {
    event: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    eventRegistration: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const notifications = { sendNotificationToAll: jest.fn() };
  let service: EventsService;

  const activeEvent = {
    id: 'event-1',
    title: 'Concierto',
    isActive: true,
    capacity: 2,
    date: new Date('2026-12-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    service = new EventsService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));
    tx.event.findFirst.mockResolvedValue({
      ...activeEvent,
      _count: { registrations: 0 },
    });
    tx.user.findUnique.mockResolvedValue({ isActive: true });
    tx.eventRegistration.findUnique.mockResolvedValue(null);
    tx.eventRegistration.create.mockResolvedValue({ id: 'reg-1' });
    notifications.sendNotificationToAll.mockResolvedValue(undefined);
  });

  // ---------- Consultas ----------
  it('findAll filtra activos y ordena por fecha ascendente', async () => {
    prisma.event.findMany.mockResolvedValue([activeEvent]);
    await service.findAll();
    expect(prisma.event.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { date: 'asc' },
    });
  });

  it('findUpcoming limita a 3 y proyecta solo campos públicos', async () => {
    prisma.event.findMany.mockResolvedValue([]);
    await service.findUpcoming();
    const arg = prisma.event.findMany.mock.calls[0][0];
    expect(arg.take).toBe(3);
    expect(arg.where.isActive).toBe(true);
    expect(arg.select).not.toHaveProperty('createdAt');
  });

  it('findAllAdmin incluye el conteo de inscripciones', async () => {
    prisma.event.findMany.mockResolvedValue([]);
    await service.findAllAdmin();
    expect(prisma.event.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { registrations: true } } },
    });
  });

  it('findOne devuelve el evento cuando existe', async () => {
    prisma.event.findUnique.mockResolvedValue(activeEvent);
    await expect(service.findOne('event-1')).resolves.toBe(activeEvent);
  });

  it('findOne lanza NotFoundException cuando no existe', async () => {
    prisma.event.findUnique.mockResolvedValue(null);
    await expect(service.findOne('no-existe')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  // ---------- Crear ----------
  it('create convierte la fecha y devuelve el evento', async () => {
    prisma.event.create.mockResolvedValue(activeEvent);
    const dto = {
      title: 'Concierto',
      description: 'Desc',
      date: '2026-12-01T00:00:00.000Z',
      time: '18:00',
      location: 'Auditorio',
    };
    const result = await service.create(dto as any);
    expect(prisma.event.create).toHaveBeenCalledWith({
      data: { ...dto, date: new Date(dto.date) },
    });
    expect(result).toBe(activeEvent);
  });

  it('create dispara la notificación sin bloquear la respuesta', async () => {
    prisma.event.create.mockResolvedValue(activeEvent);
    await service.create({
      title: 'X',
      description: 'Y',
      date: '2026-12-01T00:00:00.000Z',
      time: '18:00',
      location: 'Z',
    } as any);
    expect(notifications.sendNotificationToAll).toHaveBeenCalledTimes(1);
  });

  it('create no falla si la notificación push es rechazada', async () => {
    prisma.event.create.mockResolvedValue(activeEvent);
    notifications.sendNotificationToAll.mockRejectedValue(new Error('push caído'));
    await expect(
      service.create({
        title: 'X',
        description: 'Y',
        date: '2026-12-01T00:00:00.000Z',
        time: '18:00',
        location: 'Z',
      } as any),
    ).resolves.toBe(activeEvent);
    await new Promise((r) => setImmediate(r));
    expect(console.error).toHaveBeenCalled();
  });

  // ---------- Actualizar / eliminar ----------
  it('update valida existencia y convierte la fecha', async () => {
    prisma.event.findUnique.mockResolvedValue(activeEvent);
    prisma.event.update.mockResolvedValue({ ...activeEvent, title: 'Nuevo' });
    await service.update('event-1', {
      title: 'Nuevo',
      date: '2027-01-01T00:00:00.000Z',
    } as any);
    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: { title: 'Nuevo', date: new Date('2027-01-01T00:00:00.000Z') },
    });
  });

  it('update sin fecha no envía date=undefined al driver', async () => {
    prisma.event.findUnique.mockResolvedValue(activeEvent);
    prisma.event.update.mockResolvedValue(activeEvent);
    await service.update('event-1', { title: 'Solo título' } as any);
    expect(prisma.event.update.mock.calls[0][0].data.date).toBeUndefined();
  });

  it('update no actualiza si el evento no existe', async () => {
    prisma.event.findUnique.mockResolvedValue(null);
    await expect(
      service.update('no-existe', { title: 'X' } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.event.update).not.toHaveBeenCalled();
  });

  it('remove elimina un evento existente', async () => {
    prisma.event.findUnique.mockResolvedValue(activeEvent);
    prisma.event.delete.mockResolvedValue(activeEvent);
    await expect(service.remove('event-1')).resolves.toBe(activeEvent);
  });

  it('remove no borra si el evento no existe', async () => {
    prisma.event.findUnique.mockResolvedValue(null);
    await expect(service.remove('no-existe')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.event.delete).not.toHaveBeenCalled();
  });

  // ---------- registrationStatus ----------
  it('registrationStatus rechaza roles distintos de USER', async () => {
    await expect(
      service.registrationStatus('event-1', 'admin-1', 'ADMIN'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.event.findUnique).not.toHaveBeenCalled();
  });

  it('registrationStatus lanza 404 si el evento no existe', async () => {
    prisma.event.findUnique.mockResolvedValue(null);
    await expect(
      service.registrationStatus('no-existe', 'u1', 'USER'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('registrationStatus devuelve registered=true cuando hay inscripción', async () => {
    prisma.event.findUnique.mockResolvedValue(activeEvent);
    prisma.eventRegistration.findUnique.mockResolvedValue({ id: 'reg-1' });
    await expect(
      service.registrationStatus('event-1', 'u1', 'USER'),
    ).resolves.toEqual({ registered: true });
  });

  it('registrationStatus devuelve registered=false sin inscripción', async () => {
    prisma.event.findUnique.mockResolvedValue(activeEvent);
    prisma.eventRegistration.findUnique.mockResolvedValue(null);
    await expect(
      service.registrationStatus('event-1', 'u1', 'USER'),
    ).resolves.toEqual({ registered: false });
  });

  // ---------- register ----------
  it('register rechaza a un administrador (403)', async () => {
    await expect(
      service.register('event-1', 'admin-1', 'ADMIN'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('register lanza 404 si el evento no existe', async () => {
    tx.event.findFirst.mockResolvedValue(null);
    await expect(service.register('event-1', 'u1', 'USER')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('register lanza 404 si el evento está inactivo', async () => {
    tx.event.findFirst.mockResolvedValue(null);
    await expect(service.register('event-1', 'u1', 'USER')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('register rechaza usuario inexistente o inactivo (403)', async () => {
    tx.user.findUnique.mockResolvedValue(null);
    await expect(service.register('event-1', 'u1', 'USER')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    tx.user.findUnique.mockResolvedValue({ isActive: false });
    await expect(service.register('event-1', 'u1', 'USER')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('register rechaza duplicados (409)', async () => {
    tx.eventRegistration.findUnique.mockResolvedValue({ id: 'reg-1' });
    await expect(service.register('event-1', 'u1', 'USER')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('register rechaza cuando se alcanzó la capacidad (409)', async () => {
    tx.event.findFirst.mockResolvedValue({
      ...activeEvent,
      _count: { registrations: 2 },
    });
    await expect(service.register('event-1', 'u1', 'USER')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('register crea la inscripción en el camino exitoso', async () => {
    await expect(service.register('event-1', 'u1', 'USER')).resolves.toEqual({
      id: 'reg-1',
    });
    expect(tx.eventRegistration.create).toHaveBeenCalled();
  });

  it('register traduce P2002 (violación UNIQUE) a 409', async () => {
    tx.eventRegistration.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicado', {
        code: 'P2002',
        clientVersion: 'test',
      } as any),
    );
    await expect(service.register('event-1', 'u1', 'USER')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('register traduce P2034 (conflicto serializable) a 409', async () => {
    tx.eventRegistration.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('conflicto', {
        code: 'P2034',
        clientVersion: 'test',
      } as any),
    );
    await expect(service.register('event-1', 'u1', 'USER')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('register propaga errores desconocidos', async () => {
    tx.eventRegistration.create.mockRejectedValue(new Error('DB caída'));
    await expect(service.register('event-1', 'u1', 'USER')).rejects.toThrow(
      'DB caída',
    );
  });

  // ---------- adminRegistrations ----------
  it('adminRegistrations rechaza a un alumno (403)', async () => {
    await expect(
      service.adminRegistrations('event-1', 'USER'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.event.findUnique).not.toHaveBeenCalled();
  });

  it('adminRegistrations lanza 404 si el evento no existe', async () => {
    prisma.event.findUnique.mockResolvedValue(null);
    await expect(
      service.adminRegistrations('no-existe', 'ADMIN'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('adminRegistrations devuelve evento, total y lista', async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: 'event-1',
      title: 'Concierto',
      capacity: 10,
    });
    prisma.eventRegistration.findMany.mockResolvedValue([
      { id: 'r1', user: { name: 'A', email: 'a@test' } },
    ]);
    await expect(
      service.adminRegistrations('event-1', 'ADMIN'),
    ).resolves.toEqual({
      event: { id: 'event-1', title: 'Concierto', capacity: 10 },
      total: 1,
      registrations: [{ id: 'r1', user: { name: 'A', email: 'a@test' } }],
    });
  });
});
