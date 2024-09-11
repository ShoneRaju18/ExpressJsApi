import { PrismaClient } from '@prisma/client';

const connectDB = new PrismaClient();

connectDB.$connect()
  .then(() => {
    console.log('Connected to the PostgreSQL database via Prisma');
  })
  .catch((err) => {
    console.error('Error connecting to the PostgreSQL database:', err);
    process.exit(1);
  });

export default connectDB;