'use strict';
/* NexaFlow (full app) Android shell.
   The APK holds a copy of the laptop app (app.html = index.html) and this loader. The loader:
   1. runs the app (the copy in the APK, or a newer copy stored on the phone),
   2. makes file downloads (backup, Excel, PDF) work inside the Android WebView (save / share sheet),
   3. serves Excel/PDF libraries from the APK so they work offline,
   4. when online, checks GitHub Pages for a newer index.html, checks it, stores it on the phone and applies it
      (at once on the login screen, otherwise after the user taps "Abhi lagayein"). A copy that fails to start
      within 15 seconds is thrown away. A client set to "Manual" update mode never downloads new code.
   This file is part of the APK shell and is never updated over the air. */
(function(){
  var PAGES='https://fatima-technology.github.io/NexaFlow/index.html';
  var CDN={
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js':'libs/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js':'libs/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js':'libs/jspdf.plugin.autotable.min.js'
  };
  var READY_MS=15000,CHECK_EVERY=30*60*1000,MIN_HTML=50000;
  var running='',ready=false,checking=false,db=null;

  /* ---- own tiny IndexedDB (separate from the app's data) ---- */
  function open(){return new Promise(function(res){try{var r=indexedDB.open('nexaflow_apk_ota',1);r.onupgradeneeded=function(){r.result.createObjectStore('kv')};r.onsuccess=function(){res(r.result)};r.onerror=function(){res(null)};r.onblocked=function(){res(null)}}catch(e){res(null)}})}
  function get(k){return new Promise(function(res){if(!db)return res(null);try{var q=db.transaction('kv','readonly').objectStore('kv').get(k);q.onsuccess=function(){res(q.result||null)};q.onerror=function(){res(null)}}catch(e){res(null)}})}
  function put(k,v){return new Promise(function(res,rej){if(!db)return rej(new Error('no storage'));try{var t=db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=function(){res()};t.onerror=t.onabort=function(){rej(t.error)}}catch(e){rej(e)}})}
  function del(k){return new Promise(function(res){if(!db)return res();try{var t=db.transaction('kv','readwrite');t.objectStore('kv').delete(k);t.oncomplete=function(){res()};t.onerror=t.onabort=function(){res()}}catch(e){res()}})}

  function hash(t){var s=0;for(var i=0;i<t.length;i++){s=(s*31+t.charCodeAt(i))>>>0}return s.toString(16).padStart(8,'0').slice(0,6)}
  /* every inline script must compile (they are compiled, never run) */
  function syntaxOk(html){
    try{
      var re=/<script([^>]*)>([\s\S]*?)<\/script>/gi,m,n=0;
      while((m=re.exec(html))){
        if(/\ssrc\s*=/.test(m[1]))continue;if(/\stype\s*=\s*["']?(?!text\/javascript|module)/i.test(m[1]))continue;
        if(m[2].trim()){new Function(m[2]);n++}
      }
      return n>0;
    }catch(e){return false}
  }
  function okHtml(t){return typeof t==='string'&&t.length>MIN_HTML&&/<\/html>\s*$/i.test(t)&&t.indexOf('<title>')>-1&&syntaxOk(t)}
  function useLocalLibs(html){for(var u in CDN){html=html.split(u).join(CDN[u])}return html}

  /* ---- downloads: Android WebView ignores <a download> for blob links; save the file and open the share sheet ---- */
  function installBridge(){
    /* native plugins: Capacitor.Plugins.X when present, otherwise registerPlugin('X') (a plain page has no JS plugin packages) */
    function plugin(n){var C=window.Capacitor;return(C.Plugins&&C.Plugins[n])||(C.registerPlugin&&C.registerPlugin(n))}
    function plugins(){
      var C=window.Capacitor;if(!C)return null;
      var native=(C.isNativePlatform&&C.isNativePlatform())||(C.Plugins&&C.Plugins.Filesystem&&C.Plugins.Share);
      if(!native)return null;
      try{var F=plugin('Filesystem'),S=plugin('Share');return F&&S?{Filesystem:F,Share:S}:null}catch(e){return null}
    }
    function toB64(blob){return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){var u=String(r.result);res(u.slice(u.indexOf(',')+1))};r.onerror=function(){rej(r.error)};r.readAsDataURL(blob)})}
    async function save(href,name){
      var P=plugins();
      try{
        var blob=await (await fetch(href)).blob();var data=await toB64(blob);
        name=String(name||'nexaflow-file').replace(/[\\/:*?"<>|]+/g,'_');
        var f=await P.Filesystem.writeFile({path:name,data:data,directory:'CACHE'});
        await P.Share.share({title:name,url:f.uri,dialogTitle:'Save / Share'});
      }catch(e){var m=String(e&&e.message||e);if(!/cancel/i.test(m))alert('File save nahi ho saki: '+m)}
    }
    function isDl(a){return a&&a.tagName==='A'&&a.hasAttribute&&a.hasAttribute('download')&&/^blob:/.test(a.href||'')&&plugins()}
    var oClick=HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click=function(){if(isDl(this)){save(this.href,this.getAttribute('download'));return}return oClick.apply(this,arguments)};
    var oDispatch=EventTarget.prototype.dispatchEvent;
    EventTarget.prototype.dispatchEvent=function(ev){if(ev&&ev.type==='click'&&isDl(this)){save(this.href,this.getAttribute('download'));return true}return oDispatch.apply(this,arguments)};
  }

  /* ---- over-the-air update ---- */
  var NexaApk=window.NexaApk={
    ver:'',source:'APK',pending:'',
    ready:function(){ready=true},
    apply:function(){location.reload()},
    check:check
  };
  async function check(){
    if(checking||navigator.onLine===false)return;checking=true;
    try{
      var mode='auto';try{if(window.nfUpdateMode)mode=await window.nfUpdateMode()}catch(e){}
      if(mode==='manual')return;                       // master put this client on manual (hold)
      var r=await fetch(PAGES+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;
      var t=await r.text();
      if(!okHtml(t)||t===running)return;
      await put('html',{html:t,at:Date.now()});
      NexaApk.pending=hash(t);window.dispatchEvent(new CustomEvent('nexaflow-update-ready'));
    }catch(e){/* offline / GitHub unreachable: try again later */}
    finally{checking=false}
  }
  async function fail(){try{await del('html')}catch(e){}location.reload()}

  async function start(){
    installBridge();
    db=await open();
    var stored=await get('html'),text='',from='APK';
    if(stored&&okHtml(stored.html)){text=stored.html;from='update'}else if(stored){await del('html')}
    if(!text){
      var r=await fetch('app.html',{cache:'no-store'});
      text=await r.text();
    }
    var libs=false;try{libs=(await fetch('libs/ready.json',{cache:'no-store'})).ok}catch(e){}
    running=text;NexaApk.source=from;NexaApk.ver=hash(text);
    if(from==='update')setTimeout(function(){if(!ready)fail()},READY_MS);
    setTimeout(check,6000);
    setInterval(function(){if(!document.hidden)check()},CHECK_EVERY);
    /* replace this page with the app (same window, same origin: the app's own data stays where it was) */
    document.open();document.write(libs?useLocalLibs(text):text);document.close();
    /* document.open() erases window listeners, so this one is added after the app has been written */
    window.addEventListener('online',function(){setTimeout(check,1500)});
  }
  start().catch(function(e){document.body.innerHTML='<p style="padding:20px;font-family:sans-serif">App start nahi ho saki: '+String(e&&e.message||e)+'</p>'});
})();
