import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. REPARARE CORS: Permitem ambele variante (cu și fără www)
  app.enableCors({
    origin: [
      'https://skintrend.skin', 
      'https://www.skintrend.skin'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'], // Important pentru JWT și login
  });

  // 2. PORT DINAMIC: Render s-ar putea să îți dea alt port decât 3001
  const port = process.env.PORT || 3001;
  
  await app.listen(port);
  console.log(`🚀 Backend-ul SkinTrend este LIVE pe portul: ${port}`);
}
bootstrap();