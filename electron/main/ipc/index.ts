import { ipcMain, app, BrowserWindow } from 'electron';
import { getPrismaClient, initDatabase } from '../db';
import type { IpcResponse, ProjectSummary } from '../../preload/types';

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // App info
  ipcMain.handle('app:getVersion', () => app.getVersion());

  // Window management
  ipcMain.on('window:minimize', () => mainWindow.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow.close());

  // Language setting persistence in SQLite
  ipcMain.handle('app:getLanguage', async (): Promise<string> => {
    try {
      const prisma = getPrismaClient();
      const setting = await prisma.appSetting.findUnique({
        where: { key: 'language' },
      });
      return setting?.value || 'es';
    } catch {
      return 'es';
    }
  });

  ipcMain.handle('app:setLanguage', async (_event, lang: string): Promise<boolean> => {
    try {
      const prisma = getPrismaClient();
      await prisma.appSetting.upsert({
        where: { key: 'language' },
        update: { value: lang },
        create: { key: 'language', value: lang },
      });
      return true;
    } catch (error) {
      console.error('Failed to save language setting:', error);
      return false;
    }
  });

  // DB Connection check
  ipcMain.handle('db:checkConnection', async () => {
    const res = await initDatabase();
    return {
      connected: res.success,
      message: res.message,
    };
  });

  // Projects list
  ipcMain.handle('projects:getAll', async (): Promise<IpcResponse<ProjectSummary[]>> => {
    try {
      const prisma = getPrismaClient();
      const projects = await prisma.project.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: {
              suppliers: true,
              items: true,
            },
          },
        },
      });

      const formatted: ProjectSummary[] = projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        client: p.client,
        currency: p.currency,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        suppliersCount: p._count.suppliers,
        itemsCount: p._count.items,
      }));

      return { success: true, data: formatted };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error';
      return { success: false, error: message };
    }
  });

  // Create project
  ipcMain.handle('projects:create', async (_event, data: { name: string; description?: string; client?: string; currency?: string }) => {
    try {
      const prisma = getPrismaClient();
      const created = await prisma.project.create({
        data: {
          name: data.name,
          description: data.description || null,
          client: data.client || null,
          currency: data.currency || 'USD',
        },
      });

      return {
        success: true,
        data: { id: created.id, name: created.name },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error creating project';
      return { success: false, error: message };
    }
  });
}
