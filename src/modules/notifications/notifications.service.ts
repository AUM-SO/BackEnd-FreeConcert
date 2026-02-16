import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async sendBookingConfirmation(userId: number, bookingCode: string) {
    // TODO: implement email/push notification
    this.logger.log(`Sending booking confirmation to user #${userId}, code: ${bookingCode}`);
  }

  async sendBookingCancellation(userId: number, bookingCode: string) {
    // TODO: implement email/push notification
    this.logger.log(`Sending booking cancellation to user #${userId}, code: ${bookingCode}`);
  }

  async sendEventReminder(userId: number, eventTitle: string) {
    // TODO: implement email/push notification
    this.logger.log(`Sending event reminder to user #${userId}, event: ${eventTitle}`);
  }
}
