import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** GET /api/v1/users/admin/all — Lista todos los usuarios (solo admin). */
  @Get('admin/all')
  findAll() {
    return this.usersService.findAll();
  }

  /** PATCH /api/v1/users/admin/:id — Edita nombre, email o estado activo del usuario. */
  @Patch('admin/:id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; email?: string; isActive?: boolean },
    @Request() req: any,
  ) {
    const adminId: string = req.user.sub;
    return this.usersService.update(id, body, adminId);
  }

  /** GET /api/v1/users/admin/:id/audit — Historial de auditoría del usuario. */
  @Get('admin/:id/audit')
  getAudit(@Param('id') id: string) {
    return this.usersService.getAuditLog(id);
  }
}
