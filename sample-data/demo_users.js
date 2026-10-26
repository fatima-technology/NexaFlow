/* Demo users: 4 bookers, 2 store managers, 2 KPO, 4 supply men. Password for every login = 0000.
   Paste in the app's browser console (F12 -> Console) while logged in as Admin. Safe to run twice. */
(()=>{
  const PASS='0000';
  const people=[
    ['booker','Bilal Ahmed','booker1','0301-1112221'],['booker','Imran Khan','booker2','0302-1112222'],
    ['booker','Zahid Marwat','booker3','0303-1112223'],['booker','Naveed Kundi','booker4','0304-1112224'],
    ['storemanager','Rashid Mehsud','store1','0305-1112225'],['storemanager','Tariq Baloch','store2','0306-1112226'],
    ['kpo','Asad Niazi','kpo1','0307-1112227'],['kpo','Farooq Awan','kpo2','0308-1112228']
  ];
  const supply=[['Waqar Gandapur','booker1'],['Salman Bhatti','booker2'],['Hamza Qureshi','booker3'],['Usman Sheikh','booker4']];
  let added=0;const find=u=>DB.users.find(x=>x.username.toLowerCase()===u);
  people.forEach(([role,name,un,phone])=>{
    if(find(un))return;
    DB.users.push({id:uid(),username:un,name,role,phone,active:true,perms:ROLE_DEFAULTS[role].slice(),pass:hashPass(un,PASS),mustChange:false});added++;
  });
  supply.forEach(([name,bk])=>{
    const un=name.toLowerCase().replace(/[^a-z0-9]/g,'');const b=find(bk);
    if(find(un)||!b)return;
    DB.users.push({id:uid(),username:un,name,role:'supplyman',phone:'',active:true,perms:[],bookerId:b.id});added++;
  });
  save();render();toast(added+' demo users added (password 0000)');
})();
