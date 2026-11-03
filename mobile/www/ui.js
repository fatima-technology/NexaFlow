'use strict';
/* NexaFlow Field — screens for Order Booker and Store Manager */
let ME=null,TAB='home',ONLINE=navigator.onLine!==false;
const ST={order:null,rec:null,recv:null,mv:'return',count:null,stockQ:'',stockF:'',ordDate:null,shopQ:''};
const ROLE_LABEL={booker:'Order Booker',storemanager:'Store Manager'};
const TABS={
  booker:[['home','🏠','Home'],['order','🛒','Order'],['orders','🧾','Orders'],['recovery','💰','Recovery'],['shops','🏪','Shops']],
  storemanager:[['home','🏠','Home'],['stock','📦','Stock'],['receive','📥','Receive'],['moves','🔄','Returns'],['count','✅','Count']]
};

/* ---------- small UI helpers ---------- */
let toastT=null;
function toast(msg,bad){const t=$('#toast');t.textContent=msg;t.className='on'+(bad?' bad':'');clearTimeout(toastT);toastT=setTimeout(()=>t.className='',bad?4500:2500)}
function openSheet(html,after){$('#sheet').innerHTML=html;$('#sheetWrap').hidden=false;after&&after()}
function closeSheet(){$('#sheetWrap').hidden=true;$('#sheet').innerHTML=''}
document.addEventListener('click',e=>{if(e.target.closest('[data-close]'))closeSheet()});
const fld=(label,inner)=>`<label class="f"><span>${label}</span>${inner}</label>`;
const inp=(id,val,type,extra)=>`<input id="${id}" type="${type||'text'}" value="${esc(val==null?'':val)}" ${extra||''}>`;
const opts=(arr,sel,ph)=>(ph!=null?`<option value="">${esc(ph)}</option>`:'')+arr.map(o=>{const v=typeof o==='object'?o.v:o,t=typeof o==='object'?o.t:o;return`<option value="${esc(v)}"${String(v)===String(sel)?' selected':''}>${esc(t)}</option>`}).join('');
const V=id=>{const e=document.getElementById(id);return e?e.value.trim():''};
const badge=(t,k)=>`<span class="badge ${k||''}">${esc(t)}</span>`;
const syncBadge=e=>e.status==='synced'?badge('Synced ✓','ok'):badge('Pending ⏳','warn');
function confirmSheet(msg,onYes,yesLabel){
  openSheet(`<h2>${esc(msg)}</h2><div class="btns"><button class="btn" data-close>Nahi</button><button class="btn pri" id="cfYes">${esc(yesLabel||'Haan')}</button></div>`,()=>{$('#cfYes').onclick=()=>{closeSheet();onYes()}});
}
/* searchable picker sheet: items = [{q, html, v}] */
function pickSheet(title,items,onPick,emptyMsg){
  openSheet(`<h2>${esc(title)}</h2><div class="search"><input id="pkQ" type="search" placeholder="Search…" autocomplete="off"></div><div class="list" id="pkL"></div>`,()=>{
    const draw=()=>{const q=V('pkQ').toLowerCase();const l=items.filter(i=>!q||i.q.includes(q)).slice(0,80);
      $('#pkL').innerHTML=l.length?l.map((i,ix)=>`<button class="row-item" data-ix="${ix}">${i.html}</button>`).join(''):`<div class="empty">${esc(emptyMsg||'Kuch nahi mila')}</div>`;
      $$('#pkL [data-ix]').forEach(b=>b.onclick=()=>{const it=l[+b.dataset.ix];closeSheet();onPick(it.v)})};
    $('#pkQ').oninput=draw;draw();setTimeout(()=>{try{$('#pkQ').focus()}catch(e){}},250)});
}
const productItems=()=>M.products.map(p=>({v:p.id,q:[p.name,p.sku,p.brand].join(' ').toLowerCase(),html:`<div class="main"><b>${esc(p.name)}</b><small>${esc([p.brand,p.sku].filter(Boolean).join(' • '))}</small></div><div class="end small">${splitPcs(p.packing,stockOf(p.id))}</div>`}));
const shopItems=ownOnly=>{const bk=ME.role==='booker'&&ownOnly&&M.settings.ownOnly;return M.shops.filter(s=>!bk||s.bookerId===ME.id).map(s=>({v:s.id,q:[s.name,s.owner,s.route,s.phone].join(' ').toLowerCase(),html:`<div class="main"><b>${esc(s.name)}</b><small>${esc([s.route,s.owner].filter(Boolean).join(' • '))}</small></div><div class="end small">${shopDue(s.id)>0?money(shopDue(s.id)):''}</div>`}))};
const prod=id=>M.products.find(p=>p.id===id);
const shop=id=>M.shops.find(s=>s.id===id);
const pickBtn=(id,label,ph)=>`<button type="button" class="pick" id="${id}">${label?`<span>${label}</span>`:`<span class="ph">${esc(ph)}</span>`}<span>▾</span></button>`;

/* ---------- boot ---------- */
async function boot(){
  await DB.open();
  FS.code=(await DB.kv('code'))||'';FS.auth=await DB.kv('fsAuth');
  M=await DB.kv('master');await loadLocal();
  const sid=await DB.kv('session');
  if(M&&sid)ME=M.users.find(u=>u.id===sid)||null;
  try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
  window.addEventListener('online',()=>{ONLINE=true;chrome()});window.addEventListener('offline',()=>{ONLINE=false;chrome()});
  /* over-the-air update (loader.js): restart at once on the login/setup screens, otherwise show a banner */
  window.addEventListener('nexaflow-update-ready',()=>{if(window.NFOTA&&(!ME||!M||!FS.code))NFOTA.apply();else render()});
  render();
  if(window.NFOTA&&NFOTA.ready)NFOTA.ready();
}
function chrome(){const n=$('#netChip');if(n){n.className='net'+(ONLINE?'':' off');n.lastChild.textContent=ONLINE?'Online':'Offline'}}

