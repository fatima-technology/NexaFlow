/* =====================================================================
   FATIMA-TECH DISTRIBUTION ERP  —  Core engine
   Sab data browser (localStorage) mein, optional Firebase cloud sync.
   ===================================================================== */
'use strict';
const LS_KEY='fatimatech_erp_v1';
let CACHE={};function clearCache(){CACHE={}}
const SESSION_KEY='fatimatech_erp_session';

/* ---------- small helpers ---------- */
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=v=>{const x=parseFloat(String(v??'').replace(/,/g,''));return isFinite(x)?x:0};
const r2=v=>Math.round(N(v)*100)/100;
const fmt=v=>{const x=r2(v);return x.toLocaleString('en-US',{maximumFractionDigits:2})};
const money=v=>(S().currency||'Rs.')+' '+fmt(v);
const pad=n=>String(n).padStart(2,'0');
const dstr=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const today=()=>dstr(new Date());
const addDays=(ds,n)=>{const d=new Date(ds+'T00:00:00');d.setDate(d.getDate()+n);return dstr(d)};
const monthOf=ds=>String(ds||'').slice(0,7);
const thisMonth=()=>today().slice(0,7);
const fmtDate=ds=>{if(!ds)return'';const f=S().dateFormat||'DD-MM-YYYY';const [y,m,d]=String(ds).slice(0,10).split('-');if(!d)return ds;return f==='YYYY-MM-DD'?`${y}-${m}-${d}`:f==='MM/DD/YYYY'?`${m}/${d}/${y}`:`${d}-${m}-${y}`};
const nowStamp=()=>{const d=new Date();return dstr(d)+' '+pad(d.getHours())+':'+pad(d.getMinutes())};
const inRange=(ds,from,to)=>(!from||ds>=from)&&(!to||ds<=to);
const sum=(arr,fn)=>arr.reduce((a,x)=>a+N(fn(x)),0);
const byId=(list,id)=>(DB[list]||[]).find(x=>x.id===id);

/* compact synchronous SHA-256 (password hashing) */
function sha256(s){s=unescape(encodeURIComponent(s));const K=[],H=[];let p=0;const isC={};for(let c=2;p<64;c++){if(!isC[c]){for(let i=0;i<313;i+=c)isC[i]=c;H[p]=(Math.pow(c,.5)*4294967296)|0;K[p++]=(Math.pow(c,1/3)*4294967296)|0}}
 const rr=(v,a)=>(v>>>a)|(v<<(32-a));const L=s.length*8;s+='\x80';while(s.length%64-56)s+='\x00';const W=[];for(let i=0;i<s.length;i++)W[i>>2]|=s.charCodeAt(i)<<((3-i)%4)*8;W[W.length]=(L/4294967296)|0;W[W.length]=L;
 let h=H.slice(0,8);for(let j=0;j<W.length;){const w=W.slice(j,j+=16);const o=h;h=h.slice(0,8);for(let i=0;i<64;i++){const w15=w[i-15],w2=w[i-2],a=h[0],e=h[4];
 const t1=h[7]+(rr(e,6)^rr(e,11)^rr(e,25))+((e&h[5])^(~e&h[6]))+K[i]+(w[i]=i<16?w[i]:(w[i-16]+(rr(w15,7)^rr(w15,18)^(w15>>>3))+w[i-7]+(rr(w2,17)^rr(w2,19)^(w2>>>10)))|0);
 const t2=(rr(a,2)^rr(a,13)^rr(a,22))+((a&h[1])^(a&h[2])^(h[1]&h[2]));h=[(t1+t2)|0].concat(h);h[4]=(h[4]+t1)|0}for(let i=0;i<8;i++)h[i]=(h[i]+o[i])|0}
 let r='';for(let i=0;i<8;i++)for(let j=3;j+1;j--){const b=(h[i]>>(j*8))&255;r+=(b<16?'0':'')+b.toString(16)}return r}
const hashPass=(user,pass)=>sha256('ft-erp|'+String(user).toLowerCase().trim()+'|'+pass);

/* ---------- default settings (developer changes all of these from panel) ---------- */
const PRINT_TYPES={
  invoice:{label:'Sales invoice',title:'SALES INVOICE',paper:'A4dual'},
  purchase:{label:'Purchase invoice',title:'PURCHASE INVOICE',paper:'A4'},
  picklist:{label:'Picklist / load sheet',title:'PICKLIST & LOAD SHEET',paper:'A4'},
  ledger:{label:'Shop ledger',title:'SHOP LEDGER',paper:'A4'},
  recovery:{label:'Recovery receipt',title:'RECOVERY RECEIPT',paper:'A5'},
  returnSlip:{label:'Return / credit note',title:'RETURN NOTE',paper:'A5'},
  claim:{label:'Company claim',title:'DAMAGE / EXPIRY CLAIM',paper:'A4'},
  salary:{label:'Salary slip',title:'SALARY SLIP',paper:'A5'},
  report:{label:'All reports',title:'',paper:'A4'},
  dailySummary:{label:'Daily summary',title:'DAILY BUSINESS SUMMARY',paper:'A4'},
  investor:{label:'Investor statement',title:'INVESTOR STATEMENT',paper:'A4'}
};
function defaultPrint(){const o={};for(const k in PRINT_TYPES){o[k]={title:PRINT_TYPES[k].title,paper:PRINT_TYPES[k].paper,orientation:'portrait',showLogo:true,showPrincipal:true,letterhead:'none',showCompany:true,orientation:k==='invoice'?'landscape':'portrait',fontSize:k==='invoice'?11:12,mTop:10,mRight:10,mBottom:10,mLeft:10,lhTop:38,lhBottom:22,copyLabels:k==='invoice'?'Customer copy, Office copy':'',footer:'',signatures:k==='invoice'?'Booker, Supply Man, Customer':k==='salary'?'Accountant, Employee':'Prepared by, Approved by',copies:1}}return o}
const MODULES=[
  {id:'dashboard',label:'Dashboard',icon:'📊',group:'Main'},
  {id:'pos',label:'Order booking / POS',icon:'🛒',group:'Sales'},
  {id:'invoices',label:'Sales invoices',icon:'📄',group:'Sales'},
  {id:'delivery',label:'Delivery dates',icon:'📅',group:'Sales'},
  {id:'picklist',label:'Picklist / load sheet',icon:'🚚',group:'Sales'},
  {id:'returns',label:'Returns',icon:'🔄',group:'Sales'},
  {id:'claims',label:'Company claims',icon:'⚠️',group:'Sales'},
  {id:'purchase',label:'Purchase entry',icon:'📥',group:'Purchase & stock'},
  {id:'purchases',label:'Purchase invoices',icon:'📑',group:'Purchase & stock'},
  {id:'suppliers',label:'Supplier dues',icon:'📒',group:'Purchase & stock'},
  {id:'products',label:'Products & stock',icon:'📦',group:'Purchase & stock'},
  {id:'collection',label:'Supply man collection',icon:'💵',group:'Recovery'},
  {id:'recovery',label:'Market recovery',icon:'💰',group:'Recovery'},
  {id:'shops',label:'Shops & routes',icon:'🏪',group:'Customers'},
  {id:'expenses',label:'Expenses',icon:'💸',group:'Accounts'},
  {id:'accounts',label:'Payment accounts',icon:'🏦',group:'Accounts'},
  {id:'investors',label:'Owner & investors',icon:'👥',group:'Accounts'},
  {id:'staff',label:'Staff advance',icon:'🧾',group:'Staff'},
  {id:'salary',label:'Salary & attendance',icon:'💼',group:'Staff'},
  {id:'reports',label:'Reports',icon:'📈',group:'Reports'},
  {id:'users',label:'Users & access',icon:'⚙️',group:'System'},
  {id:'backup',label:'Backup & day end',icon:'💾',group:'System'},
  {id:'help',label:'User manual',icon:'📘',group:'System'},
  {id:'devpanel',label:'Developer control',icon:'🛠️',group:'Developer',devOnly:true}
];
const ROLES={admin:'Admin',booker:'Order booker',kpo:'KPO / data entry',supplyman:'Supply man',staff:'Staff (no login)'};
const ROLE_DEFAULTS={
  admin:MODULES.filter(m=>!m.devOnly).map(m=>m.id),
  booker:['dashboard','pos','invoices','recovery','shops','help'],
  kpo:['dashboard','pos','invoices','delivery','picklist','returns','collection','recovery','shops','expenses','help'],
  supplyman:['dashboard','collection','help'],
  staff:[]
};
function defaultSettings(){return{
  appName:'Distribution ERP',companyName:'Your Distribution Company',tagline:'FMCG Sales & Distribution',
  phone:'',address:'',email:'',ntn:'',principalName:'',
  logo:'',principalLogo:'',letterhead:'',loginBg:'',
  accent:'#3949ab',sideColor:'#1a1d3a',currency:'Rs.',dateFormat:'DD-MM-YYYY',
  loginTitle:'Distribution Management System',loginSub:'Sign in with your username and password',
  devCredit:'Developed by Fatima-Tech',
  taxPercent:0,invoicePrefix:'INV-',purchasePrefix:'PUR-',claimPrefix:'CLM-',
  maxDeliveryExtend:7,allowNegativeStock:true,defaultCreditLimit:0,
  bookerOwnShopsOnly:true,recoveryNeedsApproval:true,creditLimitBlock:false,
  expenseHeads:'Fuel, Vehicle repair, Rent, Electricity, Tea / food, Labour, Misc',
  productCategories:'General',
  theme:'corporate',mode:'auto',
  modules:Object.fromEntries(MODULES.map(m=>[m.id,true])),
  print:defaultPrint(),
  firebase:{enabled:false,config:'',path:''}
}}
function freshDB(){return{
  meta:{app:'fatimatech-erp',version:1,created:nowStamp(),updated:Date.now()},
  settings:defaultSettings(),
  users:[
    {id:'u_dev',username:'developer',name:'Fatima-Tech Developer',role:'developer',pass:hashPass('developer','fatima@123'),active:true,mustChange:true},
    {id:'u_admin',username:'admin',name:'Admin',role:'admin',pass:hashPass('admin','admin123'),active:true,mustChange:true,perms:ROLE_DEFAULTS.admin.slice()}
  ],
  products:[],shops:[],invoices:[],purchases:[],supplierPayments:[],recoveries:[],collections:[],returns:[],claims:[],
  expenses:[],accounts:[{id:'acc_cash',name:'Cash in hand',type:'cash',opening:0,openingDate:today()}],transfers:[],
  staffAdv:[],salarySetup:{},attendance:{},salaries:[],investors:[],investorTxns:[],activity:[],dayEnds:[],picklists:[],counters:{inv:0,pur:0,clm:0,pick:0},
  licence:{limit:200,unlimited:false,devName:'Fatima-Tech',phone:'',whatsapp:'',email:'',message:'Your free limit of invoices is complete. Please purchase the full version to continue.'}
}}

/* ---------- storage ---------- */
let DB=null;
function deepMerge(base,over){if(Array.isArray(base))return Array.isArray(over)?over:base;if(base&&typeof base==='object'){const o={...base};if(over&&typeof over==='object')for(const k in over)o[k]=k in base?deepMerge(base[k],over[k]):over[k];return o}return over===undefined?base:over}
function normalize(d){
  clearCache();
  const f=freshDB();const out=deepMerge(f,d||{});
  out.settings=deepMerge(defaultSettings(),(d&&d.settings)||{});
  out.settings.print=deepMerge(defaultPrint(),((d&&d.settings)||{}).print||{});
  if(!out.users.some(u=>u.role==='developer'))out.users.unshift(f.users[0]);
  if(!out.accounts.length)out.accounts=f.accounts;
  if(String(out.settings.accent).toLowerCase()==='#0e7c6b'&&String(out.settings.sideColor).toLowerCase()==='#16323a'){out.settings.accent='#3949ab';out.settings.sideColor='#1a1d3a'}
  out.meta.invMade=Math.max(N(out.meta.invMade),out.invoices.length);
  return out;
}
/* IndexedDB: browser ki bari storage (localStorage ki 5 MB had nahi) */
const IDB={db:null,
  open(){return new Promise(res=>{try{if(!window.indexedDB)return res(null);const r=indexedDB.open('fatimatech_erp',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>{this.db=r.result;res(r.result)};r.onerror=()=>res(null);r.onblocked=()=>res(null)}catch(e){res(null)}})},
  get(k){return new Promise(res=>{if(!this.db)return res(null);try{const q=this.db.transaction('kv','readonly').objectStore('kv').get(k);q.onsuccess=()=>res(q.result??null);q.onerror=()=>res(null)}catch(e){res(null)}})},
  set(k,v){return new Promise((res,rej)=>{if(!this.db)return rej(new Error('IndexedDB not found'));try{const tx=this.db.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)}catch(e){rej(e)}})}
};
let PENDING=Promise.resolve();
const BC=('BroadcastChannel' in window)?new BroadcastChannel('fatimatech_erp'):null;
async function loadDB(){
  await IDB.open();let raw=await IDB.get(LS_KEY);let migrate=false;
  if(!raw){raw=localStorage.getItem(LS_KEY);migrate=!!raw&&!!IDB.db}
  try{DB=normalize(raw?JSON.parse(raw):null)}catch(e){console.error(e);DB=freshDB()}
  if(migrate)persist();
  try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
}
function persist(){
  const txt=JSON.stringify(DB);
  const lsWrite=()=>{try{localStorage.setItem(LS_KEY,txt)}catch(e){toast('Data was not saved: storage is full. Download a backup immediately.',true);console.error(e)}};
  PENDING=IDB.db?IDB.set(LS_KEY,txt).then(()=>{try{localStorage.removeItem(LS_KEY)}catch(e){}}).catch(e=>{console.error(e);lsWrite()}):Promise.resolve(lsWrite());
  PENDING.then(()=>{try{BC&&BC.postMessage({updated:DB.meta.updated})}catch(e){}});
  return PENDING;
}
function save(silentSync){
  DB.meta.updated=Date.now();clearCache();persist();
  if(!silentSync)Cloud.push();
}
const S=()=>DB.settings;
function log(module,action,record,details){DB.activity.unshift({id:uid(),at:nowStamp(),user:ME?ME.username:'system',module,action,record:record||'',details:details||''});if(DB.activity.length>20000)DB.activity.length=20000}
function nextNo(key,prefix){DB.counters[key]=(DB.counters[key]||0)+1;return prefix+String(DB.counters[key]).padStart(5,'0')}

/* ---------- auth / session ---------- */
let ME=null;
const isDev=()=>ME&&ME.role==='developer';
const isAdmin=()=>ME&&(ME.role==='admin'||ME.role==='developer');
function canSee(mid){
  const m=MODULES.find(x=>x.id===mid);if(!m||!ME)return false;
  if(m.devOnly)return isDev();
  if(isDev())return true;
  if(!S().modules[mid]&&mid!=='help')return false;
  const perms=ME.perms&&ME.perms.length?ME.perms:ROLE_DEFAULTS[ME.role]||[];
  return perms.includes(mid);
}
function doLogin(){
  const u=$('#lu').value.trim().toLowerCase(),p=$('#lp').value;
  const user=DB.users.find(x=>x.username.toLowerCase()===u);
  if(!user||user.pass!==hashPass(u,p)){$('#loginErr').textContent='Username or password is incorrect.';return}
  if(!user.active||user.role==='staff'){$('#loginErr').textContent='This account is disabled for login. Please contact the admin.';return}
  ME=user;sessionStorage.setItem(SESSION_KEY,user.id);localStorage.setItem(SESSION_KEY,user.id);
  $('#lp').value='';$('#loginErr').textContent='';
  log('Login','Login',user.username);save(true);
  startApp();
  showWelcome(()=>{if(user.mustChange)setTimeout(()=>changePasswordDialog(true),200)});
}
/* developer password reset from the login screen: verify developer login (or recovery key) once, then change any user's password */
const RECOVERY_HASH='1e6ff6018b3800e227dc290e30968c74705332185ad6f34519a13516235cb3e2';
let RESET_FAILS=0,RESET_WAIT=0;
function resetPasswordDialog(){
  modal('Reset password',`<p class="small muted">Only the developer can reset passwords. Log in with the developer account once to continue.</p>
   <div class="grid g2">${F('Developer username',inp('rpU','','text','autocapitalize="none" spellcheck="false" autocomplete="off"'))}${F('Developer password',inp('rpP','','password','autocomplete="off"'))}</div>
   <p class="small muted mt">Forgot the developer password? Enter your developer recovery key in the password box.</p>`,
   [{t:'Continue',pri:1,fn:()=>{
     if(Date.now()<RESET_WAIT)return toast('Too many wrong tries. Wait 30 seconds.',true);
     const un=V('rpU').toLowerCase(),pw=$('#rpP').value;const dev=DB.users.find(u=>u.role==='developer'&&u.username.toLowerCase()===un&&u.pass===hashPass(un,pw));
     const byKey=!dev&&sha256('ft-recovery|'+pw.trim().toUpperCase())===RECOVERY_HASH;
     if(!dev&&!byKey){RESET_FAILS++;if(RESET_FAILS>=5){RESET_FAILS=0;RESET_WAIT=Date.now()+30000}return toast('Developer username or password is incorrect.',true)}
     RESET_FAILS=0;resetPasswordStep2(dev?dev.username:'recovery key')}}]);
  setTimeout(()=>{const e=$('#rpU');e&&e.focus()},50);
}
function resetPasswordStep2(by){
  const users=DB.users.slice().sort((a,b)=>(a.role==='developer'?-1:b.role==='developer'?1:0));
  modal('Reset password — choose user',`<p class="note">Verified as developer. Select any user (your own account too) and set a new password.</p>
   <div class="grid g2 mt">${F('User',sel('rpUser',users.map(u=>({v:u.id,t:(u.name||u.username)+' ('+u.username+') — '+(u.role==='developer'?'Developer':ROLES[u.role]||u.role)})),users[0]&&users[0].id),'wide')}
   ${F('Username (login)',inp('rpNU',users[0]?users[0].username:'','text','autocapitalize="none" spellcheck="false" autocomplete="off"'))}${F('New password',inp('rpN1','','password','autocomplete="new-password"'))}${F('Confirm password',inp('rpN2','','password','autocomplete="new-password"'))}
   ${F('Account status',sel('rpAct',[{v:'1',t:'Active'},{v:'0',t:'Disabled'}],'1'))}</div>`,
   [{t:'Save password',pri:1,fn:()=>{const u=byId('users',V('rpUser'));if(!u)return toast('Select a user.',true);
     const nu=V('rpNU').toLowerCase().replace(/\s+/g,''),a=$('#rpN1').value,b=$('#rpN2').value;
     if(!nu)return toast('Enter a username.',true);if(DB.users.some(x=>x.id!==u.id&&x.username.toLowerCase()===nu))return toast('This username belongs to someone else.',true);
     if(a.length<4)return toast('Password must be at least 4 characters.',true);if(a!==b)return toast('The two passwords do not match.',true);
     u.username=nu;u.pass=hashPass(nu,a);u.mustChange=false;u.active=V('rpAct')==='1'||u.role==='developer';
     DB.activity.unshift({id:uid(),at:nowStamp(),user:by,module:'Users',action:'Password reset from login screen',record:u.username,details:''});save();
     closeModal();$('#lu').value=u.username;$('#lp').value='';$('#loginErr').textContent='';toast('Password changed for '+u.username+'. You can sign in now.')}}]);
  $('#rpUser').onchange=()=>{const u=byId('users',V('rpUser'));$('#rpNU').value=u?u.username:'';$('#rpAct').value=u&&u.active===false?'0':'1'};
}
/* ---------- live clock ---------- */
const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function timeText(d,sec){d=d||new Date();let h=d.getHours();const ap=h<12?'AM':'PM';h=h%12||12;return h+':'+pad(d.getMinutes())+(sec?':'+pad(d.getSeconds()):'')+' '+ap}
function greeting(h){return h>=5&&h<12?'Good morning':h>=12&&h<17?'Good afternoon':h>=17&&h<21?'Good evening':'Welcome back'}
function tickClock(){const d=new Date();const c=$('#bizDate');
  if(c)c.innerHTML=`<span class="cd">${DAYS[d.getDay()].slice(0,3)}<span class="cdt">, ${fmtDate(dstr(d))} •</span></span> <span class="ct">${timeText(d,true)}</span>`;
  const w=$('#wClock');if(w)w.textContent=timeText(d,true);
  const day=dstr(d);if(ME&&tickClock.day&&tickClock.day!==day&&CUR==='dashboard')render();tickClock.day=day;
  if(ME&&(!tickClock.od||Date.now()-tickClock.od>10000)){tickClock.od=Date.now();const o=!!dayEndOverdue();if(o!==tickClock.lock){const first=tickClock.lock===undefined;tickClock.lock=o;if(!first)render()}}
}
/* dashboard refreshes itself every 30 seconds (only when nothing is open and the tab is visible) */
let LIVE_AT=null;
function liveRefresh(){if(!ME||CUR!=='dashboard'||document.hidden)return;if($('#modalBg').classList.contains('on')||$('#welcome').classList.contains('on'))return;const y=window.scrollY;render();window.scrollTo(0,y)}

/* ---------- welcome screen (shown once after sign in) ---------- */
function welcomeFacts(){const t=today();const r=ME.role;
  try{
    if(r==='booker'){const iv=activeInv().filter(i=>i.bookerId===ME.id&&i.date===t);return[['Your orders today',iv.length],['Your sales today',money(sum(iv,i=>i.net))],['Your shops',visibleShops().length]]}
    if(r==='supplyman'){const iv=activeInv().filter(i=>i.supplymanId===ME.id&&i.deliveryDate===t);return[['Deliveries today',iv.length],['Delivery value',money(sum(iv,i=>i.net))],['Cash collected today',money(sum(DB.collections.filter(c=>c.smId===ME.id&&c.date===t),c=>c.amount))]]}
    const iv=activeInv().filter(i=>i.date===t);const pend=DB.recoveries.filter(x=>x.status==='pending').length;
    return[['Invoices today',iv.length],['Sales today',money(sum(iv,i=>i.net))],[isAdmin()?'Recoveries waiting approval':'Products in system',isAdmin()?pend:DB.products.length]];
  }catch(e){console.error(e);return[]}
}
function showWelcome(after){
  const s=S(),h=new Date().getHours();const part=greeting(h);
  const first=String(ME.name||ME.username).trim().split(/\s+/)[0];
  const d=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).replace(/^(\w+) /,'$1, ');
  const role=ME.role==='developer'?'Developer':ROLES[ME.role]||ME.role;
  const quick=[ME.role==='supplyman'?'collection':ME.role==='booker'?'pos':'pos',ME.role==='booker'?'recovery':'reports'].filter((x,i,a)=>a.indexOf(x)===i&&canSee(x));
  const w=$('#welcome');
  w.innerHTML=`<div class="w-in"><div class="w-brand">${s.logo?`<img src="${s.logo}" alt="">`:''}<span>${esc(s.companyName||s.appName||'')}</span></div>
   <h1 id="wTitle">${part}, ${esc(first)}.</h1>
   <div class="w-date">${esc(d)} • <b id="wClock">${timeText(new Date(),true)}</b> • Signed in as ${esc(role)}</div>
   <svg class="w-route" viewBox="-4 -26 772 84" overflow="visible" aria-hidden="true"><path id="wPath" d="M6 44 C 140 44, 160 14, 300 18 S 480 50, 600 30 S 720 12, 752 14" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="2" stroke-dasharray="6 7"/>
    <g fill="var(--side)" stroke-width="3"><circle cx="6" cy="44" r="6" stroke="rgba(255,255,255,.55)"/><circle cx="300" cy="18" r="6" stroke="rgba(255,255,255,.55)"/><circle cx="600" cy="30" r="6" stroke="rgba(255,255,255,.55)"/><circle cx="752" cy="14" r="8" stroke="var(--saffron)"/></g>
    <g id="wVan"><rect x="-17" y="-16" width="24" height="14" rx="2.5" fill="var(--saffron)"/><rect x="7" y="-12" width="9" height="10" rx="2.5" fill="#f6c46f"/><circle cx="-10" cy="-1" r="3" fill="#fff"/><circle cx="10" cy="-1" r="3" fill="#fff"/>
     <animateMotion dur="1.8s" fill="freeze" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".25 .1 .25 1"><mpath href="#wPath"/></animateMotion></g></svg>
   <div class="w-facts">${welcomeFacts().map(f=>`<div><small>${esc(f[0])}</small><b>${typeof f[1]==='number'?fmt(f[1]):esc(f[1])}</b></div>`).join('')}</div>
   <div class="w-act"><button class="btn go" data-w="dashboard">Open dashboard</button>${quick.map(id=>{const m=MODULES.find(x=>x.id===id);return`<button class="btn" data-w="${id}">${m.icon} ${esc(m.label)}</button>`}).join('')}</div>
   <div class="w-foot">${esc(s.devCredit||'')}</div></div>`;
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){const a=w.querySelector('animateMotion');a&&a.setAttribute('dur','0.01s')}
  const close=id=>{w.classList.remove('on');document.removeEventListener('keydown',key);go(id||'dashboard');after&&after()};
  const key=e=>{if(e.key==='Escape'||e.key==='Enter'){e.preventDefault();close('dashboard')}};
  w.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>close(b.dataset.w));
  w.classList.add('on');setTimeout(()=>countUp(w.querySelectorAll('.w-facts>div'),false),350);setTimeout(()=>document.addEventListener('keydown',key),300);setTimeout(()=>{const b=w.querySelector('.go');b&&b.focus()},50);
}
function logout(){$('#welcome').classList.remove('on');log('Login','Logout',ME?ME.username:'');save(true);ME=null;localStorage.removeItem(SESSION_KEY);sessionStorage.removeItem(SESSION_KEY);PENDING.finally(()=>location.reload())}
function changePasswordDialog(forced){
  modal(forced?'First login: set a new password':'Change password',`
   <div class="grid g2"><div class="f"><label>New password</label><input id="np1" type="password"></div>
   <div class="f"><label>Confirm password</label><input id="np2" type="password"></div></div>
   ${forced?'<p class="note mt">The default password is known to everyone, so change it now.</p>':''}`,
   [{t:'Save password',pri:1,fn:()=>{const a=$('#np1').value,b=$('#np2').value;if(a.length<4)return toast('Password must be at least 4 characters.',true);if(a!==b)return toast('The two passwords do not match.',true);
     ME.pass=hashPass(ME.username,a);ME.mustChange=false;log('Users','Password changed',ME.username);save();closeModal();toast('Password changed.')}}]);
}

/* ---------- invoice limit (licence) ---------- */
const LIC=()=>DB.licence;
function invUsed(){return N(DB.meta.invMade)}
function invLimitReached(){return !LIC().unlimited&&invUsed()>=(N(LIC().limit)||200)}
function showBuyDialog(){const L=LIC();const wa=String(L.whatsapp||'').replace(/[^\d]/g,'');
  modal('Invoice limit reached',`<div class="note" style="border-color:#e0b25a;background:#fdf6e7"><b>${invUsed()} / ${N(L.limit)||200} invoices used.</b><br>${esc(L.message||'')}</div>
   <h4 class="mt">Contact the developer to purchase</h4><table class="kv" style="width:100%"><tr><td>Developer</td><td><b>${esc(L.devName||'')}</b></td></tr>${L.phone?`<tr><td>Phone</td><td><a href="tel:${esc(L.phone)}">${esc(L.phone)}</a></td></tr>`:''}${L.whatsapp?`<tr><td>WhatsApp</td><td><a href="https://wa.me/${wa}" target="_blank" rel="noopener">${esc(L.whatsapp)}</a></td></tr>`:''}${L.email?`<tr><td>Email</td><td><a href="mailto:${esc(L.email)}">${esc(L.email)}</a></td></tr>`:''}</table>
   <p class="small muted mt">All your existing data is safe. Old invoices can still be viewed, printed and edited.</p>`,
   wa?[{t:'💬 WhatsApp developer',pri:1,fn:()=>window.open('https://wa.me/'+wa+'?text='+encodeURIComponent('Assalam o Alaikum, I want to purchase the full version of '+(S().appName||'Distribution ERP')+' for '+(S().companyName||'')+'.'),'_blank')}]:[])}

/* ---------- day end lock ---------- */
function lastClosed(){return DB.dayEnds.reduce((m,d)=>d.date>m?d.date:m,'')}
function isLocked(date){const c=lastClosed();return !!c&&!!date&&String(date).slice(0,10)<=c&&!isDev()}
/* Day End deadline: a day with entries must be closed by 10:00 AM next day, after that only the Day End process works (developer exempt) */
const DAYEND_HOUR=10;
function dayEndOverdue(){if(!ME||isDev())return '';
  const now=new Date();const t=dstr(now);const cutoff=addDays(t,now.getHours()>=DAYEND_HOUR?-1:-2);const lc=lastClosed();
  if(lc>=cutoff)return '';
  const lists=[DB.invoices,DB.recoveries,DB.collections,DB.expenses,DB.purchases,DB.returns,DB.supplierPayments,DB.transfers,DB.staffAdv,DB.investorTxns];
  let first='';for(const L of lists)for(const x of (L||[])){const d=String(x.date||'').slice(0,10);if(d&&d>lc&&d<=cutoff&&(!first||d<first))first=d}
  return first}
function overdueBlock(){const o=dayEndOverdue();if(o){toast('System is locked: Day End for '+fmtDate(o)+' is pending. Only Day End can be done.',true);return true}return false}
function backupPending(){if(DB.meta.pendingBackup&&!isDev()){toast('Backup after Day End ('+fmtDate(DB.meta.pendingBackup)+') is not confirmed yet. Take the backup from Backup & day end first.',true);return true}return false}
function guard(...dates){if(overdueBlock()||backupPending())return false;if(dates.some(isLocked)){toast('Day end is done up to '+fmtDate(lastClosed())+'. New entries can only be made after this date.',true);return false}return true}

/* edit/delete of an entry on a closed date: admin only */
function guardEdit(...dates){if(overdueBlock()||backupPending())return false;if(!isAdmin()&&dates.some(isLocked)){toast('Day end is done up to '+fmtDate(lastClosed())+'. Only admin can edit or delete entries on or before this date.',true);return false}return true}

/* ---------- UI primitives ---------- */
function toast(msg,bad){const t=$('#toast');t.textContent=msg;t.className='on'+(bad?' bad':'');clearTimeout(t._t);t._t=setTimeout(()=>t.className='',2800)}
function modal(title,html,buttons){
  $('.modal').classList.remove('wide');
  $('#mTitle').textContent=title;$('#mBody').innerHTML=html;const f=$('#mFoot');f.innerHTML='';
  (buttons||[]).concat([{t:'Close',fn:closeModal}]).forEach(b=>{const el=document.createElement('button');el.className='btn'+(b.pri?' pri':'')+(b.bad?' bad':'');el.textContent=b.t;el.onclick=b.fn;f.appendChild(el)});
  $('#modalBg').classList.add('on');
}
function closeModal(){$('#modalBg').classList.remove('on')}
function confirmBox(msg,fn){modal('Please confirm',`<p>${esc(msg)}</p>`,[{t:'Yes, proceed',bad:1,fn:()=>{closeModal();fn()}}])}
const opt=(list,val,ph)=>(ph!==undefined?`<option value="">${esc(ph)}</option>`:'')+list.map(o=>{const v=typeof o==='object'?o.v:o,t=typeof o==='object'?o.t:o;return`<option value="${esc(v)}"${String(v)===String(val??'')?' selected':''}>${esc(t)}</option>`}).join('');
const F=(label,input,cls)=>`<div class="f ${cls||''}"><label>${label}</label>${input}</div>`;
const inp=(id,val,type,extra)=>`<input id="${id}" type="${type||'text'}" value="${esc(val??'')}" ${extra||''}>`;
const sel=(id,list,val,ph,extra)=>`<select id="${id}" ${extra||''}>${opt(list,val,ph)}</select>`;
const V=id=>{const e=document.getElementById(id);return e?(e.type==='checkbox'?e.checked:e.value.trim()):''};
function table(cols,rows,foot){
  if(!rows.length)return`<div class="tbl"><div class="empty">No records yet.</div></div>`;
  const h=cols.map(c=>`<th class="${c.n?'n':''}">${esc(c.t)}</th>`).join('');
  const b=rows.map(r=>'<tr>'+r.map((v,i)=>`<td class="${cols[i]&&cols[i].n?'n':''}">${v}</td>`).join('')+'</tr>').join('');
  const fo=foot?'<tfoot><tr>'+foot.map((v,i)=>`<td class="${cols[i]&&cols[i].n?'n':''}">${v}</td>`).join('')+'</tr></tfoot>':'';
  return`<div class="tbl"><table><thead><tr>${h}</tr></thead><tbody>${b}</tbody>${fo}</table></div>`;
}
const badge=(t,k)=>`<span class="badge ${k||''}">${esc(t)}</span>`;
function readImage(file,maxW,quality){return new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=rej;fr.onload=()=>{const img=new Image();img.onload=()=>{const sc=Math.min(1,maxW/img.width);const c=document.createElement('canvas');c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);const png=file.type==='image/png'&&maxW<=400;res(c.toDataURL(png?'image/png':'image/jpeg',quality||.82))};img.onerror=rej;img.src=fr.result};fr.readAsDataURL(file)})}
function pickFile(accept){return new Promise(res=>{const f=$('#hiddenFile');f.value='';f.accept=accept||'';f.onchange=()=>res(f.files[0]||null);f.click()})}
function loadScript(src){return new Promise((res,rej)=>{if(document.querySelector(`script[src="${src}"]`))return res();const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('Load failed: '+src));document.head.appendChild(s)})}

/* =====================================================================
   CALCULATION ENGINE — har balance records se banta hai (koi double entry nahi)
   ===================================================================== */
const activeInv=()=>DB.invoices.filter(i=>i.status!=='cancelled');
function productPcs(p){return N(p.packing)||1}
function splitPcs(p,pcs){const pk=productPcs(p);const neg=pcs<0;pcs=Math.abs(Math.round(pcs));const c=Math.floor(pcs/pk),l=pcs%pk;return (neg?'-':'')+c+' ctn'+(l?' + '+l+' pcs':'')}
function stockMap(){if(CACHE.stock)return CACHE.stock;const m={};const add=(id,v)=>{m[id]=(m[id]||0)+N(v)};
  DB.products.forEach(p=>add(p.id,p.openingPcs));DB.purchases.forEach(pu=>pu.items.forEach(it=>add(it.productId,it.pcs)));
  activeInv().forEach(iv=>iv.items.forEach(it=>add(it.productId,-N(it.pcs))));DB.returns.forEach(r=>{if(r.toStock)add(r.productId,r.pcs)});DB.claims.forEach(c=>{if(c.deductStock)add(c.productId,-N(c.pcs))});
  return CACHE.stock=m}
