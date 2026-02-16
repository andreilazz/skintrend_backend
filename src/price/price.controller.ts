import { Controller, Get, Query } from '@nestjs/common';
import { PriceService } from './price.service';

@Controller('prices')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get('catalog')
  getCatalog() {
    return this.priceService.getCatalog();
  }

  @Get('history')
  async getHistory(
    @Query('item') item: string, 
    @Query('timeframe') timeframe: string
  ) {
    return this.priceService.getHistory(item, timeframe);
  }

  @Get('movers')
  async getMarketMovers() {
    return this.priceService.getMarketMovers();
  }
}