/* Same SHA-256 as the laptop app (index.html) so password hashes verify identically */
function sha256(s){s=unescape(encodeURIComponent(s));const K=[],H=[];let p=0;const isC={};for(let c=2;p<64;c++){if(!isC[c]){for(let i=0;i<313;i+=c)isC[i]=c;H[p]=(Math.pow(c,.5)*4294967296)|0;K[p++]=(Math.pow(c,1/3)*4294967296)|0}}
 const rr=(v,a)=>(v>>>a)|(v<<(32-a));const L=s.length*8;s+='\x80';while(s.length%64-56)s+='\x00';const W=[];for(let i=0;i<s.length;i++)W[i>>2]|=s.charCodeAt(i)<<((3-i)%4)*8;W[W.length]=(L/4294967296)|0;W[W.length]=L;
 let h=H.slice(0,8);for(let j=0;j<W.length;){const w=W.slice(j,j+=16);const o=h;h=h.slice(0,8);for(let i=0;i<64;i++){const w15=w[i-15],w2=w[i-2],a=h[0],e=h[4];
 const t1=h[7]+(rr(e,6)^rr(e,11)^rr(e,25))+((e&h[5])^(~e&h[6]))+K[i]+(w[i]=i<16?w[i]:(w[i-16]+(rr(w15,7)^rr(w15,18)^(w15>>>3))+w[i-7]+(rr(w2,17)^rr(w2,19)^(w2>>>10)))|0);
 const t2=(rr(a,2)^rr(a,13)^rr(a,22))+((a&h[1])^(a&h[2])^(h[1]&h[2]));h=[(t1+t2)|0].concat(h);h[4]=(h[4]+t1)|0}for(let i=0;i<8;i++)h[i]=(h[i]+o[i])|0}
 let r='';for(let i=0;i<8;i++)for(let j=3;j+1;j--){const b=(h[i]>>(j*8))&255;r+=(b<16?'0':'')+b.toString(16)}return r}
const legacyHash=(user,pass)=>sha256('ft-erp|'+String(user).toLowerCase().trim()+'|'+pass);
function stretchHash(user,pass,salt){const u=String(user).toLowerCase().trim();let h=sha256('ft-erp2|'+salt+'|'+u+'|'+pass);for(let i=0;i<8000;i++)h=sha256(h+salt+pass);return h}
function verifyPass(user,pass,stored){stored=String(stored||'');if(!stored)return false;if(stored.startsWith('s1$')){const i=stored.indexOf('$',3);return i>0&&stretchHash(user,pass,stored.slice(3,i))===stored.slice(i+1)}return legacyHash(user,pass)===stored}
