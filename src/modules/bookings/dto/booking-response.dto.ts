import { ApiProperty } from '@nestjs/swagger';

export class BookingResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  bookingCode: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  eventId: number;

  @ApiProperty()
  seatId: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  createdAt: Date;
}
