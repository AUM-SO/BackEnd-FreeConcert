import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';

@Processor('bookings')
export class BookingsProcessor {
  private readonly logger = new Logger(BookingsProcessor.name);

  @Process('confirm')
  async handleConfirm(job: Job) {
    this.logger.debug(`Processing booking confirmation: ${job.id}`);
    // TODO: implement booking confirmation logic (e.g., send email)
    this.logger.debug(`Booking confirmed: ${JSON.stringify(job.data)}`);
  }

  @Process('cancel')
  async handleCancel(job: Job) {
    this.logger.debug(`Processing booking cancellation: ${job.id}`);
    // TODO: implement booking cancellation logic
    this.logger.debug(`Booking cancelled: ${JSON.stringify(job.data)}`);
  }
}
