import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilitar CORS para el frontend
  app.enableCors();
  
  // Prefijo global para la API
  app.setGlobalPrefix('api/v1');
  
  // Validación global para los DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades que no estén en el DTO
      forbidNonWhitelisted: true, // Lanza error si hay propiedades no permitidas
      transform: true, // Transforma los payloads automáticamente según los tipos
    }),
  );

  const port = process.env.API_PORT || 3000;
  await app.listen(port);
  console.log(`Backend corriendo en http://localhost:${port}/api/v1`);
}
bootstrap();
