import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { allowedOrigins } from './modules/auth/access';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use((_request: unknown, response: { setHeader(name: string, value: string): void }, next: () => void) => {
    response.setHeader('Cache-Control', 'private, no-store'); next();
  });
  app.enableCors({
    origin: allowedOrigins(),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);
}

void bootstrap();
