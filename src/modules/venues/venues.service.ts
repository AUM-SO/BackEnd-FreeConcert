import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.module';
import { venues } from '../../database/schema';
import { CreateVenueDto } from './dto/create-venue.dto';

@Injectable()
export class VenuesService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async create(createVenueDto: CreateVenueDto) {
    const result = await this.db.insert(venues).values(createVenueDto);
    return this.findOne(result[0].insertId);
  }

  async findAll() {
    return this.db.select().from(venues);
  }

  async findOne(id: number) {
    const [venue] = await this.db.select().from(venues).where(eq(venues.id, id)).limit(1);

    if (!venue) {
      throw new NotFoundException(`Venue #${id} not found`);
    }
    return venue;
  }

  async update(id: number, updateDto: Partial<CreateVenueDto>) {
    await this.findOne(id);

    await this.db
      .update(venues)
      .set({ ...updateDto, updatedAt: new Date() })
      .where(eq(venues.id, id));

    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.db.delete(venues).where(eq(venues.id, id));
    return { message: `Venue #${id} deleted` };
  }
}
