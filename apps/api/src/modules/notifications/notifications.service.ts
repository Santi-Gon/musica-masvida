import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import * as webpush from 'web-push';
import { ConfigService } from '@nestjs/config';

export class PushSubscriptionDto {
  endpoint!: string;
  keys!: {
    p256dh: string;
    auth: string;
  };
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.configService.get<string>('VAPID_SUBJECT') || 'mailto:admin@musicamasvida.com';

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.logger.log('Web Push VAPID keys configured.');
    } else {
      this.logger.warn('Web Push VAPID keys are missing from environment variables.');
    }
  }

  async saveSubscription(subscription: PushSubscriptionDto) {
    const exists = await this.prisma.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint },
    });

    if (!exists) {
      return this.prisma.pushSubscription.create({
        data: {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      });
    }
    return exists;
  }

  async sendNotificationToAll(title: string, body: string, url: string = '/') {
    const subscriptions = await this.prisma.pushSubscription.findMany();
    
    if (subscriptions.length === 0) {
      this.logger.log('No subscriptions found to send push notification.');
      return;
    }

    const payload = JSON.stringify({
      title,
      body,
      url,
      icon: '/vite.svg', // Assuming a basic icon for now
    });

    let successCount = 0;
    let failureCount = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload,
        );
        successCount++;
      } catch (error: any) {
        failureCount++;
        if (error.statusCode === 410 || error.statusCode === 404) {
          // The subscription is no longer valid, delete it
          await this.prisma.pushSubscription.delete({
            where: { endpoint: sub.endpoint },
          });
          this.logger.log(`Deleted expired subscription: ${sub.endpoint}`);
        } else {
          this.logger.error(`Error sending push to ${sub.endpoint}: ${error.message}`);
        }
      }
    }

    this.logger.log(`Push sent: ${successCount} success, ${failureCount} failed.`);
    return { successCount, failureCount };
  }
}
