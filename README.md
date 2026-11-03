# NexaFlow Distribution ERP

## Files
- `index.html` — app shell and library references
- `styles.css` — visual styling
- `app.js` — ERP functionality and business logic

## Run locally
Keep all three files in the same folder and open `index.html` in a modern browser. External font and PDF/Excel libraries require internet access.

## GitHub Pages
Upload all files to the repository root (same folder), then enable GitHub Pages from repository Settings.

## Design update
The default theme is now **NexaFlow Modern** with a forest-green / mint palette, Manrope typography, softer cards, refreshed navigation and updated login styling. This is a presentation/theme change; core ERP business logic was not intentionally changed. Browser end-to-end checks are still required before production use.

## Offline-first orders, Sync and booker Day End
- Har booker ka order pehle phone ki **IndexedDB** (`nexaflow_orders`) mein UUID aur status `pending` ke saath save hota hai, phir internet ho to foran Firestore par upload ki koshish hoti hai (8-9 sec timeout; fail ho to `pending` rehta hai, booker block nahi hota).
- Upar status bar: green **Online** ya red **Offline — X orders pending**. Orders ke saath **Synced ✓ / Pending ⏳** badge.
- Internet wapas aane par pending orders khud upload **nahi** hote; booker **Sync** dabata hai. Document ID = order UUID, is liye dobara Sync par duplicate nahi banta.
- Synced orders phone se delete nahi hote; woh Day End tak IndexedDB mein rehte hain. `navigator.storage.persist()` mangi jati hai.
- **Day End** (Sales → Sync & Day End): pending orders hon to band. Tasdeeq ke baad woh date us booker ke liye lock (sirf view). Day End Firestore (`dayEnds/{bookerId}_{date}`) mein bhi save hota hai aur admin ko dikhta hai.
- Sirf developer: **Order sync settings** (Developer group) mein is device ka **Client code** daalein (har device par ek baar). Firebase project (`nexaflow-5f265`) ka web config ab app mein default hai. Admin aur booker ko yeh screen nahi dikhti.
- Admin:  **Booker orders (live)** mein sab bookers ke synced orders real-time dikhte hain.

### Firebase setup (ek baar)
1. Firestore Database banayein. 2. Authentication → **Anonymous** aur **Email/Password** enable karein; master ka email/password user banayein. 3. `firestore.rules` mein `fatimatech96@gmail.com` ko master email se badal kar Rules tab mein publish karein.
Automatic deployment test
Rules band date par orders ka create/update rokte hain aur `dayEnds` ko create-only rakhte hain. Note: app ka login Firebase Auth se juda nahi, is liye rules yeh nahi pehchan sakte ke request kis booker ne bheji; woh sirf (booker, date) ke Day End lock ko enforce karte hain.

## Windows .exe (client laptop) + Day End cloud backup
- `desktop/` mein Electron wrapper hai. App laptop par offline bhi chalti hai; data usi laptop par rehta hai.
- **.exe kaise milega:** GitHub → Actions → **Build Windows exe** → *Run workflow*. 5-10 min baad us run ke neeche **Artifacts → NexaFlow-Windows-Setup** download karein (zip ke andar `NexaFlow Setup x.y.z.exe`). Wohi client laptop par chalayein.
- **Firebase config exe mein kaise jaye:** repo Settings → Secrets and variables → Actions → New secret → naam `FIREBASE_CONFIG`, value = Firebase ka `firebaseConfig` JSON (keys double quotes mein). Phir exe dobara build karein. Config na ho to bhi app chalti hai (baad mein Developer → Order sync settings se dal sakte hain).
- **Har Day End par:** admin "Backup & day end → Day end + backup" dabata hai to (1) backup `.json` khud `Documents\NexaFlow Backups` mein save hota hai, (2) poora data gzip hokar Firestore `backups` collection mein jata hai. Internet na ho to laptop par queue rehta hai aur net aate hi khud chala jata hai.
- **Owner ke liye:** Firebase → Authentication → Email/Password enable karein, apna user banayein, `firestore.rules` Publish karein. Phir NexaFlow mein Developer login → **Cloud backups** → apna email/password → har Day End ki backup list se **Download**.

## Multi-client (ek Firebase project, har client ka alag data) + expiry / fees
- Sab clients ek hi Firebase project par hain. Har client ka data `clients/{CODE}/orders|dayEnds|backups` ke neeche alag jata hai. Code lamba random hota hai (`NX-XXXXXXXXXX`) taake andaza na lag sake.
- **Master panel:** Developer login → **Clients (master)** → master email/password → **Naya client** (naam, fee, expiry). Code copy karke client ke laptop par Developer → **Order sync settings** mein daalein.
- **Expiry / fees:** "+1 mahina" / "+1 saal" dabane se expiry aage barhti hai aur payment record hoti hai. "Band" karne par client foran block ho jata hai. Expire hone par client (admin/booker/...) ko "NexaFlow band hai" screen dikhti hai; **data delete nahi hota**. Developer login kabhi block nahi hota. Device license online hone par check karke yaad rakhta hai, isliye offline mein bhi expiry ki tareekh par band hota hai.
- **Cloud backups** screen master login se sab clients ke backups dikhati hai (Client column ke saath).
- Nota: client ka login Firebase Auth se juda nahi (anonymous auth), is liye client ka code hi uski hifazat hai; code kisi ko na batayein.

## Windows .exe ab GitHub Pages se khulta hai
- `.exe` ab `https://fatima-technology.github.io/NexaFlow/` load karta hai (Cloudflare worker hata diya gaya hai). PR merge hote hi GitHub Pages par nayi version aati hai aur `.exe` khud update ho jata hai.
- Purani `.exe` jo workers.dev se banti thi ab nahi khulegi: **Build Windows exe** dobara chala kar nayi `.exe` install karein.
- Dhyan: browser/app ka data (local storage) har website address ke hisaab se alag hota hai, isliye nayi `.exe` pehli baar khali khulegi. Purana data wapas laane ke liye backup file ya Cloud restore (pehli screen par) use karein.
