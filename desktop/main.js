const { app, BrowserWindow, Menu, session, shell, ipcMain, protocol, net } = require('electron');
const { pathToFileURL } = require('url');
const path = require('path');
const fs = require('fs');

// Ek hi window: dobara icon dabane par wohi khule
if (!app.requestSingleInstanceLock()) { app.quit(); }

// Web app exe ke andar band hai (offline bhi chalti hai). Nayi version "Update" button se aati hai (master jise chahe usi ko bhejta hai).
// app:// custom address: iska local data alag, stable jagah par rehta hai aur update ke baad bhi safe rehta hai.
const APP_URL = 'app://nexaflow/index.html';
const APP_DIR = path.join(__dirname, 'app');
const RELEASE_REPO = 'fatima-technology/NexaFlow';
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);

function registerAppProtocol() {
  protocol.handle('app', (request) => {
    let rel = decodeURIComponent(new URL(request.url).pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    const file = path.normalize(path.join(APP_DIR, rel));
    if (!file.startsWith(APP_DIR + path.sep) && file !== APP_DIR) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
}

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

// ---- Update: master jis version ka kahe wohi GitHub Release se download karke install ----
let updating = false;
function sendUpd(msg) { if (win && !win.isDestroyed()) win.webContents.send('nexa-update-status', msg); }
ipcMain.on('nexa-update', (e, version) => {
  if (updating) return;
  if (!/^\d+\.\d+\.\d+$/.test(String(version))) return sendUpd({ type: 'error', message: 'Version galat hai.' });
  if (!app.isPackaged) return sendUpd({ type: 'error', message: 'Update sirf install ki hui app mein chalta hai.' });
  let autoUpdater;
  try { ({ autoUpdater } = require('electron-updater')); } catch (err) { return sendUpd({ type: 'error', message: 'Updater nahi mila: ' + err.message }); }
  updating = true;
  autoUpdater.autoDownload = false; autoUpdater.autoInstallOnAppQuit = false; autoUpdater.allowDowngrade = true;
  autoUpdater.removeAllListeners();
  autoUpdater.setFeedURL({ provider: 'generic', url: 'https://github.com/' + RELEASE_REPO + '/releases/download/v' + version });
  autoUpdater.on('update-available', () => { sendUpd({ type: 'progress', percent: 0 }); autoUpdater.downloadUpdate().catch(() => {}); });
  autoUpdater.on('update-not-available', () => { updating = false; sendUpd({ type: 'none' }); });
  autoUpdater.on('download-progress', (p) => sendUpd({ type: 'progress', percent: Math.round(p.percent || 0) }));
  autoUpdater.on('update-downloaded', () => { sendUpd({ type: 'downloaded' }); setTimeout(() => autoUpdater.quitAndInstall(true, true), 1500); });
  autoUpdater.on('error', (err) => { updating = false; sendUpd({ type: 'error', message: String((err && err.message) || err).slice(0, 200) }); });
  autoUpdater.checkForUpdates().catch((err) => { updating = false; sendUpd({ type: 'error', message: String((err && err.message) || err).slice(0, 200) }); });
});

ipcMain.on('nexa-reload', () => { if (win) win.webContents.reload(); });
ipcMain.on('nexa-titlebar', (e, color, symbolColor) => {
  try { if (win && win.setTitleBarOverlay && /^#[0-9a-f]{6}$/i.test(color) && /^#[0-9a-f]{6}$/i.test(symbolColor)) win.setTitleBarOverlay({ color, symbolColor, height: 56 }); } catch (err) { /* purani Electron mein nahi */ }
});

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => { registerAppProtocol(); setupBackupFolder(); createWindow(); });
app.on('window-all-closed', () => app.quit());
