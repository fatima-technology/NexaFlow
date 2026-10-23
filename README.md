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
- Sirf developer: **Order sync settings** (Developer group) mein Firebase config paste karein (har device par ek baar; config code mein hardcode nahi). Admin aur booker ko yeh screen nahi dikhti.
- Admin:  **Booker orders (live)** mein sab bookers ke synced orders real-time dikhte hain.

### Firebase setup (ek baar)
1. Firestore Database banayein. 2. Authentication → Anonymous enable karein. 3. `firestore.rules` ko Rules tab mein publish karein.
Automatic deployment test
Rules band date par orders ka create/update rokte hain aur `dayEnds` ko create-only rakhte hain. Note: app ka login Firebase Auth se juda nahi, is liye rules yeh nahi pehchan sakte ke request kis booker ne bheji; woh sirf (booker, date) ke Day End lock ko enforce karte hain.
