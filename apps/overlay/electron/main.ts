import { app, BrowserWindow, globalShortcut, screen } from 'electron';
import path from 'node:path';

let win: BrowserWindow | null = null;

function createOverlay() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  const w = 380;
  win = new BrowserWindow({
    width: w,
    height: 720,
    x: width - w - 24,
    y: 80,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  // Click-through by default; hold Alt to interact. Toggle with Ctrl+Shift+O.
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true, { forward: true });

  const devUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    win.loadURL(devUrl).catch(() => win?.loadFile(path.join(__dirname, '../dist/index.html')));
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createOverlay();
  // Toggle interact / click-through
  let interactive = false;
  globalShortcut.register('CommandOrControl+Shift+O', () => {
    interactive = !interactive;
    win?.setIgnoreMouseEvents(!interactive, { forward: true });
  });
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    win?.isVisible() ? win?.hide() : win?.show();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
