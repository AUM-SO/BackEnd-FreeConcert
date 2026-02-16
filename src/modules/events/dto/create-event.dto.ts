import { IsString, IsDateString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({ example: 'Summer Concert 2026' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: '2026-06-15T18:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-06-15T22:00:00Z' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  venueId?: number;

  @ApiProperty({ example: 500 })
  @IsInt()
  @Min(1)
  totalSeats: number;
}
