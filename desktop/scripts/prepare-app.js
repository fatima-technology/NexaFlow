// Sirf icons copy karta hai (app khud live site se khulti hai) aur firebase-config.json tayyar karta hai.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const dest = path.join(__dirname, '..', 'app');
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(path.join(root, 'icons'), path.join(dest, 'icons'), { recursive: true });

// Firebase config: pehle FIREBASE_CONFIG (GitHub secret), warna desktop/firebase-config.json, warna khali {}
const out = path.join(__dirname, '..', 'firebase-config.json');
let cfg = process.env.FIREBASE_CONFIG && process.env.FIREBASE_CONFIG.trim();
if (cfg) {
  const a = cfg.indexOf('{'), b = cfg.lastIndexOf('}');
  cfg = cfg.slice(a, b + 1);
  try { JSON.parse(cfg); } catch (e) { console.error('FIREBASE_CONFIG valid JSON nahi hai (keys ko "double quotes" mein likhein).'); process.exit(1); }
  fs.writeFileSync(out, cfg);
  console.log('Firebase config secret se liya gaya.');
} else if (!fs.existsSync(out)) {
  fs.writeFileSync(out, '{}');
  console.log('Firebase config nahi mila: app bina cloud ke banegi (baad mein Developer panel se bhi dal sakte hain).');
}
