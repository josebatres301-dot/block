# Block

12-week training and nutrition tool. Single-file React app + Firebase. Apple-styled iOS UI.

## Setup (15 minutes total)

### 1. Firebase (10 min)

1. Go to https://console.firebase.google.com → **Add project** → name it `block-app` (or whatever) → no Analytics
2. Build → **Firestore Database** → Create → **Production mode** → pick a region close to you (e.g. `us-central1`)
3. Build → **Authentication** → Get started → Sign-in method tab → **Anonymous** → Enable → Save
4. Project Settings (gear icon, top left) → scroll down → **Your apps** → click the `</>` Web icon → register app (no Hosting checkbox needed) → **copy the firebaseConfig object**
5. Firestore → **Rules** tab → paste the contents of `firestore.rules` from this folder → **Publish**

### 2. Local setup (3 min)

```bash
npm install
cp .env.example .env
```

Open `.env` and paste the Firebase config values:
```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=block-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=block-app
VITE_FIREBASE_STORAGE_BUCKET=block-app.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=1:...:web:...
```

Then:
```bash
npm run dev
```

Open http://localhost:5173 → the app loads and seeds the Firestore with Jose + Yareli profiles, default workout plans, and 10 starter foods.

### 3. Deploy to Vercel (5 min)

```bash
git init
git add .
git commit -m "Initial commit"
# Push to GitHub (create a new repo first)
git remote add origin <your-repo-url>
git push -u origin main
```

Then on vercel.com:
1. Add New → Project → Import your GitHub repo
2. Framework: Vite (auto-detected)
3. Environment Variables: paste each `VITE_FIREBASE_*` from your `.env`
4. Deploy

### 4. Install as PWA on iPhone (30 sec)

Open the deployed URL in Safari → Share button → **Add to Home Screen** → done.

## First Use

- App opens with Jose profile active
- Tap "Jose" avatar to switch to Yareli
- Edit macros in Settings (gear icon top right) if defaults need adjusting
- On Tue/Thu/Sun, the workout card appears; tap to log
- Add Food at any time

## Defaults pre-loaded

- Jose: 2500 cal / 180p / 68f / 255c · Push/Pull/Full Body plan
- Yareli: 1400 cal / 110p / 48f / 128c · Glute/Upper/Glute plan
- 10 starter foods (Chicken breast, Ground beef, Rice, Eggs, etc.)
- Block start date = the day you first open the app

Edit any of these in Settings.
