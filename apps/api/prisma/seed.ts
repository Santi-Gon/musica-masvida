import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Iniciando seed de datos de prueba...');

  // Crear usuario administrador
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@musicamasvida.com' },
    update: {},
    create: {
      email: 'admin@musicamasvida.com',
      password: adminPassword,
      name: 'Administrador Principal',
    },
  });
  console.log(`Admin user creado: ${admin.email}`);

  // Crear usuario regular
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      password: userPassword,
      name: 'Usuario de Prueba',
    },
  });
  console.log(`Usuario regular creado: ${user.email}`);

  // Crear Evento
  const event = await prisma.event.create({
    data: {
      title: 'Concierto de Primavera',
      description: 'Un gran concierto para celebrar la llegada de la primavera.',
      date: new Date('2027-03-21T18:00:00Z'),
      time: '18:00',
      location: 'Auditorio Principal',
    },
  });
  console.log(`Evento creado: ${event.title}`);

  // Crear Instrumento
  const instrument = await prisma.instrument.create({
    data: {
      name: 'Piano',
      description: 'Piano de cola clásico',
      category: 'KEYBOARD',
    },
  });
  console.log(`Instrumento creado: ${instrument.name}`);

  // Crear Maestro
  const teacher = await prisma.teacher.create({
    data: {
      name: 'Juan Pérez',
      bio: 'Pianista profesional con 10 años de experiencia.',
      instruments: ['Piano'],
      email: 'juan@musicamasvida.com',
    },
  });
  console.log(`Maestro creado: ${teacher.name}`);

  console.log('Seed de datos completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
