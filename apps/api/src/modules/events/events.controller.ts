import {
  Controller, Get, Post, Put, Delete, Body, Param,
  HttpCode, HttpStatus, UseGuards,
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
    return [
      {
        id: 'mock-1',
        title: 'Gran Concierto de Invierno',
        date: '2026-12-15T00:00:00.000Z',
        time: '19:30',
        location: 'Teatro Principal',
      },
      {
        id: 'mock-2',
        title: 'Recital de Piano Solo',
        date: '2026-11-20T00:00:00.000Z',
        time: '18:00',
        location: 'Sala de Cámara',
      },
      {
        id: 'mock-3',
        title: 'Clase Magistral de Violín',
        date: '2026-11-10T00:00:00.000Z',
        time: '16:00',
        location: 'Aula 4B',
      }
    ];
    // Original (comentado por pruebas):
    // return this.eventsService.findUpcoming();
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
