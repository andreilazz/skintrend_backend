import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // AICI E SECRETUL: Dăm voie Frontend-ului să ia date
  app.enableCors({
    origin: 'http://localhost:3000', // Portul unde rulează Next.js
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(3001);
  console.log(`🚀 Serverul Backend rulează pe: http://localhost:3001`);
}
bootstrap();