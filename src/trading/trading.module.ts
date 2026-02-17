import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradingController } from './trading.controller';
import { TradingService } from './trading.service';
import { Position } from './position.entity';
import { User } from './user.entity';
import { Transaction } from './transaction.entity';
import { PriceModule } from '../price/price.module'; // IMPORTA ASTA

@Module({
  imports: [
    TypeOrmModule.forFeature([Position, User, Transaction]),
    PriceModule, // ADĂUGA ASTA AICI
  ],
  controllers: [TradingController],
  providers: [TradingService],
})
export class TradingModule {}