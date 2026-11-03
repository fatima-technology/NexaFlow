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

## Windows .exe: app andar band + "Update" button (master jise chahe usi ko)
- `.exe` ab web app ko apne andar rakhta hai (`app://nexaflow`), isliye internet ke bina bhi khulta hai aur website mein hone wali tabdeeli **khud sab ko nahi** milti. Nayi version sirf **Update** button se aati hai.
- **Naya release banana:** GitHub → Actions → **Release Windows exe** → Run workflow → version likhein (jaise `1.1.0`, pichli se bari). Isse GitHub Release `v1.1.0` ban jata hai (installer + `latest.yml`). Pehle PRs merge kar lein, phir release karein.
- **Sirf ek client ko bhejna:** Developer login → Clients (master) → master login → us client ki row mein **⬆️ Update** → version (`1.1.0`) → Bhejein. Sirf us ki app mein upar **⬆️ Update v1.1.0** button aayega.
- **Sab clients ko bhejna:** Clients (master) ke upar "Sab clients ke liye update version" mein `1.1.0` likh kar **Sab ko update bhejein**.
- **Client ke liye:** Update button dabaye → "Update karein?" Yes → download hota hai → app khud install karke dobara khulti hai. Data wahi rehta hai.
- Master table mein har client ki **installed version** aur aakhri baar dekhne ki tareekh dikhti hai. Update wapas lene ke liye version khali karke bhejein.
- **Pehli baar (ek hi martaba):** nayi `.exe` manually install karni hai (Actions → Release Windows exe se banne wale Release se `NexaFlow Setup x.y.z.exe`). Ye app ka local data alag jagah rakhta hai, isliye purane exe ka data **backup file** (Backup & day end) ya **Cloud restore** (pehli screen) se wapas laayein. Uske baad kabhi dobara install nahi karna, sirf Update button.
- Browser mein (developer) website hamesha live version dikhati hai.

## NexaFlow Field — Android app (Order Booker + Store Manager)
Alag APK (`mobile/` folder, Capacitor). **Laptop / Windows app mein koi tabdeeli nahi hui** — woh pehle jaisi chalti hai.
- **Login:** ek hi app; username/password se role ke hisaab se screens khulti hain (laptop par jo Booker / Store Manager users banaye hain wahi).
- **Data kahan se:** phone laptop ke maujooda **Cloud backup** (har "Day end + backup" par Firestore mein jata hai) se users, shops, products, stock aur shop balances download karta hai (pehli baar **Client Code** daal kar; baad mein menu ⋮ → *Data refresh*). Is liye data utna taaza hai jitna laptop ka aakhri Day End backup.
- **Booker:** shops, naya order (offline bhi), apne orders, **Sync** (manual, laptop wale flow jaisa), **Day End** (date lock), market recovery, shop balance. Orders usi `clients/{CODE}/orders` + `dayEnds` mein jate hain, to laptop ka "Booker orders (live)" unhein dikhata hai.
- **Store Manager:** live stock (low/out filter), maal receive (purchase), shop return, company claim, stock count. Yeh entries `clients/{CODE}/inbox` mein jati hain.
- **Zaroori (ek baar):** naye `firestore.rules` Firebase console → Firestore → Rules mein **Publish** karein (is mein `inbox` ka rule hai). Iske baghair booker orders/Day End chalte hain, lekin recovery/store entries sync nahi hongi (403).
- **Abhi laptop `inbox` entries (recovery, purchase, return, claim, count) khud import nahi karta** — woh Firestore mein safe hain; laptop mein import screen alag se banani hogi.
- **APK banana:** GitHub → Actions → **Build Android APK (NexaFlow Field)** → Run workflow → 5-10 min baad Artifacts → `NexaFlow-Field-APK` (`NexaFlow-Field.apk`). Phone mein install karein (Settings mein "Install unknown apps" allow karna hoga).
