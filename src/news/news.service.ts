import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { News } from './news.entity';
import Parser from 'rss-parser';

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private parser = new Parser();

  constructor(
    @InjectRepository(News)
    private newsRepository: Repository<News>,
  ) {}

  // Trage știri la fiecare 4 ore
  @Cron(CronExpression.EVERY_4_HOURS)
  async fetchCS2News() {
    this.logger.log('Căutăm update-uri de la Valve...');
    
    try {
      const feed = await this.parser.parseURL('https://store.steampowered.com/feeds/news/app/730');
      
      // Curățăm tabelul vechi ca să avem doar noutăți
      await this.newsRepository.clear();

      // Luăm primele 5 articole
      const newsItems = feed.items.slice(0, 5).map(item => {
        const news = new News();
        
        // Adăugăm || 'text de rezervă' ca să mulțumim TypeScript-ul
        news.title = item.title || 'Actualizare CS2';
        news.link = item.link || 'https://blog.counter-strike.net/';
        news.date = item.pubDate || new Date().toISOString();
        news.snippet = item.contentSnippet ? item.contentSnippet.substring(0, 150) + '...' : '';
        
        return news;
      });

      // Salvăm direct în SQLite
      await this.newsRepository.save(newsItems);
      this.logger.log('Știrile au fost salvate cu succes în baza de date!');
    } catch (error) {
      this.logger.error('Eroare la preluarea știrilor', error);
    }
  }

  // Funcția care e apelată de Controller
  async getNews() {
    return this.newsRepository.find();
  }
}