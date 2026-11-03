const { app, BrowserWindow, Menu, session, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Ek hi window: dobara icon dabane par wohi khule
if (!app.requestSingleInstanceLock()) { app.quit(); }

// App hamesha live site se khulti hai: PR merge hote hi nayi version khud aa jati hai (offline cache sw.js se).
const APP_URL = 'https://fatima-technology.github.io/NexaFlow/';

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1366, height: 820, minWidth: 1000, minHeight: 640,
    title: 'NexaFlow', autoHideMenuBar: true,
    // Header hi title bar: Windows ke minimize/maximize/close buttons upar overlay hote hain, Refresh button unke saath
    titleBarStyle: 'hidden', titleBarOverlay: { color: '#ffffff', symbolColor: '#222222', height: 56 },
    icon: path.join(__dirname, 'app', 'icons', 'icon-512.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false },
  });
  Menu.setApplicationMenu(null);
  // Menu band hai, isliye F5 / Ctrl+R se refresh khud handle karte hain
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F5' || ((input.control || input.meta) && input.key.toLowerCase() === 'r')) { e.preventDefault(); win.webContents.reload(); }
  });
  win.maximize();
  win.loadURL(APP_URL);
  // Pehli baar net na ho (cache abhi bana nahi) to saaf paigham, data alag jagah nahi banta
  win.webContents.on('did-fail-load', (e, code, desc, url, isMainFrame) => {
    if (isMainFrame && code !== -3) win.loadFile(path.join(__dirname, 'offline.html'), { query: { u: APP_URL } });
  });
  // Bahar ke links (http/https) default browser mein khulen
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
}

// Day End backup (.json) bina poochhe Documents\NexaFlow Backups mein save ho
function setupBackupFolder() {
  const dir = path.join(app.getPath('documents'), 'NexaFlow Backups');
  session.defaultSession.on('will-download', (event, item) => {
    const name = item.getFilename();
    if (!/\.json$/i.test(name)) return; // baqi downloads (Excel/PDF) normal dialog se
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { return; }
    item.setSavePath(path.join(dir, name));
  });
}

ipcMain.on('nexa-reload', () => { if (win) win.webContents.reload(); });
ipcMain.on('nexa-titlebar', (e, color, symbolColor) => {
  try { if (win && win.setTitleBarOverlay && /^#[0-9a-f]{6}$/i.test(color) && /^#[0-9a-f]{6}$/i.test(symbolColor)) win.setTitleBarOverlay({ color, symbolColor, height: 56 }); } catch (err) { /* purani Electron mein nahi */ }
});

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => { setupBackupFolder(); createWindow(); });
app.on('window-all-closed', () => app.quit());
