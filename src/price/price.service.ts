import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Price } from './price.entity';
import axios from 'axios';

@Injectable()
export class PriceService implements OnModuleInit {
  // Aici ținem în RAM absolut toată piața CS2 (aprox 20,000 iteme) pentru viteză extremă
  private liveMarket: Map<string, any> = new Map();
  public globalMarketCap: number = 0;

  constructor(
    @InjectRepository(Price) private priceRepo: Repository<Price>,
  ) {}

  async onModuleInit() {
    console.log('🚀 [SkinTrend Engine] Inițializare arhitectură Enterprise...');
    
    // 1. Tragem TOATĂ piața la pornire
    await this.syncEntireMarket();
    
    // 2. Sincronizăm prețurile de bază de la Skinport o dată la 10 minute
    setInterval(() => this.syncEntireMarket(), 10 * 60 * 1000);
    
    // 3. Pornim motorul de tranzacționare la înaltă frecvență (HFT) în memorie (5 secunde)
    setInterval(() => this.generateHighFrequencyTicks(), 5000);

    // 4. Salvăm "o poză" a pieței în baza de date (SQLite) din oră în oră, pentru grafice
    setInterval(() => this.saveSnapshotToDatabase(), 60 * 60 * 1000);
  }

  // --- TRAGEM ABSOLUT TOT CATALOGUL CS2 ---
  async syncEntireMarket() {
    try {
      console.log('🌍 [Data Fetch] Descărcăm întregul catalog CS2 de pe Skinport...');
      
      const response = await axios.get('https://api.skinport.com/v1/items', {
        params: { app_id: 730, currency: 'USD', tradable: 0 },
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (SkinTrend Platform)'
        } 
      });

      const items = response.data;
      let tempMarketCap = 0;
      let loadedItems = 0;

      // Iterăm prin zecile de mii de iteme
      items.forEach((item: any) => {
        if (item.min_price && item.quantity > 0) { // Ignorăm itemele care nu sunt la vânzare deloc
          
          this.liveMarket.set(item.market_hash_name, {
            basePrice: item.min_price,
            currentPrice: item.min_price, // Ăsta se va mișca la fiecare 5 secunde
            quantity: item.quantity,
            bidPrice: Number((item.min_price * 0.98).toFixed(2)),
            askPrice: Number((item.min_price * 1.02).toFixed(2)),
          });

          // Calculăm direct Liquid Market Cap-ul adevărat al pieței
          tempMarketCap += (item.min_price * item.quantity);
          loadedItems++;
        }
      });

      this.globalMarketCap = tempMarketCap;
      
      console.log(`✅ [SkinTrend Engine] Încărcare completă: ${loadedItems.toLocaleString()} iteme unice stocate în RAM.`);
      console.log(`💰 [Live Market Cap]: $${this.globalMarketCap.toLocaleString()}`);

    } catch (error: any) {
      console.error('❌ [Skinport API Error] Eroare la sincronizarea pieței globale:', error.message);
    }
  }

  // --- INIMA FINANCIARĂ (RULARE ÎN RAM PENTRU TOATE CELE 20.000 ITEME) ---
  generateHighFrequencyTicks() {
    // Calculăm fluctuațiile în RAM ca să nu prăjim baza de date. 
    // Durează câteva milisecunde pentru 20.000 de iteme.
    for (const [itemName, data] of this.liveMarket.entries()) {
      
      let volatility = (Math.random() * 0.4 - 0.2) / 100; // Fluctuație de max 0.2%
      let newPrice = data.currentPrice + (data.currentPrice * volatility);
      newPrice = Math.round(newPrice * 100) / 100;

      // Actualizăm direct în memorie
      this.liveMarket.set(itemName, {
        ...data,
        currentPrice: newPrice,
        bidPrice: Number((newPrice * 0.98).toFixed(2)),
        askPrice: Number((newPrice * 1.02).toFixed(2)),
      });
    }
  }

  // --- SALVAREA PENTRU GRAFICE (ISTORIC) ---
  async saveSnapshotToDatabase() {
    console.log('💾 [Database] Salvăm snapshot-ul pieței pe disk...');
    // Aici nu salvăm 20.000 de intrări deodată ca să nu blocăm serverul.
    // Filtrăm și salvăm doar itemele care depășesc un anumit volum/preț, 
    // sau le scriem în loturi (batches) dacă vrem istoric la absolut tot.
    // Momentan vom salva un snapshot de performanță.
    
    const batch: Price[] = [];;
    for (const [itemName, data] of this.liveMarket.entries()) {
      // Salvăm în DB doar itemele de peste 10$ ca să optimizăm SQLite-ul
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
      // Salvăm în bucăți de câte 1000 ca să respire SQLite-ul
      for (let i = 0; i < batch.length; i += 1000) {
        const chunk = batch.slice(i, i + 1000);
        await this.priceRepo.save(chunk);
      }
      console.log(`✅ [Database] Snapshot complet! Am salvat ${batch.length} iteme premium.`);
    } catch (error) {
      console.error('❌ [Database Error]', error);
    }
  }

  // --- EXPORTĂM CĂTRE CONTROLLER ---
  // Returnează un anumit item pentru terminalul tău
  getLiveAsset(itemName: string) {
    return this.liveMarket.get(itemName) || null;
  }

  // Returnează top 50 cele mai scumpe iteme pentru pagina principală
  getMarketMovers() {
    const allItems = Array.from(this.liveMarket.entries()).map(([name, data]) => ({
      name,
      ...data
    }));

    // Sortăm descrescător după preț și luăm primele 50
    return allItems.sort((a, b) => b.currentPrice - a.currentPrice).slice(0, 50);
  }

  getMarketStats() {
    return {
      totalAssetsTracked: this.liveMarket.size,
      liquidMarketCap: this.globalMarketCap
    };
  }
  // Returnăm primele 100 de iteme pentru catalog (să nu prăbușim frontend-ul trimițând 20.000 de string-uri deodată)
  getCatalog() {
    return Array.from(this.liveMarket.keys()).slice(0, 100); 
  }

  // Păstrăm funcția ta originală pentru istoric, trage pozele salvate din SQLite pentru grafice
  async getHistory(assetName: string, timeframe: string = '1H') {
    const rawData = await this.priceRepo.find({
      where: { assetName },
      order: { id: 'ASC' }, 
    });
    return rawData.map(p => ({
      // AM CORECTAT AICI: p.createdAt în loc de p.updatedAt
      time: Math.floor(new Date(p.createdAt || new Date()).getTime() / 1000),
      value: parseFloat(p.price.toString()) || 0 
    }));
  }
}