function render(){
  const app=$('#app');
  if(!M||!FS.code)return setupView(app);
  if(!ME)return loginView(app);
  const tabs=TABS[ME.role];if(!tabs.some(t=>t[0]===TAB))TAB='home';
  const pend=pendingN();
  app.innerHTML=`<div class="shell"><header class="top"><div class="ttl"><b>${esc(M.settings.company)}</b><small>${esc(ME.name)} • ${ROLE_LABEL[ME.role]}</small></div>
    <span class="net${ONLINE?'':' off'}" id="netChip"><i></i><span>${ONLINE?'Online':'Offline'}</span></span>
    <button class="iconbtn" id="btnSync" aria-label="Sync">🔄</button><button class="iconbtn" id="btnMe" aria-label="Menu">⋮</button></header>
    <main id="main"></main>
    <nav class="nav">${tabs.map(([k,ic,t])=>`<button data-tab="${k}" class="${k===TAB?'on':''}"><span>${ic}</span>${t}${k===(ME.role==='booker'?'orders':'home')&&pend?`<i class="dot">${pend}</i>`:''}</button>`).join('')}</nav></div>`;
  $$('[data-tab]').forEach(b=>b.onclick=()=>{TAB=b.dataset.tab;render();$('#main').scrollTop=0});
  $('#btnSync').onclick=doSync;$('#btnMe').onclick=menuSheet;
  const v=(ME.role==='booker'?BOOKER:STORE)[TAB];v($('#main'));
  if(window.NFOTA&&NFOTA.pending){$('#main').insertAdjacentHTML('afterbegin','<div class="note">🆕 Naya update tayyar hai. <button class="btn sm pri" id="otaGo" style="margin-left:6px">Abhi lagayein</button></div>');$('#otaGo').onclick=()=>NFOTA.apply()}
}

/* ---------- setup (first run) & login ---------- */
function setupView(app){
  app.innerHTML=`<div class="auth"><div class="logo"><img src="icons/icon-192.png" alt=""></div><h1>NexaFlow Field</h1><p>Order Booker aur Store Manager ke liye. Pehli baar apna <b>Client Code</b> daalein (laptop wale admin se milega).</p>
   <div class="panel">${fld('Client code',inp('scCode',FS.code||'','text','placeholder="NX-XXXXXXXXXX" autocapitalize="characters" autocomplete="off"'))}
   <div class="err" id="scErr"></div><button class="btn pri block" id="scGo">Data download karein</button>
   <p class="small muted" style="margin:12px 0 0">Internet chahiye. Data laptop ke aakhri <b>Day End backup</b> se aata hai.</p></div><div class="foot">Developed by Fatima-Tech</div></div>`;
  $('#scGo').onclick=async()=>{
    const c=FS.clean(V('scCode'));if(!c)return($('#scErr').textContent='Client code likhein.');
    const b=$('#scGo');b.disabled=true;$('#scErr').textContent='';FS.code=c;
    try{await refreshMaster(t=>{b.textContent=t});await DB.setkv('code',c);toast('Data aa gaya ✓');ME=null;render()}
    catch(e){FS.code=(await DB.kv('code'))||'';$('#scErr').textContent=e.net?'Internet nahi hai ya bohat slow hai.':e.message;b.disabled=false;b.textContent='Data download karein'}};
}
function loginView(app){
  app.innerHTML=`<div class="auth"><div class="logo"><img src="icons/icon-192.png" alt=""></div><h1>${esc(M.settings.company)}</h1><p>Apne username aur password se login karein.</p>
   <div class="panel">${fld('Username',inp('lgU','','text','autocapitalize="none" autocomplete="username"'))}${fld('Password',inp('lgP','','password','autocomplete="current-password"'))}
   <div class="err" id="lgErr"></div><button class="btn pri block" id="lgGo">Login</button>
   <p class="small muted" style="margin:12px 0 0">Data: ${fmtDate(M.bk.date)} ke Day End backup se.</p></div><div class="foot">Developed by Fatima-Tech</div></div>`;
  const go=async()=>{
    const u=V('lgU').toLowerCase(),p=$('#lgP').value;if(!u||!p)return($('#lgErr').textContent='Username aur password likhein.');
    $('#lgGo').disabled=true;$('#lgGo').textContent='Check ho raha hai…';await new Promise(r=>setTimeout(r,30));   // let the button repaint (hash is CPU heavy)
    const user=M.users.find(x=>x.username.toLowerCase()===u);
    if(!user||!verifyPass(user.username,p,user.pass)){$('#lgErr').textContent='Username ya password ghalat hai. (Naya user/password laptop par badla ho to menu se data refresh karein.)';$('#lgGo').disabled=false;$('#lgGo').textContent='Login';return}
    ME=user;TAB='home';await DB.setkv('session',user.id);render()};
  $('#lgGo').onclick=go;$('#lgP').onkeydown=e=>{if(e.key==='Enter')go()};
}
function menuSheet(){
  const age=Math.floor((Date.now()-M.fetchedAtMs)/3600000);
  openSheet(`<h2>${esc(ME.name)}</h2><div class="card"><div class="small muted">Data: <b>${fmtDate(M.bk.date)}</b> ka Day End backup • download ${age<1?'abhi':age+' ghante pehle'}</div><div class="small muted">Client: ${esc(FS.code)}</div><div class="small muted">App: ${window.NFOTA&&NFOTA.ver?esc(NFOTA.ver)+(NFOTA.source==='update'?' (online update)':''):'—'}</div></div>
   <div class="btns" style="flex-direction:column"><button class="btn block" id="mnRef">⬇ Data refresh (latest backup)</button><button class="btn block" id="mnOut">Logout</button><button class="btn block bad" id="mnCode">Client code badlein</button></div>`,()=>{
    $('#mnOut').onclick=async()=>{await DB.delkv('session');ME=null;closeSheet();render()};
    $('#mnRef').onclick=async()=>{const b=$('#mnRef');b.disabled=true;try{await refreshMaster(t=>{b.textContent=t});ME=M.users.find(u=>u.id===ME.id)||null;closeSheet();toast('Data refresh ho gaya ✓');if(!ME)await DB.delkv('session');render()}catch(e){b.disabled=false;b.textContent='⬇ Data refresh (latest backup)';toast(e.net?'Internet nahi hai.':e.message,true)}};
    $('#mnCode').onclick=()=>{if(pendingN())return toast('Pehle pending entries Sync karein.',true);confirmSheet('Client code badlein? Is phone ka data saaf ho jayega.',async()=>{for(const s of['kv']){for(const r of await DB.all(s))await DB.del(s,r.k)}for(const r of await DB.all('outbox'))await DB.del('outbox',r.id);for(const r of await DB.all('dayends'))await DB.del('dayends',r.key);M=null;ME=null;OUT=[];DAYS=[];FS.code='';FS.auth=null;FS.tok=null;render()},'Haan, saaf karein')};
  });
}
async function doSync(){
  if(SYNCING)return;const b=$('#btnSync');if(b)b.disabled=true;toast('Sync ho raha hai…');
  const r=await syncAll(ME);if(!r)return;ONLINE=!r.net;
  let m=`${r.ok} synced, ${r.fail} failed`;if(r.dayEnds)m+=` • ${r.dayEnds} Day End`;if(r.net)m+=' — internet nahi hai ya slow hai';else if(r.errors[0])m+=' — '+r.errors[0];
  if(!r.ok&&!r.fail&&!r.dayEnds)m=r.net?'Internet nahi hai ya slow hai':'Sab kuch synced hai ✓';
  toast(m,r.fail>0||r.net);render();
}
const staleNote=()=>{const d=Math.floor((Date.now()-M.bk.createdAtMs)/86400000);return d>=2?`<div class="note warn">⚠️ Data ${d} din purana hai (laptop ka aakhri Day End backup ${fmtDate(M.bk.date)}). Stock/balances purane ho sakte hain.</div>`:''};
const lastSyncNote=()=>LAST_SYNC?`<p class="small muted">Aakhri Sync ${clock(LAST_SYNC.at)}: ${LAST_SYNC.ok} synced, ${LAST_SYNC.fail} failed</p>`:'';

