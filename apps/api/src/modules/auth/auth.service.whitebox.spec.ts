import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import { AuthService } from './auth.service';

/**
 * Práctica 11 - White Box de AuthService.
 * Cubre login de admin/alumno, bootstrap, QR móvil y PIN de smartwatch,
 * incluyendo caminos de error y condiciones de estado (activo, expirado, consumido).
 */
describe('AuthService (white box)', () => {
  const prisma = {
    adminUser: { findUnique: jest.fn(), count: jest.fn(), create: jest.fn() },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    mobileLoginChallenge: {
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    medicalReminder: { create: jest.fn() },
    physicalActivity: { create: jest.fn() },
  };
  const jwt = { sign: jest.fn() };
  let service: AuthService;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('correcta', 4);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
    );
    jwt.sign.mockReturnValue('jwt-token');
    prisma.mobileLoginChallenge.deleteMany.mockResolvedValue({ count: 0 });
    prisma.mobileLoginChallenge.updateMany.mockResolvedValue({ count: 0 });
    prisma.mobileLoginChallenge.create.mockResolvedValue({});
  });

  // ---------------- login (admin) ----------------
  it('login exitoso firma un JWT de ADMIN y no expone el hash', async () => {
    prisma.adminUser.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@test.com',
      name: 'Admin',
      password: passwordHash,
    });

    const result = await service.login({
      email: 'admin@test.com',
      password: 'correcta',
    });

    expect(jwt.sign).toHaveBeenCalledWith({
      sub: 'admin-1',
      email: 'admin@test.com',
      role: 'ADMIN',
    });
    expect(result.accessToken).toBe('jwt-token');
    expect(JSON.stringify(result)).not.toContain(passwordHash);
  });

  it('login con correo inexistente responde 401 sin firmar token', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ email: 'nadie@test.com', password: 'x' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('login con contraseña incorrecta responde 401', async () => {
    prisma.adminUser.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@test.com',
      name: 'Admin',
      password: passwordHash,
    });
    await expect(
      service.login({ email: 'admin@test.com', password: 'mala' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  // ---------------- loginUser (alumno) ----------------
  it('loginUser exitoso firma un JWT de USER', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'alumno@test.com',
      name: 'Alumno',
      password: passwordHash,
      isActive: true,
    });

    const result = await service.loginUser({
      email: 'alumno@test.com',
      password: 'correcta',
    });

    expect(jwt.sign).toHaveBeenCalledWith({
      sub: 'u1',
      email: 'alumno@test.com',
      role: 'USER',
    });
    expect(result.user.role).toBe('USER');
  });

  it('loginUser rechaza cuentas suspendidas', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'alumno@test.com',
      name: 'Alumno',
      password: passwordHash,
      isActive: false,
    });
    await expect(
      service.loginUser({ email: 'alumno@test.com', password: 'correcta' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('loginUser rechaza usuario inexistente', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.loginUser({ email: 'no@test.com', password: 'x' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  // ---------------- bootstrap ----------------
  it('setupInitialAdmin bloquea el bootstrap si ya hay administradores', async () => {
    prisma.adminUser.count.mockResolvedValue(1);
    await expect(service.setupInitialAdmin()).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.adminUser.create).not.toHaveBeenCalled();
  });

  it('setupInitialAdmin crea el primer admin con hash bcrypt', async () => {
    prisma.adminUser.count.mockResolvedValue(0);
    prisma.adminUser.create.mockImplementation(async ({ data }: any) => ({
      id: 'admin-1',
      ...data,
    }));

    const result = await service.setupInitialAdmin();

    const created = prisma.adminUser.create.mock.calls[0][0].data;
    expect(created.password).not.toBe('password123');
    expect(await bcrypt.compare('password123', created.password)).toBe(true);
    expect(result.email).toBe('admin@musicamasvida.com');
  });

  it('setupInitialUser con usuarios existentes emite token del primero (sin credenciales)', async () => {
    prisma.user.count.mockResolvedValue(1);
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      email: 'alumno@test.com',
    });

    const result = await service.setupInitialUser();

    expect(result.accessToken).toBe('jwt-token');
    expect(jwt.sign).toHaveBeenCalledWith({
      sub: 'u1',
      email: 'alumno@test.com',
      role: 'USER',
    });
  });

  it('setupInitialUser crea alumno y datos iniciales cuando no hay usuarios', async () => {
    prisma.user.count.mockResolvedValue(0);
    prisma.user.create.mockResolvedValue({
      id: 'u2',
      email: 'alumno@musicamasvida.com',
      name: 'Alumno de Prueba',
    });

    const result = await service.setupInitialUser();

    expect(prisma.medicalReminder.create).toHaveBeenCalled();
    expect(prisma.physicalActivity.create).toHaveBeenCalled();
    expect(result.accessToken).toBe('jwt-token');
  });

  // ---------------- QR móvil ----------------
  it('generateMobileQr rechaza a un administrador', async () => {
    await expect(
      service.generateMobileQr('admin-1', 'ADMIN'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('generateMobileQr rechaza usuario inexistente o inactivo', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.generateMobileQr('u1', 'USER')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    prisma.user.findUnique.mockResolvedValue({ id: 'u1', isActive: false });
    await expect(service.generateMobileQr('u1', 'USER')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('generateMobileQr guarda solo el hash, invalida códigos previos y expira en 5 min', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', isActive: true });

    const result = await service.generateMobileQr('u1', 'USER');

    const saved = prisma.mobileLoginChallenge.create.mock.calls[0][0].data;
    expect(saved.codeHash).toBe(createHash('sha256').update(result.code).digest('hex'));
    expect(JSON.stringify(prisma.mobileLoginChallenge.create.mock.calls)).not.toContain(
      result.code,
    );
    expect(prisma.mobileLoginChallenge.updateMany).toHaveBeenCalled();
    const ttl = new Date(result.expiresAt).getTime() - Date.now();
    expect(ttl).toBeGreaterThan(4 * 60 * 1000);
    expect(ttl).toBeLessThanOrEqual(5 * 60 * 1000);
  });

  it('loginWithMobileQr rechaza código inexistente, expirado o ya consumido', async () => {
    prisma.mobileLoginChallenge.findUnique.mockResolvedValue(null);
    await expect(service.loginWithMobileQr('x')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    prisma.mobileLoginChallenge.findUnique.mockResolvedValue({
      id: 'c1',
      consumedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      user: { id: 'u1', isActive: true },
    });
    await expect(service.loginWithMobileQr('x')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    prisma.mobileLoginChallenge.findUnique.mockResolvedValue({
      id: 'c1',
      consumedAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
      user: { id: 'u1', isActive: true },
    });
    await expect(service.loginWithMobileQr('x')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('loginWithMobileQr rechaza si el usuario está suspendido', async () => {
    prisma.mobileLoginChallenge.findUnique.mockResolvedValue({
      id: 'c1',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60000),
      user: { id: 'u1', email: 'a@test', name: 'A', isActive: false },
    });
    await expect(service.loginWithMobileQr('x')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('loginWithMobileQr consume el código y firma el token en el camino exitoso', async () => {
    prisma.mobileLoginChallenge.findUnique.mockResolvedValue({
      id: 'c1',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60000),
      user: { id: 'u1', email: 'a@test', name: 'A', isActive: true },
    });
    prisma.mobileLoginChallenge.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.loginWithMobileQr('code');

    expect(prisma.mobileLoginChallenge.updateMany).toHaveBeenCalled();
    expect(result.accessToken).toBe('jwt-token');
  });

  // ---------------- Smartwatch ----------------
  it('generateSmartwatchPin devuelve 6 dígitos y guarda el hash con expiración', async () => {
    prisma.user.update.mockResolvedValue({});

    const result = await service.generateSmartwatchPin('u1');

    expect(result.pin).toMatch(/^\d{6}$/);
    const saved = prisma.user.update.mock.calls[0][0].data;
    expect(saved.smartwatchPin).not.toBe(result.pin);
    expect(await bcrypt.compare(result.pin, saved.smartwatchPin)).toBe(true);
    expect(saved.pinExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('smartwatchLogin rechaza cuando no hay PIN activo', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    await expect(service.smartwatchLogin('123456')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('smartwatchLogin rechaza un PIN que no coincide', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'u1',
        email: 'a@test',
        name: 'A',
        smartwatchPin: passwordHash,
      },
    ]);
    await expect(service.smartwatchLogin('000000')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('smartwatchLogin con PIN válido firma token y lo invalida (un solo uso)', async () => {
    const pin = '654321';
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'u1',
        email: 'a@test',
        name: 'A',
        smartwatchPin: await bcrypt.hash(pin, 4),
      },
    ]);
    prisma.user.update.mockResolvedValue({});

    const result = await service.smartwatchLogin(pin);

    expect(result.accessToken).toBe('jwt-token');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { smartwatchPin: null, pinExpiresAt: null },
    });
  });
});
