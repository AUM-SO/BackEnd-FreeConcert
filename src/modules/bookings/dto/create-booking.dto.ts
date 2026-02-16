import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  eventId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  seatId: number;
}