/* =====================================================================
   ORDER BOOKER
   ===================================================================== */
const myOrders=date=>OUT.filter(e=>e.kind==='order'&&e.byId===ME.id&&(!date||e.date===date));
const BOOKER={
  home(el){
    const t=today(),os=myOrders(t),rc=OUT.filter(e=>e.kind==='recovery'&&e.byId===ME.id&&e.date===t);
    const mine=M.shops.filter(s=>!M.settings.ownOnly||s.bookerId===ME.id);const credit=sum(mine,s=>Math.max(0,shopDue(s.id)));
    el.innerHTML=`${staleNote()}<div class="kpis"><div class="kpi hot"><small>Aaj ki sale</small><b>${money(sum(os,o=>o.payload.net))}</b></div><div class="kpi"><small>Aaj ke orders</small><b>${os.length}</b></div>
      <div class="kpi"><small>Aaj ki recovery</small><b>${money(sum(rc,r=>r.amount))}</b></div><div class="kpi"><small>Pending sync</small><b>${pendingN()}</b></div></div>
      <div class="btns" style="margin-bottom:12px"><button class="btn pri" data-go="order">🛒 Naya order</button><button class="btn" data-go="recovery">💰 Recovery</button></div>
      <div class="card"><h3>Shops with credit<span class="sp"></span><span class="small muted">${money(credit)}</span></h3><div class="list">${mine.map(s=>[s,shopDue(s.id)]).filter(x=>x[1]>0.5).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([s,d])=>`<div class="row-item"><div class="main"><b>${esc(s.name)}</b><small>${esc(s.route)}</small></div><div class="end">${fmt(d)}</div></div>`).join('')||'<div class="empty">Koi credit baqi nahi</div>'}</div></div>${lastSyncNote()}`;
    $$('[data-go]',el).forEach(b=>b.onclick=()=>{TAB=b.dataset.go;render()});
  },
  /* ---- new order ---- */
  order(el){
    const O=ST.order||(ST.order={shopId:'',pay:'credit',delivery:addDays(today(),1),items:[]});
    const sh=shop(O.shopId);const T=orderTotals(O);
    el.innerHTML=`${staleNote()}<div class="card"><h3>Naya order</h3>${fld('Shop',pickBtn('oShop',sh?esc(sh.name):'','Shop chunein'))}
      ${sh?`<div class="note">Baqaya: <b>${money(shopDue(sh.id))}</b>${sh.creditLimit?' • Limit: '+money(sh.creditLimit):''}${sh.route?' • '+esc(sh.route):''}</div>`:''}
      <div class="two">${fld('Payment',`<select id="oPay">${opts([{v:'credit',t:'Credit'},{v:'cash',t:'Cash'}],O.pay)}</select>`)}${fld('Delivery date',inp('oDel',O.delivery,'date'))}</div></div>
      <div class="card"><h3>Items<span class="sp"></span><button class="btn sm pri" id="oAdd">+ Item</button></h3>
      <div class="list">${O.items.map((it,ix)=>`<div class="row-item"><div class="main"><b>${esc(it.name)}</b><small>${splitPcs(it.packing,it.pcs)} × ${fmt(it.rate)}${it.disc?' − '+fmt(it.disc):''}</small></div><div class="end">${fmt(it.gross-it.disc)}</div><button class="btn sm bad" data-rm="${ix}" aria-label="Remove">✕</button></div>`).join('')||'<div class="empty">Abhi koi item nahi</div>'}</div>
      <div class="totals"><span>Gross</span><b class="right">${money(T.g)}</b><span>Discount</span><b class="right">${money(T.d)}</b>${M.settings.taxPercent?`<span>Tax ${M.settings.taxPercent}%</span><b class="right">${money(T.tax)}</b>`:''}<span class="big">Net</span><b class="big right">${money(T.net)}</b></div>
      <button class="btn pri block" id="oSave">💾 Order save karein</button></div>`;
    $('#oShop').onclick=()=>pickSheet('Shop chunein',shopItems(true),id=>{O.shopId=id;render()},'Aap ki koi shop nahi mili');
    $('#oPay').onchange=()=>O.pay=V('oPay');$('#oDel').onchange=()=>O.delivery=V('oDel');
    $('#oAdd').onclick=()=>pickSheet('Product chunein',productItems(),pid=>itemSheet(O,pid),'Product nahi mila');
    $$('[data-rm]',el).forEach(b=>b.onclick=()=>{O.items.splice(+b.dataset.rm,1);render()});
    $('#oSave').onclick=()=>saveOrder(O);
  },
  /* ---- my orders, sync, day end ---- */
  orders(el){
    const date=ST.ordDate||(ST.ordDate=today());const list=myOrders(date).slice().reverse();const locked=dayLocked(ME.id,date),dr=DAYS.find(d=>d.key===ME.id+'_'+date);
    const pend=list.filter(o=>o.status==='pending').length,allPend=pendingN();
    el.innerHTML=`<div class="card"><h3>Sync<span class="sp"></span><button class="btn sm pri" id="osSync">🔄 Sync</button></h3><div>${ONLINE?badge('Online','ok'):badge('Offline','bad')} ${allPend?badge(allPend+' pending','warn'):badge('Sab synced ✓','ok')}</div>${lastSyncNote()}
       <p class="small muted">Internet aane par orders khud upload nahi hote — Sync dabayein.</p></div>
      <div class="card"><h3>Orders<span class="sp"></span><input id="osDate" type="date" value="${date}" style="width:auto;min-height:40px"></h3>
       ${locked?`<div class="note bad">🔒 ${fmtDate(date)} ka Day End ho chuka${dr?' ('+clock(dr.closedAtMs)+')':''}. Ab sirf dekh sakte hain.${dr&&!dr.synced?'<br>Day End abhi online save nahi hua — Sync dabayein.':''}</div>`:''}
       <div class="list">${list.map(o=>`<button class="row-item" data-oid="${o.id}"><div class="main"><b>${esc(o.payload.shopName)}</b><small>${esc(o.payload.no)} • ${clock(o.createdAtMs)} • ${o.payload.items.length} items</small></div><div class="end">${fmt(o.payload.net)}<br>${syncBadge(o)}</div></button>`).join('')||'<div class="empty">Is date par koi order nahi</div>'}</div>
       ${list.length?`<div class="totals"><span class="big">Total (${list.length})</span><b class="big right">${money(sum(list,o=>o.payload.net))}</b></div>`:''}
       ${locked?'':`<button class="btn pri block" id="osEnd">🏁 Day End (${fmtDate(date)})</button>`}</div>`;
    $('#osSync').onclick=doSync;$('#osDate').onchange=()=>{ST.ordDate=V('osDate')||today();render()};
    $$('[data-oid]',el).forEach(b=>b.onclick=()=>orderDetail(b.dataset.oid));
    if($('#osEnd'))$('#osEnd').onclick=()=>{
      if(OUT.some(e=>e.byId===ME.id&&e.status==='pending'))return toast('Pehle Sync karein — pending entries baqi hain.',true);
      confirmSheet(`${fmtDate(date)} ka Day End? Is ke baad is date par naya order/edit nahi ho sakega.`,async()=>{
        const rec={key:ME.id+'_'+date,bookerId:ME.id,bookerName:ME.name,date,closedAtMs:Date.now(),orderCount:list.length,total:r2(sum(list,o=>o.payload.net)),synced:false};
        DAYS.push(rec);await DB.put('dayends',rec);
        try{await withTimeout(20000,s=>putDayEnd(rec,s));rec.synced=true;await DB.put('dayends',rec);toast('Day End ho gaya ✓')}catch(e){toast('Day End phone par lock ho gaya; online save ke liye Sync dabayein.',true)}
        render()},'Haan, Day End');
    };
  },
  /* ---- recovery ---- */
  recovery(el){
    const R=ST.rec||(ST.rec={shopId:'',amount:'',method:'Cash',note:''});const sh=shop(R.shopId);
    const mine=OUT.filter(e=>e.kind==='recovery'&&e.byId===ME.id).slice(-15).reverse();
    el.innerHTML=`<div class="card"><h3>Market recovery</h3>${fld('Shop',pickBtn('rShop',sh?esc(sh.name):'','Shop chunein'))}
      ${sh?`<div class="note">Baqaya: <b>${money(shopDue(sh.id))}</b></div>`:''}
      <div class="two">${fld('Mili hui raqam',inp('rAmt',R.amount,'number','inputmode="decimal" min="0"'))}${fld('Tareeqa',`<select id="rMeth">${opts(['Cash','Bank transfer','Easypaisa','JazzCash','Cheque'],R.method)}</select>`)}</div>
      ${fld('Note',inp('rNote',R.note))}<p class="small muted">Admin laptop par approve karega.</p><button class="btn pri block" id="rSave">💾 Recovery save karein</button></div>
      <div class="card"><h3>Meri recoveries</h3><div class="list">${mine.map(r=>`<div class="row-item"><div class="main"><b>${esc(r.payload.shopName)}</b><small>${fmtDate(r.date)} • ${esc(r.payload.method)}</small></div><div class="end">${fmt(r.payload.amount)}<br>${syncBadge(r)}</div></div>`).join('')||'<div class="empty">Abhi koi nahi</div>'}</div></div>`;
    $('#rShop').onclick=()=>pickSheet('Shop chunein',shopItems(true),id=>{R.shopId=id;R.amount=R.amount;render()},'Aap ki koi shop nahi mili');
    ['rAmt','rMeth','rNote'].forEach(id=>$('#'+id).oninput=()=>{R.amount=V('rAmt');R.method=V('rMeth');R.note=V('rNote')});
    $('#rSave').onclick=async()=>{
      R.amount=V('rAmt');R.method=V('rMeth');R.note=V('rNote');
      if(!sh)return toast('Shop chunein.',true);const amt=N(R.amount);if(amt<=0)return toast('Raqam likhein.',true);
      const due=shopDue(sh.id);
      const e={id:uuid(),kind:'recovery',byId:ME.id,byName:ME.name,role:ME.role,date:today(),summary:`Recovery ${sh.name}`,amount:amt,payload:{shopId:sh.id,shopName:sh.name,expected:Math.max(0,due),amount:amt,short:Math.max(0,r2(due-amt)),adjust:0,adjustType:'none',method:R.method,note:R.note,collectorId:ME.id,collector:ME.name}};
      try{await addEntry(e)}catch(err){return toast(err.message,true)}
      ST.rec=null;toast('Recovery save ho gayi ✓ (Sync dabayein)');render();Sync_try();
    };
  },
  /* ---- shops ---- */
  shops(el){
    const q=ST.shopQ.toLowerCase();const list=M.shops.filter(s=>(!M.settings.ownOnly||s.bookerId===ME.id)&&(!q||[s.name,s.owner,s.route,s.phone].join(' ').toLowerCase().includes(q)));
    el.innerHTML=`<div class="search"><input id="shQ" type="search" placeholder="Shop / route / owner search" value="${esc(ST.shopQ)}"></div><div class="card"><div class="list">${list.slice(0,150).map(s=>`<button class="row-item" data-sid="${s.id}"><div class="main"><b>${esc(s.name)}</b><small>${esc([s.route,s.owner,s.phone].filter(Boolean).join(' • '))}</small></div><div class="end">${shopDue(s.id)>0.5?fmt(shopDue(s.id)):'—'}</div></button>`).join('')||'<div class="empty">Koi shop nahi mili</div>'}</div></div>`;
    $('#shQ').oninput=()=>{ST.shopQ=V('shQ');const pos=$('#shQ').selectionStart;render();const i=$('#shQ');i.focus();i.setSelectionRange(pos,pos)};
    $$('[data-sid]',el).forEach(b=>b.onclick=()=>{const s=shop(b.dataset.sid);openSheet(`<h2>${esc(s.name)}</h2><div class="card"><div class="totals"><span>Baqaya</span><b class="right">${money(shopDue(s.id))}</b>${s.creditLimit?`<span>Credit limit</span><b class="right">${money(s.creditLimit)}</b>`:''}</div><p class="muted small">${esc([s.owner,s.phone,s.route,s.address].filter(Boolean).join(' • '))}</p></div><div class="btns">${s.phone?`<a class="btn" style="display:grid;place-items:center;text-decoration:none" href="tel:${esc(s.phone)}">📞 Call</a>`:''}<button class="btn pri" id="shOrder">🛒 Order</button><button class="btn" id="shRec">💰 Recovery</button></div>`,()=>{
      $('#shOrder').onclick=()=>{closeSheet();(ST.order||(ST.order={shopId:'',pay:'credit',delivery:addDays(today(),1),items:[]})).shopId=s.id;TAB='order';render()};
      $('#shRec').onclick=()=>{closeSheet();(ST.rec||(ST.rec={shopId:'',amount:'',method:'Cash',note:''})).shopId=s.id;TAB='recovery';render()}})});
  }
};
function Sync_try(){if(ONLINE)syncAll(ME).then(r=>{if(r){ONLINE=!r.net;if(r.ok)render()}})}
function orderTotals(O){const g=sum(O.items,i=>i.gross),d=sum(O.items,i=>i.disc);const tax=r2((g-d)*N(M.settings.taxPercent)/100);return{g,d,tax,net:r2(g-d+tax)}}
function itemSheet(O,pid){
  const p=prod(pid);const inCart=sum(O.items.filter(i=>i.productId===pid),i=>i.pcs);const st=stockOf(pid)-inCart;
  openSheet(`<h2>${esc(p.name)}</h2><div class="note">Stock: <b>${splitPcs(p.packing,st)}</b> • Packing ${p.packing} • Trade/ctn ${money(p.tradePc*p.packing)}</div>
   <div class="two">${fld('Cartons',inp('iCtn','','number','inputmode="numeric" min="0"'))}${fld('Pieces',inp('iPcs','','number','inputmode="numeric" min="0"'))}</div>
   ${fld('Rate / pc',inp('iRate',p.tradePc||'','number','step="0.01" inputmode="decimal"'))}
   <div class="two">${fld('Discount',`<select id="iDT">${opts([{v:'pct',t:'% percent'},{v:'pc',t:'Rs / piece'},{v:'flat',t:'Rs total'}],'pct')}</select>`)}${fld('Value',inp('iDV','','number','step="0.01" inputmode="decimal"'))}</div>
   <button class="btn pri block" id="iOk">Add karein</button>`,()=>{
    $('#iOk').onclick=()=>{
      const pcs=N(V('iCtn'))*p.packing+N(V('iPcs'));if(pcs<=0)return toast('Carton ya pieces likhein.',true);
      if(pcs>st&&!M.settings.allowNeg)return toast('Stock kam hai. Sirf '+splitPcs(p.packing,st)+' maujood.',true);
      const rate=N(V('iRate'))||p.tradePc;const gross=r2(pcs*rate);const dt=V('iDT'),dv=N(V('iDV'));
      const disc=r2(dt==='pct'?gross*dv/100:dt==='pc'?pcs*dv:dv);
      O.items.push({productId:p.id,name:p.name,brand:p.brand,packing:p.packing,pcs,rate,retail:p.retailPc,gross,discType:dt,discVal:dv,disc,cost:r2(p.costCtn/p.packing)});
      closeSheet();render()}});
}
async function saveOrder(O){
  const sh=shop(O.shopId);if(!sh)return toast('Shop chunein.',true);if(!O.items.length)return toast('Kam az kam ek item add karein.',true);
  if(O.delivery<today())return toast('Delivery date aaj se pehle nahi ho sakti.',true);
  const date=today();if(dayLocked(ME.id,date))return toast(fmtDate(date)+' ka Day End ho chuka hai — naya order nahi ho sakta.',true);
  const T=orderTotals(O);const due=shopDue(sh.id);
  if(O.pay==='credit'&&sh.creditLimit&&due+T.net>sh.creditLimit){
    if(M.settings.creditBlock)return toast('Credit limit se zyada — order save nahi hoga.',true);
    return confirmSheet('Yeh order credit limit se zyada hai. Phir bhi save karein?',()=>doSave(O,sh,T,date),'Haan, save');
  }
  doSave(O,sh,T,date);
}
async function doSave(O,sh,T,date){
  const seq=OUT.filter(e=>e.kind==='order'&&e.byId===ME.id&&e.date===date).length+1;
  const no=ME.username.replace(/[^a-z0-9]/gi,'').slice(0,4).toUpperCase()+'-'+date.slice(2).replace(/-/g,'')+'-'+String(seq).padStart(3,'0');
  const id=uuid();
  const iv={id,no,status:'booked',createdBy:ME.username,createdAt:date+' '+new Date().toTimeString().slice(0,5),date,deliveryDate:O.delivery,bookerId:ME.id,bookerName:ME.name,supplymanId:'',supplyman:'',shopId:sh.id,shopName:sh.name,route:sh.route,payType:O.pay,accountId:'acc_cash',items:O.items,gross:T.g,discount:T.d,tax:T.tax,net:T.net};
  try{await addEntry({id,kind:'order',byId:ME.id,byName:ME.name,role:ME.role,date,summary:no+' '+sh.name,amount:T.net,payload:iv})}catch(err){return toast(err.message,true)}
  ST.order=null;toast('Order '+no+' save ho gaya ✓');render();Sync_try();
}
function orderDetail(id){
  const o=OUT.find(e=>e.id===id);if(!o)return;const p=o.payload;
  openSheet(`<h2>${esc(p.no)}</h2><div class="card"><b>${esc(p.shopName)}</b><div class="small muted">${fmtDate(p.date)} • Delivery ${fmtDate(p.deliveryDate)} • ${p.payType==='cash'?'Cash':'Credit'} ${syncBadge(o)}</div></div>
   <div class="card"><div class="list">${p.items.map(it=>`<div class="row-item"><div class="main"><b>${esc(it.name)}</b><small>${splitPcs(it.packing,it.pcs)} × ${fmt(it.rate)}${it.disc?' − '+fmt(it.disc):''}</small></div><div class="end">${fmt(it.gross-it.disc)}</div></div>`).join('')}</div>
   <div class="totals"><span class="big">Net</span><b class="big right">${money(p.net)}</b></div></div>
   ${o.status==='pending'&&!dayLocked(ME.id,o.date)?'<button class="btn bad block" id="odDel">🗑 Delete (sirf unsynced)</button>':''}`,()=>{
    if($('#odDel'))$('#odDel').onclick=()=>confirmSheet('Yeh order delete karein?',async()=>{OUT=OUT.filter(e=>e.id!==id);await DB.del('outbox',id);toast('Delete ho gaya');render()},'Haan, delete')});
}

