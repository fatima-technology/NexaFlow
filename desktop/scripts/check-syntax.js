// Release se pehle: index.html ke inline scripts aur mobile app ki JS files compile ho rahi hain ya nahi (chalaye nahi jate).
// Koi syntax error ho to release ruk jati hai, taake kharab version clients tak na pahunche.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..', '..');
let bad = 0;
function check(name, code) {
  try { new vm.Script(code, { filename: name }); } catch (e) { bad++; console.error('SYNTAX ERROR in ' + name + ': ' + e.message); }
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let n = 0;
html.replace(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, (m, code) => { n++; if (code.trim()) check('index.html script #' + n, code); return m; });
for (const dirName of ['mobile', 'mobile-full']) {
  const mob = path.join(root, dirName, 'www');
  if (fs.existsSync(mob)) for (const f of fs.readdirSync(mob)) if (f.endsWith('.js')) check(dirName + '/www/' + f, fs.readFileSync(path.join(mob, f), 'utf8'));
}
if (bad) process.exit(1);
console.log('Syntax check OK (' + n + ' inline scripts + mobile files).');
