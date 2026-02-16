import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer'; // IMPORT NOU
import { PriceModule } from './price/price.module';
import { Price } from './price/price.entity';
import { TradingModule } from './trading/trading.module';
import { Position } from './trading/position.entity';
import { User } from './trading/user.entity';
import { Transaction } from './trading/transaction.entity';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'cs2_trading.sqlite',
      entities: [Price, Position, User, Transaction], 
      synchronize: true,
    }),
    
    // CONFIGURARE MAILER
    MailerModule.forRoot({
      transport: {
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: {
          user: 'resend',
          pass: 're_dhnmnFjJ_DhZigenzupEidJkU2Eua45vz', // AICI PUI API KEY-UL TĂU
        },
      },
      defaults: {
        from: '"SkinTrend Support" <onboarding@resend.dev>', // Resend permite asta pt teste
      },
    }),

    PriceModule,
    TradingModule,
    AuthModule,
  ],
})
export class AppModule {}