import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('setup')
  @HttpCode(HttpStatus.CREATED)
  async setup() {
    return this.authService.setupInitialAdmin();
  }

  @Post('setup-user')
  @HttpCode(HttpStatus.CREATED)
  async setupUser() {
    return this.authService.setupInitialUser();
  }

  // Endpoint de prueba para verificar que el JWT funciona
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: any) {
    return {
      message: 'Token válido',
      user: req.user,
    };
  }

  // ==============================
  // Endpoints Smartwatch
  // ==============================

  @Post('smartwatch/generate-pin')
  @UseGuards(JwtAuthGuard) // Solo usuarios logueados en la web pueden pedir PIN
  async generatePin(@Req() req: any) {
    // req.user.userId (o sub) viene del JWT
    return this.authService.generateSmartwatchPin(req.user.sub);
  }

  @Post('smartwatch/login')
  @HttpCode(HttpStatus.OK)
  async smartwatchLogin(@Body() body: { pin: string }) {
    return this.authService.smartwatchLogin(body.pin);
  }
}

