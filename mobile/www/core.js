'use strict';
/* NexaFlow Field — core: helpers, local storage, Firestore REST, master-data download, sync.
   Laptop app is NOT modified: data comes from the laptop's existing Cloud backup (clients/{CODE}/backups),
   orders go to the existing clients/{CODE}/orders + dayEnds, other entries go to clients/{CODE}/inbox. */

/* ---------- helpers ---------- */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const N=v=>{const x=parseFloat(String(v==null?'':v).replace(/,/g,''));return isFinite(x)?x:0};
const r2=v=>Math.round(N(v)*100)/100;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>N(v).toLocaleString('en-US',{maximumFractionDigits:2});
const pad=n=>String(n).padStart(2,'0');
const dstr=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const today=()=>dstr(new Date());
const addDays=(ds,n)=>{const d=new Date(ds+'T00:00:00');d.setDate(d.getDate()+n);return dstr(d)};
const fmtDate=ds=>{if(!ds)return'';const [y,m,d]=String(ds).slice(0,10).split('-');return d?d+'-'+m+'-'+y:ds};
const clock=ms=>ms?new Date(ms).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'';
const sum=(a,f)=>a.reduce((s,x)=>s+N(f(x)),0);
const uuid=()=>{try{if(crypto.randomUUID)return crypto.randomUUID()}catch(e){}const a=new Uint8Array(16);crypto.getRandomValues(a);a[6]=a[6]&15|64;a[8]=a[8]&63|128;const h=Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20)};
const money=v=>(M&&M.settings&&M.settings.currency||'Rs.')+' '+fmt(v);
/* "2 ctn + 5 pcs" */
function splitPcs(packing,pcs){const pk=N(packing)||1;const neg=pcs<0;pcs=Math.abs(Math.round(pcs));const c=Math.floor(pcs/pk),l=pcs%pk;return(neg?'-':'')+c+' ctn'+(l?' + '+l+' pcs':'')}

/* ---------- IndexedDB ---------- */
const DB={db:null,
  open(){return new Promise(res=>{try{const r=indexedDB.open('nexaflow_field',1);
    r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('kv',{keyPath:'k'});d.createObjectStore('outbox',{keyPath:'id'});d.createObjectStore('dayends',{keyPath:'key'})};
    r.onsuccess=()=>{this.db=r.result;res(true)};r.onerror=()=>res(false);r.onblocked=()=>res(false)}catch(e){res(false)}})},
  tx(store,mode,fn){return new Promise((res,rej)=>{if(!this.db)return rej(new Error('Storage not available'));try{const t=this.db.transaction(store,mode);const q=fn(t.objectStore(store));t.oncomplete=()=>res(q&&q.result);t.onerror=t.onabort=()=>rej(t.error)}catch(e){rej(e)}})},
  put(s,v){return this.tx(s,'readwrite',o=>o.put(v))},
  del(s,k){return this.tx(s,'readwrite',o=>o.delete(k))},
  all(s){return this.tx(s,'readonly',o=>o.getAll())},
  get(s,k){return this.tx(s,'readonly',o=>o.get(k))},
  async kv(k){const r=await this.get('kv',k).catch(()=>null);return r?r.v:null},
  setkv(k,v){return this.put('kv',{k,v})},
  delkv(k){return this.del('kv',k)}
};

