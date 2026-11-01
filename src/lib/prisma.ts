import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

const adapter = new PrismaPg({ connectionString });
const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Singleton database client for Prisma.
 * Uses a global instance in development to prevent hot-reloading from exhausting DB connections.
 * Uses a PostgreSQL adapter for high performance.
 */
const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
