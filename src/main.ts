import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: [process.env.CLIENT_URL],
    credentials: true,
  });
  app.useStaticAssets(join(__dirname, '..', 'public', 'images'), {
    prefix: '/images/',
  });
  app.setGlobalPrefix('api');

  app.use(cookieParser());

  await app.listen(3000);
}
bootstrap();
