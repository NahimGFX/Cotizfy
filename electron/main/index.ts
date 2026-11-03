import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipc';
import { initDatabase } from './db';

let mainWindow: BrowserWindow | null = null;

// Determine environment explicitly
const isDevServer = Boolean(
  process.env.VITE_DEV_SERVER_URL ||
  (process.env.NODE_ENV === 'development' && !app.isPackaged)
);

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: 'Cotizfy',
    frame: true,
    show: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  // Initialize and migrate SQLite before exposing query handlers or loading the renderer.
  const dbStatus = await initDatabase();
  console.log('[Cotizfy Main] Database initialization:', dbStatus.message);
  if (!dbStatus.success) {
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Cotizfy',
      message: 'Could not initialize the local database.',
      detail: dbStatus.message,
    });
    mainWindow.destroy();
    app.quit();
    return;
  }

  registerIpcHandlers(mainWindow);

  if (isDevServer) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    console.log(`[Cotizfy Main] Loading development server: ${devUrl}`);
    await mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Robust path resolution using app.getAppPath() for both packaged and local production previews
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
    console.log(`[Cotizfy Main] Loading production bundle: ${indexPath}`);
    await mainWindow.loadFile(indexPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
