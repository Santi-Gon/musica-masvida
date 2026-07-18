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
}

