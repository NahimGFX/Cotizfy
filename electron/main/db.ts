import { PrismaClient } from '@prisma/client';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

let prisma: PrismaClient | null = null;

export function getDatabasePath(): string {
  if (app.isPackaged) {
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    return path.join(userDataPath, 'cotizfy.db');
  }

  // Development database path (inside prisma folder)
  return path.resolve(process.cwd(), 'prisma', 'dev.db');
}

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    const dbPath = getDatabasePath();
    const dbUrl = `file:${dbPath}`;

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  return prisma;
}

export async function initDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    const client = getPrismaClient();
    // Test connectivity
    await client.$queryRaw`SELECT 1`;
    return { success: true, message: 'Database connected successfully' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Database connection error:', message);
    return { success: false, message };
  }
}
