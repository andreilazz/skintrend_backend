import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Price } from './price.entity';
import axios from 'axios';

@Injectable()
export class PriceService implements OnModuleInit {
  // Map în RAM pentru viteză HFT
  private liveMarket: Map<string, any> = new Map();
  public globalMarketCap: number = 0;

  constructor(
    @InjectRepository(Price) private priceRepo: Repository<Price>,
  ) {}

  async onModuleInit() {
    console.log('🚀 [SkinTrend Engine] Inițializare sistem Enterprise...');
    
    // Ștergem istoricul vechi la restart pentru consistență
    await this.priceRepo.clear();

    // 1. Sincronizăm piața la pornire
    await this.syncEntireMarket();
    
    // 2. Facem primul snapshot în DB imediat pentru grafice
    await this.saveSnapshotToDatabase();

    // Intervalele de mentenanță
    setInterval(() => this.syncEntireMarket(), 10 * 60 * 1000); // Sync Skinport la 10 min
    setInterval(() => this.generateHighFrequencyTicks(), 5000);   // Tick-uri în RAM la 5 sec
    setInterval(() => this.saveSnapshotToDatabase(), 60 * 60 * 1000); // Snapshot DB la 60 min
  }

  async syncEntireMarket() {
    try {
      console.log('🌍 [Data Fetch] Sincronizare Skinport API...');
      
      const response = await axios.get('https://api.skinport.com/v1/items', {
        params: { app_id: 730, currency: 'USD', tradable: 0 },
        headers: { 'Accept': 'application/json' } 
      });

      const items = response.data;
      let tempMarketCap = 0;

      this.liveMarket.clear();

      items.forEach((item: any) => {
        if (item.min_price) { 
          this.liveMarket.set(item.market_hash_name, {
            name: item.market_hash_name,
            basePrice: item.min_price,
            currentPrice: item.min_price,
            quantity: item.quantity || 0,
            // Aplicăm spread-ul de broker
            bidPrice: Number((item.min_price * 0.98).toFixed(2)),
            askPrice: Number((item.min_price * 1.02).toFixed(2)),
          });

          // Calculăm Liquid Market Cap-ul
          tempMarketCap += (item.min_price * (item.quantity || 1));
        }
      });

      this.globalMarketCap = tempMarketCap;
      console.log(`✅ [Engine] Sincronizate ${this.liveMarket.size} iteme.`);
      console.log(`💰 [Live Market Cap]: $${this.globalMarketCap.toLocaleString()}`);

    } catch (error: any) {
      console.error('❌ [Critical Error] Skinport Sync Failed:', error.message);
    }
  }

  // --- MOTORUL DE TICK-URI (RAM ONLY) ---
  generateHighFrequencyTicks() {
    for (const [itemName, data] of this.liveMarket.entries()) {
      let volatility = (Math.random() * 0.4 - 0.2) / 100; 
      let newPrice = data.currentPrice + (data.currentPrice * volatility);
      newPrice = Math.round(newPrice * 100) / 100;

      this.liveMarket.set(itemName, {
        ...data,
        currentPrice: newPrice,
        bidPrice: Number((newPrice * 0.98).toFixed(2)),
        askPrice: Number((newPrice * 1.02).toFixed(2)),
      });
    }
  }

  // --- PERSISTENȚĂ PENTRU GRAFICE ---
  async saveSnapshotToDatabase() {
    console.log('💾 [Database] Salvăm snapshot-ul pieței...');
    const batch: Price[] = [];

    for (const [itemName, data] of this.liveMarket.entries()) {
      // Salvăm doar itemele premium (>10$) pentru a nu umple DB-ul inutil
      if (data.currentPrice > 10) {
        batch.push(
          this.priceRepo.create({
            assetName: itemName,
            price: data.currentPrice,
            bidPrice: data.bidPrice,
            askPrice: data.askPrice,
            source: 'Hourly Snapshot'
          })
        );
      }
    }

    try {
      // Salvare în tranșe de 1000 pentru performanță SQLite
      for (let i = 0; i < batch.length; i += 1000) {
        const chunk = batch.slice(i, i + 1000);
        await this.priceRepo.save(chunk);
      }
      console.log(`✅ [Database] Snapshot complet pentru ${batch.length} iteme.`);
    } catch (error) {
      console.error('❌ [Database Error] Eșec la snapshot:', error);
    }
  }

  // --- API PENTRU CONTROLLERS ---
  
  getLiveAsset(itemName: string) {
    return this.liveMarket.get(itemName) || null;
  }

  getMarketMovers() {
    return Array.from(this.liveMarket.values())
      .sort((a, b) => b.currentPrice - a.currentPrice)
      .slice(0, 50);
  }

  getMarketStats() {
    return {
      totalAssetsTracked: this.liveMarket.size,
      liquidMarketCap: this.globalMarketCap
    };
  }

  getCatalog() {
    return Array.from(this.liveMarket.values()).slice(0, 100); 
  }

  async getHistory(assetName: string, timeframe: string = '1H') {
    const rawData = await this.priceRepo.find({
      where: { assetName },
      order: { createdAt: 'ASC' }, 
    });
    return rawData.map(p => ({
      time: Math.floor(new Date(p.createdAt).getTime() / 1000),
      value: parseFloat(p.price.toString()) || 0 
    }));
  }
}