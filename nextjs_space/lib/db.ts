import { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Singleton Prisma client
// ---------------------------------------------------------------------------

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  // -------------------------------------------------------------------------
  // RLS middleware — sets app.current_user_id for every transaction so that
  // PostgreSQL Row Level Security policies can identify the current user.
  //
  // Call `prismaWithUser(userId)` in route handlers instead of bare `prisma`
  // when you need RLS to be enforced for that specific request.
  // -------------------------------------------------------------------------
  // (The base client is left without RLS injection to allow service-level
  //  operations such as seeding, migrations, and admin tasks.)

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
export const db = prisma;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ---------------------------------------------------------------------------
// RLS-aware client factory
// ---------------------------------------------------------------------------

/**
 * Returns a Prisma client extension that sets `app.current_user_id` to
 * `userId` at the start of every query, activating PostgreSQL RLS policies.
 *
 * Usage in route handlers:
 *
 *   import { prismaWithUser } from '@/lib/db';
 *   const db = prismaWithUser(session.user.id);
 *   const projects = await db.project.findMany();
 */
export function prismaWithUser(userId: string): PrismaClient {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          // SET LOCAL only works inside a transaction; wrap automatically.
          const [, result] = await prisma.$transaction([
            prisma.$executeRawUnsafe(
              `SET LOCAL app.current_user_id = '${userId.replace(/'/g, "''")}'`
            ),
            query(args) as any,
          ]);
          return result;
        },
      },
    },
  }) as unknown as PrismaClient;
}
