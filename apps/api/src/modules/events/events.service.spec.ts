import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsService } from './events.service';

describe('EventsService registration', () => {
  const transaction = {
    event: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    eventRegistration: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn(),
  };
  const notificationsService = {} as NotificationsService;
  const service = new EventsService(
    prisma as unknown as PrismaService,
    notificationsService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback) => callback(transaction));
    transaction.event.findUnique.mockResolvedValue({
      id: 'event-1',
      isActive: true,
      capacity: 2,
    });
    transaction.user.findUnique.mockResolvedValue({ isActive: true });
    transaction.eventRegistration.findUnique.mockResolvedValue(null);
    transaction.eventRegistration.count.mockResolvedValue(0);
    transaction.eventRegistration.create.mockResolvedValue({ id: 'registration-1' });
  });

  it('creates an enrollment in a serializable transaction', async () => {
    await service.register('event-1', 'user-1', 'USER');

    expect(transaction.eventRegistration.create).toHaveBeenCalledWith({
      data: { eventId: 'event-1', userId: 'user-1' },
      select: { id: true, eventId: true, userId: true, createdAt: true },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  });

  it('blocks duplicate enrollments before checking the available capacity', async () => {
    transaction.eventRegistration.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.register('event-1', 'user-1', 'USER'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.eventRegistration.create).not.toHaveBeenCalled();
  });

  it('blocks enrollment when all places are occupied', async () => {
    transaction.eventRegistration.count.mockResolvedValue(2);

    await expect(
      service.register('event-1', 'user-1', 'USER'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.eventRegistration.create).not.toHaveBeenCalled();
  });
});