function stockOf(pid,excludeInv){
  const p=byId('products',pid);if(!p)return 0;
  let s=pid in stockMap()?stockMap()[pid]:N(p.openingPcs);
  if(excludeInv){const iv=byId('invoices',excludeInv);if(iv&&iv.status!=='cancelled')iv.items.forEach(it=>{if(it.productId===pid)s+=N(it.pcs)})}
  return s;
}
function costPerPc(pid){
  if(!CACHE.cost){const q={},c={};DB.purchases.forEach(pu=>pu.items.forEach(it=>{q[it.productId]=(q[it.productId]||0)+N(it.pcs);c[it.productId]=(c[it.productId]||0)+N(it.amount)}));CACHE.cost={q,c}}
  const {q,c}=CACHE.cost;if(q[pid]>0)return c[pid]/q[pid];
  const p=byId('products',pid);return p?N(p.costCtn)/productPcs(p):0;
}
function invCash(iv){return iv.payType==='cash'?N(iv.net):0}
function invCollected(ivId){if(!CACHE.coll){CACHE.coll={};DB.collections.forEach(c=>CACHE.coll[c.invoiceId]=(CACHE.coll[c.invoiceId]||0)+N(c.amount))}return CACHE.coll[ivId]||0}
function invDue(iv){if(iv.status==='cancelled')return 0;return N(iv.net)-invCash(iv)-invCollected(iv.id)}
const approvedRec=()=>DB.recoveries.filter(r=>r.status==='approved');
function allLedgers(){
  if(CACHE.led)return CACHE.led;const G={};const P=(id,x)=>(G[id]=G[id]||[]).push(x);
  DB.shops.forEach(sh=>{if(N(sh.opening))P(sh.id,{date:sh.openingDate||'',type:'Opening balance',ref:'',dr:N(sh.opening),cr:0,note:''})});
  DB.invoices.forEach(i=>{if(i.status==='cancelled')return;P(i.shopId,{date:i.date,type:'Sale invoice',ref:i.no,dr:N(i.net),cr:0,note:i.items.length+' items, '+(i.payType==='cash'?'cash':'credit')});
    if(i.payType==='cash')P(i.shopId,{date:i.date,type:'Cash on invoice',ref:i.no,dr:0,cr:N(i.net),note:'',tgt:i.no})});
  DB.collections.forEach(c=>P(c.shopId,{date:c.date,type:'Supply man cash',ref:c.invoiceNo,dr:0,cr:N(c.amount),note:c.remarks||'',src:'col',sid:c.id,tgt:c.invoiceNo}));
  approvedRec().forEach(r=>{P(r.shopId,{date:r.date,type:'Recovery',ref:r.method||'',dr:0,cr:N(r.amount),note:r.note||'',src:'rec',sid:r.id});if(N(r.adjust))P(r.shopId,{date:r.date,type:'Short adjusted ('+r.adjustType+')',ref:'',dr:0,cr:N(r.adjust),note:r.staffName||''})});
  DB.returns.forEach(r=>{if(r.settle==='credit')P(r.shopId,{date:r.date,type:r.kind==='udhaar'?'Credit stock return':'Item return',ref:r.productName,dr:0,cr:N(r.amount),note:r.reason||''})});
  for(const id in G){const L=G[id];L.sort((a,b)=>String(a.date).localeCompare(String(b.date)));let bal=0;L.forEach(x=>{bal+=x.dr-x.cr;x.bal=bal})}
  return CACHE.led=G;
}
function shopLedger(shopId,to){const L=allLedgers()[shopId]||[];return (to?L.filter(x=>!(x.date>to)):L).map(x=>({...x}))}
function shopDue(shopId){const L=allLedgers()[shopId];return L&&L.length?L[L.length-1].bal:0}
function supplierList(){const s=new Set();DB.purchases.forEach(p=>p.supplier&&s.add(p.supplier));DB.supplierPayments.forEach(p=>p.supplier&&s.add(p.supplier));DB.claims.forEach(c=>c.supplier&&s.add(c.supplier));return [...s].sort()}
function supplierDue(name){return sum(DB.purchases.filter(p=>p.supplier===name),p=>N(p.total)-N(p.paidNow))-sum(DB.supplierPayments.filter(p=>p.supplier===name),p=>p.amount)}
function accountMoves(){
  if(CACHE.moves)return CACHE.moves;
  const M=[];const add=(date,acc,inn,out,desc,ref)=>{if(N(inn)||N(out))M.push({date,acc:acc||'acc_cash',in:N(inn),out:N(out),desc,ref:ref||''})};
  DB.accounts.forEach(a=>add(a.openingDate||'',a.id,N(a.opening)>0?a.opening:0,N(a.opening)<0?-a.opening:0,'Opening balance'));
  activeInv().forEach(i=>{if(i.payType==='cash')add(i.date,i.accountId,i.net,0,'Cash sale '+(i.shopName||''),i.no)});
  DB.collections.forEach(c=>add(c.date,c.accountId,c.amount,0,'Supply man cash: '+(c.supplyman||''),c.invoiceNo));
  approvedRec().forEach(r=>add(r.approvedDate||r.date,r.accountId,r.amount,0,'Recovery: '+(r.shopName||''),r.collector));
  DB.purchases.forEach(p=>add(p.date,p.accountId,0,p.paidNow,'Purchase payment: '+p.supplier,p.no));
  DB.supplierPayments.forEach(p=>add(p.date,p.accountId,0,p.amount,'Supplier payment: '+p.supplier,p.note));
  DB.expenses.forEach(e=>add(e.date,e.accountId,0,e.amount,'Expense: '+e.head,e.note));
  DB.returns.filter(r=>r.settle==='cash').forEach(r=>add(r.date,r.accountId,0,r.amount,'Cash refund: '+(r.shopName||''),r.productName));
  DB.staffAdv.filter(a=>a.type==='Advance'||a.type==='Loan').forEach(a=>add(a.date,a.accountId,0,a.amount,a.type+': '+a.staffName,a.note));
  DB.salaries.filter(s=>s.paid).forEach(s=>add(s.paidDate||s.date,s.accountId,0,s.net,'Salary: '+s.staffName,s.month));
  DB.investorTxns.forEach(t=>{if(t.type==='capital')add(t.date,t.accountId,t.amount,0,'Capital in: '+t.investorName,t.note);if(t.type==='withdraw'||t.type==='profitPaid')add(t.date,t.accountId,0,t.amount,(t.type==='withdraw'?'Capital withdrawal: ':'Profit paid: ')+t.investorName,t.note)});
  DB.claims.filter(c=>c.status==='received'&&N(c.receivedAmount)).forEach(c=>add(c.receivedDate||c.date,c.accountId,c.receivedAmount,0,'Claim received: '+c.supplier,c.no));
  DB.transfers.forEach(t=>{add(t.date,t.from,0,t.amount,'Transfer to '+(byId('accounts',t.to)||{}).name,t.note);add(t.date,t.to,t.amount,0,'Transfer from '+(byId('accounts',t.from)||{}).name,t.note)});
  return CACHE.moves=M.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
}
function accountBalance(id,to){return sum(accountMoves().filter(m=>m.acc===id&&(!to||m.date<=to)),m=>m.in-m.out)}
function accOptions(){return DB.accounts.map(a=>({v:a.id,t:a.name}))}
function staffList(){return DB.users.filter(u=>u.role!=='developer')}
function usersByRole(r){return DB.users.filter(u=>u.role===r&&u.active!==false)}
function shopLabel(s){return s.name+(s.route?' ('+s.route+')':'')+(s.address?' – '+s.address:'')}
function visibleShops(){if(ME&&ME.role==='booker'&&S().bookerOwnShopsOnly)return DB.shops.filter(s=>s.bookerId===ME.id);return DB.shops}
function pnl(from,to){
  const inv=activeInv().filter(i=>inRange(i.date,from,to));
  const sales=sum(inv,i=>i.net);const gross=sum(inv,i=>i.gross);const disc=sum(inv,i=>i.discount);const tax=sum(inv,i=>i.tax);
  const cogs=sum(inv,i=>sum(i.items,it=>N(it.pcs)*N(it.cost||costPerPc(it.productId))));
  const rets=DB.returns.filter(r=>inRange(r.date,from,to));const retVal=sum(rets,r=>r.amount);const retCost=sum(rets.filter(r=>r.toStock),r=>N(r.pcs)*costPerPc(r.productId));
  const exp=sum(DB.expenses.filter(e=>inRange(e.date,from,to)),e=>e.amount);
  const sal=sum(DB.salaries.filter(s=>inRange((s.month||'')+'-28',from,to)),s=>N(s.net)+N(s.advanceDed)+N(s.cashDiffDed));
  const claimsRecv=sum(DB.claims.filter(c=>c.status==='received'&&inRange(c.receivedDate||c.date,from,to)),c=>c.receivedAmount);
  const netSales=sales-tax-retVal;const gp=netSales-(cogs-retCost);
  return{sales,gross,disc,tax,cogs:cogs-retCost,retVal,exp,sal,claimsRecv,netSales,gp,net:gp-exp-sal+claimsRecv,count:inv.length};
}

/* ---------- Cloud sync (Firebase, optional — developer panel se on hota hai) ---------- */
const Cloud={ready:false,ref:null,pulling:false,_t:null,
  async init(){
    const fb=S().firebase;if(!fb||!fb.enabled||!fb.config)return;
    try{
      const raw=fb.config.slice(fb.config.indexOf('{'),fb.config.lastIndexOf('}')+1);let cfg;try{cfg=JSON.parse(raw)}catch(e){cfg=(new Function('return ('+raw+')'))()}
      await loadScript('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
      await loadScript('https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js');
      if(!firebase.apps.length)firebase.initializeApp(cfg);
      const path='ftErp/'+(fb.path||S().companyName||'default').toLowerCase().replace(/[^a-z0-9]+/g,'-');
      this.ref=firebase.database().ref(path);this.ready=true;
      const snap=await this.ref.once('value');const remote=snap.val();
      if(remote&&remote.data){const r=JSON.parse(remote.data);if(N(r.meta&&r.meta.updated)>N(DB.meta.updated)){DB=normalize(r);save(true);if(ME){ME=DB.users.find(u=>u.id===ME.id)||ME;render()}}}
      else this.push(true);
      this.ref.on('value',s=>{const v=s.val();if(!v||!v.data||v.by===this.client)return;const r=JSON.parse(v.data);if(N(r.meta.updated)>N(DB.meta.updated)){DB=normalize(r);save(true);if(ME){ME=DB.users.find(u=>u.id===ME.id)||ME;applyBranding();render()}}});
      toast('Cloud sync connected');
    }catch(e){console.error(e);toast('Cloud sync could not connect: '+e.message,true)}
  },
  client:uid(),
  push(now){if(!this.ready)return;clearTimeout(this._t);this._t=setTimeout(()=>{try{this.ref.set({data:JSON.stringify(DB),by:this.client,at:Date.now()})}catch(e){console.error(e)}},now?0:1200)}
};
/* =====================================================================
   PRINT ENGINE — har print developer ke set kiye format se banta hai
   ===================================================================== */
function printHeader(P,title,sub){
  const s=S();let h='';
  if(P.letterhead==='header'&&s.letterhead)h+=`<img class="lh-top" src="${s.letterhead}">`;
  else if(P.showCompany||P.showLogo){
    h+=`<div class="ph">${P.showLogo&&s.logo?`<img class="lg" src="${s.logo}">`:''}<div class="pc">${P.showCompany?`<div class="cn">${esc(s.companyName)}</div><div class="cd">${[s.address,s.phone&&('Ph: '+s.phone),s.ntn&&('NTN: '+s.ntn),s.email].filter(Boolean).map(esc).join(' &nbsp;|&nbsp; ')}</div>`:''}</div>${P.showPrincipal&&s.principalLogo?`<img class="lg" src="${s.principalLogo}">`:''}</div>`;
  }
  if(title)h+=`<div class="pt">${esc(title)}</div>`;
  if(sub)h+=`<div class="ps">${sub}</div>`;
  return h;
}
function printFooter(P){
  const sig=String(P.signatures||'').split(',').map(x=>x.trim()).filter(Boolean);
  return (sig.length?`<div class="sig">${sig.map(x=>`<div><span></span>${esc(x)}</div>`).join('')}</div>`:'')+
   (P.footer?`<div class="pf">${esc(P.footer)}</div>`:'')+
   `<div class="pd">Printed ${esc(nowStamp())}${ME?' by '+esc(ME.name||ME.username):''} • ${esc(S().devCredit||'')}</div>`;
}
function printDoc(type,body,o){
  o=o||{};const s=S();const P=Object.assign({},defaultPrint()[type]||defaultPrint().report,s.print[type]||{});
  const title=o.title!==undefined?(type==='report'&&P.title&&o.title?P.title+' — '+o.title:o.title):(P.title||'');
  if(type==='invoice'){P.paper='A4dual';P.orientation='landscape';}const paper=P.paper||'A4';const dual=paper==='A4dual'||paper==='A4dual_v';const land=P.orientation==='landscape';
  const lhBg=P.letterhead==='background'&&s.letterhead;const fs=N(P.fontSize)||12;
  const mm=(v,d)=>{const x=parseFloat(v);return isFinite(x)&&x>=0?x:d};
  const mT=mm(P.mTop,10),mR=mm(P.mRight,10),mB=mm(P.mBottom,10),mL=mm(P.mLeft,10);
  const top=lhBg?mm(P.lhTop,38):mT,bot=lhBg?mm(P.lhBottom,22):mB;
  const labels=String(P.copyLabels||'').split(',').map(x=>x.trim()).filter(Boolean);
  let W=210,H=297,pageCss;
  if(paper==='thermal'){W=80;H=0;pageCss='80mm auto'}
  else if(paper==='A4dual'){W=297;H=210;pageCss='A4 landscape'}
  else if(paper==='A4dual_v'){pageCss='A4 portrait'}
  else{const bs=paper==='A5'?[148,210]:[210,297];[W,H]=land?[bs[1],bs[0]]:bs;pageCss=paper+' '+(land?'landscape':'portrait')}
  const hw=paper==='A4dual'?W/2:W,hh=paper==='A4dual_v'?H/2:H;
  const css=`@page{size:${pageCss};margin:0}
  *{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:${fs}px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .print-page{display:block;width:100%;break-after:page;page-break-after:always}.print-page:last-child{break-after:auto;page-break-after:auto}.pg{width:${paper==='thermal'?'76mm':'100%'};border-collapse:collapse;break-after:page;page-break-after:always}.pg:last-of-type{break-after:auto;page-break-after:auto}
  .pg>thead>tr>td,.pg>tfoot>tr>td,.pg>tbody>tr>td{border:0!important;padding:0!important;background:none!important}
  .pg>tbody>tr>td.pgc{padding:0 ${paper==='thermal'?2:mR}mm 0 ${paper==='thermal'?2:mL}mm!important}
  .lhfix{position:fixed;left:0;top:0;width:${W}mm;height:${H}mm;object-fit:fill;z-index:-1}
  .sheet2{width:${W}mm;height:${H}mm;display:flex;overflow:hidden;break-after:page;page-break-after:always}.sheet2:last-of-type{break-after:auto;page-break-after:auto}
  .sheet2.row{flex-direction:row}.sheet2.col{flex-direction:column}
  .half{position:relative;width:${hw}mm;height:${hh}mm;flex:0 0 auto;overflow:hidden;padding:${top}mm ${mR}mm ${bot}mm ${mL}mm}
  .sheet2.row .half+.half{border-left:1px dashed #999}.sheet2.col .half+.half{border-top:1px dashed #999}
  .half .lhbg{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;z-index:-1}
  .fit{transform-origin:top left}
  .cl{float:right;border:1.5px solid #222;padding:1px 8px;font-size:${fs-1}px;font-weight:700;border-radius:3px;margin:0 0 3px 6px}
  .doc .lh-top{width:100%;max-height:40mm;object-fit:contain;display:block;margin-bottom:4px}
  .doc .ph{display:flex;align-items:center;gap:10px;border-bottom:2px solid #222;padding-bottom:5px}.doc .ph .pc{flex:1;text-align:center}.doc .lg{height:${paper==='thermal'?'28px':dual?'40px':'52px'};max-width:28%;object-fit:contain}
  .doc .cn{font-size:${fs+(dual?6:8)}px;font-weight:700}.doc .cd{font-size:${fs-2}px;color:#333;margin-top:2px}
  .doc .pt{text-align:center;font-weight:700;font-size:${fs+3}px;margin:6px 0 4px;letter-spacing:.5px;clear:both}.doc .ps{text-align:center;font-size:${fs-1}px;color:#333;margin-bottom:6px}
  .doc table{width:100%;border-collapse:collapse;margin-top:6px}.doc th,.doc td{border:1px solid #777;padding:3px 5px;font-size:${fs-1}px;vertical-align:top}.doc th{background:#eee}.doc td.n,.doc th.n{text-align:right;white-space:nowrap}
  .doc thead{display:table-header-group}.doc tr{break-inside:avoid;page-break-inside:avoid}
  .doc .meta{display:grid;grid-template-columns:1fr 1fr;gap:2px 14px;font-size:${fs-1}px;margin-top:6px}
  .doc .tot{margin-left:auto;width:60%;margin-top:6px}.doc .tot td{border:0;border-bottom:1px solid #ccc}.doc .tot tr:last-child td{font-weight:700;font-size:${fs+1}px;border-bottom:2px solid #222}
  .doc .sig{display:flex;gap:18px;justify-content:space-between;margin-top:${dual?22:34}px;font-size:${fs-1}px;break-inside:avoid}.doc .sig div{flex:1;text-align:center}.doc .sig span{display:block;border-top:1px solid #222;margin-bottom:3px}
  .doc .pf{text-align:center;margin-top:10px;font-size:${fs-1}px}.doc .pd{text-align:center;margin-top:6px;font-size:9px;color:#666}
  .doc .kv td{padding:4px 6px}.doc .kv td:last-child{text-align:right;font-weight:700}
  .doc h4{margin:12px 0 2px;font-size:${fs+1}px}.doc .pbreak{break-before:page;page-break-before:always}
  ${paper==='thermal'?'.doc .meta{grid-template-columns:1fr}.doc .tot{width:100%}.doc .sig{display:none}':''}`;
  const one=(b,label)=>`<div class="doc">${label?`<div class="cl">${esc(label)}</div>`:''}${printHeader(P,title,o.sub)}${b}${printFooter(P)}</div>`;
  const bodies=Array.isArray(body)?body:[body];let html='';
  if(dual){bodies.forEach(b=>{const l=[labels[0]||'',labels[1]||labels[0]||''];html+=`<div class="sheet2 ${paper==='A4dual'?'row':'col'}">${l.map(x=>`<div class="half">${lhBg?`<img class="lhbg" src="${s.letterhead}">`:''}<div class="fit">${one(b,x)}</div></div>`).join('')}</div>`})}
  else{const n=Math.max(1,N(P.copies)||1);if(lhBg&&paper!=='thermal')html+=`<img class="lhfix" src="${s.letterhead}">`;
    bodies.forEach(b=>{for(let c=0;c<n;c++)html+=`<div class="print-page"><table class="pg"><thead><tr><td style="height:${paper==='thermal'?2:top}mm"></td></tr></thead><tbody><tr><td class="pgc">${one(b,n>1?labels[c]||'':'')}</td></tr></tbody><tfoot><tr><td style="height:${paper==='thermal'?2:bot}mm"></td></tr></tfoot></table></div>`})}
  const fr=document.createElement('iframe');fr.style.cssText='position:fixed;left:-20000px;top:0;width:1200px;height:900px;border:0;visibility:hidden';document.body.appendChild(fr);
  const d=fr.contentWindow.document;d.open();d.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title||s.companyName)}</title></head><body>${html}</body></html>`);d.close();
  const fitHalves=()=>{let cut=false;d.querySelectorAll('.half').forEach(h=>{const f=h.querySelector('.fit');const cs=fr.contentWindow.getComputedStyle(h);
    const aw=h.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),ah=h.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
    f.style.transform='';f.style.width=aw+'px';let k=1;for(let i=0;i<5;i++){const ht=f.scrollHeight;if(ht<=ah+1)break;k=Math.max(.5,k*ah/ht);f.style.width=(aw/k)+'px';f.style.transform=`scale(${k})`;if(k<=.5)break}
    if(f.scrollHeight*k>ah+2)cut=true});return cut};
  const go=()=>{if(dual&&fitHalves())toast('Invoice is too long to fit on a half page. Set the invoice paper to "A4" in the Developer panel.',true);
    setTimeout(()=>{try{fr.contentWindow.focus();fr.contentWindow.print()}catch(e){console.error(e)}setTimeout(()=>fr.remove(),60000)},60)};
  const imgs=Array.from(d.images);let left=imgs.length;if(!left)setTimeout(go,150);else imgs.forEach(im=>{const done=()=>{if(--left===0)setTimeout(go,100)};im.complete?done():(im.onload=im.onerror=done)});
  return fr;
}
function tableHTMLPrint(cols,rows,foot){return`<table><thead><tr>${cols.map(c=>`<th class="${c.n?'n':''}">${esc(c.t)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>'<tr>'+r.map((v,i)=>`<td class="${cols[i]&&cols[i].n?'n':''}">${esc(v)}</td>`).join('')+'</tr>').join('')}</tbody>${foot?`<tfoot><tr>${foot.map((v,i)=>`<td class="${cols[i]&&cols[i].n?'n':''}"><b>${esc(v)}</b></td>`).join('')}</tr></tfoot>`:''}</table>`}

/* ---------- Excel / PDF export ---------- */
function exportExcel(name,cols,rows,foot){
  if(!window.XLSX)return toast('Excel library did not load (check the internet connection).',true);
  const aoa=[[S().companyName],[name],[],cols.map(c=>c.t),...rows.map(r=>r.map((v,i)=>cols[i]&&cols[i].n?N(v):v))];if(foot)aoa.push(foot.map((v,i)=>cols[i]&&cols[i].n&&v!==''?N(v):v));
  const ws=XLSX.utils.aoa_to_sheet(aoa);ws['!cols']=cols.map(()=>({wch:16}));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Report');
  XLSX.writeFile(wb,(name||'report').replace(/[^\w\- ]+/g,'').trim().replace(/\s+/g,'_')+'_'+today()+'.xlsx');
}
function exportPDF(name,cols,rows,foot,sub){
  if(!window.jspdf||!window.jspdf.jsPDF)return toast('PDF library did not load. Use the Print button and choose "Save as PDF".',true);
  const P=Object.assign({},defaultPrint().report,S().print.report||{});
  const land=P.orientation==='landscape'||cols.length>7;
  const doc=new window.jspdf.jsPDF({orientation:land?'landscape':'portrait',unit:'mm',format:P.paper==='A5'?'a5':'a4'});
  const W=doc.internal.pageSize.getWidth();let y=12;const s=S();
  try{if(P.showLogo&&s.logo)doc.addImage(s.logo,'JPEG',10,6,18,18)}catch(e){}
  try{if(P.showPrincipal&&s.principalLogo)doc.addImage(s.principalLogo,'JPEG',W-28,6,18,18)}catch(e){}
  doc.setFontSize(15);doc.setFont(undefined,'bold');doc.text(s.companyName||'',W/2,y,{align:'center'});y+=6;
  doc.setFontSize(9);doc.setFont(undefined,'normal');const cd=[s.address,s.phone].filter(Boolean).join(' | ');if(cd){doc.text(cd,W/2,y,{align:'center'});y+=5}
  doc.setFontSize(12);doc.setFont(undefined,'bold');doc.text((P.title?P.title+' — ':'')+name,W/2,y+2,{align:'center'});y+=7;
  if(sub){doc.setFontSize(9);doc.setFont(undefined,'normal');doc.text(String(sub).replace(/<[^>]+>/g,''),W/2,y,{align:'center'});y+=4}
  doc.autoTable({startY:y+2,head:[cols.map(c=>c.t)],body:rows.map(r=>r.map(v=>String(v??''))),foot:foot?[foot.map(v=>String(v??''))]:undefined,styles:{fontSize:8,cellPadding:1.6},headStyles:{fillColor:[40,60,66]},footStyles:{fillColor:[230,236,234],textColor:20},
    columnStyles:Object.fromEntries(cols.map((c,i)=>[i,c.n?{halign:'right'}:{}])),
    didDrawPage:()=>{doc.setFontSize(7);doc.setTextColor(120);doc.text((P.footer||'')+'   '+(s.devCredit||'')+'   '+nowStamp(),W/2,doc.internal.pageSize.getHeight()-5,{align:'center'});doc.setTextColor(0)}});
  doc.save((name||'report').replace(/[^\w\- ]+/g,'').trim().replace(/\s+/g,'_')+'_'+today()+'.pdf');
}

/* =====================================================================
   IMPORT CENTER — Excel / CSV / PDF / Image (OCR) se data system mein
   ===================================================================== */
const IMPORT_TARGETS={
  products:{label:'Products (with opening stock)',fields:[
    ['name','Product name',1,['product','item','name','description','product name','item name','sku name']],
    ['sku','SKU / code',0,['sku','code','item code','barcode']],
    ['brand','Brand',0,['brand','company','principal']],
    ['category','Category',0,['category','group','type']],
    ['packing','Carton packing (pcs)',0,['packing','pack','pcs/ctn','pcs per ctn','carton packing','ctn size','units']],
    ['costCtn','Cost / carton',0,['cost','list price','purchase price','cost/ctn','list price/ctn','tp/ctn','price/ctn']],
    ['tradePc','Trade price / pc',0,['trade','trade price','tp','trade/pc','tp/pc','rate']],
    ['retailPc','Retail price / pc',0,['retail','retail price','mrp','rp','retail/pc']],
    ['openingCtn','Opening cartons',0,['opening ctn','cartons','ctn','stock ctn','qty ctn','opening']],
    ['openingPcs','Opening loose pcs',0,['opening pcs','loose','pcs','pieces','loose pcs']]]},
  shops:{label:'Shops / customers',fields:[
    ['name','Shop name',1,['shop','shop name','customer','name','store']],
    ['owner','Owner',0,['owner','owner name','contact person']],
    ['phone','Phone',0,['phone','mobile','contact','cell']],
    ['route','Route / area',0,['route','area','sector','beat']],
    ['address','Address',0,['address','location']],
    ['booker','Booker (username)',0,['booker','order booker','salesman','username']],
    ['creditLimit','Credit limit',0,['credit limit','limit']],
    ['opening','Opening balance',0,['opening','balance','opening balance','due','outstanding']]]},
  purchaseItems:{label:'Purchase invoice items',fields:[
    ['name','Product name',1,['product','item','name','description','product name']],
    ['brand','Brand',0,['brand','company']],
    ['category','Category',0,['category','group']],
    ['packing','Carton packing (pcs)',0,['packing','pack','pcs/ctn','carton packing','units']],
    ['ctn','Cartons',0,['ctn','cartons','qty','quantity','qty ctn']],
    ['pcs','Loose pcs',0,['pcs','loose','pieces']],
    ['costCtn','Cost / carton',0,['cost','list price','price','rate','cost/ctn','amount/ctn']],
    ['tradePc','Trade price / pc',0,['trade','trade price','tp']],
    ['retailPc','Retail price / pc',0,['retail','retail price','mrp']]]}
};
async function readTabular(file){
  const name=file.name.toLowerCase();
  if(/\.(xlsx|xls|csv|ods)$/.test(name)){
    if(!window.XLSX)throw new Error('Excel library did not load. Please turn on the internet.');
    const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:'array'});const ws=wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false}).filter(r=>r.some(c=>String(c).trim()!==''));
  }
  if(/\.pdf$/.test(name)){
    toast('Reading PDF…');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;const rows=[];
    for(let pg=1;pg<=pdf.numPages;pg++){
      const tc=await (await pdf.getPage(pg)).getTextContent();const lines={};
      tc.items.forEach(it=>{if(!it.str.trim())return;const y=Math.round(it.transform[5]/3)*3;(lines[y]=lines[y]||[]).push({x:it.transform[4],w:it.width,s:it.str})});
      Object.keys(lines).map(Number).sort((a,b)=>b-a).forEach(y=>{const its=lines[y].sort((a,b)=>a.x-b.x);const cells=[];let cur=null;
        its.forEach(it=>{if(cur&&it.x-(cur.x+cur.w)<6){cur.s+=(it.x-(cur.x+cur.w)>1.5?' ':'')+it.s;cur.w=it.x+it.w-cur.x}else{cur={x:it.x,w:it.w,s:it.s};cells.push(cur)}});
        rows.push(cells.map(c=>c.s.trim()))});
    }
    return rows;
  }
  if(/\.(png|jpe?g|webp|bmp)$/.test(name)||file.type.startsWith('image/')){
    toast('Reading text from image (OCR)… this may take a moment');
    await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
    const r=await Tesseract.recognize(file,'eng');
    return textToRows(r.data.text);
  }
  if(/\.(txt)$/.test(name))return textToRows(await file.text());
  throw new Error('This file type is not supported. Please use Excel, CSV, PDF or an image.');
}
function textToRows(text){
  return String(text).split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{
    let cells=l.split(/\t|\s{2,}|\s*\|\s*/).map(x=>x.trim()).filter(Boolean);
    if(cells.length<2){const m=l.match(/^(.*?[^\d\s.,][^\s]*)\s+((?:[\d.,]+\s*)+)$/);if(m)cells=[m[1].trim(),...m[2].trim().split(/\s+/)]}
    return cells;
  });
}
function autoMap(rows,target){
  const fields=IMPORT_TARGETS[target].fields;let hdr=-1,best=0;
  rows.slice(0,15).forEach((r,ri)=>{let sc=0;r.forEach(c=>{const t=String(c).toLowerCase().trim();if(fields.some(f=>f[3].includes(t)))sc++});if(sc>best){best=sc;hdr=ri}});
  const map={};if(best>=2){const r=rows[hdr].map(c=>String(c).toLowerCase().trim());
    fields.forEach(f=>{let i=r.findIndex(c=>c===f[3][0]||f[3].includes(c));if(i<0)i=r.findIndex(c=>f[3].some(s=>c&&c.includes(s)));if(i>=0&&!Object.values(map).includes(i))map[f[0]]=i})}
  else{hdr=-1;fields.forEach((f,i)=>{map[f[0]]=i})}
  return{hdr,map};
}
async function openImport(target,onDone){
  const file=await pickFile('.xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.webp,.txt');if(!file)return;
  let rows;try{rows=await readTabular(file)}catch(e){console.error(e);return toast(e.message,true)}
  if(!rows.length)return toast('No data found in the file.',true);
  const T=IMPORT_TARGETS[target];let {hdr,map}=autoMap(rows,target);
  const maxC=Math.max(...rows.map(r=>r.length));
  const colName=i=>String.fromCharCode(65+(i%26))+(i>=26?Math.floor(i/26):'')+(hdr>=0&&rows[hdr][i]?' — '+rows[hdr][i]:'');
  const draw=()=>{
    const data=rows.slice(hdr+1);
    $('#mBody').innerHTML=`<p class="note">File: <b>${esc(file.name)}</b> — ${data.length} rows found. Select the correct column for each field, then check the preview below.</p>
    <div class="grid mt">${F('Header row',`<select id="impHdr">${opt([{v:-1,t:'No header'},...rows.slice(0,15).map((r,i)=>({v:i,t:'Row '+(i+1)+': '+r.slice(0,3).join(' | ').slice(0,40)}))],hdr)}</select>`)}
    ${T.fields.map(f=>F(f[1]+(f[2]?' *':''),`<select data-fld="${f[0]}">${opt([{v:'',t:'— skip —'},...Array.from({length:maxC},(_,i)=>({v:i,t:colName(i)}))],map[f[0]]??'')}</select>`)).join('')}</div>
    <h4 class="mt">Preview (first 15 rows)</h4>${table(T.fields.map(f=>({t:f[1]})),data.slice(0,15).map(r=>T.fields.map(f=>esc(map[f[0]]!==undefined&&map[f[0]]!==''?r[map[f[0]]]??'':''))))}`;
    $('#impHdr').onchange=e=>{hdr=N(e.target.value);const a=autoMap(rows.slice(hdr<0?0:hdr),target);if(hdr>=0)map=a.map;draw()};
    $$('#mBody [data-fld]').forEach(s=>s.onchange=()=>{map[s.dataset.fld]=s.value===''?undefined:N(s.value);draw()});
  };
  modal('Import: '+T.label,'',[{t:'Import',pri:1,fn:()=>{
    const data=rows.slice(hdr+1).map(r=>{const o={};T.fields.forEach(f=>{if(map[f[0]]!==undefined&&map[f[0]]!=='')o[f[0]]=String(r[map[f[0]]]??'').trim()});return o}).filter(o=>o.name&&!/^(total|grand total|sub ?total)$/i.test(o.name));
    if(!data.length)return toast('Select the product / shop name column.',true);
    const n=applyImport(target,data);closeModal();toast(n+' records imported.');onDone&&onDone(data);render();
  }}]);
  draw();
}
function upsertProduct(o){
  let p=DB.products.find(x=>(o.sku&&x.sku&&x.sku.toLowerCase()===String(o.sku).toLowerCase())||x.name.toLowerCase()===String(o.name).toLowerCase());
  if(!p){p={id:uid(),name:o.name,sku:o.sku||'',brand:'',category:'General',packing:1,costCtn:0,tradePc:0,retailPc:0,openingPcs:0,image:''};DB.products.push(p)}
  ['sku','brand','category'].forEach(k=>{if(o[k])p[k]=o[k]});
  ['packing','costCtn','tradePc','retailPc'].forEach(k=>{if(o[k]!==undefined&&o[k]!=='')p[k]=N(o[k])});
  if(!N(p.packing))p.packing=1;
  if(!N(p.tradePc)&&N(p.costCtn))p.tradePc=r2(N(p.costCtn)/N(p.packing));
  return p;
}
function applyImport(target,data){
  if(target==='products'){data.forEach(o=>{const p=upsertProduct(o);if(o.openingCtn!==undefined||o.openingPcs!==undefined)p.openingPcs=N(o.openingCtn)*N(p.packing)+N(o.openingPcs)});log('Import','Products import',data.length+' rows')}
  if(target==='shops'){data.forEach(o=>{let s=DB.shops.find(x=>x.name.toLowerCase()===o.name.toLowerCase()&&(!o.route||x.route===o.route));if(!s){s={id:uid(),name:o.name,openingDate:today(),creditLimit:N(S().defaultCreditLimit)};DB.shops.push(s)}
    ['owner','phone','route','address'].forEach(k=>{if(o[k])s[k]=o[k]});if(o.creditLimit)s.creditLimit=N(o.creditLimit);if(o.opening)s.opening=N(o.opening);
    if(o.booker){const b=DB.users.find(u=>u.username.toLowerCase()===o.booker.toLowerCase()||String(u.name).toLowerCase()===o.booker.toLowerCase());if(b)s.bookerId=b.id}});log('Import','Shops import',data.length+' rows')}
  if(target==='purchaseItems'){data.forEach(o=>{const p=upsertProduct({name:o.name,brand:o.brand,category:o.category,packing:o.packing,costCtn:o.costCtn,tradePc:o.tradePc,retailPc:o.retailPc});
    PUR.items.push(purItemFrom(p,N(o.ctn),N(o.pcs),N(o.costCtn)||N(p.costCtn)))});}
  save();return data.length;
}
/* =====================================================================
   SHELL — navigation, branding, mobile app layout
   ===================================================================== */
let CUR='dashboard';
const VIEWS={};
/* =====================================================================
   THEMES + DAY / NIGHT — each theme sets colours, fonts and a structure
   (soft = rounded, corp = flat ruled business, neon = gaming HUD)
   ===================================================================== */
