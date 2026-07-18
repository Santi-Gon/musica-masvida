import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

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

