const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

function readConfig() {
  const candidates = [
    path.join(process.resourcesPath || '', 'firebase-config.json'),
    path.join(__dirname, 'firebase-config.json'),
  ];
  for (const p of candidates) {
    try {
      const c = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (c && c.projectId && c.apiKey) return c;
    } catch (e) { /* agli try */ }
  }
  return null;
}

contextBridge.exposeInMainWorld('nexaDesktop', {
  isDesktop: true,
  hostname: os.hostname(),
  firebaseConfig: readConfig(),
  reload: () => ipcRenderer.send('nexa-reload'),
  setTitleBar: (color, symbolColor) => ipcRenderer.send('nexa-titlebar', String(color), String(symbolColor)),
});
// Header hi title bar ban jata hai: page ko pata chale ke yeh desktop app hai
window.addEventListener('DOMContentLoaded', () => document.documentElement.classList.add('desk'));
