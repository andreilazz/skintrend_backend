import { Controller, Get, Query } from '@nestjs/common';
import { PriceService } from './price.service';

@Controller('prices')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  // 1. STATISTICI (Aici tragi Market Cap-ul global pentru frontend)
  @Get('stats')
  getStats() {
    return this.priceService.getMarketStats();
  }

  // 2. CATALOGUL (Tot ce avem în memorie)
  @Get('catalog')
  getCatalog() {
    return this.priceService.getCatalog();
  }

  // 3. PRET LIVE (Trage instant din RAM, fără să atingă baza de date - viteză HFT)
  @Get('live')
  getLiveAsset(@Query('item') item: string) {
    return this.priceService.getLiveAsset(item);
  }

  // 4. ISTORIC PENTRU GRAFICE (Asta trage snapshot-urile din SQLite)
  @Get('history')
  async getHistory(
    @Query('item') item: string, 
    @Query('timeframe') timeframe: string
  ) {
    return this.priceService.getHistory(item, timeframe);
  }

  // 5. TOP MOVERS (Cele mai scumpe / populare iteme)
  @Get('movers')
  async getMarketMovers() {
    return this.priceService.getMarketMovers();
  }
}