const LIGHT_BASE={bg:'#f1f2f7',card:'#ffffff',ink:'#191c33','ink-hi':'#191c33',mute:'#5d6385',line:'#e0e2ee',soft:'#f5f6fb','soft-2':'#eceef7',field:'#ccd0e2','field-bg':'#ffffff','btn-bg':'#ffffff','th-ink':'#3c4166',ok:'#157f3b',warn:'#a86108',bad:'#b42318',info:'#1d5fa8','accent-ink':'#ffffff','lead-ink':'#ffffff','side-head':'#ffffff',saffron:'#f0a531',hot:'#e0217d',grid:'#7887ff','accent-2':'#5b6bd6',cut:'14px'};
const DARK_BASE={bg:'#0f1222',card:'#171b30',ink:'#e6e8f5','ink-hi':'#ffffff',mute:'#9aa0c4',line:'#272c48',soft:'#1b2038','soft-2':'#222846',field:'#363c62','field-bg':'#12162a','btn-bg':'#1b2038','th-ink':'#c4c8e6',ok:'#4ade80',warn:'#fbbf24',bad:'#f87171',info:'#60a5fa','accent-ink':'#0b0e1c','lead-ink':'#ffffff','side-head':'#ffffff',saffron:'#f5b041',hot:'#ff4fa0',grid:'#7887ff','accent-2':'#8c9eff',cut:'14px'};
const THEMES={
 classic:{name:'Classic',group:'Normal',st:'soft',head:'Onest',body:'Onest',r:[16,10,8],brand:true,
   day:{'side-2':'#262a4f','side-ink':'#dfe2f5','side-mute':'#9198c4'},
   night:{side:'#0b0e1c','side-2':'#191d38','side-ink':'#d4d8f2','side-mute':'#8a91bd'}},
 fresh:{name:'Mint Fresh',group:'Normal',st:'soft',head:'Nunito',body:'Nunito',r:[20,14,12],
   day:{bg:'#eef6f3',ink:'#13302b','ink-hi':'#13302b',mute:'#58706b',line:'#d7e8e2',soft:'#f3faf7','soft-2':'#e3f1ec',field:'#bfd8cf','th-ink':'#2d4a44',accent:'#0f9d7a',side:'#0f3d36','side-2':'#185247','side-ink':'#d6efe8','side-mute':'#8dbcb0',saffron:'#ffb347',hot:'#ff6f61'},
   night:{bg:'#0b1715',card:'#11211e',ink:'#e3f3ee',mute:'#8fb3aa',line:'#1f3632',soft:'#142824','soft-2':'#1a322d',field:'#2c4a44','field-bg':'#0d1b18','btn-bg':'#142824','th-ink':'#bfe0d6',accent:'#34d3a7','accent-ink':'#05211a',side:'#081210','side-2':'#12251f','side-ink':'#d6efe8','side-mute':'#7fa89d',saffron:'#ffb347',hot:'#ff8a7a'}},
 corporate:{name:'NexaFlow Modern',group:'Professional',st:'corp',head:'Manrope',body:'Manrope',r:[18,12,9],
   day:{bg:'#f3f7f5',card:'#ffffff',ink:'#172b27','ink-hi':'#10251f',mute:'#60746e',line:'#dbe8e2',soft:'#f7fbf9','soft-2':'#eaf3ee',field:'#c6d9d0','th-ink':'#24483d',accent:'#087f68',side:'#123b32','side-2':'#1b5144','side-ink':'#e3f4ed','side-mute':'#9dc7b8','side-head':'#ffffff','lead-ink':'#172b27',saffron:'#e7a64b',hot:'#cb6b4f'},
   night:{bg:'#0d1714',card:'#14231e',ink:'#e6f2ec',mute:'#9ab6aa',line:'#294137',soft:'#192b24','soft-2':'#20382e',field:'#3b5b4e','field-bg':'#101c17','btn-bg':'#192b24','th-ink':'#c7e4d6',accent:'#49c6a0','accent-ink':'#06271c',side:'#09130f','side-2':'#142820','side-ink':'#d9efe5','side-mute':'#89b5a3',saffron:'#efb35e',hot:'#ff9278'}},
 ledger:{name:'Ledger Green',group:'Professional',st:'corp',head:'Source Serif 4',body:'Source Sans 3',r:[2,2,2],
   day:{bg:'#f3f4f1',ink:'#1d2621','ink-hi':'#1d2621',mute:'#5f6b63',line:'#dde2dc',soft:'#f7f8f5','soft-2':'#ebefe9',field:'#c4ccc4','th-ink':'#34433a',accent:'#1e6b4a',side:'#fbfcfa','side-2':'#eef2ec','side-ink':'#2f3b34','side-mute':'#7b877f','side-head':'#14301f','lead-ink':'#1d2621'},
   night:{bg:'#0f1411',card:'#161d19',ink:'#e2e9e4',mute:'#94a399',line:'#26302a',soft:'#1a221d','soft-2':'#202a24',field:'#35423a','field-bg':'#121814','btn-bg':'#1a221d','th-ink':'#c4d2c8',accent:'#5ccf97','accent-ink':'#06170e',side:'#121814','side-2':'#1a221d','side-ink':'#cfd9d2','side-mute':'#7f8e84'}},
 executive:{name:'Executive Gold',group:'Professional',st:'corp',head:'Lora',body:'Libre Franklin',r:[2,2,2],
   day:{bg:'#f4f3f1',ink:'#1c1b19','ink-hi':'#1c1b19',mute:'#6b6760',line:'#e2dfda',soft:'#f8f7f5','soft-2':'#eeebe6',field:'#cfc9c0','th-ink':'#3d3a35',accent:'#9a7633',side:'#1c1b19','side-2':'#2a2825','side-ink':'#e7e2d8','side-mute':'#a39b8c',saffron:'#c9a55a'},
   night:{bg:'#121110',card:'#1b1a18',ink:'#ece7de',mute:'#a49d90',line:'#2e2b27',soft:'#211f1d','soft-2':'#282522',field:'#3d3934','field-bg':'#161513','btn-bg':'#211f1d','th-ink':'#d6cfc2',accent:'#d4ad62','accent-ink':'#1a1306',side:'#0d0c0b','side-2':'#1f1d1a','side-ink':'#e7e2d8','side-mute':'#9a9283',saffron:'#d4ad62'}},
 neon:{name:'Neon Arena',group:'Gaming',st:'neon',head:'Chakra Petch',body:'Onest',r:[6,5,4],nightFirst:true,
   night:{accent:'#27e0e8','accent-2':'#52f0c8',hot:'#ff3d9a',saffron:'#ffb02e',side:'#0c1028','side-2':'#171d45','side-ink':'#d7dcff','side-mute':'#7f88c4',bg:'#080b1c',card:'#10142f',ink:'#e9ecff',mute:'#8f97cc',line:'rgba(120,135,255,.2)',soft:'#151a3c','soft-2':'#1a2050',field:'rgba(120,135,255,.32)','field-bg':'#0b0f26','btn-bg':'rgba(255,255,255,.03)','th-ink':'#27e0e8',ok:'#3dfc8b',warn:'#ffb02e',bad:'#ff4d6d',info:'#5aa8ff','accent-ink':'#04121a',grid:'#7887ff'},
   day:{bg:'#eef0fb',ink:'#12163a','ink-hi':'#0b0e2a',mute:'#5a6196',line:'rgba(80,95,220,.22)',soft:'#f2f3fd','soft-2':'#e6e9fb',field:'rgba(80,95,220,.35)','th-ink':'#0a7f8e',accent:'#0896a8','accent-2':'#14b88f',hot:'#e0217d',saffron:'#e89400',side:'#12163a','side-2':'#1d2358','side-ink':'#d7dcff','side-mute':'#8b93d0',ok:'#0f9f55',warn:'#c27a00',bad:'#d92d4b',grid:'#5060dc'}},
 inferno:{name:'Inferno',group:'Gaming',st:'neon',head:'Rajdhani',body:'Onest',r:[6,5,4],nightFirst:true,
   night:{accent:'#ff5a1f','accent-2':'#ffb800',hot:'#ff2e63',saffron:'#ffc23d',side:'#160a08','side-2':'#2a1410','side-ink':'#ffd9cc','side-mute':'#b38878',bg:'#0d0605',card:'#1a0e0b',ink:'#ffece5',mute:'#c09a8c',line:'rgba(255,120,80,.2)',soft:'#22120e','soft-2':'#2c1712',field:'rgba(255,120,80,.32)','field-bg':'#140a08','btn-bg':'rgba(255,255,255,.03)','th-ink':'#ff8a52',ok:'#7dff6b',warn:'#ffc23d',bad:'#ff4d6d','accent-ink':'#1a0700',grid:'#ff7850'},
   day:{bg:'#fff3ee',ink:'#2a110a','ink-hi':'#1a0904',mute:'#8a5a4a',line:'rgba(220,90,40,.22)',soft:'#fff8f5','soft-2':'#ffe9df',field:'rgba(220,90,40,.35)','th-ink':'#c2410c',accent:'#e2480f','accent-2':'#f29a00',hot:'#d91b55',saffron:'#e89400',side:'#2a110a','side-2':'#3d1a10','side-ink':'#ffd9cc','side-mute':'#c08a78',ok:'#178a3e',warn:'#b86e00',bad:'#d0213f',grid:'#dc5a28'}},
 toxic:{name:'Toxic Lime',group:'Gaming',st:'neon',head:'Exo 2',body:'Onest',r:[6,5,4],nightFirst:true,
   night:{accent:'#a3ff3b','accent-2':'#3bffd0',hot:'#b44dff',saffron:'#ffd23b',side:'#0b0f0a','side-2':'#172113','side-ink':'#e0ffd0','side-mute':'#89a87c',bg:'#070a06',card:'#0f150d',ink:'#ecffe3',mute:'#9fbb93',line:'rgba(163,255,59,.18)',soft:'#141c11','soft-2':'#1a2516',field:'rgba(163,255,59,.3)','field-bg':'#0a0f08','btn-bg':'rgba(255,255,255,.03)','th-ink':'#a3ff3b',ok:'#3bffd0',warn:'#ffd23b',bad:'#ff5d7a','accent-ink':'#0b1400',grid:'#a3ff3b'},
   day:{bg:'#f3f8ee',ink:'#13200d','ink-hi':'#0c1608',mute:'#5d7352',line:'rgba(80,140,20,.22)',soft:'#f8fbf5','soft-2':'#e9f3df',field:'rgba(80,140,20,.35)','th-ink':'#3f7d00',accent:'#4c9a00','accent-2':'#00a37a',hot:'#8e2fd6',saffron:'#c99a00',side:'#13200d','side-2':'#1f3216','side-ink':'#e0ffd0','side-mute':'#8fb07f',ok:'#0f8a4a',warn:'#a87200',bad:'#c8243f',grid:'#50a014'}}
};
const FONT_W={'Manrope':'400;500;600;700;800','Onest':'400;500;600;700;800','Nunito':'400;600;700;800','IBM Plex Sans':'400;500;600;700','Source Serif 4':'500;600;700','Source Sans 3':'400;500;600;700','Lora':'500;600;700','Libre Franklin':'400;500;600;700','Chakra Petch':'500;600;700','Rajdhani':'500;600;700','Exo 2':'500;600;700;800'};
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}
function themeId(){let id=lsGet('ft_theme')||(DB&&S().theme)||'corporate';if(id==='gaming')id='neon';if(id==='neon'){id='corporate';lsSet('ft_theme','corporate')}return THEMES[id]?id:'corporate'}
function themeMode(){const m=lsGet('ft_mode')||(DB&&S().mode)||'auto';if(m==='day'||m==='night')return m;const th=THEMES[themeId()];if(th.nightFirst)return'night';return window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'night':'day'}
function applyTheme(){
  const id=themeId(),mode=themeMode(),th=THEMES[id],s=DB?S():{};
  const v=Object.assign({},mode==='night'?DARK_BASE:LIGHT_BASE,th[mode]||{});
  if(th.brand){if(mode==='day'){v.accent=s.accent||'#3949ab';v.side=s.sideColor||'#1a1d3a';v['side-2']=`color-mix(in srgb, ${v.side} 82%, white)`}else{v.accent=`color-mix(in srgb, ${s.accent||'#3949ab'} 60%, #c7ceff)`}}
  if(!v.accent)v.accent='#3949ab';if(!v.side)v.side='#1a1d3a';
  v['r-lg']=th.r[0]+'px';v.r=th.r[1]+'px';v['r-sm']=th.r[2]+'px';
  v.font=`"${th.body}","Segoe UI",system-ui,-apple-system,Roboto,"Noto Sans",Arial,sans-serif`;v.hud=`"${th.head}",${v.font}`;
  const r=document.documentElement.style;for(const k in v)r.setProperty('--'+k,v[k]);
  const b=document.body;['s-soft','s-corp','s-neon','gaming'].forEach(c=>b.classList.remove(c));b.classList.add('s-'+th.st);b.classList.toggle('mode-night',mode==='night');
  document.documentElement.style.colorScheme=mode==='night'?'dark':'light';document.documentElement.dataset.theme=id;document.documentElement.dataset.mode=mode;
  const fam=[...new Set([th.head,th.body])].map(f=>'family='+f.replace(/ /g,'+')+':wght@'+(FONT_W[f]||'400;600;700')).join('&');
  let l=document.getElementById('themeFont');if(!l){l=document.createElement('link');l.id='themeFont';l.rel='stylesheet';document.head.appendChild(l)}
  const href='https://fonts.googleapis.com/css2?'+fam+'&display=swap';if(l.href!==href)l.href=href;
  const m=document.querySelector('meta[name=theme-color]');if(m)m.content=String(v.side).startsWith('#')?v.side:'#1a1d3a';
  $$('[data-mode-btn]').forEach(x=>{x.textContent=mode==='night'?'☀️':'🌙';x.title=mode==='night'?'Switch to day mode':'Switch to night mode';x.setAttribute('aria-label',x.title)});
}
function toggleMode(){lsSet('ft_mode',themeMode()==='night'?'day':'night');applyTheme()}
function themePicker(){
  const cur=themeId(),mode=themeMode();const groups={};Object.entries(THEMES).forEach(([k,t])=>(groups[t.group]=groups[t.group]||[]).push([k,t]));
  const sw=(t,m)=>{const v=Object.assign({},m==='night'?DARK_BASE:LIGHT_BASE,t[m]||{});if(t.brand&&m==='day'){v.accent=S().accent||'#3949ab';v.side=S().sideColor||'#1a1d3a'}return v};
  modal('Theme & day / night',`<div class="row" style="margin-bottom:14px"><span class="small muted">Mode</span><div class="tabs" style="margin:0"><button data-pm="day" class="${mode==='day'?'on':''}">☀️ Day</button><button data-pm="night" class="${mode==='night'?'on':''}">🌙 Night</button></div></div>
   ${Object.entries(groups).map(([g,list])=>`<h4 style="margin:14px 0 8px">${esc(g)}</h4><div class="theme-grid">${list.map(([k,t])=>{const v=sw(t,mode);return`<button class="theme-card${k===cur?' on':''}" data-pt="${k}" style="--tc-bg:${v.bg||'#fff'};--tc-card:${v.card||'#fff'};--tc-side:${v.side||'#222'};--tc-acc:${v.accent||'#3949ab'};--tc-ink:${v.ink||'#111'};--tc-hot:${t.st==='neon'?(v.hot||v.accent):v.side}">
     <span class="tc-prev"><i class="tc-s"></i><i class="tc-m"><b></b><b></b><b class="tc-a"></b></i></span><span class="tc-name" style="font-family:'${t.head}',var(--font)">${esc(t.name)}</span><span class="tc-sub">${esc(t.st==='corp'?'Flat business layout':t.st==='neon'?'HUD layout, cut corners':'Rounded layout')} • ${esc(t.head)}</span></button>`}).join('')}</div>`).join('')}
   <p class="small muted mt">Your choice is saved on this device only. Other users and devices keep their own theme.</p>`,
   [{t:'Use developer default',fn:()=>{lsSet('ft_theme',null);lsSet('ft_mode',null);applyTheme();themePicker()}}]);
  $$('[data-pt]').forEach(b=>b.onclick=()=>{lsSet('ft_theme',b.dataset.pt);if(!lsGet('ft_mode')&&THEMES[b.dataset.pt].nightFirst)lsSet('ft_mode','night');applyTheme();themePicker()});
  $$('[data-pm]').forEach(b=>b.onclick=()=>{lsSet('ft_mode',b.dataset.pm);applyTheme();themePicker()});
}
function applyBranding(){
  const s=S();document.title=s.appName||'Distribution ERP';applyTheme();
  $('#loginTitle').textContent=s.loginTitle||s.appName;$('#loginSub').textContent=s.loginSub||'';
  $('#loginDev').textContent=s.devCredit||'';$('#loginDev2').textContent=s.devCredit||'';$('#loginCo').textContent=s.companyName||s.appName||'';if(s.tagline)$('#loginTag').textContent=s.tagline;$('#sideFoot').textContent=s.devCredit||'';
  $('#login').style.backgroundImage=s.loginBg?`url("${s.loginBg}")`:'';
  [['#loginLogo',s.logo],['#sideLogo',s.logo]].forEach(([q,src])=>{const im=$(q);if(src){im.src=src;im.classList.remove('hidden')}else im.classList.add('hidden')});
  $('#sideName').textContent=s.companyName||s.appName;$('#sideTag').textContent=s.tagline||'';
}
let REPORT_SELECTED='daily';
function buildNav(){
  const groups={};MODULES.filter(m=>canSee(m.id)).forEach(m=>(groups[m.group]=groups[m.group]||[]).push(m));
  $('#nav').innerHTML=Object.entries(groups).map(([g,ms])=>`<div class="nav-group"><span>${esc(g)}</span>${ms.map(m=>`<button class="nav-item${m.id===CUR?' on':''}" data-go="${m.id}"><i>${m.icon}</i>${esc(m.label)}</button>${m.id==='reports'&&CUR==='reports'?`<div class="report-subnav" aria-label="Available reports">${Object.entries(REPORTS).map(([k,r])=>`<button class="report-subitem${REPORT_SELECTED===k?' on':''}" data-report-key="${k}" title="Open ${esc(r.t)}">${esc(r.t)}</button>`).join('')}</div>`:''}`).join('')}</div>`).join('');
  const prefs={booker:['dashboard','pos','recovery','shops'],supplyman:['dashboard','collection','help'],kpo:['dashboard','pos','invoices','collection']}[ME.role]||['dashboard','pos','invoices','reports'];
  const bn=prefs.filter(canSee).slice(0,4).map(id=>MODULES.find(m=>m.id===id));
  $('#bottomNav').style.gridTemplateColumns=`repeat(${bn.length+1},1fr)`;
  $('#bottomNav').innerHTML=bn.map(m=>`<button data-go="${m.id}" class="${m.id===CUR?'on':''}"><i>${m.icon}</i>${esc(m.label.split(/[ /]/)[0])}</button>`).join('')+`<button data-menu="1"><i>☰</i>More</button>`;
}
function go(id){if(!canSee(id))id=MODULES.find(m=>canSee(m.id)).id;CUR=id;document.body.classList.remove('drawer');NAV_ANIM=true;render();window.scrollTo(0,0);try{history.replaceState(null,'','#'+id)}catch(e){}}
let NAV_ANIM=false;const KPI_LAST={};
const REDUCED=()=>!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
/* numbers count up from 0 on a new screen; on a live refresh only changed figures move and flash */
function countUp(cards,onlyChanged){
  cards.forEach(k=>{const lab=(k.querySelector('small')||{}).textContent||'';const b=k.querySelector('b');if(!b)return;
    const fin=b.textContent;const key=CUR+'|'+lab;const prev=KPI_LAST[key];KPI_LAST[key]=fin;
    if(onlyChanged&&(prev===undefined||prev===fin))return;
    if(onlyChanged){k.classList.remove('bump');void k.offsetWidth;k.classList.add('bump')}
    if(REDUCED())return;
    const nums=[],dec=[];fin.replace(/-?[\d,]+(\.\d+)?/g,m=>{nums.push(N(m));dec.push(m.includes('.'));return m});if(!nums.some(Boolean))return;
    const from=[];if(onlyChanged&&prev)prev.replace(/-?[\d,]+(\.\d+)?/g,m=>{from.push(N(m));return m});
    const t0=performance.now(),dur=onlyChanged?650:900;
    const step=now=>{if(!b.isConnected)return;const p=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-p,3);let i=0;
      b.textContent=p>=1?fin:fin.replace(/-?[\d,]+(\.\d+)?/g,()=>{const a=from[i]||0,z=nums[i],v=a+(z-a)*e,d=dec[i];i++;return fmt(d?v:Math.round(v))});if(p<1)requestAnimationFrame(step)};
    requestAnimationFrame(step)});
}
function render(){
  if(!ME)return;if(!canSee(CUR))CUR=MODULES.find(m=>canSee(m.id)).id;
  const od=dayEndOverdue();
  if(od){if(canSee('backup'))CUR='backup';else{$('#pageTitle').textContent='System locked';buildNav();$('#view').innerHTML=`<div class="card"><h3>🔒 System locked</h3><p>Day End for <b>${fmtDate(od)}</b> was not done before ${DAYEND_HOUR}:00 AM. No entry can be made until the admin completes Day End.</p><p class="muted">The system will start working again automatically after Day End.</p></div>`;return}}
  const m=MODULES.find(x=>x.id===CUR);$('#pageTitle').textContent=m.label;buildNav();
  const v=$('#view');v.innerHTML='';try{(VIEWS[CUR]||(()=>v.innerHTML='<div class="card">Coming soon</div>'))(v)}catch(e){console.error(e);v.innerHTML=`<div class="card"><b>There was a problem on this screen:</b> ${esc(e.message)}</div>`}
  if(od)v.insertAdjacentHTML('afterbegin',`<div class="note" style="margin-bottom:12px;border-color:#d9534f">🔒 <b>System locked.</b> Day End for ${fmtDate(od)} was not done before ${DAYEND_HOUR}:00 AM. Only Day End can be done now; the system resumes right after it.</div>`);
  const anim=NAV_ANIM;NAV_ANIM=false;
  if(anim){v.classList.remove('enter');void v.offsetWidth;v.classList.add('enter');clearTimeout(render._t);render._t=setTimeout(()=>v.classList.remove('enter'),900)}
  countUp(v.querySelectorAll('.kpi'),!anim);
}
function startApp(){
  $('#login').style.display='none';$('#app').classList.add('on');applyBranding();
  $('#avatar').textContent=(ME.name||ME.username)[0].toUpperCase();$('#uName').textContent=ME.name||ME.username;$('#uRole').textContent=ME.role==='developer'?'Developer':ROLES[ME.role]||ME.role;
  $('#uMenuInfo').textContent=(ME.name||ME.username)+' • '+$('#uRole').textContent;
  tickClock();
  const h=location.hash.slice(1);go(h&&MODULES.some(m=>m.id===h)?h:'dashboard');
}
document.addEventListener('click',e=>{
  const rp=e.target.closest('[data-report-key]');if(rp){REPORT_SELECTED=rp.dataset.reportKey;go('reports');return}
  const g=e.target.closest('[data-go]');if(g){if(g.dataset.go==='reports'&&CUR!=='reports')REPORT_SELECTED='daily';go(g.dataset.go);return}
  if(e.target.closest('[data-menu]')||e.target.closest('#menuBtn')){document.body.classList.toggle('drawer');return}
  if(e.target.closest('#scrim')){document.body.classList.remove('drawer');return}
  if(e.target.closest('#userBtn')){$('#userMenu').classList.toggle('on');return}
  const a=e.target.closest('#userMenu [data-act]');if(a){$('#userMenu').classList.remove('on');a.dataset.act==='logout'?logout():a.dataset.act==='theme'?themePicker():changePasswordDialog(false);return}
  if(e.target.closest('[data-mode-btn]')){toggleMode();return}
  if(!e.target.closest('#userMenu'))$('#userMenu').classList.remove('on');
});

/* small reusable: filter bar + report output (Print / Excel / PDF) */
function reportBlock(el,def){
  // def:{title, printType, filters:html, build:()=>({cols,rows,foot,sub,cards,printBody})}
  el.innerHTML=`<div class="card"><h3>${esc(def.title)}<span class="sp"></span><button class="btn sm" data-r="print">🖨️ Print</button><button class="btn sm" data-r="xls">📊 Excel</button><button class="btn sm" data-r="pdf">📄 PDF</button></h3>
   ${def.filters?`<div class="grid">${def.filters}</div><div class="row mt"><button class="btn pri" data-r="run">Generate report</button></div>`:''}
   <div data-r="out" class="mt"></div></div>`;
  let R=null;const out=el.querySelector('[data-r=out]');
  const run=()=>{R=def.build();out.innerHTML=(R.cards?`<div class="kpis">${R.cards.map(c=>`<div class="kpi"><small>${esc(c[0])}</small><b>${c[1]}</b></div>`).join('')}</div>`:'')+(R.html||'')+(R.cols?table(R.cols,R.rows.map(r=>r.map(v=>typeof v==='number'?fmt(v):esc(v))),R.foot&&R.foot.map(v=>typeof v==='number'?fmt(v):esc(v))):'');def.after&&def.after(out,R)};
  el.querySelector('[data-r=run]')&&(el.querySelector('[data-r=run]').onclick=run);
  const fx=a=>a.map(v=>typeof v==='number'?fmt(v):v);
  el.querySelector('[data-r=print]').onclick=()=>{if(!R)run();printDoc(def.printType||'report',R.printBody||((R.cards?`<table class="kv">${R.cards.map(c=>`<tr><td>${esc(c[0])}</td><td>${c[1]}</td></tr>`).join('')}</table>`:'')+(R.cols?tableHTMLPrint(R.cols,R.rows.map(fx),R.foot&&fx(R.foot)):'')),{title:(def.printType&&def.printType!=='report'?undefined:def.title),sub:R.sub})};
  el.querySelector('[data-r=xls]').onclick=()=>{if(!R)run();if(!R.cols)return toast('Excel is not available for this report.',true);exportExcel(def.title,R.cols,R.rows,R.foot)};
  el.querySelector('[data-r=pdf]').onclick=()=>{if(!R)run();if(!R.cols)return toast('Use the Print button and choose Save as PDF.',true);exportPDF(def.title,R.cols,R.rows.map(fx),R.foot&&fx(R.foot),R.sub)};
  run();return{run};
}
const dateRange=(p,from,to)=>F('From',inp(p+'From',from||thisMonth()+'-01','date'))+F('To',inp(p+'To',to||today(),'date'));

/* =====================================================================
   DASHBOARD
   ===================================================================== */
const LIVE_STRIP=()=>{LIVE_AT=new Date();return`<div class="live"><b>Live</b><span>Figures refresh automatically • last updated ${timeText(LIVE_AT,true)}</span></div>`};
VIEWS.dashboard=el=>{VIEWS._dash(el);el.insertAdjacentHTML('afterbegin',LIVE_STRIP())};
VIEWS._dash=el=>{
  const t=today();
  if(ME.role==='booker'||ME.role==='supplyman'){
    const myInv=activeInv().filter(i=>ME.role==='booker'?i.bookerId===ME.id:i.supplymanId===ME.id);
    const myShops=visibleShops();const credit=sum(myShops,s=>Math.max(0,shopDue(s.id)));
    const adv=sum(DB.staffAdv.filter(a=>a.staffId===ME.id),a=>a.amount);
    el.innerHTML=`<div class="kpis">
      <div class="kpi lead"><small>Sales today</small><b>${money(sum(myInv.filter(i=>i.date===t),i=>i.net))}</b></div>
      <div class="kpi"><small>Sales this month</small><b>${money(sum(myInv.filter(i=>monthOf(i.date)===thisMonth()),i=>i.net))}</b></div>
      ${ME.role==='booker'?`<div class="kpi"><small>My shops</small><b>${myShops.length}</b></div><div class="kpi"><small>Market credit</small><b>${money(credit)}</b></div>`:''}
      <div class="kpi"><small>Pending recovery approvals</small><b>${DB.recoveries.filter(r=>r.status==='pending'&&r.collectorId===ME.id).length}</b></div>
      <div class="kpi"><small>My advance / loan</small><b>${money(adv)}</b></div></div>
      <div class="card"><h3>Quick actions</h3><div class="row">${['pos','recovery','shops','collection'].filter(canSee).map(id=>{const m=MODULES.find(x=>x.id===id);return`<button class="btn" data-go="${id}">${m.icon} ${esc(m.label)}</button>`}).join('')}</div></div>
      ${ME.role==='booker'?`<div class="card"><h3>Shops with credit due</h3>${table([{t:'Shop'},{t:'Route'},{t:'Outstanding',n:1}],myShops.map(s=>[s,shopDue(s.id)]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).map(([s,d])=>[esc(s.name),esc(s.route||''),fmt(d)]))}</div>`:''}
      <div class="card"><h3>My invoices today</h3>${table([{t:'Inv #'},{t:'Shop'},{t:'Type'},{t:'Amount',n:1}],myInv.filter(i=>i.date===t).map(i=>[esc(i.no),esc(i.shopName),i.payType,fmt(i.net)]))}</div>`;
    return;
  }
  const P=pnl(t,t),M=pnl(thisMonth()+'-01',t);
  const credit=sum(DB.shops,s=>Math.max(0,shopDue(s.id)));
  const stockVal=sum(DB.products,p=>Math.max(0,stockOf(p.id))*costPerPc(p.id));
  const cash=sum(DB.accounts,a=>accountBalance(a.id));
  const pend=DB.recoveries.filter(r=>r.status==='pending');
  const todayRec=sum(approvedRec().filter(r=>(r.approvedDate||r.date)===t),r=>r.amount)+sum(DB.collections.filter(c=>c.date===t),c=>c.amount);
  const low=DB.products.map(p=>[p,stockOf(p.id)]).filter(x=>x[1]<=N(x[0].packing)).slice(0,12);
  const bkAge=DB.meta.lastBackup?(Date.now()-DB.meta.lastBackup)/86400000:999;
  el.innerHTML=((DB.meta.reopen||DB.meta.pendingBackup)&&canSee('backup')?`<div class="note" style="margin-bottom:12px;border-color:#e0b25a;background:#fdf6e7">${DB.meta.reopen?'🔓 Day end was moved back to '+fmtDate(DB.meta.reopen.from)+' by the developer. Finish the entries and do Day End again.':''} ${DB.meta.pendingBackup?'⛔ Backup after Day End is not confirmed.':''} <button class="btn sm" data-go="backup">Open Backup & day end</button></div>`:'')+(bkAge>1&&canSee('backup')?`<div class="note" style="margin-bottom:12px;border-color:#e0b25a;background:#fdf6e7">⚠️ ${DB.meta.lastBackup?'Last backup was taken '+Math.floor(bkAge)+' day(s) ago.':'No backup has been taken yet.'} Data is stored only on this device. <button class="btn sm" data-go="backup">Take backup</button></div>`:'')+`<div class="kpis">
    <div class="kpi lead"><small>Net sales today</small><b>${money(P.sales)}</b></div>
    <div class="kpi"><small>Recovery today</small><b>${money(todayRec)}</b></div>
    <div class="kpi"><small>Total market credit</small><b>${money(credit)}</b></div>
    <div class="kpi"><small>Cash + bank balance</small><b>${money(cash)}</b></div>
    <div class="kpi"><small>Stock value (cost)</small><b>${money(stockVal)}</b></div>
    <div class="kpi"><small>Sales this month</small><b>${money(M.sales)}</b></div>
    <div class="kpi"><small>Net profit this month</small><b>${money(M.net)}</b></div>
    <div class="kpi"><small>Expenses this month</small><b>${money(M.exp)}</b></div>
    <div class="kpi"><small>Supplier dues</small><b>${money(sum(supplierList(),s=>Math.max(0,supplierDue(s))))}</b></div>
    <div class="kpi"><small>Pending recoveries</small><b>${pend.length} • ${money(sum(pend,r=>r.amount))}</b></div></div>
    <div class="grid g2">
     <div class="card"><h3>Booker performance (this month)</h3>${table([{t:'Booker'},{t:'Invoices',n:1},{t:'Sales',n:1},{t:'Credit given',n:1}],usersByRole('booker').map(b=>{const iv=activeInv().filter(i=>i.bookerId===b.id&&monthOf(i.date)===thisMonth());return[esc(b.name||b.username),iv.length,fmt(sum(iv,i=>i.net)),fmt(sum(iv,i=>invDue(i)))]}))}</div>
     <div class="card"><h3>Low stock products<span class="sp"></span><button class="btn sm" data-go="products">View all</button></h3>${table([{t:'Product'},{t:'Stock'}],low.map(([p,s])=>[esc(p.name),`<span class="badge ${s<=0?'bad':'warn'}">${splitPcs(p,s)}</span>`]))}</div>
    </div>
    <div class="card"><h3>Quick actions</h3><div class="row">${['pos','purchase','recovery','collection','expenses'].filter(canSee).map(id=>{const m=MODULES.find(x=>x.id===id);return`<button class="btn" data-go="${id}">${m.icon} ${esc(m.label)}</button>`}).join('')}</div></div>`;
};

/* =====================================================================
   POS — ORDER BOOKING
   ===================================================================== */
let POS={items:[],editId:null};
function posItemTotals(){const g=sum(POS.items,i=>i.gross),d=sum(POS.items,i=>i.disc);const tax=r2((g-d)*N(S().taxPercent)/100);return{g,d,tax,net:r2(g-d+tax)}}
VIEWS.pos=el=>{
  const ed=POS.editId?byId('invoices',POS.editId):null;
  if(!ed&&invLimitReached()){el.innerHTML=`<div class="card"><h3>Invoice limit reached</h3><p>${invUsed()} / ${N(LIC().limit)||200} invoices used. New invoices cannot be created until the full version is purchased.</p><div class="row mt"><button class="btn pri" id="posBuy">📞 Contact developer to purchase</button></div></div>`;$('#posBuy').onclick=showBuyDialog;return}
  const shops=visibleShops();const bookers=usersByRole('booker');const sms=usersByRole('supplyman');
  el.innerHTML=`<div class="card"><h3>${ed?'Invoice edit: '+esc(ed.no):'New order'}<span class="sp"></span>${ed?'<button class="btn sm bad" id="posCancelEdit">Cancel edit</button>':''}</h3>
   <div class="grid">
    ${F('Order date',inp('pDate',ed?ed.date:today(),'date'))}
    ${F('Delivery date',inp('pDel',ed?ed.deliveryDate:addDays(today(),1),'date'))}
    ${F('Order booker',ME.role==='booker'?`<input readonly value="${esc(ME.name||ME.username)}"><input type="hidden" id="pBooker" value="${ME.id}">`:sel('pBooker',[...bookers,...DB.users.filter(u=>u.role==='admin')].map(u=>({v:u.id,t:u.name||u.username})),ed?ed.bookerId:(bookers[0]||{}).id))}
    ${F('Supply man',sel('pSM',sms.map(u=>({v:u.id,t:u.name||u.username})),ed?ed.supplymanId:'','— later —'))}
    ${F('Shop',sel('pShop',shops.map(s=>({v:s.id,t:shopLabel(s)})),ed?ed.shopId:'','Select shop'),'full-m')}
    ${F('Payment',sel('pPay',[{v:'credit',t:'Credit'},{v:'cash',t:'Cash'}],ed?ed.payType:'credit'))}
    ${F('Cash account',sel('pAcc',accOptions(),ed?ed.accountId:'acc_cash'))}
   </div><div class="prod-hint" id="pShopInfo"></div></div>
   <div class="card"><h3>Add products</h3>
    <div class="grid">
     ${F('Product',`<input id="pProd" list="pProdList" placeholder="Type name or code"><datalist id="pProdList">${DB.products.map(p=>`<option value="${esc(p.name)}">${esc([p.sku,p.brand].filter(Boolean).join(' • '))}</option>`).join('')}</datalist>`,'wide')}
     ${F('Cartons',inp('pCtn','','number','min="0" inputmode="numeric"'))}
     ${F('Pieces',inp('pPcs','','number','min="0" inputmode="numeric"'))}
     ${F('Trade price / pc',inp('pRate','','number','step="0.01" inputmode="decimal"'))}
     ${F('Discount type',sel('pDType',[{v:'pct',t:'% percent'},{v:'pc',t:'Rs per piece'},{v:'flat',t:'Rs total'}],'pct'))}
     ${F('Discount',inp('pDVal','','number','step="0.01" inputmode="decimal"'))}
    </div><div class="prod-hint" id="pHint"></div>
    <div class="row mt"><button class="btn pri" id="pAdd">+ Add item</button></div>
    <div class="mt" id="pItems"></div>
    <div class="totals" id="pTotals"></div>
    <div class="row end mt"><button class="btn" id="pSave">💾 Save</button><button class="btn pri" id="pSavePrint">🖨️ Save & print</button></div>
   </div>`;
  const findP=()=>{const v=V('pProd').toLowerCase();return DB.products.find(p=>p.name.toLowerCase()===v||(p.sku&&p.sku.toLowerCase()===v))};
  const shopInfo=()=>{const sh=byId('shops',V('pShop'));$('#pShopInfo').innerHTML=sh?`Outstanding: <b>${money(shopDue(sh.id)-(ed&&ed.shopId===sh.id?invDue(ed):0))}</b>${N(sh.creditLimit)?' • Credit limit: '+money(sh.creditLimit):''}${sh.phone?' • '+esc(sh.phone):''}`:''};
  $('#pShop').onchange=()=>{const sh=byId('shops',V('pShop'));if(sh&&sh.bookerId&&ME.role!=='booker'&&$('#pBooker').tagName==='SELECT')$('#pBooker').value=sh.bookerId;shopInfo()};shopInfo();
  $('#pProd').oninput=()=>{const p=findP();if(!p){$('#pHint').textContent='';return}
    const inCart=sum(POS.items.filter(i=>i.productId===p.id),i=>i.pcs);const st=stockOf(p.id,POS.editId)-inCart;
    $('#pRate').value=p.tradePc||'';$('#pHint').innerHTML=`Stock: <b>${splitPcs(p,st)}</b> (${fmt(st)} pcs) • Packing ${p.packing} • Trade/ctn ${money(N(p.tradePc)*N(p.packing))} • Retail/pc ${money(p.retailPc)}`};
  let editingItemIndex=null;
  const draw=()=>{
    $('#pItems').innerHTML=table([{t:'Product'},{t:'Qty'},{t:'Rate',n:1},{t:'Discount',n:1},{t:'Total',n:1},{t:'Edit'},{t:''}],POS.items.map((it,ix)=>[esc(it.name),it.qtyEntryMode==='pcs'?`${it.enteredPcs} pcs`:splitPcs({packing:it.packing},it.pcs),fmt(it.rate),fmt(it.disc),fmt(it.gross-it.disc),`<button class="btn sm" data-edititem="${ix}">✏️</button>`,`<button class="btn sm bad" data-rm="${ix}">✕</button>`]));
    $$('#pItems [data-rm]').forEach(b=>b.onclick=()=>{const ix=+b.dataset.rm;POS.items.splice(ix,1);if(editingItemIndex===ix)editingItemIndex=null;else if(editingItemIndex!==null&&ix<editingItemIndex)editingItemIndex--;draw()});
    $$('#pItems [data-edititem]').forEach(b=>b.onclick=()=>{
      const ix=+b.dataset.edititem,it=POS.items[ix],prod=byId('products',it.productId);if(!it||!prod)return toast('Product record not found.',true);
      editingItemIndex=ix;$('#pProd').value=prod.name;$('#pCtn').value=Math.floor(N(it.pcs)/(N(it.packing)||1));$('#pPcs').value=N(it.pcs)%(N(it.packing)||1);$('#pRate').value=it.rate;$('#pDType').value=it.discType||'flat';$('#pDVal').value=it.discVal??it.disc??0;$('#pAdd').textContent='✓ Update item';$('#pHint').textContent='Editing '+it.name+' — change quantity, rate or discount, then click Update item.';$('#pProd').dispatchEvent(new Event('input'));$('#pRate').value=it.rate;$('#pDType').value=it.discType||'flat';$('#pDVal').value=it.discVal??it.disc??0;$('#pProd').focus();
    });
    const T=posItemTotals();$('#pTotals').innerHTML=`<span>Gross</span><b>${money(T.g)}</b><span>Discount</span><b>${money(T.d)}</b>${N(S().taxPercent)?`<span>Tax ${S().taxPercent}%</span><b>${money(T.tax)}</b>`:''}<span class="big">Net total</span><b class="big">${money(T.net)}</b>`;
  };
  $('#pAdd').onclick=()=>{
    const p=findP();if(!p)return toast('Select a product from the list.',true);
    if(N(V('pCtn'))<0||N(V('pPcs'))<0||!Number.isInteger(N(V('pCtn')))||!Number.isInteger(N(V('pPcs'))))return toast('Cartons and pieces must be non-negative whole numbers.',true);const pcs=N(V('pCtn'))*N(p.packing)+N(V('pPcs'));if(pcs<=0)return toast('Enter cartons or pieces.',true);
    const inCart=sum(POS.items.filter((i,ix)=>i.productId===p.id&&ix!==editingItemIndex),i=>i.pcs);const st=stockOf(p.id,POS.editId)-inCart;
    if(pcs>st&&!S().allowNegativeStock)return toast(`Not enough stock. Only ${splitPcs(p,st)} available.`,true);
    const rate=N(V('pRate'))||N(p.tradePc);const gross=r2(pcs*rate);const dt=V('pDType'),dv=N(V('pDVal'));
    const disc=r2(dt==='pct'?gross*dv/100:dt==='pc'?pcs*dv:dv);
    if(rate<0||dv<0||disc>gross+0.001)return toast('Rate and discount must be valid; discount cannot exceed item amount.',true);
    const enteredCtn=N(V('pCtn')),enteredPcs=N(V('pPcs'));const item={productId:p.id,name:p.name,brand:p.brand||'',packing:N(p.packing),pcs,qtyEntryMode:enteredCtn>0?'ctn':'pcs',enteredCtn,enteredPcs:enteredCtn>0?enteredPcs:pcs,rate,retail:N(p.retailPc),gross,discType:dt,discVal:dv,disc,cost:r2(costPerPc(p.id))};
    if(editingItemIndex!==null){POS.items[editingItemIndex]=item;editingItemIndex=null;$('#pAdd').textContent='+ Add item';toast('Invoice item updated.')}else POS.items.push(item);
    ['pProd','pCtn','pPcs','pRate','pDVal'].forEach(i=>$('#'+i).value='');$('#pHint').textContent='';$('#pProd').focus();draw();
  };
  const saveInv=print=>{
    if(!ed&&invLimitReached())return showBuyDialog();
    const shop=byId('shops',V('pShop'));if(!shop)return toast('Select a shop.',true);if(!(ed?guardEdit(V('pDate'),ed.date):guard(V('pDate'))))return;if(!POS.items.length)return toast('Add at least one item.',true);
    if(!V('pDate')||!V('pDel')||V('pDel')<V('pDate'))return toast('Enter valid order and delivery dates.',true);
    if(!byId('accounts',V('pAcc')||'acc_cash'))return toast('Select a valid cash account.',true);
    for(const it of POS.items){if(!byId('products',it.productId))return toast('A selected product no longer exists. Refresh the invoice.',true);const available=stockOf(it.productId,POS.editId)-sum(POS.items.filter(x=>x.productId===it.productId&&x!==it),x=>x.pcs);if(it.pcs>available&&!S().allowNegativeStock)return toast('Stock changed while preparing the invoice. Check '+it.name+' and try again.',true)}
    const T=posItemTotals();if(T.net<0||T.d>T.g+0.001)return toast('Invoice discount cannot exceed the gross total.',true);const due=shopDue(shop.id)-(ed&&ed.shopId===shop.id?invDue(ed):0);
    if(V('pPay')==='credit'&&N(shop.creditLimit)&&due+T.net>N(shop.creditLimit)){if(S().creditLimitBlock)return toast('Credit limit exceeded. Order not saved.',true);if(!confirm('This exceeds the credit limit. Save anyway?'))return}
    const bk=byId('users',V('pBooker')),sm=byId('users',V('pSM'));
    const rec={date:V('pDate'),deliveryDate:V('pDel')||V('pDate'),bookerId:V('pBooker'),bookerName:bk?bk.name||bk.username:'',supplymanId:V('pSM'),supplyman:sm?sm.name||sm.username:'',shopId:shop.id,shopName:shop.name,route:shop.route||'',payType:V('pPay'),accountId:V('pAcc')||'acc_cash',items:POS.items,gross:T.g,discount:T.d,tax:T.tax,net:T.net};
    let iv;if(ed){Object.assign(ed,rec,{editedBy:ME.username,editedAt:nowStamp()});iv=ed;log('Sales','Invoice edited',ed.no,money(T.net))}
    else{DB.meta.invMade=invUsed()+1;iv={id:uid(),no:nextNo('inv',S().invoicePrefix||'INV-'),status:'booked',createdBy:ME.username,createdAt:nowStamp(),...rec};DB.invoices.push(iv);log('Sales','Invoice created',iv.no,shop.name+' '+money(T.net))}
    save();POS={items:[],editId:null};toast('Invoice '+iv.no+' saved.');if(print)printInvoice(iv);render();
  };
  $('#pSave').onclick=()=>saveInv(false);$('#pSavePrint').onclick=()=>saveInv(true);
  if($('#posCancelEdit'))$('#posCancelEdit').onclick=()=>{POS={items:[],editId:null};editingItemIndex=null;render()};
  draw();
};
function invoiceBody(iv){
  const sh=byId('shops',iv.shopId)||{};const prevDue=DB.invoices.includes(iv)?shopDue(iv.shopId)-invDue(iv):(iv.shopId?shopDue(iv.shopId):0);
  return `<div class="meta"><div><b>Invoice #:</b> ${esc(iv.no)}</div><div><b>Date:</b> ${fmtDate(iv.date)}</div>
   <div><b>Shop:</b> ${esc(iv.shopName)}</div><div><b>Delivery:</b> ${fmtDate(iv.deliveryDate)}</div>
   <div><b>Owner / Ph:</b> ${esc([sh.owner,sh.phone].filter(Boolean).join(' / '))}</div><div><b>Route:</b> ${esc(iv.route||'')}</div>
   <div><b>Booker:</b> ${esc(iv.bookerName)}</div><div><b>Supply man:</b> ${esc(iv.supplyman||'')}</div>
   <div><b>Payment:</b> ${iv.payType==='cash'?'Cash':'Credit'}</div><div>${iv.status==='cancelled'?'<b>CANCELLED</b>':''}</div></div>
   ${tableHTMLPrint([{t:'#'},{t:'Item'},{t:'Ctn/Pcs'},{t:'Rate',n:1},{t:'Retail',n:1},{t:'Disc',n:1},{t:'Amount',n:1}],iv.items.map((it,i)=>[i+1,it.name,it.qtyEntryMode==='pcs'?`${it.enteredPcs??it.pcs} pcs`:splitPcs({packing:it.packing},it.pcs),fmt(it.rate),fmt(it.retail),fmt(it.disc),fmt(it.gross-it.disc)]))}
   <table class="tot"><tr><td>Gross</td><td class="n">${fmt(iv.gross)}</td></tr><tr><td>Discount</td><td class="n">${fmt(iv.discount)}</td></tr>${N(iv.tax)?`<tr><td>Tax</td><td class="n">${fmt(iv.tax)}</td></tr>`:''}
   ${iv.payType==='credit'?`<tr><td>Previous balance</td><td class="n">${fmt(prevDue)}</td></tr>`:''}<tr><td>Net payable (this bill)</td><td class="n">${fmt(iv.net)}</td></tr>${iv.payType==='credit'?`<tr><td>Total balance</td><td class="n">${fmt(prevDue+invDue(iv))}</td></tr>`:''}</table>`;
}
function printInvoice(iv){printDoc('invoice',invoiceBody(iv))}

