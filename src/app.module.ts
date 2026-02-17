import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { ScheduleModule } from '@nestjs/schedule'; // IMPORT NOU PENTRU CRON

import { PriceModule } from './price/price.module';
import { Price } from './price/price.entity';
import { TradingModule } from './trading/trading.module';
import { Position } from './trading/position.entity';
import { User } from './trading/user.entity';
import { Transaction } from './trading/transaction.entity';
import { AuthModule } from './auth/auth.module';
import { NewsModule } from './news/news.module'; // IMPORT NOU
import { News } from './news/news.entity'; // IMPORT NOU

@Module({
  imports: [
    // 1. ACTIVĂM CEASUL INTERN
    ScheduleModule.forRoot(),

    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'cs2_trading.sqlite',
      entities: [Price, Position, User, Transaction, News], // 2. AM ADĂUGAT ENTITATEA NEWS
      synchronize: true,
    }),
    
    MailerModule.forRoot({
      transport: {
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: {
          user: 'resend',
          pass: 're_dhnmnFjJ_DhZigenzupEidJkU2Eua45vz', // Muta asta in .env mai incolo
        },
      },
      defaults: {
        from: '"SkinTrend Support" <onboarding@resend.dev>', 
      },
    }),

    PriceModule,
    TradingModule,
    AuthModule,
    NewsModule, // 3. AM ADĂUGAT MODULUL DE ȘTIRI
  ],
})
export class AppModule {}