/* =====================================================================
   STORE MANAGER
   ===================================================================== */
const STORE={
  home(el){
    const ps=M.products;const st=ps.map(p=>({p,s:stockOf(p.id)}));
    const low=st.filter(x=>x.s>0&&x.s<x.p.packing).length,out=st.filter(x=>x.s<=0).length;const val=sum(st,x=>Math.max(0,x.s)*x.p.costCtn/x.p.packing);
    const recent=OUT.filter(e=>e.byId===ME.id).slice(-8).reverse();
    el.innerHTML=`${staleNote()}<div class="kpis"><div class="kpi hot"><small>Stock value (cost)</small><b>${money(val)}</b></div><div class="kpi"><small>Products</small><b>${ps.length}</b></div><div class="kpi"><small>Low (1 ctn se kam)</small><b>${low}</b></div><div class="kpi"><small>Out of stock</small><b>${out}</b></div></div>
     <div class="btns" style="margin-bottom:12px"><button class="btn pri" data-go="receive">📥 Maal receive</button><button class="btn" data-go="count">✅ Stock count</button></div>
     <div class="card"><h3>Meri recent entries<span class="sp"></span><span class="small muted">${pendingN()} pending</span></h3><div class="list">${recent.map(e=>`<div class="row-item"><div class="main"><b>${esc(e.summary)}</b><small>${KIND[e.kind]} • ${fmtDate(e.date)}</small></div><div class="end">${syncBadge(e)}</div></div>`).join('')||'<div class="empty">Abhi koi entry nahi</div>'}</div></div>${lastSyncNote()}`;
    $$('[data-go]',el).forEach(b=>b.onclick=()=>{TAB=b.dataset.go;render()});
  },
  stock(el){
    const q=ST.stockQ.toLowerCase(),f=ST.stockF;
    const rows=M.products.map(p=>({p,s:stockOf(p.id)})).filter(x=>(!q||[x.p.name,x.p.sku,x.p.brand].join(' ').toLowerCase().includes(q))&&(!f||(f==='out'?x.s<=0:f==='low'?x.s>0&&x.s<x.p.packing:x.s>0))).sort((a,b)=>a.p.name.localeCompare(b.p.name));
    el.innerHTML=`<div class="search"><input id="stQ" type="search" placeholder="Product / brand / code" value="${esc(ST.stockQ)}"></div>
     <div class="tabs">${[['','Sab'],['low','Low'],['out','Out'],['in','In stock']].map(([k,t])=>`<button data-f="${k}" class="${k===f?'on':''}">${t}</button>`).join('')}</div>
     <div class="card"><div class="list">${rows.slice(0,200).map(({p,s})=>`<div class="row-item"><div class="main"><b>${esc(p.name)}</b><small>${esc([p.brand,p.sku].filter(Boolean).join(' • '))} • pack ${p.packing}</small></div><div class="end">${s<=0?badge(splitPcs(p.packing,s),'bad'):s<p.packing?badge(splitPcs(p.packing,s),'warn'):badge(splitPcs(p.packing,s),'ok')}<br><span class="small muted">${fmt(s)} pcs</span></div></div>`).join('')||'<div class="empty">Kuch nahi mila</div>'}</div></div><p class="small muted">${rows.length} products • stock = ${fmtDate(M.bk.date)} ke backup + is phone ki entries</p>`;
    $('#stQ').oninput=()=>{ST.stockQ=V('stQ');const pos=$('#stQ').selectionStart;render();const i=$('#stQ');i.focus();i.setSelectionRange(pos,pos)};
    $$('[data-f]',el).forEach(b=>b.onclick=()=>{ST.stockF=b.dataset.f;render()});
  },
  /* ---- receive purchase ---- */
  receive(el){
    const P=ST.recv||(ST.recv={supplier:'',ref:'',paid:'',items:[]});
    const total=r2(sum(P.items,i=>i.amount));
    el.innerHTML=`<div class="card"><h3>Maal receive (purchase)</h3>${fld('Supplier / company',`<input id="pSup" list="pSupL" value="${esc(P.supplier)}" autocomplete="off"><datalist id="pSupL">${M.suppliers.map(s=>`<option value="${esc(s)}">`).join('')}</datalist>`)}
      <div class="two">${fld('Supplier invoice #',inp('pRef',P.ref))}${fld('Abhi di gayi raqam',inp('pPaid',P.paid,'number','inputmode="decimal"'))}</div></div>
     <div class="card"><h3>Products<span class="sp"></span><button class="btn sm pri" id="pAdd">+ Product</button></h3><div class="list">${P.items.map((it,ix)=>`<div class="row-item"><div class="main"><b>${esc(it.name)}</b><small>${splitPcs(it.packing,it.pcs)} × ${fmt(it.costCtn)}/ctn</small></div><div class="end">${fmt(it.amount)}</div><button class="btn sm bad" data-rm="${ix}">✕</button></div>`).join('')||'<div class="empty">Abhi koi product nahi</div>'}</div>
      <div class="totals"><span class="big">Total</span><b class="big right">${money(total)}</b><span>Baqaya</span><b class="right">${money(total-N(P.paid))}</b></div><button class="btn pri block" id="pSave">💾 Purchase save karein</button></div>`;
    const keep=()=>{P.supplier=V('pSup');P.ref=V('pRef');P.paid=V('pPaid')};
    ['pSup','pRef','pPaid'].forEach(i=>$('#'+i).oninput=()=>{keep();if(i==='pPaid')render()});
    $('#pAdd').onclick=()=>{keep();pickSheet('Product chunein',productItems(),pid=>{const p=prod(pid);
      openSheet(`<h2>${esc(p.name)}</h2><div class="note">Abhi stock: <b>${splitPcs(p.packing,stockOf(pid))}</b> • Packing ${p.packing}</div><div class="two">${fld('Cartons',inp('qCtn','','number','inputmode="numeric" min="0"'))}${fld('Loose pcs',inp('qPcs','','number','inputmode="numeric" min="0"'))}</div>${fld('Cost / carton',inp('qCost',p.costCtn||'','number','step="0.01" inputmode="decimal"'))}<button class="btn pri block" id="qOk">Add karein</button>`,()=>{
        $('#qOk').onclick=()=>{const pcs=N(V('qCtn'))*p.packing+N(V('qPcs'));if(pcs<=0)return toast('Quantity likhein.',true);const cost=N(V('qCost'));
          P.items.push({productId:p.id,name:p.name,brand:p.brand,packing:p.packing,ctn:N(V('qCtn')),loose:N(V('qPcs')),pcs,costCtn:cost,tradePc:p.tradePc,retailPc:p.retailPc,amount:r2(pcs*cost/p.packing)});closeSheet();render()}})})};
    $$('[data-rm]',el).forEach(b=>b.onclick=()=>{keep();P.items.splice(+b.dataset.rm,1);render()});
    $('#pSave').onclick=async()=>{keep();if(!P.supplier)return toast('Supplier likhein.',true);if(!P.items.length)return toast('Products add karein.',true);
      const e={id:uuid(),kind:'purchase',byId:ME.id,byName:ME.name,role:ME.role,date:today(),summary:`Purchase ${P.supplier}`,amount:total,payload:{date:today(),supplier:P.supplier,ref:P.ref,paidNow:N(P.paid),total,items:P.items}};
      try{await addEntry(e)}catch(err){return toast(err.message,true)}ST.recv=null;toast('Purchase save ho gayi ✓ (Sync dabayein)');render();Sync_try()};
  },
  /* ---- returns & claims ---- */
  moves(el){
    const k=ST.mv;const F=ST[k+'F']||(ST[k+'F']={});
    el.innerHTML=`<div class="tabs">${[['return','Shop return'],['claim','Company claim']].map(([x,t])=>`<button data-mv="${x}" class="${x===k?'on':''}">${t}</button>`).join('')}</div><div class="card" id="mvForm"></div>`;
    $$('[data-mv]',el).forEach(b=>b.onclick=()=>{ST.mv=b.dataset.mv;render()});
    const f=$('#mvForm');const p=prod(F.productId),sh=shop(F.shopId);
    if(k==='return'){
      f.innerHTML=`<h3>Shop se wapsi (return)</h3>${fld('Shop',pickBtn('mShop',sh?esc(sh.name):'','Shop chunein'))}${fld('Product',pickBtn('mProd',p?esc(p.name):'','Product chunein'))}
       <div class="two">${fld('Pieces',inp('mPcs',F.pcs||'','number','inputmode="numeric"'))}${fld('Rate / pc',inp('mRate',F.rate||(p?p.tradePc:''),'number','step="0.01" inputmode="decimal"'))}</div>
       <div class="two">${fld('Hisaab',`<select id="mSet">${opts([{v:'credit',t:'Shop balance se minus'},{v:'cash',t:'Cash wapas'}],F.settle||'credit')}</select>`)}${fld('Maal ki halat',`<select id="mCond">${opts([{v:'1',t:'Theek — stock mein'},{v:'0',t:'Kharab / expiry'}],F.cond||'1')}</select>`)}</div>${fld('Wajah',inp('mWhy',F.why||''))}<button class="btn pri block" id="mSave">💾 Return save karein</button>`;
      $('#mShop').onclick=()=>pickSheet('Shop chunein',shopItems(false),id=>{keepMv(F);F.shopId=id;render()});
    }else{
      f.innerHTML=`<h3>Company se claim (damage / expiry)</h3>${fld('Company / supplier',`<input id="mSup" list="mSupL" value="${esc(F.supplier||'')}" autocomplete="off"><datalist id="mSupL">${M.suppliers.map(s=>`<option value="${esc(s)}">`).join('')}</datalist>`)}${fld('Product',pickBtn('mProd',p?esc(p.name):'','Product chunein'))}
       <div class="two">${fld('Claim type',`<select id="mType">${opts(['Damage','Expiry','Short supply','Leakage','Other'],F.type||'Damage')}</select>`)}${fld('Pieces',inp('mPcs',F.pcs||'','number','inputmode="numeric"'))}</div>
       <div class="two">${fld('Cost / pc',inp('mRate',F.rate||(p?r2(p.costCtn/p.packing):''),'number','step="0.01" inputmode="decimal"'))}${fld('Stock se kam karein?',`<select id="mDed">${opts([{v:'0',t:'Nahi (alag rakha hai)'},{v:'1',t:'Haan, kam karein'}],F.ded||'0')}</select>`)}</div>${fld('Wajah',inp('mWhy',F.why||''))}<button class="btn pri block" id="mSave">💾 Claim save karein</button>`;
    }
    $('#mProd').onclick=()=>pickSheet('Product chunein',productItems(),id=>{keepMv(F);F.productId=id;F.rate='';render()});
    $('#mSave').onclick=async()=>{keepMv(F);const pr=prod(F.productId);if(!pr)return toast('Product chunein.',true);const pcs=N(F.pcs);if(pcs<=0)return toast('Pieces likhein.',true);if(!F.why)return toast('Wajah likhein.',true);
      let e;
      if(k==='return'){const s=shop(F.shopId);if(!s)return toast('Shop chunein.',true);const rate=N(F.rate)||pr.tradePc;
        e={id:uuid(),kind:'return',byId:ME.id,byName:ME.name,role:ME.role,date:today(),summary:`Return ${s.name} • ${pr.name}`,amount:r2(pcs*rate),payload:{kind:'item',date:today(),shopId:s.id,shopName:s.name,productId:pr.id,productName:pr.name,pcs,rate,amount:r2(pcs*rate),settle:F.settle||'credit',toStock:(F.cond||'1')==='1',reason:F.why}}}
      else{if(!F.supplier)return toast('Company likhein.',true);const rate=N(F.rate);
        e={id:uuid(),kind:'claim',byId:ME.id,byName:ME.name,role:ME.role,date:today(),summary:`Claim ${F.supplier} • ${pr.name}`,amount:r2(pcs*rate),payload:{date:today(),supplier:F.supplier,productId:pr.id,productName:pr.name,type:F.type||'Damage',pcs,rate,amount:r2(pcs*rate),deductStock:(F.ded||'0')==='1',reason:F.why}}}
      try{await addEntry(e)}catch(err){return toast(err.message,true)}ST[k+'F']={};toast('Save ho gaya ✓ (Sync dabayein)');render();Sync_try()};
  },
  /* ---- stock count ---- */
  count(el){
    const C=ST.count||(ST.count={lines:[],note:''});
    el.innerHTML=`<div class="card"><h3>Stock count<span class="sp"></span><button class="btn sm pri" id="cAdd">+ Product</button></h3><p class="small muted">Product chunein aur ginti (cartons + pieces) likhein. Farq admin ko jayega.</p>
     <div class="list">${C.lines.map((l,ix)=>{const p=prod(l.productId);const sys=stockOf(l.productId);const cnt=l.ctn*p.packing+l.pcs;const diff=cnt-sys;return`<div class="row-item"><div class="main"><b>${esc(p.name)}</b><small>System ${splitPcs(p.packing,sys)} • Ginti ${splitPcs(p.packing,cnt)}</small></div><div class="end">${diff===0?badge('Barabar','ok'):badge((diff>0?'+':'')+diff+' pcs',diff>0?'warn':'bad')}</div><button class="btn sm bad" data-rm="${ix}">✕</button></div>`}).join('')||'<div class="empty">Abhi koi product nahi</div>'}</div>
     ${fld('Note',inp('cNote',C.note))}<button class="btn pri block" id="cSave">💾 Count submit karein</button></div>`;
    $('#cNote').oninput=()=>C.note=V('cNote');
    $('#cAdd').onclick=()=>pickSheet('Product chunein',productItems().filter(i=>!C.lines.some(l=>l.productId===i.v)),pid=>{const p=prod(pid);
      openSheet(`<h2>${esc(p.name)}</h2><div class="note">System stock: <b>${splitPcs(p.packing,stockOf(pid))}</b> • Packing ${p.packing}</div><div class="two">${fld('Ginti — cartons',inp('kCtn','','number','inputmode="numeric" min="0"'))}${fld('Ginti — pieces',inp('kPcs','','number','inputmode="numeric" min="0"'))}</div><button class="btn pri block" id="kOk">Add karein</button>`,()=>{
        $('#kOk').onclick=()=>{if(V('kCtn')===''&&V('kPcs')==='')return toast('Ginti likhein (0 bhi likh sakte hain).',true);C.lines.push({productId:pid,ctn:N(V('kCtn')),pcs:N(V('kPcs'))});closeSheet();render()}})});
    $$('[data-rm]',el).forEach(b=>b.onclick=()=>{C.lines.splice(+b.dataset.rm,1);render()});
    $('#cSave').onclick=async()=>{C.note=V('cNote');if(!C.lines.length)return toast('Products add karein.',true);
      const lines=C.lines.map(l=>{const p=prod(l.productId);const sys=stockOf(l.productId);const counted=l.ctn*p.packing+l.pcs;return{productId:l.productId,name:p.name,packing:p.packing,systemPcs:sys,countedPcs:counted,diff:counted-sys}});
      const e={id:uuid(),kind:'count',byId:ME.id,byName:ME.name,role:ME.role,date:today(),summary:`Stock count (${lines.length} products)`,amount:0,payload:{date:today(),note:C.note,lines}};
      try{await addEntry(e)}catch(err){return toast(err.message,true)}ST.count=null;toast('Count save ho gaya ✓ (Sync dabayein)');render();Sync_try()};
  }
};
const KIND={order:'Order',recovery:'Recovery',purchase:'Purchase',return:'Return',claim:'Claim',count:'Stock count'};
function keepMv(F){['mPcs','mRate','mWhy','mSup','mType','mDed','mSet','mCond'].forEach(id=>{const e=document.getElementById(id);if(!e)return;const key={mPcs:'pcs',mRate:'rate',mWhy:'why',mSup:'supplier',mType:'type',mDed:'ded',mSet:'settle',mCond:'cond'}[id];F[key]=e.value.trim()})}

boot();
