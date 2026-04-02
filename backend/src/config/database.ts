import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Call once on startup to verify the DB is reachable
export const verifyDatabaseConnection = async (): Promise<void> => {
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log(' Database connected successfully')
  } catch (error) {
    console.error('Database connection failed:', error)
    console.error('Check DATABASE_URL in your .env file')
    console.error('Is PostgreSQL running? (Task Manager → Services → postgresql-16)')
    process.exit(1)
  }
}

export default prisma