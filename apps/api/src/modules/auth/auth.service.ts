import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    
    // Buscar el usuario por email
    const user = await this.prisma.adminUser.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Validar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Generar Token JWT
    const payload = { sub: user.id, email: user.email, role: 'ADMIN' };
    
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'ADMIN',
      },
    };
  }

  // Login para usuarios normales (estudiantes) — usa la tabla User, no AdminUser
  async loginUser(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar que la cuenta no haya sido suspendida por un administrador
    if (!user.isActive) {
      throw new UnauthorizedException('Cuenta suspendida. Contacta al administrador.');
    }

    const payload = { sub: user.id, email: user.email, role: 'USER' };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'USER',
      },
    };
  }

  async generateMobileQr(userId: string, role: string) {
    if (role !== 'USER') {
      throw new UnauthorizedException('Solo los alumnos pueden iniciar sesión en la app móvil');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('La cuenta no está disponible');
    }

    const code = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const codeHash = createHash('sha256').update(code).digest('hex');

    await this.prisma.mobileLoginChallenge.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    await this.prisma.mobileLoginChallenge.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await this.prisma.mobileLoginChallenge.create({
      data: { userId, codeHash, expiresAt },
    });

    return { code, expiresAt };
  }

  async loginWithMobileQr(code: string) {
    const codeHash = createHash('sha256').update(code).digest('hex');
    const now = new Date();
    const challenge = await this.prisma.mobileLoginChallenge.findUnique({
      where: { codeHash },
      include: { user: true },
    });

    if (
      !challenge ||
      challenge.consumedAt ||
      challenge.expiresAt <= now ||
      !challenge.user.isActive
    ) {
      throw new UnauthorizedException('El código QR no es válido o ya expiró');
    }

    const consumed = await this.prisma.mobileLoginChallenge.updateMany({
      where: {
        id: challenge.id,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) {
      throw new UnauthorizedException('El código QR ya fue utilizado o expiró');
    }

    const payload = {
      sub: challenge.user.id,
      email: challenge.user.email,
      role: 'USER',
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: challenge.user.id,
        email: challenge.user.email,
        name: challenge.user.name,
        role: 'USER',
      },
    };
  }

  // Método especial para crear el primer administrador si no existe ninguno.
  // Es útil para la configuración inicial.
  async setupInitialAdmin() {
    const adminCount = await this.prisma.adminUser.count();
    
    if (adminCount > 0) {
      throw new ConflictException('Ya existen administradores en el sistema. El setup ha sido bloqueado por seguridad.');
    }

    // Datos por defecto para el primer admin
    const defaultEmail = 'admin@musicamasvida.com';
    const defaultPassword = 'password123';
    
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    const admin = await this.prisma.adminUser.create({
      data: {
        name: 'Administrador Principal',
        email: defaultEmail,
        password: hashedPassword,
      },
    });

    return {
      message: 'Administrador creado con éxito',
      email: defaultEmail,
      password: defaultPassword,
      note: 'POR FAVOR CAMBIA LA CONTRASEÑA EN PRODUCCIÓN',
    };
  }

  // Setup para un usuario normal (estudiante) para la práctica
  async setupInitialUser() {
    const userCount = await this.prisma.user.count();
    if (userCount > 0) {
      // Si ya existe, simplemente devolvemos un token para el primero para hacer la prueba fácil
      const user = await this.prisma.user.findFirst();
      const payload = { sub: user!.id, email: user!.email, role: 'USER' };
      return {
        message: 'Usuario ya existía',
        accessToken: this.jwtService.sign(payload),
      };
    }

    const hashedPassword = await bcrypt.hash('alumno123', 10);
    
    const user = await this.prisma.user.create({
      data: {
        name: 'Alumno de Prueba',
        email: 'alumno@musicamasvida.com',
        password: hashedPassword,
      },
    });

    // Crear algo de datos médicos y actividad para la práctica
    await this.prisma.medicalReminder.create({
      data: { title: 'Tomar Pastilla', time: '08:00 AM', userId: user.id }
    });
    await this.prisma.physicalActivity.create({
      data: { type: 'Caminata', duration: 30, calories: 150, userId: user.id }
    });

    const payload = { sub: user.id, email: user.email, role: 'USER' };
    return {
      message: 'Usuario creado',
      accessToken: this.jwtService.sign(payload),
    };
  }

  // ==============================
  // Métodos para Smartwatch (Prácticas 11 y 12)
  // ==============================

  async generateSmartwatchPin(userId: string) {
    // Generar un PIN aleatorio de 6 dígitos
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hashear el PIN por seguridad (requerimiento: credenciales no en texto plano)
    const hashedPin = await bcrypt.hash(pin, 10);
    
    // Configurar expiración de 10 minutos
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        smartwatchPin: hashedPin,
        pinExpiresAt: expiresAt,
      },
    });

    // Retornamos el PIN en texto plano SOLO a la web para que se lo muestre al usuario
    return { pin, expiresAt };
  }

  async smartwatchLogin(pin: string) {
    // Buscar todos los usuarios que tengan un PIN activo (esto no escala bien para millones de usuarios, 
    // pero funciona perfecto para la práctica. Otra opción es pedir el email en el smartwatch, 
    // pero el requerimiento pide SOLO el PIN).
    const users = await this.prisma.user.findMany({
      where: {
        smartwatchPin: { not: null },
        pinExpiresAt: { gt: new Date() }, // El PIN no debe haber expirado
      },
    });

    let matchedUser = null;

    // Comparar los hashes
    for (const user of users) {
      if (await bcrypt.compare(pin, user.smartwatchPin!)) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      throw new UnauthorizedException('PIN inválido o expirado');
    }

    // Limpiar el PIN para que sea de un solo uso
    await this.prisma.user.update({
      where: { id: matchedUser.id },
      data: {
        smartwatchPin: null,
        pinExpiresAt: null,
      },
    });

    // Generar JWT para el smartwatch
    const payload = { sub: matchedUser.id, email: matchedUser.email, role: 'USER' };
    
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: matchedUser.id,
        name: matchedUser.name,
      },
    };
  }
}
