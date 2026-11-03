'use strict';
/* NexaFlow Field — loader + over-the-air (OTA) updates.
   The APK contains this loader and a bundled copy of the app. Whenever the phone is online it checks the
   published copy on GitHub Pages (https://fatima-technology.github.io/NexaFlow/mobile/www/). If that differs it is
   syntax-checked and stored on the phone; the app then runs the stored copy. So a push to GitHub updates every
   phone without reinstalling the APK. If a downloaded copy fails to start, it is thrown away and the bundled
   copy is used again.
   This file is part of the APK shell and is never updated over the air. Keep it small and stable. */
(function(){
  var BASE='https://fatima-technology.github.io/NexaFlow/mobile/www/';
  var FILES=['sha256.js','core.js','ui.js','styles.css'];
  var JS=['sha256.js','core.js','ui.js'];
  var CHECK_EVERY=30*60*1000;
  var running=null,booted=false,checking=false;

  /* ---- tiny IndexedDB key/value (own database, so it can never disturb the app's data) ---- */
  function open(){return new Promise(function(res){try{var r=indexedDB.open('nexaflow_ota',1);r.onupgradeneeded=function(){r.result.createObjectStore('kv')};r.onsuccess=function(){res(r.result)};r.onerror=function(){res(null)};r.onblocked=function(){res(null)}}catch(e){res(null)}})}
  function get(db,k){return new Promise(function(res){if(!db)return res(null);try{var q=db.transaction('kv','readonly').objectStore('kv').get(k);q.onsuccess=function(){res(q.result||null)};q.onerror=function(){res(null)}}catch(e){res(null)}})}
  function put(db,k,v){return new Promise(function(res,rej){if(!db)return rej(new Error('no storage'));try{var t=db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=function(){res()};t.onerror=t.onabort=function(){rej(t.error)}}catch(e){rej(e)}})}
  function del(db,k){return new Promise(function(res){if(!db)return res();try{var t=db.transaction('kv','readwrite');t.objectStore('kv').delete(k);t.oncomplete=function(){res()};t.onerror=t.onabort=function(){res()}}catch(e){res()}})}

  function sum(files){var s=0,t=JS.map(function(f){return files[f]||''}).join('\n');for(var i=0;i<t.length;i++){s=(s*31+t.charCodeAt(i))>>>0}return s.toString(16).padStart(8,'0').slice(0,6)}
  function okBundle(b){return !!(b&&b.files&&FILES.every(function(f){return typeof b.files[f]==='string'&&b.files[f].length>20}))}
  function syntaxOk(files){
    try{JS.forEach(function(f){new Function(files[f])});return /function\s+boot\s*\(/.test(files['ui.js'])||/boot\(\)\s*;?\s*$/.test(files['ui.js'])}catch(e){return false}
  }
  function inject(text){var s=document.createElement('script');s.text=text;document.head.appendChild(s)}
  function addStyle(text){var l=document.getElementById('css');if(l)l.disabled=true;var s=document.createElement('style');s.textContent=text;document.head.appendChild(s)}

  /* run the downloaded copy; any error while starting => caller falls back to the bundled copy */
  function runBundle(files){
    try{JS.forEach(function(f){inject(files[f])});addStyle(files['styles.css']);return true}catch(e){console.error('OTA start failed',e);return false}
  }
  function runBundled(){
    var i=0;(function next(){if(i>=JS.length)return;var s=document.createElement('script');s.src=JS[i++];s.async=false;s.onload=next;document.head.appendChild(s)})();
  }
  function bundledFiles(){
    return Promise.all(FILES.map(function(f){return fetch(f,{cache:'no-store'}).then(function(r){return r.ok?r.text():''}).catch(function(){return ''})})).then(function(a){var o={};FILES.forEach(function(f,i){o[f]=a[i]});return o});
  }
  function remoteFiles(){
    return Promise.all(FILES.map(function(f){return fetch(BASE+f+'?t='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error(f+' '+r.status);return r.text()})})).then(function(a){var o={};FILES.forEach(function(f,i){o[f]=a[i]});return o});
  }

  /* look for a newer published copy; store it; tell the app (it decides when to restart) */
  async function check(){
    if(checking||navigator.onLine===false)return;checking=true;
    try{
      var mode='auto';try{if(window.nfUpdateMode)mode=await window.nfUpdateMode()}catch(e){}
      if(mode==='manual')return;          // master put this client on manual (hold)
      var remote=await remoteFiles();
      if(!okBundle({files:remote})||!syntaxOk(remote))return;
      var cur=running?running.files:await bundledFiles();
      var changed=FILES.some(function(f){return remote[f]!==cur[f]});
      if(!changed)return;
      var db=await open();await put(db,'bundle',{files:remote,at:Date.now(),ver:sum(remote)});
      NFOTA.pending=sum(remote);window.dispatchEvent(new CustomEvent('nexaflow-update-ready'));
    }catch(e){/* offline or GitHub unreachable: try again later */}
    finally{checking=false}
  }

  var NFOTA=window.NFOTA={
    pending:'',ver:'',source:'APK',
    check:check,
    apply:function(){location.reload()},
    ready:function(){booted=true}            // ui.js calls this once the first screen is drawn
  };

  async function start(){
    var db=await open();var b=await get(db,'bundle');
    if(b&&(!okBundle(b)||b.bad||!syntaxOk(b.files))){await del(db,'bundle');b=null}
    if(b){
      /* errors thrown while the downloaded copy starts are reported to window 'error', not to this function */
      window.addEventListener('error',function onErr(){if(!booted){window.removeEventListener('error',onErr);fail()}});
      running=b;
      if(runBundle(b.files)){NFOTA.source='update';NFOTA.ver=b.ver||sum(b.files);setTimeout(function(){if(!booted)fail()},10000)}
      else{fail();return}
    }else{
      runBundled();bundledFiles().then(function(f){NFOTA.ver=sum(f)});
    }
    setTimeout(check,4000);
    window.addEventListener('online',function(){setTimeout(check,1500)});
    setInterval(function(){if(!document.hidden)check()},CHECK_EVERY);
  }
  /* a downloaded copy that never reached its first screen is discarded; the bundled copy runs after reload */
  async function fail(){try{var db=await open();await del(db,'bundle')}catch(e){}location.reload()}

  start();
})();
