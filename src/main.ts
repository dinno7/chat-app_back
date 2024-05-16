import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: [process.env.CLIENT_URL],
  });
  app.useStaticAssets(join(__dirname, '..', 'public', 'images'), {
    prefix: '/images/',
  });
  app.setGlobalPrefix('api');

  await app.listen(3000);
}
bootstrap();
