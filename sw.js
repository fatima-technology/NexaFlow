/* NexaFlow offline shell: internet na ho tab bhi app khule (orders phone mein pending rehte hain) */
const CACHE='nexaflow-shell-v2';
const LIBS=/^https:\/\/(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./index.html','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
/* page: pehle net (4 sec), na mile ya slow ho to cache se; online hone par hamesha nayi version milti hai */
async function page(req){
  const c=await caches.open(CACHE);
  try{
    const res=await Promise.race([fetch(req),new Promise((_,no)=>setTimeout(()=>no(new Error('slow')),4000))]);
    if(res&&res.ok)c.put('./index.html',res.clone());
    return res;
  }catch(e){return (await c.match('./index.html'))||Response.error()}
}
/* CDN libraries (Excel/PDF, fonts): cache mein rakhi jati hain */
async function lib(req){
  const c=await caches.open(CACHE);const hit=await c.match(req);if(hit)return hit;
  const res=await fetch(req);if(res&&(res.ok||res.type==='opaque'))c.put(req,res.clone());return res;
}
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(r.mode==='navigate'&&u.origin===location.origin)e.respondWith(page(r));
  else if(LIBS.test(r.url))e.respondWith(lib(r));
});
