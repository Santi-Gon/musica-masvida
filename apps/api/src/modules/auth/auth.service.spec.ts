import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService mobile QR login', () => {
  const user = {
    id: 'user-1',
    email: 'student@example.com',
    name: 'Student',
    isActive: true,
  };
  const prisma = {
    user: { findUnique: jest.fn() },
    mobileLoginChallenge: {
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const jwtService = { sign: jest.fn() };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwtService as unknown as JwtService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a short-lived QR challenge and stores only its hash', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.mobileLoginChallenge.create.mockResolvedValue({});

    const result = await service.generateMobileQr(user.id, 'USER');

    expect(result.code).toHaveLength(43);
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(prisma.mobileLoginChallenge.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: user.id,
        codeHash: createHash('sha256').update(result.code).digest('hex'),
      }),
    });
    expect(JSON.stringify(prisma.mobileLoginChallenge.create.mock.calls)).not.toContain(
      result.code,
    );
  });

  it('rejects a QR challenge when another request already consumed it', async () => {
    prisma.mobileLoginChallenge.findUnique.mockResolvedValue({
      id: 'challenge-1',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user,
    });
    prisma.mobileLoginChallenge.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.loginWithMobileQr('valid-code')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('rejects QR generation for non-student accounts', async () => {
    await expect(
      service.generateMobileQr('admin-1', 'ADMIN'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
