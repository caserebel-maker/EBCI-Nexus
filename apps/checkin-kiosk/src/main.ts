import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

let mainWindow: BrowserWindow | null = null;

const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:5173';

function defaultPublicPath(fileName: string) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar', 'public', fileName);
  }

  return path.join(__dirname, '..', 'public', fileName);
}

async function ensureUserFile(fileName: string) {
  const userFilePath = path.join(app.getPath('userData'), fileName);

  try {
    await fs.access(userFilePath);
  } catch {
    await fs.mkdir(app.getPath('userData'), { recursive: true });
    await fs.copyFile(defaultPublicPath(fileName), userFilePath);
  }

  return userFilePath;
}

async function readJsonFile(fileName: string) {
  const userFilePath = await ensureUserFile(fileName);
  const rawJson = (await fs.readFile(userFilePath, 'utf8')).replace(/^\uFEFF/, '');
  return JSON.parse(rawJson);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 1920,
    fullscreen: true,
    kiosk: true,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#140408',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    mainWindow.loadURL(devServerUrl);
  }
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('toggle-fullscreen', () => {
  if (!mainWindow) return;

  const isFullscreen = mainWindow.isFullScreen() || mainWindow.isKiosk();
  if (isFullscreen) {
    mainWindow.setKiosk(false);
    mainWindow.setFullScreen(false);
  } else {
    mainWindow.setFullScreen(true);
    mainWindow.setKiosk(true);
  }
});

ipcMain.handle('quit-app', () => {
  app.quit();
});

ipcMain.handle('get-config', async () => readJsonFile('config.json'));

ipcMain.handle('get-employees', async () => readJsonFile('employees.json'));