/* ---------- SALES INVOICES LIST ---------- */
VIEWS.invoices=el=>{
  el.innerHTML=`<div class="card"><h3>Sales invoices<span class="sp"></span><button class="btn sm" id="ivPrintSel">🖨️ Selected print</button><button class="btn sm" id="ivXls">📊 Excel</button></h3>
   <div class="grid">${dateRange('iv',addDays(today(),-7),today())}${F('Date type',sel('ivDT',[{v:'date',t:'Order date'},{v:'deliveryDate',t:'Delivery date'}],'date'))}${F('Search',inp('ivQ','','search','placeholder="Shop, booker, invoice #"'))}${F('Status',sel('ivSt',[{v:'',t:'All'},{v:'booked',t:'Active'},{v:'cancelled',t:'Cancelled'}],''))}</div>
   <div class="mt" id="ivOut"></div></div>`;
  let list=[];
  const run=()=>{const q=V('ivQ').toLowerCase(),dt=V('ivDT');
    list=DB.invoices.filter(i=>inRange(i[dt],V('ivFrom'),V('ivTo'))&&(!V('ivSt')||i.status===V('ivSt'))&&(!q||[i.no,i.shopName,i.bookerName,i.supplyman].join(' ').toLowerCase().includes(q))&&(ME.role!=='booker'||i.bookerId===ME.id)).sort((a,b)=>b.no.localeCompare(a.no));
    $('#ivOut').innerHTML=table([{t:'✓'},{t:'Inv #'},{t:'Date'},{t:'Delivery'},{t:'Shop'},{t:'Booker'},{t:'Type'},{t:'Net',n:1},{t:'Due',n:1},{t:'Status'},{t:'Actions'}],
      list.map(i=>[`<input type="checkbox" data-ck="${i.id}">`,esc(i.no),fmtDate(i.date),fmtDate(i.deliveryDate),esc(i.shopName),esc(i.bookerName),i.payType,fmt(i.net),fmt(invDue(i)),i.status==='cancelled'?badge('Cancelled','bad'):invDue(i)<=0?badge('Paid','ok'):badge('Due','warn'),
       `<div class="row"><button class="btn sm" data-pr="${i.id}">🖨️</button>${i.status!=='cancelled'&&(isAdmin()||ME.role==='kpo'||i.bookerId===ME.id)?`<button class="btn sm" data-ed="${i.id}">✏️</button>`:''}${isAdmin()?`<button class="btn sm bad" data-del="${i.id}">🗑️</button>`:''}</div>`]),
      ['',list.length+' invoices','','','','','',fmt(sum(list.filter(i=>i.status!=='cancelled'),i=>i.net)),fmt(sum(list,invDue)),'','']);
    $$('#ivOut [data-pr]').forEach(b=>b.onclick=()=>printInvoice(byId('invoices',b.dataset.pr)));
    $$('#ivOut [data-ed]').forEach(b=>b.onclick=()=>{const iv=byId('invoices',b.dataset.ed);if(!guardEdit(iv.date))return;if(invCollected(iv.id)>0&&!confirm('Cash has already been collected on this invoice. Edit anyway?'))return;POS={items:JSON.parse(JSON.stringify(iv.items)),editId:iv.id};go('pos')});
    $$('#ivOut [data-del]').forEach(b=>b.onclick=()=>{const iv=byId('invoices',b.dataset.del);if(!guardEdit(iv.date))return;confirmBox(`Delete invoice ${iv.no} permanently? (Better to cancel it from "Returns" so the record is kept.)`,()=>{DB.invoices=DB.invoices.filter(x=>x.id!==iv.id);DB.collections=DB.collections.filter(c=>c.invoiceId!==iv.id);log('Sales','Invoice deleted',iv.no,money(iv.net));save();run();toast('Deleted.')})});
  };
  ['ivFrom','ivTo','ivDT','ivQ','ivSt'].forEach(id=>$('#'+id).oninput=run);
  $('#ivPrintSel').onclick=()=>{const ids=$$('#ivOut [data-ck]:checked').map(c=>c.dataset.ck);if(!ids.length)return toast('Tick the invoices first.',true);printDoc('invoice',ids.map(id=>invoiceBody(byId('invoices',id))))};
  $('#ivXls').onclick=()=>exportExcel('Sales invoices',[{t:'Inv #'},{t:'Date'},{t:'Delivery'},{t:'Shop'},{t:'Booker'},{t:'Supply man'},{t:'Type'},{t:'Gross',n:1},{t:'Discount',n:1},{t:'Net',n:1},{t:'Due',n:1},{t:'Status'}],list.map(i=>[i.no,i.date,i.deliveryDate,i.shopName,i.bookerName,i.supplyman,i.payType,i.gross,i.discount,i.net,invDue(i),i.status]));
  run();
};

/* ---------- DELIVERY DATES ---------- */
VIEWS.delivery=el=>{
  const act=activeInv();const mx=N(S().maxDeliveryExtend)||7;
  el.innerHTML=`<div class="card"><h3>Single invoice delivery date</h3><div class="grid">
    ${F('Invoice',sel('dInv',act.slice().reverse().slice(0,500).map(i=>({v:i.id,t:i.no+' — '+i.shopName+' ('+fmtDate(i.deliveryDate)+')'})),'','Select'),'wide')}
    ${F('New delivery date',inp('dNew',addDays(today(),1),'date'))}</div><div class="row mt"><button class="btn pri" id="dOne">Update</button></div></div>
   <div class="card"><h3>Bulk delivery date (max ${mx} days after order date)</h3><div class="grid">
    ${F('Order date',inp('bOD',today(),'date'))}${F('Booker',sel('bBk',usersByRole('booker').map(u=>({v:u.id,t:u.name||u.username})),'','All bookers'))}
    ${F('New delivery date',inp('bNew',addDays(today(),1),'date'))}</div><div class="mt" id="bList"></div>
    <div class="row mt"><button class="btn pri" id="bApply">Apply to selected</button></div></div>`;
  $('#dOne').onclick=()=>{const iv=byId('invoices',V('dInv'));if(!iv)return toast('Select an invoice.',true);if(V('dNew')<iv.date)return toast('Delivery date cannot be before the order date.',true);const old=iv.deliveryDate;iv.deliveryDate=V('dNew');log('Sales','Delivery date',iv.no,old+' → '+iv.deliveryDate);save();toast('Updated.');render()};
  const drawB=()=>{const l=act.filter(i=>i.date===V('bOD')&&(!V('bBk')||i.bookerId===V('bBk')));
    $('#bList').innerHTML=table([{t:'<all>'},{t:'Inv #'},{t:'Shop'},{t:'Booker'},{t:'Delivery'}],l.map(i=>[`<input type="checkbox" data-bk="${i.id}" checked>`,esc(i.no),esc(i.shopName),esc(i.bookerName),fmtDate(i.deliveryDate)]))};
  ['bOD','bBk'].forEach(i=>$('#'+i).onchange=drawB);drawB();
  $('#bApply').onclick=()=>{const nd=V('bNew');if(nd<V('bOD')||nd>addDays(V('bOD'),mx))return toast(`Date must be within 0–${mx} days of the order date.`,true);
    const ids=$$('#bList [data-bk]:checked').map(c=>c.dataset.bk);if(!ids.length)return toast('No invoice selected.',true);ids.forEach(id=>byId('invoices',id).deliveryDate=nd);log('Sales','Bulk delivery date',ids.length+' invoices',nd);save();toast(ids.length+' invoices updated.');drawB()};
};

/* ---------- PICKLIST / LOAD SHEET (booker wise) ---------- */
function picklistData(dateType,date,bookerId,smId){
  const inv=activeInv().filter(i=>i[dateType]===date&&(!bookerId||i.bookerId===bookerId)&&(!smId||i.supplymanId===smId));const agg={};
  inv.forEach(i=>i.items.forEach(it=>{const a=agg[it.productId]=agg[it.productId]||{name:it.name,brand:it.brand,packing:N(it.packing)||1,pcs:0,amount:0};a.pcs+=N(it.pcs);a.amount+=N(it.gross)-N(it.disc)}));
  return{inv,rows:Object.values(agg).sort((a,b)=>((a.brand||'')+a.name).localeCompare((b.brand||'')+b.name))};
}
const PL_COLS=[{t:'Product'},{t:'Brand'},{t:'Pack',n:1},{t:'Cartons',n:1},{t:'Loose pcs',n:1},{t:'Total pcs',n:1},{t:'Amount',n:1}];
const plRow=r=>[r.name,r.brand||'',r.packing,Math.floor(r.pcs/r.packing),r.pcs%r.packing,r.pcs,r.amount];
const plFoot=rows=>['Total','','',sum(rows,r=>Math.floor(r.pcs/r.packing)),'',sum(rows,r=>r.pcs),sum(rows,r=>r.amount)];
function plBookers(dateType,date,smId){const ids=[...new Set(activeInv().filter(i=>i[dateType]===date&&(!smId||i.supplymanId===smId)).map(i=>i.bookerId))];return ids.map(id=>({id,name:(byId('users',id)||{}).name||(activeInv().find(i=>i.bookerId===id)||{}).bookerName||'Booker'})).sort((a,b)=>a.name.localeCompare(b.name))}
function picklistPrintBody(p){
  const d=picklistData(p.dateType,p.date,p.bookerId,p.smId);const fx=a=>a.map(v=>typeof v==='number'?fmt(v):v);
  const sms=[...new Set(d.inv.map(i=>i.supplyman).filter(Boolean))].join(', ');
  return`<div class="meta"><div><b>Picklist #:</b> ${esc(p.no)}</div><div><b>${p.dateType==='date'?'Order':'Delivery'} date:</b> ${fmtDate(p.date)}</div><div><b>Booker:</b> ${esc(p.label)}</div><div><b>Supply man:</b> ${esc(sms||'—')}</div><div><b>Invoices:</b> ${d.inv.length} • <b>Shops:</b> ${new Set(d.inv.map(i=>i.shopId)).size}</div><div><b>Total cartons:</b> ${sum(d.rows,r=>Math.floor(r.pcs/r.packing))}</div></div>`+
   tableHTMLPrint(PL_COLS,d.rows.map(r=>fx(plRow(r))),fx(plFoot(d.rows)))+
   `<h4>Invoices / shops</h4>`+tableHTMLPrint([{t:'Inv #'},{t:'Shop'},{t:'Route'},{t:'Type'},{t:'Amount',n:1}],d.inv.map(i=>[i.no,i.shopName,i.route,i.payType==='cash'?'Cash':'Credit',fmt(i.net)]),['','','','Total',fmt(sum(d.inv,i=>i.net))]);
}
function picklistTotalBody(dateType,date,smId,bookers){
  const d=picklistData(dateType,date,'',smId);const fx=a=>a.map(v=>typeof v==='number'?fmt(v):v);
  return`<div class="meta"><div><b>Total vehicle load</b></div><div><b>${dateType==='date'?'Order':'Delivery'} date:</b> ${fmtDate(date)}</div><div><b>Bookers:</b> ${bookers.length}</div><div><b>Invoices:</b> ${d.inv.length}</div></div>`+
   tableHTMLPrint(PL_COLS,d.rows.map(r=>fx(plRow(r))),fx(plFoot(d.rows)))+
   `<h4>Booker wise summary</h4>`+tableHTMLPrint([{t:'Booker'},{t:'Invoices',n:1},{t:'Cartons',n:1},{t:'Amount',n:1}],bookers.map(b=>{const x=picklistData(dateType,date,b.id,smId);return[b.name,x.inv.length,sum(x.rows,r=>Math.floor(r.pcs/r.packing)),fmt(sum(x.inv,i=>i.net))]}),['Total',d.inv.length,sum(d.rows,r=>Math.floor(r.pcs/r.packing)),fmt(sum(d.inv,i=>i.net))]);
}
VIEWS.picklist=el=>{
  el.innerHTML=`<div class="card"><h3>Picklist / vehicle load sheet</h3><div class="grid">
   ${F('Date by',sel('plDT',[{v:'deliveryDate',t:'Delivery date'},{v:'date',t:'Order date'}],'deliveryDate'))}${F('Date',inp('plD',today(),'date'))}
   ${F('Booker',sel('plB',usersByRole('booker').map(u=>({v:u.id,t:u.name||u.username})),'','All bookers (separate per booker)'))}${F('Supply man',sel('plS',usersByRole('supplyman').map(u=>({v:u.id,t:u.name||u.username})),'','All'))}</div>
   <div class="row mt"><button class="btn pri" id="plGen">View picklist</button><button class="btn" id="plSave">💾 Save & print</button></div><div id="plOut" class="mt"></div></div>
   <div class="card"><h3>Saved picklists</h3>${table([{t:'#'},{t:'Date'},{t:'Booker'},{t:'Invoices',n:1},{t:'Amount',n:1},{t:'Time'},{t:''}],DB.picklists.slice().reverse().slice(0,150).map(p=>[esc(p.no),fmtDate(p.date),esc(p.label),p.invoices.length,fmt(p.amount),esc(p.at||''),`<button class="btn sm" data-ppl="${p.id}">🖨️</button>${isAdmin()?` <button class="btn sm bad" data-dpl="${p.id}">🗑️</button>`:''}`]))}</div>`;
  const targets=()=>V('plB')?[{id:V('plB'),name:(byId('users',V('plB'))||{}).name||''}]:plBookers(V('plDT'),V('plD'),V('plS'));
  const gen=()=>{const bks=targets();const fx=a=>a.map(v=>typeof v==='number'?fmt(v):esc(v));
    if(!bks.length){$('#plOut').innerHTML='<div class="empty">No invoices on this date.</div>';return bks}
    $('#plOut').innerHTML=bks.map(b=>{const d=picklistData(V('plDT'),V('plD'),b.id,V('plS'));return`<h4 style="margin:16px 0 6px">${esc(b.name)} — ${d.inv.length} invoices • ${money(sum(d.inv,i=>i.net))}</h4>`+table(PL_COLS,d.rows.map(r=>fx(plRow(r))),fx(plFoot(d.rows)))}).join('')+
     (bks.length>1?(()=>{const d=picklistData(V('plDT'),V('plD'),'',V('plS'));return`<h4 style="margin:18px 0 6px">Total vehicle load (all bookers)</h4>`+table(PL_COLS,d.rows.map(r=>fx(plRow(r))),fx(plFoot(d.rows)))})():'');
    return bks};
  $('#plGen').onclick=gen;['plDT','plD','plB','plS'].forEach(i=>$('#'+i).onchange=gen);
  $('#plSave').onclick=()=>{const bks=gen();if(!bks.length)return toast('No invoices on this date.',true);const smId=V('plS');const recs=[];
    bks.forEach(b=>{const d=picklistData(V('plDT'),V('plD'),b.id,smId);if(!d.inv.length)return;const p={id:uid(),no:nextNo('pick','PL-'),dateType:V('plDT'),date:V('plD'),bookerId:b.id,smId,label:b.name,invoices:d.inv.map(i=>i.no),amount:sum(d.inv,i=>i.net),at:nowStamp(),by:ME.username};
      d.inv.forEach(i=>i.picklist=p.no);DB.picklists.push(p);recs.push(p)});
    log('Sales','Picklist saved',recs.map(r=>r.no).join(', '),fmtDate(V('plD')));save();
    const bodies=recs.map(picklistPrintBody);if(recs.length>1)bodies.push(picklistTotalBody(V('plDT'),V('plD'),smId,bks));
    printDoc('picklist',bodies);toast(recs.length+' picklist(s) saved.');render()};
  $$('[data-ppl]').forEach(b=>b.onclick=()=>printDoc('picklist',picklistPrintBody(byId('picklists',b.dataset.ppl))));
  $$('[data-dpl]').forEach(b=>b.onclick=()=>confirmBox('Delete this picklist?',()=>{DB.picklists=DB.picklists.filter(p=>p.id!==b.dataset.dpl);save();render()}));
  gen();
};

/* ---------- RETURNS ---------- */
VIEWS.returns=el=>{
  const shops=visibleShops();const prodOpt=DB.products.map(p=>({v:p.id,t:p.name}));
  el.innerHTML=`<div class="tabs"><button class="on" data-rt="item">Item return</button><button data-rt="udhaar">Credit stock return</button><button data-rt="cancel">Full invoice cancel</button></div>
  <div class="card" id="rtForm"></div>
  <div class="card"><h3>Returns record</h3>${table([{t:'Date'},{t:'Kind'},{t:'Shop'},{t:'Product'},{t:'Pcs',n:1},{t:'Amount',n:1},{t:'Settle'},{t:'Stock'},{t:'Reason'},{t:''}],DB.returns.slice().reverse().slice(0,300).map(r=>[fmtDate(r.date),r.kind==='udhaar'?'Credit return':'Item return',esc(r.shopName),esc(r.productName),r.pcs,fmt(r.amount),r.settle==='cash'?'Cash refund':'Balance minus',r.toStock?badge('In stock','ok'):badge('Damaged','warn'),esc(r.reason||''),`<button class="btn sm" data-prt="${r.id}">🖨️</button>${isAdmin()?` <button class="btn sm bad" data-drt="${r.id}">🗑️</button>`:''}`]))}</div>`;
  const form=k=>{$$('[data-rt]').forEach(b=>b.classList.toggle('on',b.dataset.rt===k));const f=$('#rtForm');
    if(k==='cancel'){f.innerHTML=`<h3>Full invoice cancel / return</h3><div class="grid">${F('Invoice',sel('rcInv',activeInv().slice().reverse().slice(0,500).map(i=>({v:i.id,t:i.no+' — '+i.shopName+' — '+fmt(i.net)})),'','Select'),'wide')}${F('Reason',inp('rcWhy'),'wide')}</div><p class="note mt">Cancelling returns all goods to stock and reduces the shop balance. The record is kept safe.</p><div class="row mt"><button class="btn pri bad" id="rcGo">Cancel invoice</button></div>`;
      $('#rcGo').onclick=()=>{const iv=byId('invoices',V('rcInv'));if(!iv)return toast('Select an invoice.',true);if(!V('rcWhy'))return toast('Enter a reason.',true);if(!guardEdit(iv.date))return;if(invCollected(iv.id)>0&&!confirm('The supply man has already collected cash on this invoice; that record will stay. Cancel the invoice?'))return;
        iv.status='cancelled';iv.cancelReason=V('rcWhy');iv.cancelledBy=ME.username;iv.cancelledAt=nowStamp();log('Returns','Invoice cancelled',iv.no,V('rcWhy'));save();toast('Invoice cancelled.');render()};return}
    f.innerHTML=`<h3>${k==='udhaar'?'Stock returned against credit':'Item return'}</h3><div class="grid">
      ${F('Date',inp('rDate',today(),'date'))}${F('Shop',sel('rShop',shops.map(s=>({v:s.id,t:s.name})),'','Select'),'full-m')}
      ${F('Product',sel('rProd',prodOpt,'','Select'),'full-m')}${F('Pieces',inp('rPcs','','number'))}${F('Rate / pc',inp('rRate','','number','step="0.01"'))}
      ${k==='item'?F('Settle',sel('rSettle',[{v:'credit',t:'Minus from shop balance'},{v:'cash',t:'Cash refunded'}],'credit')):''}
      ${k==='item'?F('Cash account',sel('rAcc',accOptions(),'acc_cash')):''}
      ${F('Goods condition',sel('rCond',[{v:'1',t:'Good — back to stock'},{v:'0',t:'Damaged / expiry — not to stock'}],'1'))}
      ${F('Reason',inp('rWhy'),'wide')}</div><div class="prod-hint" id="rInfo"></div><div class="row mt"><button class="btn pri" id="rGo">Save return</button></div>`;
    const info=()=>{const sh=byId('shops',V('rShop')),p=byId('products',V('rProd'));if(p&&!V('rRate'))$('#rRate').value=p.tradePc||'';$('#rInfo').innerHTML=(sh?'Shop balance: <b>'+money(shopDue(sh.id))+'</b> ':'')+(p&&N(V('rPcs'))?' • Amount: <b>'+money(N(V('rPcs'))*N(V('rRate')))+'</b>':'')};
    ['rShop','rProd','rPcs','rRate'].forEach(i=>$('#'+i).oninput=info);
    $('#rGo').onclick=()=>{const sh=byId('shops',V('rShop')),p=byId('products',V('rProd'));if(!sh||!p)return toast('Select a shop and a product.',true);const pcs=N(V('rPcs'));if(pcs<=0)return toast('Enter pieces.',true);if(!V('rWhy'))return toast('Enter a reason.',true);if(!guard(V('rDate')))return;
      const r={id:uid(),kind:k,date:V('rDate'),shopId:sh.id,shopName:sh.name,productId:p.id,productName:p.name,pcs,rate:N(V('rRate')),amount:r2(pcs*N(V('rRate'))),settle:k==='udhaar'?'credit':V('rSettle'),accountId:V('rAcc')||'acc_cash',toStock:V('rCond')==='1',reason:V('rWhy'),by:ME.username};
      DB.returns.push(r);log('Returns',k==='udhaar'?'Credit stock return':'Item return',sh.name,p.name+' '+pcs+' pcs');save();toast('Return saved.');render()};
  };
  $$('[data-rt]').forEach(b=>b.onclick=()=>form(b.dataset.rt));form('item');
  $$('[data-prt]').forEach(b=>b.onclick=()=>{const r=byId('returns',b.dataset.prt);printDoc('returnSlip',`<div class="meta"><div><b>Date:</b> ${fmtDate(r.date)}</div><div><b>Shop:</b> ${esc(r.shopName)}</div></div>${tableHTMLPrint([{t:'Product'},{t:'Pcs',n:1},{t:'Rate',n:1},{t:'Amount',n:1}],[[r.productName,r.pcs,fmt(r.rate),fmt(r.amount)]])}<p><b>Settlement:</b> ${r.settle==='cash'?'Cash refund':'Adjusted in balance'} • <b>Reason:</b> ${esc(r.reason)}</p>`)});
  $$('[data-drt]').forEach(b=>b.onclick=()=>guardEdit((byId('returns',b.dataset.drt)||{}).date)&&confirmBox('Delete this return record?',()=>{DB.returns=DB.returns.filter(r=>r.id!==b.dataset.drt);log('Returns','Return deleted',b.dataset.drt);save();render()}));
};

/* ---------- COMPANY CLAIMS ---------- */
VIEWS.claims=el=>{
  el.innerHTML=`<div class="card"><h3>Claim to company (damage / expiry)</h3><div class="grid">
   ${F('Date',inp('cDate',today(),'date'))}${F('Company / supplier',`<input id="cSup" list="cSupL"><datalist id="cSupL">${opt(supplierList())}</datalist>`)}
   ${F('Product',sel('cProd',DB.products.map(p=>({v:p.id,t:p.name})),'','Select'),'full-m')}${F('Claim type',sel('cType',['Damage','Expiry','Short supply','Leakage','Other'],'Damage'))}
   ${F('Pieces',inp('cPcs','','number'))}${F('Cost rate / pc',inp('cRate','','number','step="0.01"'))}
   ${F('Deduct from stock?',sel('cDed',[{v:'0',t:'No (damaged goods already separated)'},{v:'1',t:'Yes, deduct from stock'}],'0'))}${F('Reason',inp('cWhy'),'wide')}</div>
   <div class="row mt"><button class="btn pri" id="cGo">Save claim</button></div></div>
   <div class="card"><h3>Claims</h3>${table([{t:'Claim #'},{t:'Date'},{t:'Company'},{t:'Product'},{t:'Type'},{t:'Pcs',n:1},{t:'Amount',n:1},{t:'Status'},{t:''}],DB.claims.slice().reverse().map(c=>[esc(c.no),fmtDate(c.date),esc(c.supplier),esc(c.productName),c.type,c.pcs,fmt(c.amount),c.status==='received'?badge('Received '+fmt(c.receivedAmount),'ok'):badge('Pending','warn'),`<div class="row"><button class="btn sm" data-pc="${c.id}">🖨️</button>${c.status!=='received'&&isAdmin()?`<button class="btn sm" data-rc="${c.id}">✅ Received</button>`:''}${isAdmin()?`<button class="btn sm bad" data-dc="${c.id}">🗑️</button>`:''}</div>`]))}</div>`;
  $('#cProd').onchange=()=>{const p=byId('products',V('cProd'));if(p)$('#cRate').value=r2(costPerPc(p.id))};
  $('#cGo').onclick=()=>{const p=byId('products',V('cProd'));if(!p||!V('cSup'))return toast('Select a company and a product.',true);const pcs=N(V('cPcs'));if(pcs<=0)return toast('Enter pieces.',true);if(!guard(V('cDate')))return;
    const c={id:uid(),no:nextNo('clm',S().claimPrefix||'CLM-'),date:V('cDate'),supplier:V('cSup'),productId:p.id,productName:p.name,type:V('cType'),pcs,rate:N(V('cRate')),amount:r2(pcs*N(V('cRate'))),deductStock:V('cDed')==='1',reason:V('cWhy'),status:'pending',by:ME.username};
    DB.claims.push(c);log('Claims','Claim created',c.no,money(c.amount));save();toast('Claim '+c.no+' saved.');render()};
  $$('[data-pc]').forEach(b=>b.onclick=()=>{const c=byId('claims',b.dataset.pc);printDoc('claim',`<div class="meta"><div><b>Claim #:</b> ${esc(c.no)}</div><div><b>Date:</b> ${fmtDate(c.date)}</div><div><b>To:</b> ${esc(c.supplier)}</div><div><b>Type:</b> ${esc(c.type)}</div></div>${tableHTMLPrint([{t:'Product'},{t:'Pcs',n:1},{t:'Rate',n:1},{t:'Amount',n:1}],[[c.productName,c.pcs,fmt(c.rate),fmt(c.amount)]])}<p><b>Reason:</b> ${esc(c.reason)}</p>`)});
  $$('[data-rc]').forEach(b=>b.onclick=()=>{const c=byId('claims',b.dataset.rc);modal('Claim received: '+c.no,`<div class="grid">${F('Received amount',inp('crAmt',c.amount,'number'))}${F('Date',inp('crDate',today(),'date'))}${F('Account',sel('crAcc',accOptions(),'acc_cash'))}</div>`,[{t:'Save',pri:1,fn:()=>{if(!guard(V('crDate')))return;c.status='received';c.receivedAmount=N(V('crAmt'));c.receivedDate=V('crDate');c.accountId=V('crAcc');log('Claims','Claim received',c.no,money(c.receivedAmount));save();closeModal();render()}}])});
  $$('[data-dc]').forEach(b=>b.onclick=()=>guardEdit((byId('claims',b.dataset.dc)||{}).date)&&confirmBox('Delete this claim?',()=>{DB.claims=DB.claims.filter(c=>c.id!==b.dataset.dc);save();render()}));
};
/* =====================================================================
   PURCHASE
   ===================================================================== */
let PUR={items:[],editId:null};
function purItemFrom(p,ctn,pcs,costCtn){const pk=N(p.packing)||1;const tot=N(ctn)*pk+N(pcs);return{productId:p.id,name:p.name,brand:p.brand||'',category:p.category||'',packing:pk,ctn:N(ctn),loose:N(pcs),pcs:tot,costCtn:N(costCtn),tradePc:N(p.tradePc),retailPc:N(p.retailPc),amount:r2(tot*N(costCtn)/pk)}}
VIEWS.purchase=el=>{
  const ed=PUR.editId?byId('purchases',PUR.editId):null;
  el.innerHTML=`<div class="card"><h3>${ed?'Purchase edit: '+esc(ed.no):'Purchase invoice entry'}<span class="sp"></span><button class="btn sm" id="puImp">📥 Items from Excel / PDF / image</button>${ed?'<button class="btn sm bad" id="puCancel">Cancel edit</button>':''}</h3>
   <div class="grid">${F('Invoice date',inp('puDate',ed?ed.date:today(),'date'))}
    ${F('Supplier',`<input id="puSup" list="puSupL" value="${esc(ed?ed.supplier:'')}"><datalist id="puSupL">${opt(supplierList())}</datalist>`)}
    ${F('Supplier invoice #',inp('puRef',ed?ed.ref:''))}
    ${F('Category',`<input id="puCat" list="puCatL" value="${esc(ed?ed.category:'')}"><datalist id="puCatL">${opt(S().productCategories.split(',').map(x=>x.trim()).filter(Boolean))}</datalist>`)}
    ${F('Payment now',inp('puPaid',ed?ed.paidNow:0,'number'))}${F('Payment account',sel('puAcc',accOptions(),ed?ed.accountId:'acc_cash'))}
    ${F('Invoice image',`<input id="puAtt" type="file" accept="image/*">`)}</div></div>
   <div class="card"><h3>Products</h3><div class="grid">
    ${F('Product',`<input id="puProd" list="puProdL" placeholder="Select existing or type a new name"><datalist id="puProdL">${opt(DB.products.map(p=>p.name))}</datalist>`,'wide')}
    ${F('Brand',inp('puBrand'))}${F('Carton packing (pcs)',inp('puPack','','number'))}${F('Cartons',inp('puCtn','','number'))}${F('Loose pcs',inp('puPcs','','number'))}
    ${F('Cost / carton',inp('puCost','','number','step="0.01"'))}${F('Trade price / pc',inp('puTP','','number','step="0.01"'))}${F('Retail price / pc',inp('puRP','','number','step="0.01"'))}
    ${F('Product image',`<input id="puImg" type="file" accept="image/*">`)}</div>
    <div class="row mt"><button class="btn pri" id="puAdd">+ Add product</button></div>
    <div class="mt" id="puItems"></div><div class="totals" id="puTot"></div>
    <div class="row end mt"><button class="btn pri" id="puSave">💾 Save purchase</button></div></div>`;
  $('#puProd').oninput=()=>{const p=DB.products.find(x=>x.name.toLowerCase()===V('puProd').toLowerCase());if(p){$('#puBrand').value=p.brand||'';$('#puPack').value=p.packing||'';$('#puCost').value=p.costCtn||'';$('#puTP').value=p.tradePc||'';$('#puRP').value=p.retailPc||''}};
  const draw=()=>{$('#puItems').innerHTML=table([{t:'Product'},{t:'Brand'},{t:'Pack',n:1},{t:'Ctn',n:1},{t:'Loose',n:1},{t:'Total pcs',n:1},{t:'Cost/ctn',n:1},{t:'Amount',n:1},{t:''}],PUR.items.map((it,i)=>[esc(it.name),esc(it.brand),it.packing,it.ctn,it.loose,it.pcs,fmt(it.costCtn),fmt(it.amount),`<button class="btn sm bad" data-rmp="${i}">✕</button>`]));
    $$('[data-rmp]').forEach(b=>b.onclick=()=>{PUR.items.splice(+b.dataset.rmp,1);draw()});
    const t=sum(PUR.items,i=>i.amount);$('#puTot').innerHTML=`<span class="big">Total</span><b class="big">${money(t)}</b><span>Due</span><b>${money(t-N(V('puPaid')))}</b>`};
  $('#puPaid').oninput=draw;
  $('#puAdd').onclick=async()=>{const name=V('puProd');if(!name)return toast('Enter the product name.',true);const pk=N(V('puPack'));if(!Number.isInteger(pk)||pk<=0)return toast('Carton packing must be a positive whole number.',true);
    if(N(V('puCtn'))<0||N(V('puPcs'))<0||!Number.isInteger(N(V('puCtn')))||!Number.isInteger(N(V('puPcs')))||N(V('puCtn'))+N(V('puPcs'))<=0)return toast('Cartons and loose pieces must be non-negative whole numbers, with a quantity above zero.',true);
    if(N(V('puCost'))<0||N(V('puTP'))<0||N(V('puRP'))<0)return toast('Prices cannot be negative.',true);
    const p=upsertProduct({name,brand:V('puBrand'),category:V('puCat')||undefined,packing:pk,costCtn:V('puCost'),tradePc:V('puTP')||r2(N(V('puCost'))/pk),retailPc:V('puRP')});
    const f=$('#puImg').files[0];if(f)p.image=await readImage(f,160,.75);
    PUR.items.push(purItemFrom(p,V('puCtn'),V('puPcs'),N(V('puCost'))));['puProd','puBrand','puPack','puCtn','puPcs','puCost','puTP','puRP','puImg'].forEach(i=>$('#'+i).value='');draw()};
  $('#puImp').onclick=()=>openImport('purchaseItems',()=>{});
  $('#puSave').onclick=async()=>{if(!V('puSup'))return toast('Enter the supplier name.',true);if(!(ed?guardEdit(V('puDate'),ed.date):guard(V('puDate'))))return;if(!PUR.items.length)return toast('Add products.',true);
    if(PUR.items.some(i=>!byId('products',i.productId)||!Number.isInteger(N(i.pcs))||N(i.pcs)<=0||N(i.costCtn)<0||N(i.amount)<0))return toast('One or more purchase items have invalid product, quantity, or cost data.',true);const total=r2(sum(PUR.items,i=>i.amount));const paidNow=N(V('puPaid'));if(!Number.isFinite(total)||total<=0)return toast('Purchase total must be greater than zero.',true);if(paidNow<0||paidNow>total+0.001)return toast('Payment now must be between zero and the purchase total.',true);if(!byId('accounts',V('puAcc')||'acc_cash'))return toast('Select a valid payment account.',true);if(!V('puDate'))return toast('Enter the purchase date.',true);const f=$('#puAtt').files[0];
    const rec={date:V('puDate'),supplier:V('puSup'),ref:V('puRef'),category:V('puCat'),items:PUR.items,total,paidNow,accountId:V('puAcc')||'acc_cash'};
    if(f)rec.attachment=await readImage(f,1100,.7);else if(ed&&ed.attachment)rec.attachment=ed.attachment;
    PUR.items.forEach(it=>{const p=byId('products',it.productId);if(p){p.costCtn=it.costCtn;if(rec.category&&(!p.category||p.category==='General'))p.category=rec.category}});
    if(ed){Object.assign(ed,rec);log('Purchase','Purchase edited',ed.no,money(total))}else{const pu={id:uid(),no:nextNo('pur',S().purchasePrefix||'PUR-'),by:ME.username,...rec};DB.purchases.push(pu);log('Purchase','Purchase saved',pu.no,rec.supplier+' '+money(total))}
    save();PUR={items:[],editId:null};toast((ed?'Purchase updated.':'Purchase saved.')+' Stock and supplier due recalculated.');go('purchases')};
  if($('#puCancel'))$('#puCancel').onclick=()=>{PUR={items:[],editId:null};render()};
  draw();
};
function purchaseBody(p){return`<div class="meta"><div><b>Purchase #:</b> ${esc(p.no)}</div><div><b>Date:</b> ${fmtDate(p.date)}</div><div><b>Supplier:</b> ${esc(p.supplier)}</div><div><b>Supplier inv #:</b> ${esc(p.ref||'')}</div></div>`+
  tableHTMLPrint([{t:'Product'},{t:'Pack',n:1},{t:'Ctn',n:1},{t:'Loose',n:1},{t:'Pcs',n:1},{t:'Cost/ctn',n:1},{t:'Amount',n:1}],p.items.map(i=>[i.name,i.packing,i.ctn,i.loose,i.pcs,fmt(i.costCtn),fmt(i.amount)]))+
  `<table class="tot"><tr><td>Total</td><td class="n">${fmt(p.total)}</td></tr><tr><td>Paid</td><td class="n">${fmt(p.paidNow)}</td></tr><tr><td>Due</td><td class="n">${fmt(N(p.total)-N(p.paidNow))}</td></tr></table>`}
