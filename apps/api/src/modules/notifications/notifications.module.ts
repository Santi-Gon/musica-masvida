import { Module } from '@nestjs/common';

@Module({
  providers: [],
  exports: [],
})
export class NotificationsModule {}

// TODO: Implementar Web Push notifications
// - Guardar suscripciones de usuarios
// - Enviar notificaciones cuando se crea un evento
// - Requiere claves VAPID (ver .env.example)