/* ---------- Firestore REST (same project / same anonymous-auth approach as the laptop app) ---------- */
const CFG={apiKey:"AIzaSyChUyMBuVTv6FS_731q4XY7EbOVCZukFDI",projectId:"nexaflow-5f265"};
const FS={code:'',auth:null,tok:null,noAuth:false,
  clean(v){return String(v||'').trim().toUpperCase().replace(/[^A-Z0-9-]/g,'')},
  base(){return'https://firestore.googleapis.com/v1/projects/'+CFG.projectId+'/databases/(default)/documents'},
  root(){return'/clients/'+encodeURIComponent(this.code)},
  async call(url,opt,sig){
    const r=await fetch(url,{...opt,signal:sig});let j=null;try{j=await r.json()}catch(e){}
    if(!r.ok){const er=j&&(j.error||(Array.isArray(j)&&j[0]&&j[0].error));const e=new Error((er&&er.message)||('HTTP '+r.status));e.http=r.status;e.status=er&&er.status;throw e}
    return j},
  async token(sig){
    if(this.noAuth)return null;if(this.tok&&this.tok.exp>Date.now()+60000)return this.tok.id;
    const k=encodeURIComponent(CFG.apiKey);let r;
    if(this.auth&&this.auth.refreshToken){
      try{r=await this.call('https://securetoken.googleapis.com/v1/token?key='+k,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=refresh_token&refresh_token='+encodeURIComponent(this.auth.refreshToken)},sig);
        this.tok={id:r.id_token,exp:Date.now()+N(r.expires_in)*1000};return this.tok.id}catch(e){if(!(e.http>=400&&e.http<500))throw e;this.auth=null}}
    try{r=await this.call('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+k,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})},sig)}
    catch(e){if(e.http>=400&&e.http<500){this.noAuth=true;return null}throw e}
    this.tok={id:r.idToken,exp:Date.now()+N(r.expiresIn)*1000};this.auth={refreshToken:r.refreshToken,uid:r.localId};DB.setkv('fsAuth',this.auth).catch(()=>{});return this.tok.id},
  async req(path,opt,sig){const t=await this.token(sig);const h={'Content-Type':'application/json'};if(t)h.Authorization='Bearer '+t;
    try{return await this.call(this.base()+path,{...opt,headers:h},sig)}catch(e){if(e.http===401&&this.tok){this.tok=null;this.auth=null}throw e}},
  val(v){return typeof v==='number'?(Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v}):typeof v==='boolean'?{booleanValue:v}:{stringValue:String(v==null?'':v)}},
  doc(o){const f={};for(const k in o)f[k]=this.val(o[k]);return JSON.stringify({fields:f})},
  un(d){const o={};for(const k in d.fields||{}){const v=d.fields[k];o[k]=v.stringValue!==undefined?v.stringValue:v.integerValue!==undefined?+v.integerValue:v.doubleValue!==undefined?v.doubleValue:v.booleanValue}return o}
};
/* every network call has a deadline so the UI never hangs */
function withTimeout(ms,fn){
  const ac=new AbortController();const t=setTimeout(()=>ac.abort(),ms);
  return fn(ac.signal).catch(e=>{if(ac.signal.aborted)throw Object.assign(new Error('Server ka jawab nahi aaya (timeout).'),{net:true});if(!e.http)e.net=true;throw e}).finally(()=>clearTimeout(t));
}

/* ---------- master data (from the laptop's latest Cloud backup) ---------- */
let M=null;        // {code, bk:{id,date,createdAtMs}, settings, users, shops, products, suppliers, fetchedAtMs}
async function gunzip(enc,data){
  if(enc==='json')return data;
  if(typeof DecompressionStream==='undefined')throw new Error('Is phone ka WebView purana hai (gzip support nahi).');
  const bin=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
  return await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
}
async function fetchLatestBackup(onStep){
  onStep&&onStep('Latest backup dhoond raha hai…');
  const q=await withTimeout(30000,s=>FS.req(FS.root()+':runQuery',{method:'POST',body:JSON.stringify({structuredQuery:{from:[{collectionId:'backups'}],orderBy:[{field:{fieldPath:'createdAtMs'},direction:'DESCENDING'}],limit:1}})},s));
  const hit=(q||[]).find(x=>x.document);
  if(!hit)throw new Error('Is client code ka koi backup nahi mila. Laptop par "Backup & day end → Day end + backup" ek baar karwayein, aur code check karein.');
  const b=FS.un(hit.document);
  const parts=[];let tok='';
  do{
    onStep&&onStep('Data download ho raha hai… '+parts.length+'/'+N(b.parts));
    const r=await withTimeout(90000,s=>FS.req(FS.root()+'/backups/'+encodeURIComponent(b.id)+'/parts?pageSize=100'+(tok?'&pageToken='+encodeURIComponent(tok):''),{method:'GET'},s));
    (r.documents||[]).forEach(d=>parts.push(FS.un(d)));tok=r.nextPageToken||'';
  }while(tok);
  parts.sort((a,c)=>a.n-c.n);
  if(parts.length!==N(b.parts))throw new Error('Backup ke hisse poore nahi mile ('+parts.length+'/'+N(b.parts)+'). Dobara koshish karein.');
  onStep&&onStep('Data kholi ja rahi hai…');
  const txt=await gunzip(b.enc,parts.map(p=>p.data).join(''));
  return{bk:{id:b.id,date:b.date,createdAtMs:N(b.createdAtMs),company:b.company},db:JSON.parse(txt)};
}
/* Reduce the full laptop DB to just what the phone needs (stock + shop balances are computed exactly like the laptop does) */
function extractMaster(db,bk){
  const S=db.settings||{};const act=(db.invoices||[]).filter(i=>i.status!=='cancelled');
  const stock={};const add=(id,v)=>{stock[id]=(stock[id]||0)+N(v)};
  (db.products||[]).forEach(p=>add(p.id,p.openingPcs));
  (db.purchases||[]).forEach(pu=>(pu.items||[]).forEach(it=>add(it.productId,it.pcs)));
  act.forEach(iv=>(iv.items||[]).forEach(it=>add(it.productId,-N(it.pcs))));
  (db.returns||[]).forEach(r=>{if(r.toStock)add(r.productId,r.pcs)});
  (db.claims||[]).forEach(c=>{if(c.deductStock)add(c.productId,-N(c.pcs))});
  const due={};const dr=(id,v)=>{due[id]=(due[id]||0)+v};
  (db.shops||[]).forEach(s=>{if(N(s.opening))dr(s.id,N(s.opening))});
  act.forEach(i=>{dr(i.shopId,N(i.net));if(i.payType==='cash')dr(i.shopId,-N(i.net))});
  (db.collections||[]).forEach(c=>dr(c.shopId,-N(c.amount)));
  (db.recoveries||[]).filter(r=>r.status==='approved').forEach(r=>{dr(r.shopId,-N(r.amount));dr(r.shopId,-N(r.adjust))});
  (db.returns||[]).forEach(r=>{if(r.settle==='credit')dr(r.shopId,-N(r.amount))});
  const sup=new Set();(db.purchases||[]).forEach(p=>p.supplier&&sup.add(p.supplier));(db.claims||[]).forEach(c=>c.supplier&&sup.add(c.supplier));(db.supplierPayments||[]).forEach(p=>p.supplier&&sup.add(p.supplier));
  return{
    bk,fetchedAtMs:Date.now(),
    settings:{company:S.companyName||bk.company||'NexaFlow',currency:S.currency||'Rs.',ownOnly:S.bookerOwnShopsOnly!==false,allowNeg:S.allowNegativeStock!==false,creditBlock:!!S.creditLimitBlock,taxPercent:N(S.taxPercent)},
    users:(db.users||[]).filter(u=>(u.role==='booker'||u.role==='storemanager')&&u.active!==false&&u.pass).map(u=>({id:u.id,username:u.username,name:u.name||u.username,role:u.role,pass:u.pass})),
    shops:(db.shops||[]).map(s=>({id:s.id,name:s.name,owner:s.owner||'',phone:s.phone||'',route:s.route||'',address:s.address||'',bookerId:s.bookerId||'',creditLimit:N(s.creditLimit),due:r2(due[s.id]||0)})),
    products:(db.products||[]).filter(p=>p.active!==false).map(p=>({id:p.id,name:p.name,sku:p.sku||'',brand:p.brand||'',packing:N(p.packing)||1,tradePc:N(p.tradePc),retailPc:N(p.retailPc),costCtn:N(p.costCtn),stock:Math.round(stock[p.id]||0)})),
    suppliers:[...sup].sort()
  };
}
async function refreshMaster(onStep){
  const {bk,db}=await fetchLatestBackup(onStep);
  const m=extractMaster(db,bk);
  if(!m.users.length)throw new Error('Backup mein koi Booker / Store Manager user nahi mila. Laptop par pehle un ke users banayein.');
  m.code=FS.code;M=m;await DB.setkv('master',m);return m;
}

/* ---------- derived numbers (backup snapshot + this phone's own entries made after that backup) ---------- */
let OUT=[];     // outbox entries (orders, recoveries, store entries)
let DAYS=[];    // booker day-end locks
const afterBk=e=>e.createdAtMs>(M&&M.bk?M.bk.createdAtMs:0);
function stockOf(pid){
  const p=M.products.find(x=>x.id===pid);let s=p?p.stock:0;
  for(const e of OUT){if(!afterBk(e))continue;const d=e.payload;
    if(e.kind==='order')d.items.forEach(it=>{if(it.productId===pid)s-=N(it.pcs)});
    else if(e.kind==='purchase')d.items.forEach(it=>{if(it.productId===pid)s+=N(it.pcs)});
    else if(e.kind==='return'){if(d.productId===pid&&d.toStock)s+=N(d.pcs)}
    else if(e.kind==='claim'){if(d.productId===pid&&d.deductStock)s-=N(d.pcs)}
    else if(e.kind==='count')d.lines.forEach(l=>{if(l.productId===pid)s+=N(l.diff)});
  }
  return s;
}
function shopDue(sid){
  const sh=M.shops.find(x=>x.id===sid);let d=sh?sh.due:0;
  for(const e of OUT){if(!afterBk(e))continue;
    if(e.kind==='order'&&e.payload.shopId===sid&&e.payload.payType==='credit')d+=N(e.payload.net);
    else if(e.kind==='recovery'&&e.payload.shopId===sid)d-=N(e.payload.amount)+N(e.payload.adjust);
    else if(e.kind==='return'&&e.payload.shopId===sid&&e.payload.settle==='credit')d-=N(e.payload.amount);
  }
  return r2(d);
}
const dayLocked=(bookerId,date)=>DAYS.some(d=>d.key===bookerId+'_'+date);

/* ---------- outbox + sync ---------- */
async function loadLocal(){
  OUT=(await DB.all('outbox').catch(()=>[])).sort((a,b)=>a.createdAtMs-b.createdAtMs);
  DAYS=await DB.all('dayends').catch(()=>[]);
}
async function addEntry(e){
  e.createdAtMs=Date.now();e.status='pending';OUT.push(e);
  try{await DB.put('outbox',e)}catch(err){OUT.pop();throw new Error('Phone ki storage mein save nahi hua: '+err.message)}
  return e;
}
const pendingN=()=>OUT.filter(e=>e.status==='pending').length;

async function uploadEntry(e,sig){
  if(e.kind==='order'){
    const p=e.payload;
    await FS.req(FS.root()+'/orders/'+encodeURIComponent(e.id),{method:'PATCH',body:FS.doc({uuid:e.id,bookerId:p.bookerId,bookerName:p.bookerName,date:p.date,no:p.no,shopId:p.shopId||'',shopName:p.shopName,route:p.route||'',payType:p.payType,net:N(p.net),itemCount:p.items.length,status:'synced',createdAtMs:e.createdAtMs,updatedAtMs:e.createdAtMs,syncedAtMs:Date.now(),payload:JSON.stringify(p),src:'mobile'})},sig);
    return;
  }
  /* other entries: create-only so a retry can never duplicate or overwrite */
  try{
    await FS.req(FS.root()+'/inbox/'+encodeURIComponent(e.id)+'?currentDocument.exists=false',{method:'PATCH',body:FS.doc({id:e.id,kind:e.kind,byId:e.byId,byName:e.byName,role:e.role,date:e.date,createdAtMs:e.createdAtMs,summary:e.summary||'',amount:N(e.amount),payload:JSON.stringify(e.payload),src:'mobile'})},sig);
  }catch(err){if(err.http===409)return;throw err}
}
async function putDayEnd(d,sig){
  try{await FS.req(FS.root()+'/dayEnds/'+encodeURIComponent(d.key)+'?currentDocument.exists=false',{method:'PATCH',body:FS.doc({bookerId:d.bookerId,bookerName:d.bookerName,date:d.date,closedAtMs:d.closedAtMs,orderCount:d.orderCount,total:d.total})},sig)}
  catch(e){if(e.http===409)return;throw e}
}
async function remoteDayEnds(bookerId,sig){
  const r=await FS.req(FS.root()+':runQuery',{method:'POST',body:JSON.stringify({structuredQuery:{from:[{collectionId:'dayEnds'}],where:{fieldFilter:{field:{fieldPath:'bookerId'},op:'EQUAL',value:{stringValue:bookerId}}}}})},sig);
  return(r||[]).filter(x=>x.document).map(x=>FS.un(x.document)).map(o=>({key:o.bookerId+'_'+o.date,bookerId:o.bookerId,bookerName:o.bookerName,date:o.date,closedAtMs:o.closedAtMs,orderCount:o.orderCount,total:o.total,synced:true,fromServer:true}));
}
let SYNCING=false,LAST_SYNC=null;
async function syncAll(user){
  if(SYNCING)return null;SYNCING=true;
  const res={ok:0,fail:0,errors:[],net:false,dayEnds:0};
  try{
    const list=OUT.filter(e=>e.status==='pending');let i=0,stop=false;
    const worker=async()=>{while(!stop&&i<list.length){const e=list[i++];
      try{await withTimeout(20000,s=>uploadEntry(e,s));e.status='synced';e.syncedAtMs=Date.now();await DB.put('outbox',e);res.ok++}
      catch(err){res.fail++;if(err.net){stop=true;res.net=true}else res.errors.push(err.http===403?'Server ne mana kiya (403). Owner ko updated firestore.rules Publish karne hain.':err.message)}}};
    await Promise.all([worker(),worker(),worker()]);
    res.fail+=list.length-i;
    if(user&&user.role==='booker'&&!res.net){
      for(const d of DAYS.filter(x=>x.bookerId===user.id&&!x.synced)){
        try{await withTimeout(20000,s=>putDayEnd(d,s));d.synced=true;await DB.put('dayends',d);res.dayEnds++}
        catch(err){if(err.net){res.net=true;break}res.errors.push(err.message)}}
      if(!res.net){try{
        const rem=await withTimeout(20000,s=>remoteDayEnds(user.id,s));
        for(const d of rem)if(!DAYS.some(x=>x.key===d.key)){DAYS.push(d);await DB.put('dayends',d)}
      }catch(err){if(err.net)res.net=true}}
    }
  }finally{SYNCING=false;res.at=Date.now();LAST_SYNC=res}
  return res;
}