VIEWS.purchases=el=>{
  el.innerHTML=`<div class="card"><h3>Purchase invoices</h3><div class="grid">${dateRange('pl',thisMonth()+'-01',today())}${F('Search',inp('plQ','','search'))}</div><div id="plO" class="mt"></div></div>`;
  const run=()=>{const q=V('plQ').toLowerCase();const l=DB.purchases.filter(p=>inRange(p.date,V('plFrom'),V('plTo'))&&(!q||(p.no+p.supplier+p.ref).toLowerCase().includes(q))).sort((a,b)=>b.date.localeCompare(a.date));
    $('#plO').innerHTML=table([{t:'Purchase #'},{t:'Date'},{t:'Supplier'},{t:'Ref'},{t:'Items',n:1},{t:'Total',n:1},{t:'Paid',n:1},{t:'Due',n:1},{t:''}],l.map(p=>[esc(p.no),fmtDate(p.date),esc(p.supplier),esc(p.ref||''),p.items.length,fmt(p.total),fmt(p.paidNow),fmt(N(p.total)-N(p.paidNow)),`<div class="row"><button class="btn sm" data-pp="${p.id}">🖨️</button>${p.attachment?`<button class="btn sm" data-pa="${p.id}">📎</button>`:''}${isAdmin()?`<button class="btn sm" data-pe="${p.id}">✏️</button><button class="btn sm bad" data-pd="${p.id}">🗑️</button>`:''}</div>`]),['','',l.length+' invoices','','',fmt(sum(l,p=>p.total)),fmt(sum(l,p=>p.paidNow)),fmt(sum(l,p=>N(p.total)-N(p.paidNow))),'']);
    $$('[data-pp]').forEach(b=>b.onclick=()=>printDoc('purchase',purchaseBody(byId('purchases',b.dataset.pp))));
    $$('[data-pa]').forEach(b=>b.onclick=()=>modal('Invoice attachment',`<img src="${byId('purchases',b.dataset.pa).attachment}" style="max-width:100%">`));
    $$('[data-pe]').forEach(b=>b.onclick=()=>{const p=byId('purchases',b.dataset.pe);if(!guardEdit(p.date))return;PUR={items:JSON.parse(JSON.stringify(p.items)),editId:p.id};go('purchase')});
    $$('[data-pd]').forEach(b=>b.onclick=()=>{const p=byId('purchases',b.dataset.pd);if(!guardEdit(p.date))return;confirmBox(`Delete purchase ${p.no}? Its stock will also be deducted.`,()=>{DB.purchases=DB.purchases.filter(x=>x.id!==p.id);log('Purchase','Purchase deleted',p.no,money(p.total));save();run()})});
  };['plFrom','plTo','plQ'].forEach(i=>$('#'+i).oninput=run);run();
};
VIEWS.suppliers=el=>{
  const sup=supplierList();
  el.innerHTML=`<div class="card"><h3>Payment to supplier</h3><div class="grid">${F('Date',inp('spDate',today(),'date'))}${F('Supplier',sel('spSup',sup,'','Select'))}${F('Amount',inp('spAmt','','number'))}${F('Account',sel('spAcc',accOptions(),'acc_cash'))}${F('Note',inp('spNote'),'wide')}</div><div class="row mt"><button class="btn pri" id="spGo">Save payment</button></div></div>
   <div class="card"><h3>Supplier dues</h3>${table([{t:'Supplier'},{t:'Purchases',n:1},{t:'Paid',n:1},{t:'Due',n:1}],sup.map(s=>{const pur=sum(DB.purchases.filter(p=>p.supplier===s),p=>p.total);return[esc(s),fmt(pur),fmt(pur-supplierDue(s)),fmt(supplierDue(s))]}),['Total',fmt(sum(DB.purchases,p=>p.total)),'',fmt(sum(sup,supplierDue))])}</div>
   <div class="card"><h3>Payments history</h3>${table([{t:'Date'},{t:'Supplier'},{t:'Amount',n:1},{t:'Account'},{t:'Note'},{t:''}],DB.supplierPayments.slice().reverse().map(p=>[fmtDate(p.date),esc(p.supplier),fmt(p.amount),esc((byId('accounts',p.accountId)||{}).name||''),esc(p.note||''),isAdmin()?`<button class="btn sm bad" data-dsp="${p.id}">🗑️</button>`:'']))}</div>`;
  $('#spGo').onclick=()=>{if(!V('spSup')||N(V('spAmt'))<=0)return toast('Enter supplier and amount.',true);if(!guard(V('spDate')))return;DB.supplierPayments.push({id:uid(),date:V('spDate'),supplier:V('spSup'),amount:N(V('spAmt')),accountId:V('spAcc'),note:V('spNote'),by:ME.username});log('Purchase','Supplier payment',V('spSup'),money(V('spAmt')));save();toast('Payment saved.');render()};
  $$('[data-dsp]').forEach(b=>b.onclick=()=>guardEdit((byId('supplierPayments',b.dataset.dsp)||{}).date)&&confirmBox('Delete this payment?',()=>{DB.supplierPayments=DB.supplierPayments.filter(x=>x.id!==b.dataset.dsp);save();render()}));
};

/* ---------- PRODUCTS & STOCK ---------- */
VIEWS.products=el=>{
  el.innerHTML=`<div class="card"><h3>Products & live stock / Stock report<span class="sp"></span>${isAdmin()?'<button class="btn sm" id="prImp">📥 Import (Excel / PDF / image)</button><button class="btn sm pri" id="prNew">+ New product</button>':''}<button class="btn sm" id="prXls">📊 Excel</button><button class="btn sm" id="prPrint">🖨️ Print</button></h3>
   <div class="grid">${F('From date',inp('prFrom',thisMonth()+'-01','date'))}${F('To date',inp('prTo',today(),'date'))}${F('Search',inp('prQ','','search','placeholder="Name, brand, code"'))}${F('Brand',sel('prB',[...new Set(DB.products.map(p=>p.brand).filter(Boolean))].sort(),'','All'))}${F('Stock',sel('prS',[{v:'',t:'All'},{v:'low',t:'Low (under 1 ctn)'},{v:'out',t:'Out of stock'}],''))}</div><div id="prSummary" class="kpis mt"></div><div id="prO" class="mt"></div></div>`;
  let rows=[];
  const priceData=p=>{
    let buyPcs=0,buyAmount=0,buyCartonWeighted=0,buyCartons=0,soldPcs=0,salesAmount=0;
    DB.purchases.filter(x=>inRange(x.date,V('prFrom'),V('prTo'))).forEach(x=>(x.items||[]).filter(it=>it.productId===p.id).forEach(it=>{buyPcs+=N(it.pcs);buyAmount+=N(it.amount);buyCartonWeighted+=N(it.costCtn)*N(it.pcs);buyCartons+=N(it.pcs)/(N(it.packing)||N(p.packing)||1)}));
    activeInv().filter(x=>inRange(x.date,V('prFrom'),V('prTo'))).forEach(x=>(x.items||[]).filter(it=>it.productId===p.id).forEach(it=>{soldPcs+=N(it.pcs);salesAmount+=N(it.gross)-N(it.disc)}));
    const avgBuyPc=buyPcs?buyAmount/buyPcs:costPerPc(p.id);
    const avgBuyCtn=buyPcs?buyAmount/buyPcs*productPcs(p):N(p.costCtn);
    const avgSalePc=soldPcs?salesAmount/soldPcs:N(p.tradePc);
    return {buyPcs,buyAmount,buyCartonWeighted,buyCartons,soldPcs,salesAmount,avgBuyPc,avgBuyCtn,avgSalePc,avgSaleCtn:avgSalePc*productPcs(p)};
  };
  const stockAsOf=(pid,until)=>{const pr=byId('products',pid);let st=N(pr?.openingPcs);DB.purchases.filter(x=>!until||x.date<=until).forEach(x=>(x.items||[]).forEach(it=>{if(it.productId===pid)st+=N(it.pcs)}));activeInv().filter(x=>!until||x.date<=until).forEach(x=>(x.items||[]).forEach(it=>{if(it.productId===pid)st-=N(it.pcs)}));DB.returns.filter(x=>x.toStock&&(!until||x.date<=until)&&x.productId===pid).forEach(x=>st+=N(x.pcs));DB.claims.filter(x=>x.deductStock&&(!until||x.date<=until)).forEach(x=>{if(x.productId===pid)st-=N(x.pcs)});return st};
  const history=p=>{const hist=[];DB.purchases.forEach(x=>(x.items||[]).filter(it=>it.productId===p.id).forEach(it=>hist.push([x.date,'Purchase',x.no||'',x.supplier||'',N(it.pcs),N(it.amount),N(it.costCtn)])));DB.invoices.filter(x=>x.status!=='cancelled').forEach(x=>(x.items||[]).filter(it=>it.productId===p.id).forEach(it=>hist.push([x.date,'Sale',x.no||'',x.shopName||'',-N(it.pcs),N(it.gross)-N(it.disc),N(it.rate)*productPcs(p)])));DB.returns.filter(x=>x.productId===p.id).forEach(x=>hist.push([x.date,'Return',x.id||'',x.shopName||'',N(x.pcs),-N(x.amount||0),0]));hist.sort((a,b)=>String(a[0]).localeCompare(String(b[0])));modal('Product history — '+p.name,`<div class="note">Purchase / sale / return history. Quantity is shown in pieces; carton conversion uses packing ${productPcs(p)}.</div><div class="table-wrap">${table([{t:'Date'},{t:'Type'},{t:'Reference'},{t:'Party'},{t:'Qty pcs',n:1},{t:'Amount',n:1},{t:'Price / ctn',n:1}],hist.map(h=>[fmtDate(h[0]),h[1],esc(h[2]),esc(h[3]),h[4],fmt(h[5]),fmt(h[6])]),['Total','','','',sum(hist,h=>h[4]),sum(hist,h=>h[5]),''])}</div>`,[{t:'Close',pri:1,fn:closeModal}])};
  const run=()=>{
    const q=V('prQ').toLowerCase(),to=V('prTo');
    rows=DB.products.filter(p=>(!q||[p.name,p.brand,p.sku].join(' ').toLowerCase().includes(q))&&(!V('prB')||p.brand===V('prB'))).map(p=>{const st=stockAsOf(p.id,to),c=costPerPc(p.id),pd=priceData(p);return{p,st,c,pd}}).filter(x=>(!V('prS')||(V('prS')==='out'?x.st<=0:x.st<N(x.p.packing)))&&x.st!==0);
    $('#prSummary').innerHTML=`<div class="kpi"><small>Products (non-zero stock)</small><b>${rows.length}</b></div><div class="kpi"><small>Stock quantity (pcs)</small><b>${fmt(sum(rows,x=>x.st))}</b></div><div class="kpi"><small>Stock value (purchase cost)</small><b>${fmt(sum(rows,x=>Math.max(0,x.st)*x.c))}</b></div><div class="kpi"><small>Period sales</small><b>${fmt(sum(rows,x=>x.pd.salesAmount))}</b></div><div class="kpi"><small>Period purchases</small><b>${fmt(sum(rows,x=>x.pd.buyAmount))}</b></div>`;
    const cols=[{t:'Product'},{t:'Brand'},{t:'Packing / ctn',n:1},{t:'Stock pcs',n:1},{t:'Stock ctn + pcs'},{t:'Purchase / ctn',n:1},{t:'Purchase / pc',n:1},{t:'Sale / ctn',n:1},{t:'Sale / pc',n:1},{t:'Retail / pc',n:1},{t:'Bought pcs',n:1},{t:'Purchase total',n:1},{t:'Sold ctn + pcs'},{t:'Sold pcs',n:1},{t:'Sales total',n:1},{t:'Stock value',n:1},{t:'History'}];
    const data=()=>rows.map(({p,st,pd})=>[p.name,p.brand||'',productPcs(p),st,splitPcs(p,st),r2(pd.avgBuyCtn),r2(pd.avgBuyPc),r2(pd.avgSaleCtn),r2(pd.avgSalePc),r2(p.retailPc),pd.buyPcs,r2(pd.buyAmount),splitPcs(p,pd.soldPcs),pd.soldPcs,r2(pd.salesAmount),r2(Math.max(0,st)*costPerPc(p.id)),`History: ${p.id}`]);
    $('#prO').innerHTML=table(cols,data().map(r=>r.map((v,i)=>i===16?`<button class="btn sm" data-ph="${esc(String(r[0]))}">📜 View</button>`:typeof v==='number'?fmt(v):esc(String(v)))),['Total','', '',fmt(sum(rows,x=>x.st)),'',fmt(sum(rows,x=>x.pd.avgBuyCtn)),'',fmt(sum(rows,x=>x.pd.avgSaleCtn)),'','',fmt(sum(rows,x=>x.pd.buyPcs)),fmt(sum(rows,x=>x.pd.buyAmount)),'',fmt(sum(rows,x=>x.pd.soldPcs)),fmt(sum(rows,x=>x.pd.salesAmount)),fmt(sum(rows,x=>Math.max(0,x.st)*x.c)),'']);
    $$('#prO [data-ph]').forEach(b=>b.onclick=()=>{const pr=rows.find(x=>x.p.name===b.dataset.ph)?.p;if(pr)history(pr)});
  };
  ['prFrom','prTo','prQ','prB','prS'].forEach(i=>$('#'+i).oninput=run);run();
  const cols=[{t:'Product'},{t:'Brand'},{t:'Packing / ctn',n:1},{t:'Stock pcs',n:1},{t:'Stock ctn + pcs'},{t:'Purchase / ctn',n:1},{t:'Purchase / pc',n:1},{t:'Sale / ctn',n:1},{t:'Sale / pc',n:1},{t:'Retail / pc',n:1},{t:'Bought pcs',n:1},{t:'Purchase total',n:1},{t:'Sold ctn + pcs'},{t:'Sold pcs',n:1},{t:'Sales total',n:1},{t:'Stock value',n:1}];
  const data=()=>rows.map(({p,st,c,pd})=>[p.name,p.brand||'',productPcs(p),st,splitPcs(p,st),r2(pd.avgBuyCtn),r2(pd.avgBuyPc),r2(pd.avgSaleCtn),r2(pd.avgSalePc),r2(p.retailPc),pd.buyPcs,r2(pd.buyAmount),splitPcs(p,pd.soldPcs),pd.soldPcs,r2(pd.salesAmount),r2(Math.max(0,st)*c)]);
  $('#prXls').onclick=()=>exportExcel('Stock report',cols,data());
  $('#prPrint').onclick=()=>printDoc('report',tableHTMLPrint(cols,data().map(r=>r.map(v=>typeof v==='number'?fmt(v):v)),['Total','', '',fmt(sum(rows,x=>x.st)),'', '', '', '', '', '',fmt(sum(rows,x=>x.pd.buyPcs)),fmt(sum(rows,x=>x.pd.buyAmount)),'',fmt(sum(rows,x=>x.pd.soldPcs)),fmt(sum(rows,x=>x.pd.salesAmount)),fmt(sum(rows,x=>Math.max(0,x.st)*x.c))]),{title:'Stock report',sub:`${fmtDate(V('prFrom'))} to ${fmtDate(V('prTo'))} • zero-stock products hidden`});
  if($('#prImp'))$('#prImp').onclick=()=>openImport('products');
  if($('#prNew'))$('#prNew').onclick=()=>editProduct(null);
};
function editProduct(p){
  const n=!p;p=p||{name:'',sku:'',brand:'',category:'General',packing:12,costCtn:0,tradePc:0,retailPc:0,openingPcs:0};
  modal(n?'New product':'Edit product',`<div class="grid">${F('Name',inp('epN',p.name),'wide')}${F('Code / SKU',inp('epS',p.sku))}${F('Brand',inp('epB',p.brand))}${F('Category',inp('epC',p.category))}${F('Carton packing',inp('epP',p.packing,'number'))}
   ${F('Cost / carton',inp('epCost',p.costCtn,'number'))}${F('Trade / pc',inp('epT',p.tradePc,'number'))}${F('Retail / pc',inp('epR',p.retailPc,'number'))}
   ${F('Opening stock (cartons)',inp('epOC',Math.floor(N(p.openingPcs)/(N(p.packing)||1)),'number'))}${F('Opening loose pcs',inp('epOP',N(p.openingPcs)%(N(p.packing)||1),'number'))}${F('Image',`<input id="epI" type="file" accept="image/*">`)}</div>`,
   [...(!n?[{t:'Delete',bad:1,fn:()=>{const used=DB.invoices.some(i=>i.items.some(x=>x.productId===p.id))||DB.purchases.some(i=>i.items.some(x=>x.productId===p.id));if(used)return toast('This product has invoices / purchases and cannot be deleted.',true);confirmBox('Delete this product?',()=>{DB.products=DB.products.filter(x=>x.id!==p.id);save();render()})}}]:[]),
    {t:'Save',pri:1,fn:async()=>{if(!V('epN'))return toast('Enter a name.',true);const pk=N(V('epP'))||1;
     Object.assign(p,{name:V('epN'),sku:V('epS'),brand:V('epB'),category:V('epC'),packing:pk,costCtn:N(V('epCost')),tradePc:N(V('epT')),retailPc:N(V('epR')),openingPcs:N(V('epOC'))*pk+N(V('epOP'))});
     const f=$('#epI').files[0];if(f)p.image=await readImage(f,160,.75);if(n){p.id=uid();DB.products.push(p)}log('Products',n?'Product added':'Product edited',p.name);save();closeModal();render()}}]);
}

/* =====================================================================
   RECOVERY
   ===================================================================== */
VIEWS.collection=el=>{
  const mine=ME.role==='supplyman';const sms=usersByRole('supplyman');
  el.innerHTML=`<div class="card"><h3>Cash collection on delivery</h3><div class="grid">
   ${F('Date',inp('coDate',today(),'date'))}${F('Supply man',mine?`<input readonly value="${esc(ME.name||ME.username)}"><input type="hidden" id="coSM" value="${ME.id}">`:sel('coSM',sms.map(u=>({v:u.id,t:u.name||u.username})),'','Select'))}
   ${F('Invoice',sel('coInv',[],''),'wide')}${F('Bill amount',inp('coBill','','text','readonly'))}${F('Cash received',inp('coAmt','','number','inputmode="decimal"'))}${F('Remaining on credit',inp('coRem','','text','readonly'))}
   ${F('Account',sel('coAcc',accOptions(),'acc_cash'))}${F('Remarks',inp('coNote'),'wide')}</div><div class="row mt"><button class="btn pri" id="coGo">Save collection</button></div></div>
   <div class="card"><h3>Collection record</h3>${table([{t:'Date'},{t:'Inv #'},{t:'Shop'},{t:'Supply man'},{t:'Bill',n:1},{t:'Collected',n:1},{t:'Remarks'},{t:''}],DB.collections.filter(c=>!mine||c.smId===ME.id).slice().reverse().slice(0,300).map(c=>[fmtDate(c.date),esc(c.invoiceNo),esc(c.shopName),esc(c.supplyman),fmt(c.bill),fmt(c.amount),esc(c.remarks||''),isAdmin()?`<button class="btn sm bad" data-dco="${c.id}">🗑️</button>`:'']))}</div>`;
  const fill=()=>{const sm=V('coSM');const l=activeInv().filter(i=>i.payType==='credit'&&invDue(i)>0&&(!sm||i.supplymanId===sm||!i.supplymanId));
    $('#coInv').innerHTML=opt(l.map(i=>({v:i.id,t:i.no+' — '+i.shopName+' — due '+fmt(invDue(i))})),'','Select invoice');calc()};
  const calc=()=>{const iv=byId('invoices',V('coInv'));$('#coBill').value=iv?fmt(invDue(iv)):'';$('#coRem').value=iv?fmt(invDue(iv)-N(V('coAmt'))):''};
  if($('#coSM').tagName==='SELECT')$('#coSM').onchange=fill;$('#coInv').onchange=calc;$('#coAmt').oninput=calc;fill();
  $('#coGo').onclick=()=>{const iv=byId('invoices',V('coInv'));if(!iv)return toast('Select an invoice.',true);const a=N(V('coAmt'));if(a<=0||a>invDue(iv)+0.001)return toast('Collection must be greater than zero and cannot exceed the remaining bill.',true);if(!byId('accounts',V('coAcc')||'acc_cash'))return toast('Select a valid cash account.',true);if(!guard(V('coDate')))return;
    const sm=byId('users',V('coSM'));if(!iv.supplymanId&&sm){iv.supplymanId=sm.id;iv.supplyman=sm.name||sm.username}
    DB.collections.push({id:uid(),date:V('coDate'),invoiceId:iv.id,invoiceNo:iv.no,shopId:iv.shopId,shopName:iv.shopName,smId:V('coSM'),supplyman:sm?sm.name||sm.username:'',bill:invDue(iv),amount:a,accountId:V('coAcc'),remarks:V('coNote'),by:ME.username});
    iv.deliveredAt=nowStamp();log('Recovery','Supply collection',iv.no,money(a));save();toast('Saved. Remaining '+money(invDue(iv))+' on credit.');render()};
  $$('[data-dco]').forEach(b=>b.onclick=()=>guardEdit((byId('collections',b.dataset.dco)||{}).date)&&confirmBox('Delete this collection?',()=>{DB.collections=DB.collections.filter(c=>c.id!==b.dataset.dco);log('Recovery','Collection deleted',b.dataset.dco);save();render()}));
};
VIEWS.recovery=el=>{
  const shops=visibleShops();const staff=staffList();const coll=DB.users.filter(u=>['booker','supplyman','admin','kpo'].includes(u.role));
  const vis=isAdmin()?DB.recoveries:DB.recoveries.filter(r=>r.collectorId===ME.id||r.by===ME.username);
  el.innerHTML=`<div class="card"><h3>Market recovery</h3><div class="grid">
   ${F('Date',inp('rcDate',today(),'date'))}${F('Collector',isAdmin()||ME.role==='kpo'?sel('rcCol',coll.map(u=>({v:u.id,t:(u.name||u.username)+' ('+(ROLES[u.role]||u.role)+')'})),ME.id):`<input readonly value="${esc(ME.name||ME.username)}"><input type="hidden" id="rcCol" value="${ME.id}">`)}
   ${F('Shop',sel('rcShop',shops.map(s=>({v:s.id,t:shopLabel(s)+' — due '+fmt(shopDue(s.id))})),'','Select shop'),'wide')}
   ${F('Amount due',inp('rcExp','','number'))}${F('Actually received',inp('rcAmt','','number','inputmode="decimal"'))}${F('Short',inp('rcShort','','text','readonly'))}
   ${F('Short handling',sel('rcAdj',[{v:'none',t:'None (stays due on shop)'},{v:'staff',t:'Staff responsibility (cash difference)'},{v:'discount',t:'Given as discount'}],'none'))}
   ${F('Responsible staff',sel('rcStaff',staff.map(u=>({v:u.id,t:u.name||u.username})),'','—'))}
   ${F('Payment method',sel('rcMeth',['Cash','Bank transfer','Easypaisa','JazzCash','Cheque'],'Cash'))}${F('Account',sel('rcAcc',accOptions(),'acc_cash'))}${F('Note',inp('rcNote'),'wide')}</div>
   <div class="row mt"><button class="btn pri" id="rcGo">${S().recoveryNeedsApproval&&!isAdmin()?'Send for approval':'Save recovery'}</button></div></div>
   <div class="card"><h3>Recoveries${isAdmin()?'<span class="sp"></span><button class="btn sm pri" id="rcAppSel">✅ Selected approve</button>':''}</h3>
   <div class="tabs">${['pending','approved','rejected'].map((s,i)=>`<button data-rs="${s}" class="${i===0?'on':''}">${s==='pending'?'Pending':s==='approved'?'Approved':'Rejected'} (${vis.filter(r=>r.status===s).length})</button>`).join('')}</div><div id="rcList"></div></div>`;
  const calc=()=>{const sh=byId('shops',V('rcShop'));if(sh&&!$('#rcExp').dataset.touched)$('#rcExp').value=Math.max(0,r2(shopDue(sh.id)));const s=N(V('rcExp'))-N(V('rcAmt'));$('#rcShort').value=fmt(Math.max(0,s))};
  $('#rcShop').onchange=()=>{$('#rcExp').dataset.touched='';calc()};$('#rcExp').oninput=()=>{$('#rcExp').dataset.touched='1';calc()};$('#rcAmt').oninput=calc;
  $('#rcGo').onclick=()=>{const sh=byId('shops',V('rcShop'));if(!sh)return toast('Select a shop.',true);const amt=N(V('rcAmt')),expected=N(V('rcExp'));if(amt<0||expected<0||amt>expected+0.001)return toast('Received amount must be non-negative and cannot exceed the expected amount.',true);if(amt<=0&&V('rcAdj')==='none')return toast('Enter amount.',true);if(!byId('accounts',V('rcAcc')||'acc_cash'))return toast('Select a valid recovery account.',true);
    if(!guard(V('rcDate')))return;const short=Math.max(0,expected-amt);const adj=V('rcAdj');if(adj==='staff'&&!V('rcStaff'))return toast('Select the responsible staff.',true);
    const col=byId('users',V('rcCol')),st=byId('users',V('rcStaff'));
    const r={id:uid(),date:V('rcDate'),collectorId:V('rcCol'),collector:col?col.name||col.username:'',shopId:sh.id,shopName:sh.name,expected:N(V('rcExp')),amount:amt,short,adjustType:adj,adjust:adj==='none'?0:short,staffId:st?st.id:'',staffName:st?st.name||st.username:'',method:V('rcMeth'),accountId:V('rcAcc'),note:V('rcNote'),status:'pending',by:ME.username,at:nowStamp()};
    DB.recoveries.push(r);if(!S().recoveryNeedsApproval||isAdmin())approveRec(r);log('Recovery','Recovery submitted',sh.name,money(amt));save();toast(r.status==='approved'?'Recovery approved.':'Sent for approval.');render()};
  const list=s=>{$$('[data-rs]').forEach(b=>b.classList.toggle('on',b.dataset.rs===s));const l=vis.filter(r=>r.status===s).slice().reverse();
    $('#rcList').innerHTML=table([{t:'✓'},{t:'Date'},{t:'Shop'},{t:'Collector'},{t:'Method'},{t:'Amount',n:1},{t:'Short',n:1},{t:'Adjustment'},{t:''}],l.map(r=>[s==='pending'&&isAdmin()?`<input type="checkbox" data-rck="${r.id}">`:'',fmtDate(r.date),esc(r.shopName),esc(r.collector),esc(r.method),fmt(r.amount),fmt(r.short),r.adjustType==='staff'?'Staff: '+esc(r.staffName):r.adjustType==='discount'?'Discount':'—',
      `<div class="row"><button class="btn sm" data-rpr="${r.id}">🖨️</button>${isAdmin()&&s==='pending'?`<button class="btn sm pri" data-rap="${r.id}">✅</button><button class="btn sm bad" data-rrj="${r.id}">✖</button>`:''}${isAdmin()?`<button class="btn sm bad" data-rdl="${r.id}">🗑️</button>`:''}</div>`]),['','','','','Total',fmt(sum(l,r=>r.amount)),fmt(sum(l,r=>r.short)),'','']);
    $$('[data-rap]').forEach(b=>b.onclick=()=>{approveRec(byId('recoveries',b.dataset.rap));save();render()});
    $$('[data-rrj]').forEach(b=>b.onclick=()=>{const r=byId('recoveries',b.dataset.rrj);r.status='rejected';r.rejectedBy=ME.username;log('Recovery','Rejected',r.shopName,money(r.amount));save();render()});
    $$('[data-rdl]').forEach(b=>b.onclick=()=>{const rr=byId('recoveries',b.dataset.rdl)||{};return guardEdit(rr.status==='approved'?rr.approvedDate||rr.date:'')&&confirmBox('Delete this recovery record?',()=>{const r=byId('recoveries',b.dataset.rdl);DB.recoveries=DB.recoveries.filter(x=>x.id!==r.id);DB.staffAdv=DB.staffAdv.filter(a=>a.recoveryId!==r.id);log('Recovery','Deleted',r.shopName,money(r.amount));save();render()})});
    $$('[data-rpr]').forEach(b=>b.onclick=()=>{const r=byId('recoveries',b.dataset.rpr);printDoc('recovery',`<div class="meta"><div><b>Date:</b> ${fmtDate(r.date)}</div><div><b>Status:</b> ${r.status}</div><div><b>Shop:</b> ${esc(r.shopName)}</div><div><b>Collector:</b> ${esc(r.collector)}</div></div><table class="kv"><tr><td>Amount received (${esc(r.method)})</td><td>${money(r.amount)}</td></tr>${r.short?`<tr><td>Short</td><td>${money(r.short)}</td></tr>`:''}<tr><td>Balance after</td><td>${money(shopDue(r.shopId))}</td></tr></table>${r.note?`<p>${esc(r.note)}</p>`:''}`)});
  };
  $$('[data-rs]').forEach(b=>b.onclick=()=>list(b.dataset.rs));list('pending');
  if($('#rcAppSel'))$('#rcAppSel').onclick=()=>{const ids=$$('[data-rck]:checked').map(c=>c.dataset.rck);if(!ids.length)return toast('Tick records first.',true);ids.forEach(id=>approveRec(byId('recoveries',id)));save();toast(ids.length+' approved.');render()};
};
function approveRec(r){if(!r||r.status==='approved')return;r.status='approved';r.approvedBy=ME.username;r.approvedDate=today();
  if(r.adjustType==='staff'&&r.short>0&&r.staffId)DB.staffAdv.push({id:uid(),date:r.date,staffId:r.staffId,staffName:r.staffName,type:'Cash Difference',amount:r.short,deductMonth:monthOf(r.date),note:'Recovery short: '+r.shopName,recoveryId:r.id});
  log('Recovery','Approved',r.shopName,money(r.amount))}

/* =====================================================================
   SHOPS
   ===================================================================== */
