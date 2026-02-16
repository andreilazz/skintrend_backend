import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TradingService } from './trading.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('trading')
@UseGuards(AuthGuard('jwt'))
export class TradingController {
  constructor(private tradingService: TradingService) {}

  @Get('balance')
  async getBalance(@Request() req) {
    return { balance: await this.tradingService.getBalance(req.user.userId) };
  }

  @Post('deposit')
  async deposit(@Request() req, @Body() body: { amount: number }) {
    return this.tradingService.deposit(req.user.userId, body.amount);
  }

  @Post('withdraw')
  async withdraw(@Request() req, @Body() body: { amount: number }) {
    return this.tradingService.withdraw(req.user.userId, body.amount);
  }

  @Get('transactions')
  async getTransactions(@Request() req) {
    return this.tradingService.getTransactions(req.user.userId);
  }

  @Post('order')
  async openPosition(@Request() req, @Body() body: { type: 'LONG' | 'SHORT', amount: number, assetName: string }) {
    return this.tradingService.openPosition(body.type, body.amount, body.assetName, req.user.userId);
  }

  @Get('positions')
  async getOpenPositions(@Request() req) {
    return this.tradingService.getOpenPositions(req.user.userId);
  }

  @Get('history')
  async getHistory(@Request() req) {
    return this.tradingService.getHistory(req.user.userId);
  }

  @Post('close/:id')
  async closePosition(@Request() req, @Param('id') id: number) {
    return this.tradingService.closePosition(id, req.user.userId);
  }

  @Get('analytics')
  async getAnalytics(@Request() req) {
    return this.tradingService.getAnalytics(req.user.userId);
  }

  // --- NOU: RUTA PENTRU PANOUL DE ADMIN ---
  @Get('admin/stats')
  async getAdminStats() {
    // Aici am putea pune si o verificare extra (ex: if user.role !== 'admin' throw Error), 
    // dar pentru moment expunem datele ca sa construim UI-ul.
    return this.tradingService.getAdminStats();
  }
  @Post('admin/withdraw/:id/approve')
  async approveWithdrawal(@Param('id') id: number) {
    return this.tradingService.approveWithdrawal(id);
  }

  @Post('admin/withdraw/:id/reject')
  async rejectWithdrawal(@Param('id') id: number) {
    return this.tradingService.rejectWithdrawal(id);
  }
}