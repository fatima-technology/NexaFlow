// Copies the laptop app (index.html) into the APK as www/app.html and downloads the Excel/PDF libraries
// so they work offline. Run before `cap sync`. Use --skip-libs to skip the download (tests).
const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.join(__dirname, '..', '..');
const www = path.join(__dirname, '..', 'www');
const LIBS = {
  'xlsx.full.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'jspdf.umd.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'jspdf.plugin.autotable.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js',
};

function get(url, hops = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && hops < 5) return resolve(get(res.headers.location, hops + 1));
      if (res.statusCode !== 200) return reject(new Error(url + ' -> HTTP ' + res.statusCode));
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

(async () => {
  fs.mkdirSync(www, { recursive: true });
  fs.copyFileSync(path.join(root, 'index.html'), path.join(www, 'app.html'));
  fs.rmSync(path.join(www, 'icons'), { recursive: true, force: true });
  fs.cpSync(path.join(root, 'icons'), path.join(www, 'icons'), { recursive: true });
  console.log('app.html copied (' + fs.statSync(path.join(www, 'app.html')).size + ' bytes)');
  if (process.argv.includes('--skip-libs')) return console.log('libs skipped');
  const dir = path.join(www, 'libs');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, url] of Object.entries(LIBS)) {
    const buf = await get(url);
    if (buf.length < 20000) throw new Error(name + ' is too small (' + buf.length + ' bytes)');
    fs.writeFileSync(path.join(dir, name), buf);
    console.log(name + ' ' + buf.length + ' bytes');
  }
  fs.writeFileSync(path.join(dir, 'ready.json'), JSON.stringify({ at: new Date().toISOString() }));
})().catch((e) => { console.error('prepare-www failed: ' + e.message); process.exit(1); });