VIEWS.shops=el=>{
  const shops=visibleShops();const bookers=usersByRole('booker');
  el.innerHTML=`<div class="card"><h3>Shops & routes<span class="sp"></span>${isAdmin()||ME.role==='kpo'?'<button class="btn sm" id="shImp">📥 Import (Excel / PDF / image)</button>':''}<button class="btn sm pri" id="shNew">+ New shop</button></h3>
   <div class="grid">${F('Search',inp('shQ','','search'))}${F('Route',sel('shR',[...new Set(shops.map(s=>s.route).filter(Boolean))].sort(),'','All routes'))}${isAdmin()?F('Booker',sel('shB',bookers.map(u=>({v:u.id,t:u.name||u.username})),'','All')):''}</div><div id="shO" class="mt"></div></div>`;
  const run=()=>{const q=V('shQ').toLowerCase();const l=shops.filter(s=>(!q||[s.name,s.owner,s.phone].join(' ').toLowerCase().includes(q))&&(!V('shR')||s.route===V('shR'))&&(!V('shB')||s.bookerId===V('shB')));
    $('#shO').innerHTML=table([{t:'Shop'},{t:'Owner'},{t:'Phone'},{t:'Route'},{t:'Booker'},{t:'Limit',n:1},{t:'Balance',n:1},{t:''}],l.map(s=>{const d=shopDue(s.id);return[esc(s.name),esc(s.owner||''),esc(s.phone||''),esc(s.route||''),esc((byId('users',s.bookerId)||{}).name||''),fmt(s.creditLimit),`<span class="${N(s.creditLimit)&&d>N(s.creditLimit)?'badge bad':''}">${fmt(d)}</span>`,`<div class="row"><button class="btn sm" data-sl="${s.id}">📒 Ledger</button>${isAdmin()||ME.role==='kpo'||s.bookerId===ME.id?`<button class="btn sm" data-se="${s.id}">✏️</button>`:''}</div>`]}),['',l.length+' shops','','','','',fmt(sum(l,s=>shopDue(s.id))),'']);
    $$('[data-sl]').forEach(b=>b.onclick=()=>showLedger(b.dataset.sl));$$('[data-se]').forEach(b=>b.onclick=()=>editShop(byId('shops',b.dataset.se)))};
  ['shQ','shR','shB'].forEach(i=>$('#'+i)&&($('#'+i).oninput=run));run();
  $('#shNew').onclick=()=>editShop(null);if($('#shImp'))$('#shImp').onclick=()=>openImport('shops');
};
function editShop(s){const n=!s;s=s||{name:'',owner:'',phone:'',route:'',address:'',creditLimit:N(S().defaultCreditLimit),opening:0,openingDate:today(),bookerId:ME.role==='booker'?ME.id:''};
  const routes=[...new Set(DB.shops.map(x=>x.route).filter(Boolean))];
  modal(n?'New shop':'Edit shop',`<div class="grid">${F('Shop name',inp('esN',s.name),'wide')}${F('Owner',inp('esO',s.owner))}${F('Phone',inp('esP',s.phone,'tel'))}${F('Route / area',`<input id="esR" list="esRL" value="${esc(s.route)}"><datalist id="esRL">${opt(routes)}</datalist>`)}
   ${F('Booker',ME.role==='booker'?`<input readonly value="${esc(ME.name)}"><input type="hidden" id="esB" value="${ME.id}">`:sel('esB',usersByRole('booker').map(u=>({v:u.id,t:u.name||u.username})),s.bookerId,'—'))}
   ${F('Address',inp('esA',s.address),'wide')}${F('Credit limit',inp('esL',s.creditLimit,'number',isAdmin()?'':'readonly'))}${F('Opening balance',inp('esOB',s.opening,'number',isAdmin()?'':'readonly'))}${F('Opening date',inp('esOD',s.openingDate,'date'))}</div>`,
   [...(!n&&isAdmin()?[{t:'Delete',bad:1,fn:()=>{if(DB.invoices.some(i=>i.shopId===s.id))return toast('This shop has invoices and cannot be deleted.',true);confirmBox('Delete this shop?',()=>{DB.shops=DB.shops.filter(x=>x.id!==s.id);save();render()})}}]:[]),
    {t:'Save',pri:1,fn:()=>{if(!V('esN'))return toast('Enter the shop name.',true);
     const dup=DB.shops.find(x=>x!==s&&x.id!==s.id&&x.name.trim().toLowerCase()===V('esN').trim().toLowerCase()&&String(x.route||'').trim().toLowerCase()===V('esR').trim().toLowerCase());
     if(dup&&!confirm('A shop named "'+dup.name+'" already exists on '+(dup.route?'route "'+dup.route+'"':'the same (empty) route')+(dup.address?' ('+dup.address+')':'')+'. Same name and route can cause recoveries to be entered on the wrong shop. Save anyway?'))return;
     Object.assign(s,{name:V('esN'),owner:V('esO'),phone:V('esP'),route:V('esR'),bookerId:V('esB'),address:V('esA'),creditLimit:N(V('esL')),opening:N(V('esOB')),openingDate:V('esOD')});
     if(n){s.id=uid();DB.shops.push(s)}log('Shops',n?'Shop added':'Shop edited',s.name);save();closeModal();render()}}]);
}
function ledgerRows(shopId,from,to){const all=shopLedger(shopId,to);const before=all.filter(x=>from&&x.date<from);const ob=before.length?before[before.length-1].bal:0;return{ob,rows:all.filter(x=>!from||x.date>=from)}}
/* which bill each payment settled: payment on an invoice goes to that bill first, the rest to the oldest open bill */
function shopAllocation(shopId){
  const L=shopLedger(shopId);const debits=[];const alloc=L.map(()=>[]);const paid={};
  const give=(ci,d,amt)=>{amt=r2(amt);if(amt<=0)return;alloc[ci].push([d.key,amt]);paid[d.key]=r2((paid[d.key]||0)+amt);d.rem=r2(d.rem-amt)};
  const credRem={};
  L.forEach((x,ix)=>{
    const dr=Math.max(0,N(x.dr)),cr=N(x.cr)+Math.max(0,-N(x.dr));
    if(dr>0){const d={key:x.ref||'Opening',rem:dr};debits.push(d);
      for(const ci in credRem){if(d.rem<=0)break;const a=Math.min(credRem[ci],d.rem);if(a>0){give(+ci,d,a);credRem[ci]=r2(credRem[ci]-a);if(credRem[ci]<=0)delete credRem[ci]}}}
    if(cr>0){let left=cr;
      if(x.tgt){const d=debits.find(y=>y.key===x.tgt&&y.rem>0);if(d){const a=Math.min(left,d.rem);give(ix,d,a);left=r2(left-a)}}
      for(const d of debits){if(left<=0)break;if(d.rem<=0)continue;const a=Math.min(left,d.rem);give(ix,d,a);left=r2(left-a)}
      if(left>0)credRem[ix]=left}
  });
  return{L,alloc,paid,unused:credRem};
}
function showLedger(shopId,tab){const sh=byId('shops',shopId);if(!sh)return;
  modal('Ledger: '+sh.name,`<div class="tabs"><button data-lt="bills">🧾 Bills ledger</button><button data-lt="stmt">📒 Payment statement</button></div>
   <div class="prod-hint" id="lgInfo"></div><div class="grid mt">${dateRange('lg','',today())}</div>
   <div class="row mt"><button class="btn" id="lgPr">🖨️ Print</button><button class="btn" id="lgX">📊 Excel</button><button class="btn" id="lgPdf">📄 PDF</button></div><div id="lgEdit" class="mt"></div><div id="lgO" class="mt"></div>`);
  $('.modal').classList.add('wide');$('#lgFrom').value='';
  let cur=tab||'bills';
  const info=()=>{const all=activeInv().filter(i=>i.shopId===shopId);$('#lgInfo').innerHTML=`Route: <b>${esc(sh.route||'—')}</b> • Owner: <b>${esc([sh.owner,sh.phone].filter(Boolean).join(' / ')||'—')}</b> • Bills: <b>${all.length}</b> • Credit limit: <b>${money(sh.creditLimit)}</b> • Balance due: <b>${money(shopDue(shopId))}</b>`};
  /* ---- bills ledger: every bill with its items ---- */
  const billCols=[{t:'Date'},{t:'Bill #'},{t:'Payment'},{t:'Item'},{t:'Qty'},{t:'Rate',n:1},{t:'Disc',n:1},{t:'Amount',n:1},{t:'Bill total',n:1},{t:'Paid',n:1},{t:'Due',n:1}];
  const billData=()=>{const A=shopAllocation(shopId);const rows=[];let tN=0,tP=0;
    DB.invoices.filter(i=>i.shopId===shopId&&inRange(i.date,V('lgFrom'),V('lgTo'))).sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.no).localeCompare(String(b.no))).forEach(i=>{
      const can=i.status==='cancelled';const p=can?0:r2(A.paid[i.no]||0);if(!can){tN+=N(i.net);tP+=p}
      (i.items.length?i.items:[{}]).forEach((it,k)=>rows.push([k?'':i.date,k?'':i.no+(can?' (cancelled)':''),k?'':(i.payType==='cash'?'Cash':'Credit'),it.name||'',it.pcs!==undefined?splitPcs({packing:it.packing},it.pcs):'',it.rate??'',it.disc??'',it.gross!==undefined?N(it.gross)-N(it.disc):'',k?'':N(i.net),k||can?'':p,k||can?'':r2(N(i.net)-p)]))});
    return{rows,foot:['','','','Total','','','','',r2(tN),r2(tP),r2(tN-tP)]}};
  /* ---- payment statement: running balance + which bill each payment went to ---- */
  const stCols=[{t:'Date'},{t:'Entry'},{t:'Ref'},{t:'Debit',n:1},{t:'Credit',n:1},{t:'Balance',n:1},{t:'Against bill(s)'},{t:'Note'}];
  const stData=()=>{const A=shopAllocation(shopId);const from=V('lgFrom'),to=V('lgTo');let ob=0;const rows=[],meta=[];
    A.L.forEach((x,ix)=>{if(from&&x.date<from){ob=x.bal;return}if(to&&x.date>to)return;
      rows.push([x.date,x.type,x.ref,x.dr||'',x.cr||'',x.bal,A.alloc[ix].map(([k,a])=>k+' ('+fmt(a)+')').join(', ')+(A.unused[ix]?(A.alloc[ix].length?', ':'')+'Advance ('+fmt(A.unused[ix])+')':''),x.note]);meta.push(x)});
    return{rows:[[from||'','Opening','','','',ob,'',''],...rows],meta:[null,...meta]}};
  const dt=v=>v?fmtDate(v):'';
  const draw=()=>{$$('[data-lt]').forEach(b=>b.classList.toggle('on',b.dataset.lt===cur));info();
    if(cur==='bills'){const d=billData();$('#lgO').innerHTML=table(billCols,d.rows.map(r=>[dt(r[0]),`<b>${esc(r[1])}</b>`,esc(r[2]),esc(r[3]),esc(r[4]),...r.slice(5).map(v=>v===''?'':fmt(v))]),d.foot.map(v=>typeof v==='number'?fmt(v):esc(v)));return}
    const d=stData();const can=isAdmin();
    $('#lgO').innerHTML=table(can?[...stCols,{t:''}]:stCols,d.rows.map((r,i)=>{const m=d.meta[i];const row=[dt(r[0]),esc(r[1]),esc(r[2]),r[3]===''?'':fmt(r[3]),r[4]===''?'':fmt(r[4]),fmt(r[5]),esc(r[6]),esc(r[7])];
      if(can)row.push(m&&(m.src==='col'||m.src==='rec')?`<div class="row"><button class="btn sm" data-lge="${m.src}:${m.sid}">✏️</button><button class="btn sm bad" data-lgd="${m.src}:${m.sid}">🗑️</button></div>`:'');return row}));
    $$('[data-lge]').forEach(b=>b.onclick=()=>editPay(b.dataset.lge));$$('[data-lgd]').forEach(b=>b.onclick=()=>delPay(b.dataset.lgd))};
  const recDate=r=>r.approvedDate||r.date;
  const editPay=key=>{const [src,id]=key.split(':');const x=src==='col'?byId('collections',id):byId('recoveries',id);if(!x)return;
    $('#lgEdit').innerHTML=`<div class="note"><b>Edit ${src==='col'?'supply man cash ('+esc(x.invoiceNo)+')':'recovery'}</b><div class="grid mt">${F('Date',inp('lgED',x.date,'date'))}${F('Amount',inp('lgEA',x.amount,'number','step="0.01" inputmode="decimal"'))}${src==='col'?'':F('Shop (change to move this recovery)',sel('lgES2',DB.shops.map(s=>({v:s.id,t:shopLabel(s)+' — due '+fmt(shopDue(s.id))})),x.shopId),'wide')}</div><div class="row mt"><button class="btn pri" id="lgES">💾 Save change</button><button class="btn" id="lgEC">Cancel</button></div></div>`;
    $('#lgEC').onclick=()=>$('#lgEdit').innerHTML='';
    $('#lgES').onclick=()=>{const nd=V('lgED'),na=r2(N(V('lgEA')));if(!nd)return toast('Enter a date.',true);if(na<0)return toast('Enter amount.',true);
      if(!guardEdit(src==='col'?x.date:recDate(x),nd))return;if(src==='col'){const iv=byId('invoices',x.invoiceId);if(iv&&na>invDue(iv)+N(x.amount)+0.01)return toast('Amount cannot be more than the bill.',true);
        const old=fmtDate(x.date)+' '+money(x.amount);x.date=nd;x.amount=na;log('Recovery','Collection edited',x.invoiceNo,old+' → '+fmtDate(nd)+' '+money(na))}
      else{const old=fmtDate(recDate(x))+' '+money(x.amount);x.date=nd;if(x.approvedDate)x.approvedDate=nd;x.amount=na;
        const ns=byId('shops',V('lgES2'));if(ns&&ns.id!==x.shopId){const from=x.shopName;x.shopId=ns.id;x.shopName=ns.name;DB.staffAdv.forEach(a=>{if(a.recoveryId===x.id)a.note='Recovery short: '+ns.name});log('Recovery','Moved to another shop',x.id,from+' → '+shopLabel(ns)+' '+money(na))}
        if(N(x.expected)){x.short=r2(Math.max(0,N(x.expected)-na));if(x.adjustType!=='none')x.adjust=x.short}
        if(x.adjustType==='staff'){const a=DB.staffAdv.find(s=>s.recoveryId===x.id);if(a){if(x.short>0){a.amount=x.short;a.date=nd}else DB.staffAdv=DB.staffAdv.filter(s=>s!==a)}else if(x.short>0&&x.staffId&&x.status==='approved')DB.staffAdv.push({id:uid(),date:nd,staffId:x.staffId,staffName:x.staffName,type:'Cash Difference',amount:x.short,deductMonth:monthOf(nd),note:'Recovery short: '+x.shopName,recoveryId:x.id})}
        log('Recovery','Recovery edited',x.shopName,old+' → '+fmtDate(nd)+' '+money(na))}
      save();$('#lgEdit').innerHTML='';toast('Payment updated.');draw()}};
  const delPay=key=>{const [src,id]=key.split(':');const x=src==='col'?byId('collections',id):byId('recoveries',id);if(!x)return;if(!guardEdit(src==='col'?x.date:recDate(x)))return;
    if(!confirm('Delete this payment of '+money(x.amount)+' dated '+fmtDate(x.date)+'?'))return;
    if(src==='col'){DB.collections=DB.collections.filter(c=>c.id!==id);log('Recovery','Collection deleted',x.invoiceNo,money(x.amount))}
    else{DB.recoveries=DB.recoveries.filter(r=>r.id!==id);DB.staffAdv=DB.staffAdv.filter(a=>a.recoveryId!==id);log('Recovery','Deleted',x.shopName,money(x.amount))}
    save();$('#lgEdit').innerHTML='';toast('Payment deleted.');draw()};
  $$('[data-lt]').forEach(b=>b.onclick=()=>{cur=b.dataset.lt;$('#lgEdit').innerHTML='';draw()});
  ['lgFrom','lgTo'].forEach(i=>$('#'+i).onchange=draw);draw();
  const out=()=>{if(cur==='bills'){const d=billData();return{cols:billCols,name:'Bills ledger',rows:d.rows.map(r=>[dt(r[0]),...r.slice(1,5),...r.slice(5).map(v=>v===''?'':fmt(v))]),raw:d.rows.map(r=>[dt(r[0]),...r.slice(1)]),foot:d.foot.map(v=>typeof v==='number'?fmt(v):v)}}
    const d=stData();return{cols:stCols,name:'Payment statement',rows:d.rows.map(r=>[dt(r[0]),r[1],r[2],r[3]===''?'':fmt(r[3]),r[4]===''?'':fmt(r[4]),fmt(r[5]),r[6],r[7]]),raw:d.rows.map(r=>[dt(r[0]),...r.slice(1)])}};
  $('#lgPr').onclick=()=>{const o=out();printDoc('ledger',`<div class="meta"><div><b>Shop:</b> ${esc(sh.name)}</div><div><b>Route:</b> ${esc(sh.route||'')}</div><div><b>Owner:</b> ${esc(sh.owner||'')} ${esc(sh.phone||'')}</div><div><b>Period:</b> ${fmtDate(V('lgFrom'))||'Start'} — ${fmtDate(V('lgTo'))}</div><div><b>${o.name}</b></div><div><b>Balance due:</b> ${money(shopDue(shopId))}</div></div>`+tableHTMLPrint(o.cols,o.rows,o.foot))};
  $('#lgX').onclick=()=>{const o=out();exportExcel(o.name+' '+sh.name,o.cols,o.raw,o.foot)};$('#lgPdf').onclick=()=>{const o=out();exportPDF(o.name+' '+sh.name,o.cols,o.rows,o.foot)};
}
/* =====================================================================
   EXPENSES / ACCOUNTS / INVESTORS
   ===================================================================== */
VIEWS.expenses=el=>{
  const heads=S().expenseHeads.split(',').map(x=>x.trim()).filter(Boolean);
  el.innerHTML=`<div class="card"><h3>Add expense</h3><div class="grid">${F('Date',inp('exDate',today(),'date'))}${F('Expense head',`<input id="exHead" list="exHL"><datalist id="exHL">${opt(heads)}</datalist>`)}${F('Amount',inp('exAmt','','number','inputmode="decimal"'))}${F('Account',sel('exAcc',accOptions(),'acc_cash'))}${F('Note',inp('exNote'),'wide')}</div><div class="row mt"><button class="btn pri" id="exGo">💾 Save</button></div></div>
   <div class="card"><h3>Expenses this month</h3>${table([{t:'Date'},{t:'Head'},{t:'Amount',n:1},{t:'Account'},{t:'Note'},{t:'By'},{t:''}],DB.expenses.filter(e=>monthOf(e.date)===thisMonth()).slice().reverse().map(e=>[fmtDate(e.date),esc(e.head),fmt(e.amount),esc((byId('accounts',e.accountId)||{}).name||''),esc(e.note||''),esc(e.by||''),isAdmin()?`<button class="btn sm bad" data-dex="${e.id}">🗑️</button>`:'']),['','Total',fmt(sum(DB.expenses.filter(e=>monthOf(e.date)===thisMonth()),e=>e.amount)),'','','',''])}</div>`;
  $('#exGo').onclick=()=>{if(!V('exHead')||N(V('exAmt'))<=0)return toast('Enter head and a positive amount.',true);if(!byId('accounts',V('exAcc')||'acc_cash'))return toast('Select a valid expense account.',true);if(!guard(V('exDate')))return;DB.expenses.push({id:uid(),date:V('exDate'),head:V('exHead'),amount:N(V('exAmt')),accountId:V('exAcc'),note:V('exNote'),by:ME.username});log('Expenses','Expense added',V('exHead'),money(V('exAmt')));save();toast('Expense saved.');render()};
  $$('[data-dex]').forEach(b=>b.onclick=()=>guardEdit((byId('expenses',b.dataset.dex)||{}).date)&&confirmBox('Delete this expense?',()=>{DB.expenses=DB.expenses.filter(x=>x.id!==b.dataset.dex);log('Expenses','Expense deleted',b.dataset.dex);save();render()}));
};
VIEWS.accounts=el=>{
  el.innerHTML=`<div class="kpis">${DB.accounts.map(a=>`<div class="kpi"><small>${esc(a.name)} (${esc(a.type)})</small><b>${money(accountBalance(a.id))}</b></div>`).join('')}</div>
   <div class="grid g2"><div class="card"><h3>New account</h3><div class="grid">${F('Name',inp('acN','','text','placeholder="Meezan Bank, JazzCash…"'))}${F('Type',sel('acT',['cash','bank','wallet'],'bank'))}${F('Opening balance',inp('acO',0,'number'))}${F('Opening date',inp('acD',today(),'date'))}</div><div class="row mt"><button class="btn pri" id="acGo">Create account</button></div></div>
   <div class="card"><h3>Account to account transfer</h3><div class="grid">${F('From',sel('trF',accOptions(),'acc_cash'))}${F('To',sel('trT',accOptions(),''))}${F('Amount',inp('trA','','number'))}${F('Date',inp('trD',today(),'date'))}${F('Note',inp('trN'),'wide')}</div><div class="row mt"><button class="btn pri" id="trGo">Transfer</button></div></div></div>
   <div id="acBook"></div>`;
  $('#acGo').onclick=()=>{if(!V('acN'))return toast('Enter a name.',true);DB.accounts.push({id:uid(),name:V('acN'),type:V('acT'),opening:N(V('acO')),openingDate:V('acD')});log('Accounts','Account added',V('acN'));save();render()};
  $('#trGo').onclick=()=>{if(V('trF')===V('trT')||!V('trT'))return toast('Select two different accounts.',true);if(!byId('accounts',V('trF'))||!byId('accounts',V('trT')))return toast('Select valid source and destination accounts.',true);if(N(V('trA'))<=0)return toast('Enter a positive amount.',true);if(!guard(V('trD')))return;DB.transfers.push({id:uid(),date:V('trD'),from:V('trF'),to:V('trT'),amount:N(V('trA')),note:V('trN'),by:ME.username});log('Accounts','Transfer',V('trF')+' → '+V('trT'),money(V('trA')));save();toast('Transfer done.');render()};
  reportBlock($('#acBook'),{title:'Account book (cash / bank ledger)',filters:F('Account',sel('abA',accOptions(),'acc_cash'))+dateRange('ab'),build:()=>{
    const acc=V('abA');const all=accountMoves().filter(m=>m.acc===acc);const ob=sum(all.filter(m=>m.date<V('abFrom')),m=>m.in-m.out);let bal=ob;
    const rows=[[fmtDate(V('abFrom')),'Opening','','','',ob]];all.filter(m=>inRange(m.date,V('abFrom'),V('abTo'))).forEach(m=>{bal+=m.in-m.out;rows.push([fmtDate(m.date),m.desc,m.ref,m.in||'',m.out||'',bal])});
    return{cols:[{t:'Date'},{t:'Detail'},{t:'Ref'},{t:'In',n:1},{t:'Out',n:1},{t:'Balance',n:1}],rows,sub:(byId('accounts',acc)||{}).name+' • '+fmtDate(V('abFrom'))+' to '+fmtDate(V('abTo'))}}});
};
VIEWS.investors=el=>{
  const inv=DB.investors;const bal=i=>sum(DB.investorTxns.filter(t=>t.investorId===i.id),t=>t.type==='capital'?t.amount:t.type==='withdraw'?-t.amount:0);
  const profit=i=>sum(DB.investorTxns.filter(t=>t.investorId===i.id&&t.type==='profitShare'),t=>t.amount);const paid=i=>sum(DB.investorTxns.filter(t=>t.investorId===i.id&&t.type==='profitPaid'),t=>t.amount);
  el.innerHTML=`<div class="grid g2"><div class="card"><h3>Add owner / investor</h3><div class="grid">${F('Name',inp('ivN'))}${F('Profit share %',inp('ivS','','number'))}${F('Note',inp('ivNote'),'wide')}</div><div class="row mt"><button class="btn pri" id="ivAdd">Add</button></div></div>
   <div class="card"><h3>Capital / withdrawal / profit payment</h3><div class="grid">${F('Investor',sel('itI',inv.map(i=>({v:i.id,t:i.name})),'','Select'))}${F('Type',sel('itT',[{v:'capital',t:'Capital invested'},{v:'withdraw',t:'Capital withdrawn'},{v:'profitPaid',t:'Profit paid'}],'capital'))}${F('Amount',inp('itA','','number'))}${F('Account',sel('itAcc',accOptions(),'acc_cash'))}${F('Date',inp('itD',today(),'date'))}${F('Note',inp('itN'))}</div><div class="row mt"><button class="btn pri" id="itGo">Save</button></div></div></div>
   <div class="card"><h3>Profit distribution</h3><div class="grid">${dateRange('pd')}${F('Profit to distribute',inp('pdA','','number'))}</div><p class="muted small" id="pdHint"></p><div class="row mt"><button class="btn" id="pdCalc">Use net profit of period</button><button class="btn pri" id="pdGo">Distribute by share %</button></div></div>
   <div class="card"><h3>Investors</h3>${table([{t:'Name'},{t:'Share %',n:1},{t:'Capital',n:1},{t:'Profit earned',n:1},{t:'Profit paid',n:1},{t:'Profit balance',n:1},{t:''}],inv.map(i=>[esc(i.name),i.share,fmt(bal(i)),fmt(profit(i)),fmt(paid(i)),fmt(profit(i)-paid(i)),`<div class="row"><button class="btn sm" data-ist="${i.id}">🖨️ Statement</button>${isAdmin()?`<button class="btn sm bad" data-idl="${i.id}">🗑️</button>`:''}</div>`]))}</div>
   <div class="card"><h3>Transactions</h3>${table([{t:'Date'},{t:'Investor'},{t:'Type'},{t:'Amount',n:1},{t:'Note'},{t:''}],DB.investorTxns.slice().reverse().map(t=>[fmtDate(t.date),esc(t.investorName),{capital:'Capital in',withdraw:'Withdrawal',profitShare:'Profit share',profitPaid:'Profit paid'}[t.type],fmt(t.amount),esc(t.note||''),isAdmin()?`<button class="btn sm bad" data-itd="${t.id}">🗑️</button>`:'']))}</div>`;
  $('#ivAdd').onclick=()=>{if(!V('ivN'))return toast('Enter a name.',true);DB.investors.push({id:uid(),name:V('ivN'),share:N(V('ivS')),note:V('ivNote'),active:true});save();render()};
  $('#itGo').onclick=()=>{const i=byId('investors',V('itI'));if(!i||N(V('itA'))<=0)return toast('Select an investor and enter a positive amount.',true);if(!byId('accounts',V('itAcc')||'acc_cash'))return toast('Select a valid investment account.',true);if(!guard(V('itD')))return;DB.investorTxns.push({id:uid(),investorId:i.id,investorName:i.name,type:V('itT'),amount:N(V('itA')),accountId:V('itAcc'),date:V('itD'),note:V('itN')});log('Investors',V('itT'),i.name,money(V('itA')));save();render()};
  $('#pdCalc').onclick=()=>{const p=pnl(V('pdFrom'),V('pdTo'));$('#pdA').value=r2(p.net);$('#pdHint').textContent='Net profit of this period: '+money(p.net)};
  $('#pdGo').onclick=()=>{const a=N(V('pdA'));if(a<=0)return toast('Enter profit amount.',true);const tot=sum(inv,i=>i.share);if(!tot)return toast('Enter the share % of investors.',true);if(inv.some(i=>N(i.share)<0)||tot>100.001)return toast('Investor profit shares must be non-negative and total no more than 100%.',true);if(!V('pdTo')||V('pdFrom')>V('pdTo'))return toast('Select a valid profit period.',true);
    inv.filter(i=>N(i.share)>0).forEach(i=>DB.investorTxns.push({id:uid(),investorId:i.id,investorName:i.name,type:'profitShare',amount:r2(a*N(i.share)/100),date:V('pdTo'),note:'Profit '+fmtDate(V('pdFrom'))+' – '+fmtDate(V('pdTo'))}));
    log('Investors','Profit distributed',money(a));save();toast('Profit distributed.'+(tot<100?' Remaining '+(100-tot)+'% stayed in the business.':''));render()};
  $$('[data-ist]').forEach(b=>b.onclick=()=>{const i=byId('investors',b.dataset.ist);const tx=DB.investorTxns.filter(t=>t.investorId===i.id);printDoc('investor',`<div class="meta"><div><b>Investor:</b> ${esc(i.name)}</div><div><b>Share:</b> ${i.share}%</div></div>`+tableHTMLPrint([{t:'Date'},{t:'Type'},{t:'Amount',n:1},{t:'Note'}],tx.map(t=>[fmtDate(t.date),t.type,fmt(t.amount),t.note||'']))+`<table class="kv"><tr><td>Capital</td><td>${money(bal(i))}</td></tr><tr><td>Profit share</td><td>${money(profit(i))}</td></tr><tr><td>Profit paid</td><td>${money(paid(i))}</td></tr><tr><td>Profit payable</td><td>${money(profit(i)-paid(i))}</td></tr></table>`)});
  $$('[data-idl]').forEach(b=>b.onclick=()=>confirmBox('Delete this investor and all their transactions?',()=>{DB.investors=DB.investors.filter(x=>x.id!==b.dataset.idl);DB.investorTxns=DB.investorTxns.filter(t=>t.investorId!==b.dataset.idl);save();render()}));
  $$('[data-itd]').forEach(b=>b.onclick=()=>confirmBox('Delete this transaction?',()=>{DB.investorTxns=DB.investorTxns.filter(t=>t.id!==b.dataset.itd);save();render()}));
};

/* =====================================================================
   STAFF ADVANCE & SALARY
   ===================================================================== */
VIEWS.staff=el=>{
  const st=staffList();
  el.innerHTML=`<div class="card"><h3>Staff advance / loan / cash difference</h3><div class="grid">${F('Staff',sel('saS',st.map(u=>({v:u.id,t:u.name||u.username})),'','Select'))}${F('Type',sel('saT',['Advance','Loan','Cash Difference','Other Deduction'],'Advance'))}${F('Amount',inp('saA','','number'))}${F('Date',inp('saD',today(),'date'))}${F('Deduct from salary of month',inp('saM',thisMonth(),'month'))}${F('Account (advance / loan paid from)',sel('saAcc',accOptions(),'acc_cash'))}${F('Note',inp('saN'),'wide')}</div><div class="row mt"><button class="btn pri" id="saGo">💾 Save</button></div></div><div id="saRep"></div>`;
  $('#saGo').onclick=()=>{const u=byId('users',V('saS'));if(!u||N(V('saA'))<=0)return toast('Select staff and enter amount.',true);if(!guard(V('saD')))return;DB.staffAdv.push({id:uid(),date:V('saD'),staffId:u.id,staffName:u.name||u.username,type:V('saT'),amount:N(V('saA')),deductMonth:V('saM'),accountId:V('saAcc'),note:V('saN'),by:ME.username});log('Staff',V('saT'),u.name,money(V('saA')));save();toast('Saved.');render()};
  reportBlock($('#saRep'),{title:'Staff advance ledger',filters:F('Staff',sel('srS',st.map(u=>({v:u.id,t:u.name||u.username})),'','All'))+F('Deduction month',inp('srM','','month')),build:()=>{
    const l=DB.staffAdv.filter(a=>(!V('srS')||a.staffId===V('srS'))&&(!V('srM')||a.deductMonth===V('srM')));
    return{cols:[{t:'Date'},{t:'Staff'},{t:'Type'},{t:'Amount',n:1},{t:'Deduction month'},{t:'Note'}],rows:l.map(a=>[fmtDate(a.date),a.staffName,a.type,a.amount,a.deductMonth,a.note||'']),foot:['','','Total',sum(l,a=>a.amount),'',''],l}},
    after:(out,R)=>{if(!isAdmin())return;out.querySelectorAll('tbody tr').forEach((tr,i)=>{const a=R.l[i];if(!a)return;const td=document.createElement('td');td.innerHTML='<button class="btn sm bad">🗑️</button>';tr.appendChild(td);td.firstChild.onclick=()=>confirmBox('Delete this entry?',()=>{DB.staffAdv=DB.staffAdv.filter(x=>x.id!==a.id);log('Staff','Entry deleted',a.staffName,money(a.amount));save();render()})})}});
};
function salaryCalc(staffId,month){
  const su=DB.salarySetup[staffId]||{basic:0,paidLeaves:0};const attRec=(DB.attendance[staffId]||{})[month];const att=attRec||{};
  const [y,m]=month.split('-').map(Number);const days=new Date(y,m,0).getDate();let P=0,A=0,L=0,H=0;
  for(let d=1;d<=days;d++){const v=att[d]||'P';if(v==='P')P++;else if(v==='A')A++;else if(v==='L')L++;else if(v==='H')H++}
  const paidL=Math.min(L,N(su.paidLeaves));const payDays=P+H+paidL;const perDay=N(su.basic)/days;const gross=r2(perDay*payDays);
  const adv=DB.staffAdv.filter(a=>a.staffId===staffId&&a.deductMonth===month);
  const advanceDed=sum(adv.filter(a=>a.type==='Advance'||a.type==='Loan'),a=>a.amount),cashDiffDed=sum(adv.filter(a=>a.type==='Cash Difference'),a=>a.amount),otherDed=sum(adv.filter(a=>a.type==='Other Deduction'),a=>a.amount);
  return{noAtt:!attRec,noSetup:!N(su.basic),basic:N(su.basic),days,P,A,L,H,paidL,payDays,gross,advanceDed,cashDiffDed,otherDed,net:r2(gross-advanceDed-cashDiffDed-otherDed)};
}
function salarySlip(s){return`<div class="meta"><div><b>Employee:</b> ${esc(s.staffName)}</div><div><b>Month:</b> ${esc(s.month)}</div></div><table class="kv">
 <tr><td>Basic salary</td><td>${money(s.basic)}</td></tr><tr><td>Days in month / pay days</td><td>${s.days} / ${s.payDays}</td></tr><tr><td>Present / Holiday / Leave / Absent</td><td>${s.P} / ${s.H} / ${s.L} / ${s.A}</td></tr>
 <tr><td>Earned salary</td><td>${money(s.gross)}</td></tr><tr><td>Advance / loan deduction</td><td>- ${money(s.advanceDed)}</td></tr><tr><td>Cash difference</td><td>- ${money(s.cashDiffDed)}</td></tr><tr><td>Other deduction</td><td>- ${money(s.otherDed)}</td></tr><tr><td><b>Net payable</b></td><td>${money(s.net)}</td></tr></table>`}
VIEWS.salary=el=>{
  const st=staffList();const so=st.map(u=>({v:u.id,t:u.name||u.username}));
  el.innerHTML=`<div class="tabs"><button class="on" data-sl="setup">Salary setup</button><button data-sl="att">Attendance</button><button data-sl="gen">Generate salary</button><button data-sl="rec">Records</button></div><div id="slO"></div>`;
  const tabs={
   setup:o=>{o.innerHTML=`<div class="card"><h3>Salary setup</h3><div class="grid">${F('Staff',sel('ssS',so,'','Select'))}${F('Monthly basic salary',inp('ssB','','number'))}${F('Paid leave days / month',inp('ssL','','number'))}${F('Effective from',inp('ssE',today(),'date'))}</div><div class="row mt"><button class="btn pri" id="ssGo">💾 Save</button></div></div><div class="card"><h3>Setup list</h3>${table([{t:'Staff'},{t:'Role'},{t:'Basic',n:1},{t:'Paid leaves',n:1}],st.map(u=>{const s=DB.salarySetup[u.id]||{};return[esc(u.name||u.username),ROLES[u.role]||u.role,fmt(s.basic),s.paidLeaves||0]}))}</div>`;
     $('#ssS').onchange=()=>{const s=DB.salarySetup[V('ssS')]||{};$('#ssB').value=s.basic||'';$('#ssL').value=s.paidLeaves||''};
     $('#ssGo').onclick=()=>{if(!V('ssS'))return toast('Select staff.',true);DB.salarySetup[V('ssS')]={basic:N(V('ssB')),paidLeaves:N(V('ssL')),from:V('ssE')};save();toast('Saved.');tabs.setup(o)}},
   att:o=>{o.innerHTML=`<div class="card"><h3>Monthly attendance</h3><div class="grid">${F('Staff',sel('atS',so,'','Select'))}${F('Month',inp('atM',thisMonth(),'month'))}</div><p class="small muted mt">P = Present, A = Absent, L = Leave, H = Holiday / Sunday</p><div id="atG" class="att-grid mt"></div><div class="row mt"><button class="btn" id="atP">All present</button><button class="btn" id="atSun">Sundays = Holiday</button><button class="btn pri" id="atGo">💾 Save attendance</button></div></div>`;
     const draw=()=>{const s=V('atS'),m=V('atM');if(!s){$('#atG').innerHTML='';return}const a=((DB.attendance[s]||{})[m])||{};const [y,mm]=m.split('-').map(Number);const days=new Date(y,mm,0).getDate();
       $('#atG').innerHTML=Array.from({length:days},(_,i)=>{const d=i+1;const dow=new Date(y,mm-1,d).getDay();return`<div class="att-day" style="${dow===0?'background:#f6f1e6':''}">${d} ${'SMTWTFS'[dow]}<select data-d="${d}">${opt(['P','A','L','H'],a[d]||(dow===0?'H':'P'))}</select></div>`}).join('')};
     ['atS','atM'].forEach(i=>$('#'+i).onchange=draw);
     $('#atP').onclick=()=>$$('#atG select').forEach(s=>s.value='P');$('#atSun').onclick=()=>{const [y,m]=V('atM').split('-').map(Number);$$('#atG select').forEach(s=>{if(new Date(y,m-1,+s.dataset.d).getDay()===0)s.value='H'})};
     $('#atGo').onclick=()=>{if(!V('atS'))return toast('Select staff.',true);const a={};$$('#atG select').forEach(s=>a[s.dataset.d]=s.value);(DB.attendance[V('atS')]=DB.attendance[V('atS')]||{})[V('atM')]=a;save();toast('Attendance saved.')}},
   gen:o=>{o.innerHTML=`<div class="card"><h3>Generate salary</h3><div class="grid">${F('Staff',sel('sgS',so,'','Select'))}${F('Month',inp('sgM',thisMonth(),'month'))}${F('Pay now?',sel('sgP',[{v:'1',t:'Yes, pay from account'},{v:'0',t:'No, record only'}],'1'))}${F('Account',sel('sgA',accOptions(),'acc_cash'))}</div><div id="sgO" class="mt"></div><div class="row mt"><button class="btn" id="sgPr">🖨️ Slip print</button><button class="btn pri" id="sgGo">💾 Salary record save</button></div></div>`;
     const calc=()=>{if(!V('sgS'))return null;const c=salaryCalc(V('sgS'),V('sgM'));const u=byId('users',V('sgS'));c.staffName=u.name||u.username;c.month=V('sgM');$('#sgO').innerHTML=(c.noSetup?'<p class="note" style="color:var(--bad)">Salary is not set up for this staff. First enter the salary in "Salary setup".</p>':'')+(c.noAtt?'<p class="note" style="color:var(--bad)">Attendance for this month is not saved. Mark it in "Attendance" first, otherwise the salary cannot be generated.</p>':'')+salarySlip(c).replace('<table class="kv">','<table class="kv" style="max-width:520px">');return c};
     ['sgS','sgM'].forEach(i=>$('#'+i).onchange=calc);
     $('#sgPr').onclick=()=>{const c=calc();if(c)printDoc('salary',salarySlip(c))};
     $('#sgGo').onclick=()=>{const c=calc();if(!c)return toast('Select staff.',true);if(c.noSetup)return toast('Set up the salary first.',true);if(c.noAtt)return toast('Save attendance for this month first.',true);if(DB.salaries.some(s=>s.staffId===V('sgS')&&s.month===V('sgM')))return toast('Salary for this month is already generated. Delete it from Records and generate again.',true);
       const {noAtt,noSetup,...cc}=c;DB.salaries.push({id:uid(),staffId:V('sgS'),...cc,paid:V('sgP')==='1',paidDate:today(),accountId:V('sgA'),date:today(),by:ME.username});log('Salary','Salary generated',c.staffName,c.month+' '+money(c.net));save();toast('Salary record saved.');tabs.rec(o)}},
   rec:o=>{reportBlock(o,{title:'Salary records',filters:F('Staff',sel('rsS',so,'','All'))+F('Month',inp('rsM','','month')),build:()=>{const l=DB.salaries.filter(s=>(!V('rsS')||s.staffId===V('rsS'))&&(!V('rsM')||s.month===V('rsM')));
     return{cols:[{t:'Month'},{t:'Staff'},{t:'Basic',n:1},{t:'Pay days',n:1},{t:'Earned',n:1},{t:'Advance',n:1},{t:'Cash diff',n:1},{t:'Other',n:1},{t:'Net',n:1},{t:'Paid'}],rows:l.map(s=>[s.month,s.staffName,s.basic,s.payDays,s.gross,s.advanceDed,s.cashDiffDed,s.otherDed,s.net,s.paid?'Yes':'No']),foot:['','Total','','',sum(l,s=>s.gross),sum(l,s=>s.advanceDed),sum(l,s=>s.cashDiffDed),sum(l,s=>s.otherDed),sum(l,s=>s.net),''],l}},
     after:(out,R)=>{if(!isAdmin())return;out.querySelectorAll('tbody tr').forEach((tr,i)=>{const s=R.l[i];const td=document.createElement('td');td.innerHTML=`<button class="btn sm">🖨️</button> <button class="btn sm bad">🗑️</button>`;tr.appendChild(td);const [p,d]=td.querySelectorAll('button');p.onclick=()=>printDoc('salary',salarySlip(s));d.onclick=()=>confirmBox('Delete this salary record?',()=>{DB.salaries=DB.salaries.filter(x=>x.id!==s.id);save();tabs.rec(o)})})}})}
  };
  $$('[data-sl]').forEach(b=>b.onclick=()=>{$$('[data-sl]').forEach(x=>x.classList.toggle('on',x===b));tabs[b.dataset.sl]($('#slO'))});tabs.setup($('#slO'));
};

/* =====================================================================
   REPORTS
   ===================================================================== */
