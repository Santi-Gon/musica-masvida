import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketsService } from './tickets.service';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTicketDto, @Req() req: any) {
    return this.ticketsService.create(dto, req.user.id, req.user.role);
  }

  @Get('admin')
  findAllAdmin(@Req() req: any) {
    return this.ticketsService.findAllAdmin(req.user.role);
  }

  @Patch('admin/:id')
  updateAdmin(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @Req() req: any,
  ) {
    return this.ticketsService.updateAdmin(id, dto, req.user.role);
  }
}
