import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationsService, PushSubscriptionDto } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  async subscribe(@Body() subscription: PushSubscriptionDto) {
    await this.notificationsService.saveSubscription(subscription);
    return { success: true, message: 'Suscripción guardada exitosamente.' };
  }
}
