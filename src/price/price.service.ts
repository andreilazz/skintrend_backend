import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Price } from './price.entity';
import axios from 'axios';

// LISTA DE ITEME TREBUIE SĂ FIE EXACT CA PE SKINPORT (CASE SENSITIVE)
export const TRACKED_ITEMS = {
  Knives: [
    '★ Butterfly Knife | Doppler (Factory New)', 
    '★ Karambit | Fade (Factory New)'
  ],
  Gloves: [
    '★ Sport Gloves | Vice (Field-Tested)', 
    '★ Moto Gloves | Spearmint (Field-Tested)'
  ],
  Rifles: [
    'AK-47 | Wild Lotus (Field-Tested)', 
    'M4A4 | Howl (Field-Tested)', 
    'AWP | Dragon Lore (Field-Tested)'
  ],
  Cases: [
    'Weapon Case 1', 
    'Operation Bravo Case'
  ]
};

@Injectable()
export class PriceService implements OnModuleInit {
  private basePrices: Record<string, number> = {};
  private currentPrices: Record<string, number> = {};

  constructor(
    @InjectRepository(Price) private priceRepo: Repository<Price>,
  ) {
    // Inițializăm cu 100 doar ca fallback. Dacă API-ul merge, astea se vor suprascrie instant.
    Object.values(TRACKED_ITEMS).flat().forEach(item => {
      this.basePrices[item] = 100;
      this.currentPrices[item] = 100;
    });
  }

  async onModuleInit() {
    console.log('🧹 [Curățenie] Ștergem istoricul vechi cu 100$...');
    await this.priceRepo.clear(); // Asta șterge tot istoricul fals ca să o luăm de la 0 curat

    console.log('🚀 [PriceEngine] Pornire... Așteptăm prețurile reale.');
    await this.fetchRealPrices(); 
    await this.generateMarketTicks();
    
    setInterval(() => this.fetchRealPrices(), 5 * 60 * 1000);
    setInterval(() => this.generateMarketTicks(), 5000);
  }

  getCatalog() { return TRACKED_ITEMS; }

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

  async getMarketMovers() {
    const allTracked = Object.values(TRACKED_ITEMS).flat();
    const movers: any[] = [];
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const itemName of allTracked) {
      const current = await this.priceRepo.findOne({ where: { assetName: itemName }, order: { createdAt: 'DESC' } });
      const old = await this.priceRepo.findOne({ where: { assetName: itemName, createdAt: MoreThan(oneDayAgo) }, order: { createdAt: 'ASC' } });

      if (current) {
        const cp = Number(current.price);
        const op = old ? Number(old.price) : cp; // Dacă nu avem istoric vechi, considerăm prețul neschimbat
        movers.push({ 
          assetName: itemName, 
          currentPrice: cp, 
          oldPrice: op, 
          change: op > 0 ? ((cp - op) / op) * 100 : 0 
        });
      }
    }
    return movers.sort((a, b) => b.change - a.change);
  }

  // --- AICI E INIMA SISTEMULUI ---
  async fetchRealPrices() {
    try {
      console.log('🔍 [Skinport] Conectare la API...');
      
      const response = await axios.get('https://api.skinport.com/v1/items', {
        params: { app_id: 730, currency: 'USD', tradable: 0 },
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        } 
      });

      const items = response.data;
      const allTracked = Object.values(TRACKED_ITEMS).flat();
      let updatedCount = 0;
      const missingItems: string[] = []; // Aici salvăm ce nu se găsește

      allTracked.forEach(itemName => {
        const skin = items.find((i: any) => i.market_hash_name === itemName);
        
        if (skin && skin.min_price) {
            const realPrice = skin.min_price;
            this.basePrices[itemName] = realPrice;
            this.currentPrices[itemName] = realPrice; // Suprascriem 100-ul forțat
            
            // Logăm fiecare preț găsit ca să fim siguri
            console.log(`✅ Preț Găsit: ${itemName} -> $${realPrice}`);
            updatedCount++;
        } else {
            missingItems.push(itemName);
        }
      });

      console.log(`✨ [Update] Am actualizat ${updatedCount} din ${allTracked.length} iteme.`);
      
      // Dacă există iteme lipsă, le afișăm clar cu roșu
      if (missingItems.length > 0) {
          console.log(`❌ Iteme NEGĂSITE pe Skinport (nume greșit sau lipsă stoc):`, missingItems);
      }

    } catch (error: any) {
      console.error('❌ [Skinport Error]', error.message);
    }
  }

  async generateMarketTicks() {
    for (const item of Object.values(TRACKED_ITEMS).flat()) {
      const current = this.currentPrices[item] || 100;
      
      // Simulare volatilitate mică (0.2%)
      let volatility = (Math.random() * 0.4 - 0.2) / 100; 
      let newPrice = current + (current * volatility);

      // Rotunjire la 2 zecimale
      newPrice = Math.round(newPrice * 100) / 100;

      this.currentPrices[item] = newPrice;
      
      // Salvăm în baza de date
      await this.priceRepo.save(this.priceRepo.create({ 
          assetName: item, 
          price: newPrice, 
          source: 'Tick' 
      }));
    }
  }
}