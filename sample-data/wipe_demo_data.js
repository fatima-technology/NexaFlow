/* Deletes ALL shops, products, invoices, purchases, payments/recoveries, returns, claims, expenses etc.
   and every user except the developer and admin logins. Settings, accounts and admin/developer stay.
   A backup (.json) is downloaded first. Paste in the app's browser console (F12 -> Console) as Admin. */
(()=>{
  const keys=['invoices','purchases','supplierPayments','recoveries','collections','returns','claims','expenses','transfers','staffAdv','salaries','investorTxns','dayEnds','picklists'];
  const extra=DB.users.filter(u=>u.role!=='developer'&&u.role!=='admin');
  const msg='This will delete '+DB.shops.length+' shops, '+DB.products.length+' products, '+extra.length+' non-admin users and ALL invoices / purchases / recoveries / returns / claims / expenses. A backup file will be downloaded first. Continue?';
  if(!confirm(msg))return;
  downloadJSON(DB,backupName('before_wipe'));
  DB.shops=[];DB.products=[];keys.forEach(k=>DB[k]=[]);
  DB.users=DB.users.filter(u=>u.role==='developer'||u.role==='admin');
  DB.attendance={};DB.attendanceLogs=[];DB.counters={inv:0,pur:0,clm:0,pick:0};DB.meta.invMade=0;
  log('Developer','All demo data wiped');save();render();toast('All data deleted. Backup downloaded.');
})();
