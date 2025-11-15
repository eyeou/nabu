import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const logLevels: Prisma.LogLevel[] =
  process.env.PRISMA_DEBUG === 'true'
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error']

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logLevels,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma