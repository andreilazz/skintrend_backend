import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradingService } from './trading.service';
import { TradingController } from './trading.controller';
import { Position } from './position.entity';
import { Price } from '../price/price.entity';
import { User } from './user.entity';
import { Transaction } from './transaction.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Position, Price, User, Transaction]),
    AuthModule,
  ],
  providers: [TradingService],
  controllers: [TradingController],
})
export class TradingModule {}