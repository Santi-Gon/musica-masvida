import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilitar CORS para el frontend (localhost en dev, Vercel en prod)
  app.enableCors({
    origin: true, // Acepta cualquier origen — puedes restringirlo al dominio de Vercel luego
    credentials: true,
  });
  
  // Prefijo global para la API
  app.setGlobalPrefix('api/v1');
  
  // Validación global para los DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Railway usa la variable PORT; en local usamos API_PORT o 3000
  const port = process.env.PORT || process.env.API_PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend corriendo en puerto ${port}/api/v1`);
}
bootstrap();
