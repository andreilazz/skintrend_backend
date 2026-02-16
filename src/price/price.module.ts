import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceService } from './price.service';
import { PriceController } from './price.controller'; // <--- Import
import { Price } from './price.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Price])],
  controllers: [PriceController], // <--- Adauga asta!
  providers: [PriceService],
})
export class PriceModule {}