const REPORTS={
  daily:{t:'Daily summary',f:()=>F('Date',inp('rD',today(),'date')),type:'dailySummary',b:()=>{const d=V('rD');const p=pnl(d,d);const rec=sum(approvedRec().filter(r=>(r.approvedDate||r.date)===d),r=>r.amount);const col=sum(DB.collections.filter(c=>c.date===d),c=>c.amount);
    const cashIn=sum(accountMoves().filter(m=>m.date===d),m=>m.in),cashOut=sum(accountMoves().filter(m=>m.date===d),m=>m.out);
    const cards=[['Invoices',p.count],['Gross sales',money(p.gross)],['Discount',money(p.disc)],['Net sales',money(p.sales)],['Cash sales',money(sum(activeInv().filter(i=>i.date===d),invCash))],['Credit given',money(sum(activeInv().filter(i=>i.date===d),invDue))],['Supply man collection',money(col)],['Market recovery',money(rec)],['Returns',money(p.retVal)],['Expenses',money(p.exp)],['Gross profit',money(p.gp)],['Total cash in',money(cashIn)],['Total cash out',money(cashOut)],['Cash + bank balance',money(sum(DB.accounts,a=>accountBalance(a.id,d)))],['Market credit (total)',money(sum(DB.shops,s=>Math.max(0,shopDue(s.id))))]];
    const bk=usersByRole('booker').map(b=>{const iv=activeInv().filter(i=>i.bookerId===b.id&&i.date===d);return[b.name||b.username,iv.length,sum(iv,i=>i.net),sum(iv,invDue),sum(approvedRec().filter(r=>r.collectorId===b.id&&(r.approvedDate||r.date)===d),r=>r.amount)]});
    return{cards,cols:[{t:'Booker'},{t:'Invoices',n:1},{t:'Sales',n:1},{t:'Credit',n:1},{t:'Recovery',n:1}],rows:bk,sub:fmtDate(d)}}},
  credit:{t:'Market credit (shop wise)',f:()=>F('Route',sel('rR',[...new Set(DB.shops.map(s=>s.route).filter(Boolean))],'','All'))+F('Booker',sel('rB',usersByRole('booker').map(u=>({v:u.id,t:u.name||u.username})),'','All'))+F('Only shops with credit',sel('rO',[{v:'1',t:'Yes'},{v:'',t:'All shops'}],'1')),b:()=>{
    const l=DB.shops.filter(s=>(!V('rR')||s.route===V('rR'))&&(!V('rB')||s.bookerId===V('rB'))).map(s=>[s,shopDue(s.id)]).filter(x=>!V('rO')||x[1]>0.5).sort((a,b)=>b[1]-a[1]);
    return{cols:[{t:'Shop'},{t:'Owner'},{t:'Phone'},{t:'Route'},{t:'Booker'},{t:'Limit',n:1},{t:'Outstanding',n:1}],rows:l.map(([s,d])=>[s.name,s.owner||'',s.phone||'',s.route||'',(byId('users',s.bookerId)||{}).name||'',N(s.creditLimit),d]),foot:['Total '+l.length,'','','','','',sum(l,x=>x[1])],ids:l.map(x=>x[0].id),html:'<p class="small muted">Click any shop to open its bills ledger and payment statement.</p>'}},
    a:(out,R)=>out.querySelectorAll('tbody tr').forEach((tr,i)=>{if(!R.ids[i])return;tr.classList.add('clk');tr.title='Open ledger';tr.onclick=()=>showLedger(R.ids[i])})},
  creditBooker:{t:'Market credit (booker wise)',b:()=>{const rows=[...usersByRole('booker'),{id:'',name:'No booker assigned'}].map(b=>{const sh=DB.shops.filter(s=>(s.bookerId||'')===b.id);const d=sh.map(s=>shopDue(s.id));return[b.name||b.username,sh.length,d.filter(x=>x>0.5).length,sum(d,x=>Math.max(0,x))]});return{cols:[{t:'Booker'},{t:'Shops',n:1},{t:'Shops with credit',n:1},{t:'Outstanding',n:1}],rows,foot:['Total',sum(rows,r=>r[1]),sum(rows,r=>r[2]),sum(rows,r=>r[3])]}}},
  sales:{t:'Sales (invoice wise)',f:()=>dateRange('r')+F('Booker',sel('rB',usersByRole('booker').map(u=>({v:u.id,t:u.name||u.username})),'','All')),a:(out,R)=>out.querySelectorAll('tbody tr').forEach((tr,i)=>{if(!R.ids||!R.ids[i])return;tr.classList.add('clk');tr.title='Open invoice for editing';tr.onclick=()=>{const iv=byId('invoices',R.ids[i]);if(!iv)return;POS.editId=iv.id;POS.items=JSON.parse(JSON.stringify(iv.items||[]));go('pos')}}),b:()=>{const l=activeInv().filter(i=>inRange(i.date,V('rFrom'),V('rTo'))&&(!V('rB')||i.bookerId===V('rB')));
    return{cols:[{t:'Inv # (click row to edit)'},{t:'Date'},{t:'Shop'},{t:'Booker'},{t:'Type'},{t:'Gross',n:1},{t:'Discount',n:1},{t:'Tax',n:1},{t:'Net',n:1}],rows:l.map(i=>[i.no,fmtDate(i.date),i.shopName,i.bookerName,i.payType,i.gross,i.discount,i.tax,i.net]),ids:l.map(i=>i.id),foot:['Total',l.length,'','','',sum(l,i=>i.gross),sum(l,i=>i.discount),sum(l,i=>i.tax),sum(l,i=>i.net)],sub:fmtDate(V('rFrom'))+' to '+fmtDate(V('rTo'))}}},
  productSales:{t:'Product wise sales',f:()=>dateRange('r')+F('Brand',sel('rBr',[...new Set(DB.products.map(p=>p.brand).filter(Boolean))],'','All')),b:()=>{const a={};activeInv().filter(i=>inRange(i.date,V('rFrom'),V('rTo'))).forEach(i=>i.items.forEach(it=>{if(V('rBr')&&it.brand!==V('rBr'))return;const x=a[it.productId]=a[it.productId]||{n:it.name,b:it.brand,pk:it.packing,pcs:0,amt:0,cost:0};x.pcs+=N(it.pcs);x.amt+=N(it.gross)-N(it.disc);x.cost+=N(it.pcs)*N(it.cost)}));
    const l=Object.values(a).sort((x,y)=>y.amt-x.amt);return{cols:[{t:'Product'},{t:'Brand'},{t:'Qty'},{t:'Pcs',n:1},{t:'Sales',n:1},{t:'Cost',n:1},{t:'Profit',n:1}],rows:l.map(x=>[x.n,x.b,splitPcs({packing:x.pk},x.pcs),x.pcs,x.amt,x.cost,x.amt-x.cost]),foot:['Total','','',sum(l,x=>x.pcs),sum(l,x=>x.amt),sum(l,x=>x.cost),sum(l,x=>x.amt-x.cost)]}}},
  booker:{t:'Booker performance',f:()=>dateRange('r'),b:()=>{const rows=usersByRole('booker').map(b=>{const iv=activeInv().filter(i=>i.bookerId===b.id&&inRange(i.date,V('rFrom'),V('rTo')));return[b.name||b.username,iv.length,new Set(iv.map(i=>i.shopId)).size,sum(iv,i=>i.net),sum(iv,i=>i.discount),sum(approvedRec().filter(r=>r.collectorId===b.id&&inRange(r.date,V('rFrom'),V('rTo'))),r=>r.amount)]});
    return{cols:[{t:'Booker'},{t:'Invoices',n:1},{t:'Shops',n:1},{t:'Sales',n:1},{t:'Discount',n:1},{t:'Recovery',n:1}],rows,foot:['Total',sum(rows,r=>r[1]),'',sum(rows,r=>r[3]),sum(rows,r=>r[4]),sum(rows,r=>r[5])]}}},
  recovery:{t:'Recovery report',f:()=>dateRange('r')+F('Collector',sel('rC',DB.users.filter(u=>u.role!=='developer').map(u=>({v:u.id,t:u.name||u.username})),'','All'))+F('Status',sel('rS',['approved','pending','rejected'],'approved')),b:()=>{
    const l=DB.recoveries.filter(r=>inRange(r.date,V('rFrom'),V('rTo'))&&(!V('rC')||r.collectorId===V('rC'))&&r.status===V('rS'));const c=DB.collections.filter(x=>inRange(x.date,V('rFrom'),V('rTo'))&&(!V('rC')||x.smId===V('rC')));
    const rows=[...l.map(r=>[fmtDate(r.date),'Recovery',r.shopName,r.collector,r.method,r.amount,r.short]),...(V('rS')==='approved'?c.map(x=>[fmtDate(x.date),'Supply man',x.shopName,x.supplyman,'Cash',x.amount,0]):[])];
    return{cols:[{t:'Date'},{t:'Type'},{t:'Shop'},{t:'Collector'},{t:'Method'},{t:'Amount',n:1},{t:'Short',n:1}],rows,foot:['Total','','','','',sum(rows,r=>r[5]),sum(rows,r=>r[6])]}}},
  stock:{t:'Stock report',f:()=>dateRange('r')+F('Brand',sel('rBr',[...new Set(DB.products.map(p=>p.brand).filter(Boolean))],'','All')),b:()=>{const l=DB.products.filter(p=>!V('rBr')||p.brand===V('rBr')).map(p=>{const s=stockOf(p.id),c=costPerPc(p.id);let sold=0,sales=0,bought=0,purchase=0;activeInv().filter(i=>inRange(i.date,V('rFrom'),V('rTo'))).forEach(i=>(i.items||[]).filter(it=>it.productId===p.id).forEach(it=>{sold+=N(it.pcs);sales+=N(it.gross)-N(it.disc)}));DB.purchases.filter(i=>inRange(i.date,V('rFrom'),V('rTo'))).forEach(i=>(i.items||[]).filter(it=>it.productId===p.id).forEach(it=>{bought+=N(it.pcs);purchase+=N(it.amount)}));return{p,s,c,sold,sales,bought,purchase}}).filter(x=>x.s!==0);const rows=l.map(x=>[x.p.name,x.p.brand||'',N(x.p.packing),splitPcs(x.p,x.s),x.s,r2(N(x.p.costCtn)),r2(x.p.tradePc),r2(x.p.retailPc),x.bought,r2(x.purchase),splitPcs(x.p,x.sold),x.sold,r2(x.sales),r2(Math.max(0,x.s)*x.c)]);
    return{cols:[{t:'Product'},{t:'Brand'},{t:'Packing / ctn',n:1},{t:'Stock'},{t:'Stock pcs',n:1},{t:'Purchase / ctn',n:1},{t:'Sale / pc',n:1},{t:'Retail / pc',n:1},{t:'Bought pcs',n:1},{t:'Purchase total',n:1},{t:'Sold ctn + pcs'},{t:'Sold pcs',n:1},{t:'Sales total',n:1},{t:'Stock value',n:1}],rows,foot:['Total','','','',sum(l,x=>x.s),'','','',sum(l,x=>x.bought),sum(l,x=>x.purchase),'',sum(l,x=>x.sold),sum(l,x=>x.sales),sum(l,x=>Math.max(0,x.s)*x.c)] ,sub:fmtDate(V('rFrom'))+' to '+fmtDate(V('rTo'))}}},
  discount:{t:'Discount report',f:()=>dateRange('r'),b:()=>{const l=activeInv().filter(i=>inRange(i.date,V('rFrom'),V('rTo'))&&N(i.discount)>0);return{cols:[{t:'Inv #'},{t:'Date'},{t:'Shop'},{t:'Booker'},{t:'Gross',n:1},{t:'Discount',n:1},{t:'Net',n:1}],rows:l.map(i=>[i.no,fmtDate(i.date),i.shopName,i.bookerName,i.gross,i.discount,i.net]),foot:['Total','','','',sum(l,i=>i.gross),sum(l,i=>i.discount),sum(l,i=>i.net)]}}},
  tax:{t:'Shop wise tax',f:()=>dateRange('r'),b:()=>{const a={};activeInv().filter(i=>inRange(i.date,V('rFrom'),V('rTo'))).forEach(i=>{const x=a[i.shopId]=a[i.shopId]||{n:i.shopName,c:0,s:0,t:0};x.c++;x.s+=N(i.net);x.t+=N(i.tax)});const l=Object.values(a);return{cols:[{t:'Shop'},{t:'Invoices',n:1},{t:'Sales',n:1},{t:'Tax',n:1}],rows:l.map(x=>[x.n,x.c,x.s,x.t]),foot:['Total',sum(l,x=>x.c),sum(l,x=>x.s),sum(l,x=>x.t)]}}},
  expenses:{t:'Expense report',f:()=>dateRange('r')+F('Head',sel('rH',[...new Set(DB.expenses.map(e=>e.head))],'','All')),b:()=>{const l=DB.expenses.filter(e=>inRange(e.date,V('rFrom'),V('rTo'))&&(!V('rH')||e.head===V('rH')));const h={};l.forEach(e=>h[e.head]=(h[e.head]||0)+N(e.amount));
    return{cards:Object.entries(h).map(([k,v])=>[k,money(v)]),cols:[{t:'Date'},{t:'Head'},{t:'Amount',n:1},{t:'Account'},{t:'Note'}],rows:l.map(e=>[fmtDate(e.date),e.head,e.amount,(byId('accounts',e.accountId)||{}).name||'',e.note||'']),foot:['Total','',sum(l,e=>e.amount),'','']}}},
  pnl:{t:'Profit & loss',f:()=>dateRange('r'),b:()=>{const p=pnl(V('rFrom'),V('rTo'));
    const days=[];for(let d=V('rFrom');d<=V('rTo')&&days.length<62;d=addDays(d,1)){const x=pnl(d,d);if(x.count||x.exp)days.push([fmtDate(d),x.sales,x.cogs,x.gp,x.exp,x.net])}
    return{cards:[['Net sales (after returns / tax)',money(p.netSales)],['Cost of goods sold',money(p.cogs)],['Gross profit',money(p.gp)],['Expenses',money(p.exp)],['Salaries',money(p.sal)],['Claims received',money(p.claimsRecv)],['Net profit / loss',money(p.net)]],
      cols:[{t:'Date'},{t:'Sales',n:1},{t:'COGS',n:1},{t:'Gross profit',n:1},{t:'Expenses',n:1},{t:'Net',n:1}],rows:days,sub:fmtDate(V('rFrom'))+' to '+fmtDate(V('rTo'))}}},
  statement:{t:'Business statement',f:()=>dateRange('r'),b:()=>{const from=V('rFrom'),to=V('rTo');const ok=d=>inRange(d,from,to);
    const before=d=>!!from&&String(d||'')<from;const M=accountMoves();const LG=Object.values(allLedgers()).flat();
    const obCash=sum(M.filter(m=>before(m.date)),m=>m.in-m.out),obCredit=sum(LG.filter(x=>before(x.date)),x=>x.dr-x.cr);
    const D={};const at=d=>D[d]=D[d]||{s:0,r:0,rt:0,p:0,e:0,i:0,o:0,lg:0};
    activeInv().filter(i=>ok(i.date)).forEach(i=>at(i.date).s+=N(i.net));
    DB.collections.filter(c=>ok(c.date)).forEach(c=>at(c.date).r+=N(c.amount));
    approvedRec().forEach(r=>{const d=r.approvedDate||r.date;if(ok(d))at(d).r+=N(r.amount)});
    DB.returns.filter(r=>ok(r.date)).forEach(r=>at(r.date).rt+=N(r.amount));
    DB.purchases.filter(p=>ok(p.date)).forEach(p=>at(p.date).p+=N(p.total));
    DB.expenses.filter(e=>ok(e.date)).forEach(e=>at(e.date).e+=N(e.amount));
    M.filter(m=>m.date&&ok(m.date)&&!before(m.date)).forEach(m=>{const x=at(m.date);x.i+=m.in;x.o+=m.out});
    LG.filter(x=>x.date&&ok(x.date)&&!before(x.date)).forEach(x=>at(x.date).lg+=x.dr-x.cr);
    let cash=obCash,cr=obCredit;const T={s:0,r:0,rt:0,p:0,e:0,i:0,o:0};
    const rows=[[from?fmtDate(from):'Start','Opening balance','','','','','','','',r2(cash),r2(cr)]];
    Object.keys(D).sort().forEach(d=>{const x=D[d];cash+=x.i-x.o;cr+=x.lg;for(const k in T)T[k]+=x[k];rows.push([fmtDate(d),'',r2(x.s),r2(x.r),r2(x.rt),r2(x.p),r2(x.e),r2(x.i),r2(x.o),r2(cash),r2(cr)])});
    const supDue=sum(DB.purchases.filter(p=>!to||p.date<=to),p=>N(p.total)-N(p.paidNow))-sum(DB.supplierPayments.filter(p=>!to||p.date<=to),p=>p.amount);
    return{cards:[['Opening cash + bank',money(obCash)],['Total sales',money(T.s)],['Total recovery',money(T.r)],['Returns',money(T.rt)],['Total purchase',money(T.p)],['Total expenses',money(T.e)],['Total cash in',money(T.i)],['Total cash out',money(T.o)],['Closing cash + bank',money(cash)],['Opening market credit',money(obCredit)],['Closing market credit',money(cr)],['Supplier dues',money(supDue)]],
      cols:[{t:'Date'},{t:'Detail'},{t:'Sales',n:1},{t:'Recovery',n:1},{t:'Returns',n:1},{t:'Purchase',n:1},{t:'Expenses',n:1},{t:'Cash in',n:1},{t:'Cash out',n:1},{t:'Cash + bank balance',n:1},{t:'Market credit',n:1}],
      rows,foot:['Total','',r2(T.s),r2(T.r),r2(T.rt),r2(T.p),r2(T.e),r2(T.i),r2(T.o),r2(cash),r2(cr)],sub:(from?fmtDate(from):'Start')+' to '+fmtDate(to)}}},
  brand:{t:'Brand wise profit',f:()=>dateRange('r'),b:()=>{const a={};activeInv().filter(i=>inRange(i.date,V('rFrom'),V('rTo'))).forEach(i=>i.items.forEach(it=>{const k=it.brand||'—';const x=a[k]=a[k]||{s:0,c:0};x.s+=N(it.gross)-N(it.disc);x.c+=N(it.pcs)*N(it.cost)}));const l=Object.entries(a);
    return{cols:[{t:'Brand'},{t:'Sales',n:1},{t:'Cost',n:1},{t:'Profit',n:1},{t:'Margin %',n:1}],rows:l.map(([k,x])=>[k,x.s,x.c,x.s-x.c,x.s?r2((x.s-x.c)/x.s*100):0]),foot:['Total',sum(l,x=>x[1].s),sum(l,x=>x[1].c),sum(l,x=>x[1].s-x[1].c),'']}}},
  returns:{t:'Returns report',f:()=>dateRange('r'),b:()=>{const l=DB.returns.filter(r=>inRange(r.date,V('rFrom'),V('rTo')));return{cols:[{t:'Date'},{t:'Kind'},{t:'Shop'},{t:'Product'},{t:'Pcs',n:1},{t:'Amount',n:1},{t:'Settle'},{t:'Reason'}],rows:l.map(r=>[fmtDate(r.date),r.kind,r.shopName,r.productName,r.pcs,r.amount,r.settle,r.reason||'']),foot:['Total','','','',sum(l,r=>r.pcs),sum(l,r=>r.amount),'','']}}},
  activity:{t:'Activity log',f:()=>dateRange('r',addDays(today(),-7),today())+F('User',sel('rU',DB.users.map(u=>u.username),'','All')),b:()=>{const l=DB.activity.filter(a=>inRange(a.at.slice(0,10),V('rFrom'),V('rTo'))&&(!V('rU')||a.user===V('rU')));return{cols:[{t:'Time'},{t:'User'},{t:'Module'},{t:'Action'},{t:'Record'},{t:'Detail'}],rows:l.map(a=>[a.at,a.user,a.module,a.action,a.record,a.details])}}}
};
VIEWS.reports=el=>{
  el.innerHTML=`<div class="note" style="margin-bottom:10px">Choose a report from the scrollable Reports list in the left sidebar. You can also use the buttons below.</div><div class="tabs" id="rpTabs">${Object.entries(REPORTS).map(([k,r])=>`<button data-rp="${k}" class="${REPORT_SELECTED===k?'on':''}">${esc(r.t)}</button>`).join('')}</div><div id="rpO"></div>`;
  const show=k=>{if(!REPORTS[k])k='daily';REPORT_SELECTED=k;$$('[data-rp]').forEach(b=>b.classList.toggle('on',b.dataset.rp===k));$$('[data-report-key]').forEach(b=>b.classList.toggle('on',b.dataset.reportKey===k));const r=REPORTS[k];reportBlock($('#rpO'),{title:r.t,printType:r.type,filters:r.f?r.f():'',build:r.b,after:r.a})};
  $$('[data-rp]').forEach(b=>b.onclick=()=>show(b.dataset.rp));show(REPORT_SELECTED);
};
/* =====================================================================
   USERS & ACCESS (admin: developer ke ilawa sab users)
   ===================================================================== */
function userEditor(u,dev){
  const n=!u;u=u||{username:'',name:'',role:'booker',active:true,phone:''};
  const roles=Object.entries(ROLES).filter(([k])=>dev||k!=='admin'||isDev()||ME.role==='admin').map(([v,t])=>({v,t}));
  const perms=u.perms&&u.perms.length?u.perms:ROLE_DEFAULTS[u.role]||[];
  modal(n?'New user':'Edit user: '+u.username,`<div class="grid">${F('Full name',inp('euN',u.name))}${F('Username (login)',inp('euU',u.username,'text','autocapitalize="none"'+(n?'':' readonly')))}
   ${F(n?'Password':'New password (leave blank to keep the current one)',inp('euP','','text'))}${F('Role',sel('euR',roles,u.role))}${F('Phone',inp('euPh',u.phone||''))}${F('Status',sel('euA',[{v:'1',t:'Active'},{v:'0',t:'Disabled'}],u.active===false?'0':'1'))}
   ${F('Booker of supply man',sel('euBk',usersByRole('booker').map(b=>({v:b.id,t:b.name||b.username})),u.bookerId||'','—'))}</div>
   <h4 class="mt">Screens allowed</h4><div class="row" id="euPerms">${MODULES.filter(m=>!m.devOnly).map(m=>`<label class="chip"><input type="checkbox" value="${m.id}" ${perms.includes(m.id)?'checked':''}> ${m.icon} ${esc(m.label)}</label>`).join('')}</div>
   <div class="row mt"><button class="btn sm" id="euDef">Default permissions of role</button></div>`,
   [...(!n&&u.id!==ME.id?[{t:'Delete',bad:1,fn:()=>confirmBox('Delete this user? (The name will stay in old records.)',()=>{DB.users=DB.users.filter(x=>x.id!==u.id);log('Users','User deleted',u.username);save();render()})}]:[]),
    {t:'Save',pri:1,fn:()=>{const un=V('euU').toLowerCase().replace(/\s+/g,'');if(!un||!V('euN'))return toast('Enter name and username.',true);
     if(n&&DB.users.some(x=>x.username.toLowerCase()===un))return toast('This username already exists.',true);if(n&&V('euR')!=='staff'&&V('euP').length<4)return toast('Password must be at least 4 characters.',true);
     Object.assign(u,{name:V('euN'),role:V('euR'),phone:V('euPh'),active:V('euA')==='1',bookerId:V('euBk'),perms:$$('#euPerms input:checked').map(c=>c.value)});
     if(n){u.id=uid();u.username=un;u.mustChange=true;DB.users.push(u)}if(V('euP'))u.pass=hashPass(u.username,V('euP'));
     log('Users',n?'User added':'User edited',u.username);save();closeModal();render();toast('User saved.')}}]);
  $('#euR').onchange=()=>{const d=ROLE_DEFAULTS[V('euR')]||[];$$('#euPerms input').forEach(c=>c.checked=d.includes(c.value))};
  $('#euDef').onclick=()=>$('#euR').onchange();
}
VIEWS.users=el=>{
  const list=DB.users.filter(u=>u.role!=='developer');
  el.innerHTML=`<div class="card"><h3>Users & access<span class="sp"></span><button class="btn sm pri" id="usNew">+ New user</button></h3>
   ${table([{t:'Name'},{t:'Username'},{t:'Role'},{t:'Phone'},{t:'Status'},{t:'Screens',n:1},{t:''}],list.map(u=>[esc(u.name),esc(u.username),ROLES[u.role]||u.role,esc(u.phone||''),u.active===false?badge('Disabled','bad'):badge('Active','ok'),(u.perms||ROLE_DEFAULTS[u.role]||[]).length,`<button class="btn sm" data-ue="${u.id}">✏️</button>`]))}
   <p class="note mt">"Staff (no login)" users are only for salary / advance; they cannot log in.</p></div>`;
  $('#usNew').onclick=()=>userEditor(null);$$('[data-ue]').forEach(b=>b.onclick=()=>userEditor(byId('users',b.dataset.ue)));
};

/* =====================================================================
   BACKUP & DAY END
   ===================================================================== */
