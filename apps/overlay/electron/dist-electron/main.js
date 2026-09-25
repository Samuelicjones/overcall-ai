"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_path_1 = __importDefault(require("node:path"));
let win = null;
function createOverlay() {
    const { width } = electron_1.screen.getPrimaryDisplay().workAreaSize;
    const w = 380;
    win = new electron_1.BrowserWindow({
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
    if (process.env.NODE_ENV === 'development' || !electron_1.app.isPackaged) {
        win.loadURL(devUrl).catch(() => win?.loadFile(node_path_1.default.join(__dirname, '../dist/index.html')));
    }
    else {
        win.loadFile(node_path_1.default.join(__dirname, '../dist/index.html'));
    }
}
electron_1.app.whenReady().then(() => {
    createOverlay();
    // Toggle interact / click-through
    let interactive = false;
    electron_1.globalShortcut.register('CommandOrControl+Shift+O', () => {
        interactive = !interactive;
        win?.setIgnoreMouseEvents(!interactive, { forward: true });
    });
    electron_1.globalShortcut.register('CommandOrControl+Shift+H', () => {
        win?.isVisible() ? win?.hide() : win?.show();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
