import {
  Controller, Get, Post, Put, Delete, Body, Param,
  HttpCode, HttpStatus, UseGuards, Req,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // Público — para el sitio web
  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  // Próximos 3 eventos — (Datos de prueba para el Parcial Móvil)
  @Get('upcoming')
  findUpcoming() {
    return this.eventsService.findUpcoming();
  }

  // Protegido — solo admins
  @Get('admin/all')
  @UseGuards(JwtAuthGuard)
  findAllAdmin() {
    return this.eventsService.findAllAdmin();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Get(':id/registration')
  @UseGuards(JwtAuthGuard)
  registrationStatus(@Param('id') id: string, @Req() req: any) {
    return this.eventsService.registrationStatus(id, req.user.id, req.user.role);
  }

  @Post(':id/register')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  register(@Param('id') id: string, @Req() req: any) {
    return this.eventsService.register(id, req.user.id, req.user.role);
  }

  @Get('admin/:id/registrations')
  @UseGuards(JwtAuthGuard)
  adminRegistrations(@Param('id') id: string, @Req() req: any) {
    return this.eventsService.adminRegistrations(id, req.user.role);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }
}