function downloadJSON(obj,name){const b=new Blob([JSON.stringify(obj,null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
const backupName=tag=>(S().companyName||'erp').replace(/[^\w]+/g,'_')+'_'+(tag||'backup')+'_'+today()+'.json';
function restoreFromFile(){pickFile('.json').then(async f=>{if(!f)return;try{const d=JSON.parse(await f.text());if(!d||d.meta?.app!=='fatimatech-erp')throw new Error('This is not a backup file of this system.');
  confirmBox('All current data will be replaced by this backup. Are you sure?',()=>{const meId=ME.id;DB=normalize(d);DB.meta.updated=Date.now();ME=DB.users.find(u=>u.id===meId)||DB.users.find(u=>u.role==='developer');log('Backup','Restored',f.name);save();applyBranding();render();toast('Data restored.')})}catch(e){toast(e.message,true)}})}
VIEWS.backup=el=>{
  const last=DB.dayEnds[DB.dayEnds.length-1];
  el.innerHTML=`<div class="grid g2"><div class="card"><h3>Backup & restore</h3><p class="muted">Keep at least one backup daily on a computer or Google Drive. All data is stored in this browser.</p><div class="row"><button class="btn pri" id="bkDl">📥 Full backup download</button><button class="btn" id="bkRs">📤 Restore from backup</button></div><p class="small muted mt" id="bkUse"></p><p class="small muted">Last backup: ${DB.meta.lastBackup?esc(new Date(DB.meta.lastBackup).toLocaleString()):'never'}</p></div>
   <div class="card"><h3>Day end (close the day)</h3><div class="grid">${F('Business date',inp('deD',dayEndOverdue()?addDays(today(),new Date().getHours()>=DAYEND_HOUR?-1:-2):today(),'date'))}${F('Note',inp('deN'))}</div><p class="small muted mt">${last?'Last day end: '+fmtDate(last.date)+' — '+esc(last.by):'No day end yet.'}</p><p class="small muted">After day end, new entries are allowed only after that date. Entries on or before it can be edited or deleted by admin only. Only the developer can reopen an earlier date.</p>${DB.meta.reopen?`<div class="note" style="border-color:#e0b25a;background:#fdf6e7">🔓 Developer reopened <b>${fmtDate(DB.meta.reopen.from)}</b> onwards (was closed up to ${fmtDate(DB.meta.reopen.prevClosed)}). Make the missing entries, then do Day End again for <b>${fmtDate(DB.meta.reopen.prevClosed)}</b> or later. Reason: ${esc(DB.meta.reopen.reason)}</div>`:''}${DB.meta.pendingBackup?`<div class="note" style="border-color:#d9534f">⛔ Backup after Day End (${fmtDate(DB.meta.pendingBackup)}) is not confirmed. New entries are blocked until you take the backup.</div>`:''}<div class="row mt"><button class="btn pri" id="deGo">🔒 Day end + backup</button>${last&&isDev()?'<button class="btn bad" id="deOpen">🔓 Move day end back (developer)</button>':''}</div></div></div>
   <div class="card"><h3>Day end history</h3>${table([{t:'Date'},{t:'By'},{t:'Time'},{t:'Sales',n:1},{t:'Recovery',n:1},{t:'Expenses',n:1},{t:'Cash + bank',n:1},{t:'Note'}],DB.dayEnds.slice().reverse().map(d=>[fmtDate(d.date),esc(d.by),esc(d.at),fmt(d.sales),fmt(d.recovery),fmt(d.exp),fmt(d.cash),esc(d.note||'')]))}</div>`;
  $('#bkDl').onclick=()=>{DB.meta.lastBackup=Date.now();delete DB.meta.pendingBackup;downloadJSON(DB,backupName());log('Backup','Downloaded');save(true);render()};
  if(navigator.storage&&navigator.storage.estimate)navigator.storage.estimate().then(e=>{const u=$('#bkUse');if(u)u.textContent='Data size: '+fmt(JSON.stringify(DB).length/1048576)+' MB • Browser storage used: '+fmt((e.usage||0)/1048576)+' MB / '+fmt((e.quota||0)/1048576)+' MB'});$('#bkRs').onclick=restoreFromFile;
  $('#deGo').onclick=()=>{const d=V('deD');if(d>today())return toast('Day end cannot be done for a future date.',true);if(d<=lastClosed())return toast('Day end is already done up to '+fmtDate(lastClosed())+'.',true);const ro=DB.meta.reopen;if(ro&&d<ro.prevClosed)return toast('The developer reopened this period. Day end must be done for '+fmtDate(ro.prevClosed)+' or later.',true);const p=pnl(d,d);
    DB.meta.lastBackup=Date.now();DB.dayEnds.push({id:uid(),date:d,by:ME.username,at:nowStamp(),sales:p.sales,recovery:sum(approvedRec().filter(r=>(r.approvedDate||r.date)===d),r=>r.amount)+sum(DB.collections.filter(c=>c.date===d),c=>c.amount),exp:p.exp,cash:sum(DB.accounts,a=>accountBalance(a.id,d)),note:V('deN')});
    log('Backup','Day end',d);if(ro)delete DB.meta.reopen;DB.meta.pendingBackup=d;save(true);
    const dl=()=>{DB.meta.lastBackup=Date.now();downloadJSON(DB,backupName('dayend_'+d))};dl();
    const ok=()=>{if(confirm('Day end done for '+fmtDate(d)+'. Has the backup file downloaded and been saved? OK = yes, Cancel = download it again.')){delete DB.meta.pendingBackup;log('Backup','Day end backup confirmed',d);save();toast('Day end complete, backup saved.');render()}else{dl();setTimeout(ok,800)}};setTimeout(ok,800);render()};
  if($('#deOpen'))$('#deOpen').onclick=()=>{const l=DB.dayEnds.reduce((m,x)=>!m||x.date>m.date?x:m,null);modal('Move day end back',`<p>Last day end is <b>${fmtDate(l.date)}</b>. Choose the first date to open again; the day end moves to the day before it, so the admin can enter or change entries from that date onwards. The admin must then do Day End again (up to ${fmtDate(l.date)} or later) and take the backup. A backup of the current data is downloaded now.</p>${F('Open from date',inp('deFrom',l.date,'date','max="'+l.date+'"'))}${F('Reason',inp('deWhy'))}`,[{t:'Move day end back',bad:1,fn:()=>{const f=V('deFrom');if(!f||f>l.date)return toast('Choose a date on or before '+fmtDate(l.date)+'.',true);if(!V('deWhy'))return toast('Enter a reason.',true);
      DB.meta.lastBackup=Date.now();downloadJSON(DB,backupName('before_reopen_'+f));
      const prev=DB.meta.reopen?DB.meta.reopen.prevClosed:l.date;DB.dayEnds=DB.dayEnds.filter(x=>x.date<f);DB.meta.reopen={from:f,prevClosed:prev>l.date?prev:l.date,by:ME.username,at:nowStamp(),reason:V('deWhy')};
      log('Backup','Day end moved back',f,V('deWhy')+' (was closed up to '+l.date+')');save();closeModal();toast('Day end moved back. Admin can now enter entries from '+fmtDate(f)+'.');render()}}])};
};

/* =====================================================================
   USER MANUAL (role ke hisab se)
   ===================================================================== */
const MANUALS={"admin": "# Admin User Manual \u2014 Distribution ERP\n\nThis manual is for the admin and other users (booker, KPO, supply man). It explains how to do the daily work in the system.\n\n---\n\n## 1. Login\n\n1. The developer will give you a username and password.\n2. On the login screen, enter the username and password and press **Sign in**.\n3. On the first login the system will ask you to set a new password. Do not share your password with anyone.\n4. To change the password later, click your name at the top right, then **Change my password**.\n5. When work is finished, use **Logout** from the same menu.\n6. Press the \ud83c\udf19 / \u2600\ufe0f button at the top to switch between **night** and **day** mode. To change the look, open your name menu and choose **\ud83c\udfa8 Theme & day / night**. Your theme is saved on your own device only.\n\n## 2. Using on mobile\n\n- On mobile the system works just like an app. There is a tab bar at the bottom (Dashboard, POS etc.) and pressing **More** opens the full menu.\n- Open the file / link in Chrome and choose **Add to Home screen** from the menu (\u22ee). It will then open from an icon like an app.\n- If a table is wider than the screen, scroll left / right with your finger. The first column (name) stays in place.\n\n## 3. First time setup (only once)\n\nWork in this order:\n\n1. **Payment accounts**: \"Cash in hand\" is already created. Create Bank, JazzCash, Easypaisa accounts and enter their opening balance.\n2. **Users & access**: create a user for every booker, KPO and supply man. For staff who do not need a login (salary only), set the role to **Staff (no login)**.\n3. **Products & stock**: create products one by one with **+ New product**, or add all at once with **Import** from Excel / PDF / image. Enter the opening stock here too.\n4. **Shops & routes**: create shops, select the route and booker of each shop, and enter any old credit in **Opening balance**. Import is also available.\n\n## 4. Dashboard\n\nThe dashboard shows sales today, recovery, total market credit, cash + bank balance, stock value, and this month's profit and expenses. Below are booker performance and low stock products.\n\nBookers and supply men get their own dashboard that shows only their own sales, shops and advance.\n\n## 5. Sales\n\n### Order booking / POS\n1. Select order date, delivery date, booker, supply man and **shop**. When a shop is selected, its previous balance and credit limit are shown.\n2. Select payment **Credit** or **Cash**.\n3. Type the name in the **Product** box and select from the list. Stock and rate are shown below.\n4. Enter cartons and pieces. For a discount, enter the type (% / Rs per piece / Rs total) and value.\n5. Press **+ Add item**. Add as many items as needed.\n6. Press **Save** or **Save & print**. The print comes as two copies on one A4 page: a **Customer copy** and an **Office copy**. Cut along the middle line.\n\nIf stock is short, the system will not add the item. If the credit limit is exceeded, the system asks (or blocks it, if the developer has set this rule).\n\n### Sales invoices\n- Find invoices by date, search and status.\n- \ud83d\udda8\ufe0f to print, \u270f\ufe0f to edit (the invoice opens in POS), \ud83d\uddd1\ufe0f to delete (admin only).\n- Tick several invoices and use **Selected print** to print them together.\n- Download the list with **Excel**.\n\n### Delivery dates\n- **Single invoice**: select the invoice, enter the new date and press Update.\n- **Bulk**: select order date and booker, tick the invoices in the list, enter the new date and apply. The new date can be at most as many days after the order date as the developer has set (usually 7).\n\n### Picklist / load sheet (booker wise)\n1. Select the delivery date (or order date).\n2. Leave Booker on **All bookers**. The screen shows a separate picklist for each booker: their products, cartons, loose pieces and amount. Below is the **total vehicle load**.\n3. To get only one booker, select that booker. You can also filter by supply man.\n4. **Save & print**: each booker gets a separate page (their products and their invoices / shops list), and the last page shows the full vehicle load and a booker wise summary. Each booker gets a separate picklist number.\n\n### Returns\n- **Item return**: enter shop, product, pieces, rate and reason. Minus the money from the shop balance or refund cash. If the goods are fine select \"Good \u2014 back to stock\", if damaged select \"Damaged / expiry \u2014 not to stock\".\n- **Credit stock return**: use this when a shop returns goods against its credit. The balance is reduced by the value of the goods.\n- **Full invoice cancel**: select the invoice and enter the reason. All goods go back to stock and the balance is corrected. The record is kept safe.\n\n### Company claims\nCreate and print a damage, expiry or short supply claim in the company's name. When the company pays, press **\u2705 Received** and enter the amount and account.\n\n## 6. Purchase & stock\n\n### Purchase entry\n1. Enter date, supplier and the supplier's invoice number.\n2. Enter the product name (for an existing product the details fill in automatically), packing, cartons, cost / carton, trade and retail price, then press **+ Add product**.\n3. If the supplier's bill is in Excel, PDF or an image, press **\ud83d\udce5 Items from Excel / PDF / image**. The system reads the items; check the columns and press Import.\n4. Enter how much payment was made now and from which account. The rest goes to the supplier's due.\n5. Press **Save purchase**. Stock increases automatically.\n\n### Purchase invoices\nPrint, view attachment (bill image), edit and delete. Deleting a purchase also deducts its stock.\n\n### Supplier dues\nTotal purchases, paid and due for each supplier. Record a payment to a supplier from the form at the top.\n\n### Products & stock\nLive stock (cartons + pieces), cost, trade, retail and value of each product. Red = out of stock, yellow = less than 1 carton. Excel and print are also here.\n\n## 7. Recovery\n\n### Supply man collection\nCash the supply man brings at delivery: select the supply man and invoice and enter the cash received. The rest automatically stays on the shop's credit.\n\n### Market recovery\n1. Select the shop and enter the amount due and the amount actually received. The short amount is calculated automatically.\n2. Choose how to handle the short: stays due on the shop, staff responsibility (goes to that staff's cash difference and is deducted from salary), or discount.\n3. Select the payment method and account and save.\n4. Recovery sent by a booker goes to **Pending**. The admin approves with \u2705 or rejects with \u2716. You can also tick several and use **Selected approve**.\n5. Only after approval does the money go to the account and the shop ledger.\n\n## 8. Shops & routes\n\n- Filter by search, route and booker.\n- **\ud83d\udcd2 Ledger**: the full account of a shop (bills, cash, recovery, returns) with running balance. Print, Excel, PDF.\n- The balance of a shop over its credit limit is shown in red.\n\n## 9. Accounts\n\n- **Expenses**: date, head (fuel, rent etc.), amount and account.\n- **Payment accounts**: balance of each account, new account, transfer from one account to another, and **Account book** (every transaction with running balance).\n- **Owner & investors**: investors and their profit share %, capital in / out, distributing a period's profit by share, paying profit and printing the investor statement.\n\n## 10. Staff\n\n- **Staff advance**: record an advance, loan, cash difference or other deduction and the month of salary it should be deducted from.\n- **Salary & attendance**:\n  1. **Salary setup**: monthly salary and paid leaves of each staff.\n  2. **Attendance**: select the month and mark P / A / L / H for each day.\n  3. **Generate salary**: the system applies attendance and deductions and calculates the net salary. Print the slip and save the record. Salary cannot be generated for a month whose attendance is not saved; mark attendance first.\n  4. **Records**: old salaries, print and Excel.\n\n## 11. Reports\n\nThe Reports screen has tabs at the top: Daily summary, Market credit (shop wise and booker wise), Sales, Product wise sales, Booker performance, Recovery, Stock, Discount, Tax, Expenses, Profit & loss, Brand wise profit, Returns and Activity log.\n\nSet the filter, press **Generate report**, then \ud83d\udda8\ufe0f Print, \ud83d\udcca Excel or \ud83d\udcc4 PDF.\n\n## 12. Backup & day end\n\n- All data is stored in this browser / device. So always take a **daily backup**: **Full backup download**. If no backup has been taken for more than a day, a yellow reminder appears on the dashboard.\n- The Backup screen shows how big the data is and when the last backup was taken.\n- At the end of the day do **Day end**. The day's summary is saved and a backup downloads automatically.\n- **After day end that day is closed.** No new entry, edit or delete can be made up to that date (invoice, purchase, recovery, expense, return etc.). This way nobody can change old accounts.\n- To correct a mistake, the admin presses **Reopen last day end** and enters a reason. This is recorded in the activity log. After correcting, do the day end again.\n- On a new computer or if data is damaged, use **Restore from backup** with the old file.\n- Always take a backup before clearing browser history / data.\n\n## 13. Common problems\n\n- **Item is not being added**: stock is short. Make a purchase entry first.\n- **\"Day end is done\" message appears**: you are entering on an old date. Select today's date, or ask the admin to reopen the day end.\n- **A long invoice prints small**: the system shrinks it to fit on a half page. For very long invoices, ask the developer to set the invoice paper to full A4.\n- **A screen is not visible**: your user does not have permission for that screen. Ask the admin.\n- **Excel / PDF button not working**: turn on the internet, then refresh the page.\n- **Something was deleted by mistake**: restore the last backup (work done after it must be entered again).\n- **Forgot password**: the admin can set a new password from \"Users & access\".\n", "developer": "# Developer Manual \u2014 Fatima-Tech Distribution ERP\n\nThis manual is only for the developer (Fatima-Tech). It explains how to prepare the system for a new client. No setting needs to be changed in the code; everything is done from the **Developer control** screen. This screen is never visible to the admin or any other user.\n\n---\n\n## 1. First login\n\n- Username: `developer`\n- Password: `fatima@123`\n- Admin default: username `admin`, password `admin123`\n\nOn the first login the system asks for a new password. Always change both the developer and admin passwords before giving the file to a client.\n\nAfter login, **Developer control** is at the very bottom of the sidebar. It has 9 tabs.\n\n## 2. Company & branding\n\n- **App name**: shown on the browser tab and mobile icon.\n- **Company name, tagline, phone, email, NTN, address**: printed on the sidebar, login screen and every print.\n- **Logos**: upload the distributor's own logo and the principal company's logo.\n- **Letterhead**: upload the client's letterhead as an image or PDF. If a PDF is given, its first page becomes the image automatically.\n- **Login background**: the picture behind the login screen.\n- **Colours**: choose the main colour (buttons) and the sidebar colour to match the client's branding.\n- **Currency and date format**.\n- **Login heading, sub-line, developer credit line**.\n\n- **Default theme** and **Default day / night**: the look every user gets until they pick their own. Themes: Normal (Classic, Mint Fresh), Professional (Corporate Navy, Ledger Green, Executive Gold) and Gaming (Neon Arena, Inferno, Toxic Lime). Each theme has its own fonts, colours and layout style, and a day and night version. The Classic theme uses the main / sidebar colours set here.\n\nPress **Save branding** after every change.\n\n## 3. Print formats\n\nThe system has 11 types of print: sales invoice, purchase invoice, picklist, shop ledger, recovery receipt, return note, company claim, salary slip, all reports, daily summary and investor statement.\n\nSet each one separately:\n\n- **Print title** (for example \"SALES INVOICE\", \"BILL\", \"CASH MEMO\"). Leave blank for no title.\n- **Paper**: A4 full page, **2 copies on A4 \u2014 top / bottom**, **2 copies on A4 \u2014 side by side**, A5, or thermal 80mm. The sales invoice default is \"2 copies on A4 \u2014 top / bottom\".\n- **Copy names**: on 2-copy paper a name is printed in the corner above each copy. Default `Customer copy, Office copy`. Change it if needed (for example `Shop copy, Record copy`).\n- **Margins (mm)**: top, right, bottom, left. These apply from the edge of each page (and of each half on 2-copy paper). If the printer cuts the edges, increase the margin.\n- **Orientation**: portrait or landscape.\n- **Letterhead**: none / as top header / full page background. In background mode set the blank space at top and bottom in mm so the text does not overlap the letterhead design.\n- Whether to show **logo, principal logo, company name / address**.\n- **Font size, copies, footer note, signature lines** (comma separated, for example `Booker, Supply Man, Customer`).\n\nOn 2-copy paper a long invoice shrinks automatically to fit on a half page. If it still does not fit, the system gives a warning; for such a client set the invoice paper to \"A4 (full page)\".\n\nCheck the format with **Sample print**, then **Save format**. To apply one format to all, use **Apply this format to all prints** (each print keeps its own title).\n\n## 4. Modules on / off\n\nUntick any module the client does not need (for example investors, salary, claims). A disabled module is hidden from every user and its data stays safe. Turning it on again brings everything back.\n\n## 5. Business rules\n\n- **Tax %** on invoice.\n- **Prefix** for invoice, purchase and claim numbers, and the **next invoice number** (if coming from an old system, start from there).\n- Maximum days the delivery date can be moved ahead.\n- Default credit limit for a new shop.\n- Allow selling more than stock, block orders at credit limit, booker sees only own shops, recovery applied after admin approval.\n- Expense heads and product categories (comma separated).\n\n## 6. Data import\n\nTo load the client's old data into the system quickly:\n\n1. Press the **Products**, **Shops** or purchase items button.\n2. Give an Excel (.xlsx / .xls), CSV, PDF or image (JPG / PNG) file.\n3. The system detects the header row and columns automatically. Check the column for each field and change it if needed.\n4. Check the preview below and press **Import**.\n\nNotes:\n- If a product already exists (same name or code) it is updated, not created again.\n- Importing from an image needs internet (OCR). A clear, straight image reads better. Always check the data after import.\n- Download a blank Excel format from **Blank format (template)** and give it to the client to fill in and return.\n\n## 7. Users & passwords\n\nHere the developer can see and create all users, including the admin. If someone forgets their password, set a new one here. The developer's own username and password are also changed here.\n\nThe developer account is not visible on the admin's \"Users & access\" screen and the admin cannot change it.\n\n**Reset password from the login screen**: press **Forgot / reset password** under the Sign in button. Enter the developer username and password once; then select any user (including your own developer account), and set a new username / password. If you forget the developer password, enter your **developer recovery key** in the password box instead. Keep the recovery key private; never give it to a client.\n\n## 8. Cloud sync (Firebase)\n\nIf the client needs the same data on more than one mobile / computer:\n\n1. Create a project at firebase.google.com and turn on **Realtime Database**.\n2. In Project settings add a Web app and copy its config (apiKey, authDomain, databaseURL, projectId\u2026).\n3. Paste the config here, enter a unique client name in \"Data name\", set Sync **On** and press **Save & connect**.\n4. On the other device: open the same file, log in as developer and make the same setting (or restore the first device's backup).\n\nKeep access secure in the database rules. When sync is off, each device keeps its own data.\n\n## 8a. Licence / invoice limit\n\n- By default the system allows **200 invoices**. On the next invoice, POS stops and shows a \"Contact developer to purchase\" message with your phone, WhatsApp and email.\n- Enter your contact details and message in the **Licence / invoice limit** tab and press **Save licence**. Use **Preview message** to see what the client will see.\n- When the client pays, set **Unlimited invoices** to **On** and save. The client can then create unlimited invoices.\n- You can also change the free limit number here.\n- Old invoices can always be viewed, printed and edited; only new invoices are stopped. Deleting invoices does not free up the limit.\n- **Clear all transactions** resets the invoice count to 0 (for use after testing). The licence setting is not copied in the settings file (format library).\n\n## 9. Data tools\n\n- **Format library (settings file)**: all settings (branding, print formats, rules, modules) download in one file. Upload this file for a new client to apply the format instantly. Data and cloud config are not included.\n- **Full backup / restore**.\n- **Clear activity log**.\n- **Clear all transactions**: after testing, before going live. Products, shops, users and settings stay. A backup downloads automatically before clearing.\n- **Factory reset**: everything is erased and the developer login returns to default.\n\n## 10. How to hand over to a new client\n\n1. Open a fresh file, log in as developer and change the password.\n2. Set branding, logos and letterhead.\n3. Set the format of each print and check with sample print.\n4. Set modules and business rules.\n5. Import products and shops.\n6. Change the admin password and give it to the admin. The admin will create the other users.\n7. Test, then **Clear all transactions**.\n8. Keep the settings file (format library) safe with you.\n9. Give the client the Admin manual and stress taking a daily backup.\n\n## 11. Running like a mobile app\n\n- Put the file on any web hosting (for example GitHub Pages, Netlify or the client's website) and open the link in mobile Chrome.\n- From the Chrome menu (\u22ee) choose **Add to Home screen**. It opens full screen from the icon like an app.\n- On mobile there is a tab bar at the bottom, an app bar at the top, and the full menu from \u2630. Forms are in one or two columns, buttons are large.\n\n## 12. Technical notes\n\n- All data is in the browser's **IndexedDB** (`fatimatech_erp` database), which has hundreds of MB of space. Old localStorage data moves to IndexedDB automatically on first open. Each device / browser has separate data unless cloud sync is on.\n- The system asks the browser to keep the data \"persistent\" so the browser does not erase it on its own. A daily backup is still necessary.\n- Stock, ledger and account calculations are built once and remembered, and rebuilt on every save, so screens open fast even with thousands of invoices.\n- After day end, all entries up to that date are locked. The lock does not apply to the developer login (to fix mistakes), but such work is recorded in the activity log.\n- Passwords are saved as hashes.\n- Stock, shop balance, account balance and supplier due are recalculated from the records every time and are not stored separately. So edit / delete never upsets the accounts.\n- Excel / PDF / OCR libraries load from the internet. The rest of the system also works offline.\n- Images (logo, letterhead) are reduced in size before saving. Browser storage is about 5 MB, so do not use very large images.\n"};
function md(t){const L=String(t).split('\n');let h='',inL=false,inO=false;const close=()=>{if(inL){h+='</ul>';inL=false}if(inO){h+='</ol>';inO=false}};
  const il=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/`(.+?)`/g,'<code>$1</code>');
  L.forEach(l=>{let m;if(m=l.match(/^(#{1,3}) (.*)/)){close();h+=`<h${m[1].length}>${il(m[2])}</h${m[1].length}>`}else if(m=l.match(/^\s*[-*] (.*)/)){if(!inL){close();h+='<ul>';inL=true}h+=`<li>${il(m[1])}</li>`}else if(m=l.match(/^\s*\d+\. (.*)/)){if(!inO){close();h+='<ol>';inO=true}h+=`<li>${il(m[1])}</li>`}else if(l.trim()==='---'){close();h+='<hr>'}else if(l.trim()){close();h+=`<p>${il(l)}</p>`}else close()});close();return h}
VIEWS.help=el=>{
  const tabs=isDev()?[['admin','Admin manual'],['developer','Developer manual']]:[['admin','User manual']];
  el.innerHTML=`<div class="tabs">${tabs.map((t,i)=>`<button data-mn="${t[0]}" class="${i?'':'on'}">${t[1]}</button>`).join('')}<button id="mnPr">🖨️ Print</button></div><div class="card manual" id="mnO"></div>`;
  let cur='admin';const show=k=>{cur=k;$$('[data-mn]').forEach(b=>b.classList.toggle('on',b.dataset.mn===k));$('#mnO').innerHTML=md(MANUALS[k])};
  $$('[data-mn]').forEach(b=>b.onclick=()=>show(b.dataset.mn));show('admin');
  $('#mnPr').onclick=()=>printDoc('report',`<div style="line-height:1.55">${md(MANUALS[cur])}</div>`,{title:''});
};

/* =====================================================================
   DEVELOPER CONTROL PANEL — sab setting yahan se, code chhune ki zaroorat nahi
   ===================================================================== */
function imgField(key,label,maxW){const v=S()[key];return`<div class="f"><label>${label}</label><div class="row"><button class="btn sm" data-img="${key}" data-w="${maxW}">Upload</button>${v?`<button class="btn sm bad" data-imgx="${key}">Remove</button>`:''}</div>${v?`<img class="img-prev" src="${v}">`:'<span class="small muted">No image</span>'}</div>`}
const DEV_TABS={
 brand:['Company & branding',el=>{const s=S();el.innerHTML=`<div class="card"><h3>Company identity</h3><div class="grid">
   ${F('App name (browser tab)',inp('dsApp',s.appName))}${F('Company / distribution name',inp('dsCo',s.companyName))}${F('Tagline',inp('dsTag',s.tagline))}${F('Principal company name',inp('dsPr',s.principalName))}
   ${F('Phone',inp('dsPh',s.phone))}${F('Email',inp('dsEm',s.email))}${F('NTN / STRN',inp('dsNtn',s.ntn))}${F('Address',inp('dsAd',s.address),'wide')}</div></div>
   <div class="card"><h3>Logos & letterhead</h3><div class="grid g2">${imgField('logo','Own / distributor logo',400)}${imgField('principalLogo','Principal company logo',400)}
    <div class="f"><label>Letterhead (image or PDF)</label><div class="row"><button class="btn sm" id="dsLH">Upload image / PDF</button>${s.letterhead?'<button class="btn sm bad" data-imgx="letterhead">Remove</button>':''}</div>${s.letterhead?`<img class="img-prev" src="${s.letterhead}">`:'<span class="small muted">If a PDF is uploaded, its first page becomes the image</span>'}</div>
    ${imgField('loginBg','Login screen background',1400)}</div></div>
   <div class="card"><h3>Colours and text</h3><div class="grid">${F('Default theme (for all users)',sel('dsTh',Object.entries(THEMES).map(([k,x])=>({v:k,t:x.group+' — '+x.name})),s.theme==='gaming'?'neon':s.theme))}${F('Default day / night',sel('dsMode',[{v:'auto',t:'Auto (follow device / theme)'},{v:'day',t:'Day'},{v:'night',t:'Night'}],s.mode||'auto'))}${F('Main colour (buttons)',`<input id="dsAcc" type="color" value="${s.accent}">`)}${F('Sidebar colour',`<input id="dsSide" type="color" value="${s.sideColor}">`)}${F('Currency',inp('dsCur',s.currency))}${F('Date format',sel('dsDF',['DD-MM-YYYY','YYYY-MM-DD','MM/DD/YYYY'],s.dateFormat))}
    ${F('Login heading',inp('dsLT',s.loginTitle))}${F('Login sub-line',inp('dsLS',s.loginSub))}${F('Developer credit line',inp('dsDev',s.devCredit),'wide')}</div>
   <div class="row mt"><button class="btn pri" id="dsSave">💾 Save branding</button></div></div>`;
  $('#dsLH').onclick=async()=>{const f=await pickFile('image/*,.pdf');if(!f)return;try{S().letterhead=f.name.toLowerCase().endsWith('.pdf')?await pdfFirstPage(f):await readImage(f,1400,.8);save();toast('Letterhead applied.');renderDev()}catch(e){toast(e.message,true)}};
  $('#dsSave').onclick=()=>{Object.assign(S(),{appName:V('dsApp'),companyName:V('dsCo'),tagline:V('dsTag'),principalName:V('dsPr'),phone:V('dsPh'),email:V('dsEm'),ntn:V('dsNtn'),address:V('dsAd'),accent:V('dsAcc'),sideColor:V('dsSide'),currency:V('dsCur'),dateFormat:V('dsDF'),theme:V('dsTh'),mode:V('dsMode'),loginTitle:V('dsLT'),loginSub:V('dsLS'),devCredit:V('dsDev')});log('Developer','Branding saved');save();applyBranding();toast('Branding saved.')}}],
 print:['Print formats',el=>{const P=S().print;el.innerHTML=`<div class="card"><h3>Format of each print</h3><div class="grid">${F('Which print',sel('dpT',Object.entries(PRINT_TYPES).map(([v,x])=>({v,t:x.label})),'invoice'))}</div><div id="dpF" class="mt"></div></div>
   <div class="note">Sales invoices print as two side-by-side copies on A4 Landscape (Customer copy and Office copy) with a cut line in between. Other print formats can use "2 copies on A4" in top / bottom or side-by-side layout. A long invoice shrinks automatically to fit. Margins are in mm from the paper edge. In letterhead "background" mode, the blank space at top / bottom is set from the letterhead fields.</div>`;
  const draw=()=>{const k=V('dpT'),p=P[k];$('#dpF').innerHTML=`<div class="grid">${F('Print title',inp('dpTi',p.title,'text','placeholder="Blank = no title"'),'wide')}
    ${F('Paper',sel('dpPa',[{v:'A4',t:'A4 (full page)'},{v:'A4dual_v',t:'2 copies on A4 — top / bottom'},{v:'A4dual',t:'2 copies on A4 — side by side'},{v:'A5',t:'A5'},{v:'thermal',t:'Thermal 80mm'}],p.paper))}${F('Orientation',sel('dpOr',[{v:'portrait',t:'Portrait'},{v:'landscape',t:'Landscape'}],p.orientation))}
    ${F('Letterhead',sel('dpLh',[{v:'none',t:'None'},{v:'header',t:'As top header'},{v:'background',t:'Full page background'}],p.letterhead))}${F('Copies (not used on 2-copy paper)',inp('dpCp',p.copies,'number','min="1" max="4"'))}
    ${F('Show logo',sel('dpLg',[{v:'1',t:'Yes'},{v:'0',t:'No'}],p.showLogo?'1':'0'))}${F('Principal logo',sel('dpPl',[{v:'1',t:'Yes'},{v:'0',t:'No'}],p.showPrincipal?'1':'0'))}${F('Company name / address',sel('dpCo',[{v:'1',t:'Yes'},{v:'0',t:'No'}],p.showCompany?'1':'0'))}${F('Font size',inp('dpFs',p.fontSize,'number'))}
    ${F('Margin top (mm)',inp('dpMT',p.mTop??10,'number'))}${F('Margin right (mm)',inp('dpMR',p.mRight??10,'number'))}${F('Margin bottom (mm)',inp('dpMB',p.mBottom??10,'number'))}${F('Margin left (mm)',inp('dpML',p.mLeft??10,'number'))}
    ${F('Letterhead top space (mm)',inp('dpTop',p.lhTop??38,'number'))}${F('Letterhead bottom space (mm)',inp('dpBot',p.lhBottom??22,'number'))}
    ${F('Copy names (comma separated)',inp('dpCL',p.copyLabels||'','text','placeholder="Customer copy, Office copy"'),'wide')}
    ${F('Footer note',inp('dpFt',p.footer),'wide')}${F('Signature lines (comma separated)',inp('dpSg',p.signatures),'wide')}</div>
    <div class="row mt"><button class="btn pri" id="dpSave">💾 Save format</button><button class="btn" id="dpPrev">👁️ Sample print</button><button class="btn" id="dpAll">Apply this format to all prints</button></div>`;
    const read=()=>({title:V('dpTi'),paper:V('dpPa'),orientation:V('dpOr'),letterhead:V('dpLh'),copies:N(V('dpCp'))||1,showLogo:V('dpLg')==='1',showPrincipal:V('dpPl')==='1',showCompany:V('dpCo')==='1',fontSize:N(V('dpFs'))||12,lhTop:N(V('dpTop')),lhBottom:N(V('dpBot')),mTop:N(V('dpMT')),mRight:N(V('dpMR')),mBottom:N(V('dpMB')),mLeft:N(V('dpML')),copyLabels:V('dpCL'),footer:V('dpFt'),signatures:V('dpSg')});
    $('#dpSave').onclick=()=>{P[k]=read();log('Developer','Print format',k);save();toast('Format saved.')};
    $('#dpAll').onclick=()=>confirmBox('Apply paper, logo, letterhead, font and footer to all prints? (Each print keeps its own title.)',()=>{const r=read();Object.keys(P).forEach(x=>{P[x]={...r,title:P[x].title,copyLabels:P[x].copyLabels}});save();toast('All prints updated.')});
    $('#dpPrev').onclick=()=>{const old=P[k];P[k]=read();printDoc(k,sampleBody(k));P[k]=old}};
  $('#dpT').onchange=draw;draw()}],
 modules:['Modules on / off',el=>{const m=S().modules;el.innerHTML=`<div class="card"><h3>Which modules are in the system</h3><p class="muted">A disabled module is hidden from every user (including admin). Its data stays safe.</p><div class="row">${MODULES.filter(x=>!x.devOnly&&x.id!=='help').map(x=>`<label class="chip"><input type="checkbox" data-mod="${x.id}" ${m[x.id]!==false?'checked':''}> ${x.icon} ${esc(x.label)}</label>`).join('')}</div><div class="row mt"><button class="btn pri" id="dmSave">💾 Save</button></div></div>`;
  $('#dmSave').onclick=()=>{$$('[data-mod]').forEach(c=>m[c.dataset.mod]=c.checked);m.dashboard=true;log('Developer','Modules saved');save();buildNav();toast('Modules saved.')}}],
 rules:['Business rules',el=>{const s=S();const yn=v=>[{v:'1',t:'Yes'},{v:'0',t:'No'}];el.innerHTML=`<div class="card"><h3>Business rules</h3><div class="grid">
   ${F('Tax % (on invoice)',inp('drTax',s.taxPercent,'number'))}${F('Invoice number prefix',inp('drIP',s.invoicePrefix))}${F('Purchase prefix',inp('drPP',s.purchasePrefix))}${F('Claim prefix',inp('drCP',s.claimPrefix))}
   ${F('Next invoice number (counter)',inp('drIC',(DB.counters.inv||0)+1,'number'))}${F('Delivery date max ahead (days)',inp('drMD',s.maxDeliveryExtend,'number'))}${F('New shop default credit limit',inp('drCL',s.defaultCreditLimit,'number'))}
   ${F('Allow selling more than stock?',sel('drNeg',yn(),s.allowNegativeStock?'1':'0'))}${F('Block order at credit limit?',sel('drBlk',yn(),s.creditLimitBlock?'1':'0'))}${F('Booker sees only own shops?',sel('drOwn',yn(),s.bookerOwnShopsOnly?'1':'0'))}${F('Recovery after admin approval?',sel('drApp',yn(),s.recoveryNeedsApproval?'1':'0'))}
   ${F('Expense heads (comma separated)',inp('drEH',s.expenseHeads),'wide')}${F('Product categories (comma separated)',inp('drPC',s.productCategories),'wide')}</div><div class="row mt"><button class="btn pri" id="drSave">💾 Save rules</button></div></div>`;
  $('#drSave').onclick=()=>{Object.assign(s,{taxPercent:N(V('drTax')),invoicePrefix:V('drIP'),purchasePrefix:V('drPP'),claimPrefix:V('drCP'),maxDeliveryExtend:N(V('drMD'))||7,defaultCreditLimit:N(V('drCL')),allowNegativeStock:V('drNeg')==='1',creditLimitBlock:V('drBlk')==='1',bookerOwnShopsOnly:V('drOwn')==='1',recoveryNeedsApproval:V('drApp')==='1',expenseHeads:V('drEH'),productCategories:V('drPC')});
   DB.counters.inv=Math.max(0,N(V('drIC'))-1);log('Developer','Rules saved');save();toast('Rules saved.')}}],
 import:['Data import',el=>{el.innerHTML=`<div class="card"><h3>Data import (Excel / CSV / PDF / image)</h3><p class="muted">Upload a file and the system will detect the columns. You can change the column for each field and check the preview before importing. Importing from an image needs internet (OCR).</p>
   <div class="row">${Object.entries(IMPORT_TARGETS).filter(([k])=>k!=='purchaseItems').map(([k,t])=>`<button class="btn pri" data-imp="${k}">📥 ${esc(t.label)}</button>`).join('')}</div>
   <h4 class="mt">Blank format (template) download</h4><div class="row">${Object.entries(IMPORT_TARGETS).map(([k,t])=>`<button class="btn sm" data-tpl="${k}">📋 ${esc(t.label)}</button>`).join('')}</div></div>`;
  $$('[data-imp]').forEach(b=>b.onclick=()=>openImport(b.dataset.imp));
  $$('[data-tpl]').forEach(b=>b.onclick=()=>{if(!window.XLSX)return toast('Excel library did not load.',true);const t=IMPORT_TARGETS[b.dataset.tpl];const ws=XLSX.utils.aoa_to_sheet([t.fields.map(f=>f[1])]);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Format');XLSX.writeFile(wb,b.dataset.tpl+'_format.xlsx')})}],
 users:['Users & passwords',el=>{const all=DB.users;el.innerHTML=`<div class="card"><h3>All users (including admin)<span class="sp"></span><button class="btn sm pri" id="duNew">+ New user</button></h3>${table([{t:'Name'},{t:'Username'},{t:'Role'},{t:'Status'},{t:''}],all.map(u=>[esc(u.name),esc(u.username),u.role==='developer'?'Developer':ROLES[u.role],u.active===false?badge('Disabled','bad'):badge('Active','ok'),u.role==='developer'?'':`<button class="btn sm" data-due="${u.id}">✏️</button>`]))}</div>
   <div class="card"><h3>Developer login</h3><div class="grid">${F('Developer username',inp('ddU',ME.username))}${F('New password',inp('ddP','','password'))}</div><div class="row mt"><button class="btn pri" id="ddSave">💾 Save developer login</button></div></div>`;
  $('#duNew').onclick=()=>userEditor(null,true);$$('[data-due]').forEach(b=>b.onclick=()=>userEditor(byId('users',b.dataset.due),true));
  $('#ddSave').onclick=()=>{const un=V('ddU').toLowerCase().replace(/\s+/g,'');if(!un)return toast('Enter a username.',true);if(DB.users.some(u=>u.id!==ME.id&&u.username.toLowerCase()===un))return toast('This username belongs to someone else.',true);
   if(!V('ddP')&&un!==ME.username)return toast('Enter a password too, to change the username.',true);ME.username=un;if(V('ddP'))ME.pass=hashPass(un,V('ddP'));ME.mustChange=false;log('Developer','Developer login changed');save();toast('Developer login updated.');renderDev()}}],
 licence:['Licence / invoice limit',el=>{const L=LIC();el.innerHTML=`<div class="card"><h3>Invoice limit</h3>
   <div class="kpis"><div class="kpi lead"><small>Invoices created</small><b>${invUsed()}</b></div><div class="kpi"><small>Status</small><b>${L.unlimited?'Unlimited (purchased)':'Limited to '+(N(L.limit)||200)}</b></div></div>
   <div class="grid">${F('Unlimited invoices',sel('dlUn',[{v:'0',t:'Off — limit applies'},{v:'1',t:'On — unlimited (purchased)'}],L.unlimited?'1':'0'))}${F('Free invoice limit',inp('dlLim',N(L.limit)||200,'number','min="1"'))}</div></div>
   <div class="card"><h3>Developer contact (shown when limit is reached)</h3><div class="grid">${F('Developer / company name',inp('dlName',L.devName))}${F('Phone',inp('dlPh',L.phone,'tel'))}${F('WhatsApp number (with country code)',inp('dlWa',L.whatsapp,'tel','placeholder="923001234567"'))}${F('Email',inp('dlEm',L.email))}${F('Message',inp('dlMsg',L.message),'wide')}</div>
   <div class="row mt"><button class="btn pri" id="dlSave">💾 Save licence</button><button class="btn" id="dlPrev">👁️ Preview message</button></div></div>`;
  const read=()=>({limit:Math.max(1,N(V('dlLim'))||200),unlimited:V('dlUn')==='1',devName:V('dlName'),phone:V('dlPh'),whatsapp:V('dlWa'),email:V('dlEm'),message:V('dlMsg')});
  $('#dlSave').onclick=()=>{const old=LIC().unlimited;DB.licence=read();log('Developer','Licence saved',DB.licence.unlimited?'Unlimited':'Limit '+DB.licence.limit,old!==DB.licence.unlimited?(DB.licence.unlimited?'Unlimited turned ON':'Unlimited turned OFF'):'');save();toast('Licence saved.');renderDev()};
  $('#dlPrev').onclick=()=>{const keep=DB.licence;DB.licence={...keep,...read()};showBuyDialog();DB.licence=keep}}],
 cloud:['Cloud sync',el=>{const fb=S().firebase;el.innerHTML=`<div class="card"><h3>Firebase cloud sync (same data on different mobiles / computers)</h3>
   <p class="muted">Create a Realtime Database in the Firebase console and paste its config here. This setting is needed only once on each device (or restore a backup).</p>
   <div class="grid">${F('Sync on',sel('dcOn',[{v:'1',t:'On'},{v:'0',t:'Off'}],fb.enabled?'1':'0'))}${F('Data name (separate for each company)',inp('dcPath',fb.path||'','text','placeholder="my-client-name"'))}${F('Firebase config',`<textarea id="dcCfg" rows="8" placeholder="{ apiKey: '...', authDomain: '...', databaseURL: '...', projectId: '...' }">${esc(fb.config)}</textarea>`,'wide')}</div>
   <div class="row mt"><button class="btn pri" id="dcSave">💾 Save & connect</button><button class="btn" id="dcPush">⬆️ Upload now</button></div><p class="small mt">${Cloud.ready?badge('Connected','ok'):badge('Not connected','warn')}</p></div>`;
  $('#dcSave').onclick=()=>{Object.assign(fb,{enabled:V('dcOn')==='1',path:V('dcPath'),config:$('#dcCfg').value.trim()});save(true);toast('Saved. Reloading the page…');setTimeout(()=>location.reload(),900)};
  $('#dcPush').onclick=()=>{if(!Cloud.ready)return toast('Connect first.',true);Cloud.push(true);toast('Uploaded.')}}],
 data:['Data tools',el=>{el.innerHTML=`<div class="grid g2"><div class="card"><h3>Format library (settings file)</h3><p class="muted">Save all settings (branding, print formats, rules, modules) in one file. Upload this file for a new client to apply the same format instantly — data is not included.</p><div class="row"><button class="btn pri" id="dfEx">📥 Settings file download</button><button class="btn" id="dfIm">📤 Settings file upload</button></div></div>
   <div class="card"><h3>Backup</h3><div class="row"><button class="btn pri" id="dfBk">📥 Full backup</button><button class="btn" id="dfRs">📤 Restore</button></div></div>
   <div class="card"><h3>Reset (dangerous)</h3><p class="muted">Take a backup first.</p><div class="row"><button class="btn bad" id="dfAct">Clear activity log</button><button class="btn bad" id="dfTx">Clear all transactions (products, shops, users stay)</button><button class="btn bad" id="dfAll">Factory reset (everything)</button></div></div></div>`;
  $('#dfEx').onclick=()=>downloadJSON({app:'fatimatech-erp-format',settings:{...S(),firebase:{enabled:false,config:'',path:''}}},'format_'+(S().companyName||'erp').replace(/[^\w]+/g,'_')+'.json');
  $('#dfIm').onclick=async()=>{const f=await pickFile('.json');if(!f)return;try{const d=JSON.parse(await f.text());if(d.app!=='fatimatech-erp-format')throw new Error('This is not a settings (format) file.');const fb=S().firebase;DB.settings=deepMerge(defaultSettings(),d.settings);DB.settings.print=deepMerge(defaultPrint(),d.settings.print||{});DB.settings.firebase=fb;log('Developer','Format imported',f.name);save();applyBranding();toast('Format applied.');renderDev()}catch(e){toast(e.message,true)}};
  $('#dfBk').onclick=()=>{DB.meta.lastBackup=Date.now();save(true);downloadJSON(DB,backupName())};$('#dfRs').onclick=restoreFromFile;
  $('#dfAct').onclick=()=>confirmBox('Clear the activity log?',()=>{DB.activity=[];log('Developer','Activity log reset');save();toast('Cleared.')});
  $('#dfTx').onclick=()=>confirmBox('Invoices, purchases, recovery, returns, expenses, salary and investors will all be erased. Products, shops, users and settings will stay. Are you sure?',()=>{downloadJSON(DB,backupName('before_reset'));['invoices','purchases','supplierPayments','recoveries','collections','returns','claims','expenses','transfers','staffAdv','salaries','investorTxns','dayEnds','picklists'].forEach(k=>DB[k]=[]);DB.attendance={};DB.counters={inv:0,pur:0,clm:0,pick:0};DB.meta.invMade=0;DB.products.forEach(p=>p.openingPcs=0);DB.shops.forEach(s=>s.opening=0);log('Developer','Transactions reset');save();toast('Transactions cleared. A backup was downloaded first.')});
  $('#dfAll').onclick=()=>confirmBox('EVERYTHING will be erased (settings too). Only the developer login returns to default. Are you sure?',()=>{downloadJSON(DB,backupName('before_factory_reset'));DB=freshDB();save();logout()})}]
};
function sampleBody(k){
  const iv={no:'INV-00001',date:today(),deliveryDate:addDays(today(),1),shopId:'',shopName:'Sample Store',route:'Main Bazar',bookerName:'Booker',supplyman:'Supply man',payType:'credit',gross:5400,discount:200,tax:0,net:5200,status:'booked',items:[{name:'Sample product A',packing:12,pcs:30,rate:100,retail:120,disc:100,gross:3000},{name:'Sample product B',packing:24,pcs:24,rate:100,retail:115,disc:100,gross:2400}]};
  if(k==='invoice')return invoiceBody(iv);
  return `<div class="meta"><div><b>Date:</b> ${fmtDate(today())}</div><div><b>Ref:</b> SAMPLE-001</div></div>`+tableHTMLPrint([{t:'Detail'},{t:'Qty',n:1},{t:'Amount',n:1}],[['Sample line one',10,'1,000'],['Sample line two',5,'750']],['Total',15,'1,750']);
}
async function pdfFirstPage(file){await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;const pg=await pdf.getPage(1);const vp=pg.getViewport({scale:1.6});const c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;return c.toDataURL('image/jpeg',.8)}
let DEV_CUR='brand';
function renderDev(){const el=$('#devBody');if(!el)return;$$('[data-dt]').forEach(b=>b.classList.toggle('on',b.dataset.dt===DEV_CUR));DEV_TABS[DEV_CUR][1](el);
  $$('#devBody [data-img]').forEach(b=>b.onclick=async()=>{const f=await pickFile('image/*');if(!f)return;S()[b.dataset.img]=await readImage(f,N(b.dataset.w)||600,.85);save();applyBranding();renderDev()});
  $$('#devBody [data-imgx]').forEach(b=>b.onclick=()=>{S()[b.dataset.imgx]='';save();applyBranding();renderDev()})}
VIEWS.devpanel=el=>{if(!isDev()){el.innerHTML='';return}
  el.innerHTML=`<div class="note" style="margin-bottom:12px">This screen is visible only to the developer. None of these settings are shown to admin or any other user.</div><div class="tabs">${Object.entries(DEV_TABS).map(([k,t])=>`<button data-dt="${k}">${esc(t[0])}</button>`).join('')}</div><div id="devBody"></div>`;
  $$('[data-dt]').forEach(b=>b.onclick=()=>{DEV_CUR=b.dataset.dt;renderDev()});renderDev()};

/* =====================================================================
   BOOT
   ===================================================================== */
(async function boot(){
  await loadDB();applyBranding();
  $('#loginBtn').onclick=doLogin;$('#loginReset').onclick=resetPasswordDialog;$('#lp').onkeydown=e=>{if(e.key==='Enter')doLogin()};$('#lu').onkeydown=e=>{if(e.key==='Enter')$('#lp').focus()};
  $('#lpToggle').onclick=()=>{const p=$('#lp');p.type=p.type==='password'?'text':'password';$('#lpToggle').textContent=p.type==='password'?'Show':'Hide'};
  $('#mClose').onclick=closeModal;$('#modalBg').onclick=e=>{if(e.target.id==='modalBg')closeModal()};
  const sid=localStorage.getItem(SESSION_KEY);const u=sid&&DB.users.find(x=>x.id===sid&&x.active!==false);
  if(u){ME=u;startApp()}else $('#lu').focus();
  Cloud.init();
  if(BC)BC.onmessage=async e=>{if(!e.data||N(e.data.updated)<=N(DB.meta.updated))return;const raw=await IDB.get(LS_KEY)||localStorage.getItem(LS_KEY);if(!raw)return;DB=normalize(JSON.parse(raw));clearCache();if(ME){ME=DB.users.find(x=>x.id===ME.id)||ME;applyBranding();render()}};
  tickClock();setInterval(tickClock,1000);setInterval(liveRefresh,30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)liveRefresh()});
})();
