# Deployment Guide — Gift for Mansha

This document explains **exactly how this app was built, configured, and deployed** so you (or future you) can repeat or fix it. Everything used here is on a **free** plan unless noted.

---

## What was deployed

| Piece | Choice | Cost |
|-------|--------|------|
| App | Vite + React + TypeScript SPA | Free |
| Source code | GitHub | Free |
| Hosting / live URL | Vercel | Free |
| Love notes + photos data | Firebase Firestore (Spark) | Free |
| Site unlock | Shared password in `src/content/site.ts` | — |

**Live URL:** https://gift-for-special.vercel.app  
**GitHub:** https://github.com/create-applicationgupta/gift-for-mansha  
**Firebase project ID:** `gift-for-mansha`

> **Not used:** Firebase Storage (it now asks to upgrade to Blaze / paid). Photos are stored compressed inside Firestore instead.

---

## Architecture (how it works in production)

```
Browser (Mansha / you)
    │
    ├─ static site (HTML/JS/CSS)  ←── Vercel CDN
    │
    └─ Firestore reads/writes
           ├─ collection: notes   (love notes)
           └─ collection: photos  (up to 30 images as compressed data)
```

1. Visitor opens the Vercel URL.
2. Password gate unlocks the SPA (session only, in that browser).
3. Love notes and photos load from Firestore using the `VITE_FIREBASE_*` keys baked into the frontend build.
4. Uploading a photo compresses it in the browser, then saves it to Firestore. If there are already 30, the oldest document is deleted first.

---

## Prerequisites (one-time)

- Node.js installed (this project was built with a recent Node; `npm` available)
- A GitHub account
- A Vercel account (can sign in with GitHub)
- A Google account for Firebase Console
- Project folder on disk: `Gift_site`

---

## Step 1 — Local app

From the project root:

```bash
npm install
npm run dev
```

Local URL is usually http://localhost:5173/

Unlock password is set in:

```ts
// src/content/site.ts
password: 'oursecret'
```

Change names / tagline in the same file (`brand`, `herName`, etc.).

Production build check:

```bash
npm run build
npm run preview
```

---

## Step 2 — Put the code on GitHub

The repo was created and pushed as:

**https://github.com/create-applicationgupta/gift-for-mansha**

What we did conceptually:

```bash
git init
git add .
git commit -m "Initial gift site"
# create empty repo on GitHub (or: gh repo create ...)
git remote add origin https://github.com/create-applicationgupta/gift-for-mansha.git
git push -u origin master
```

Later updates:

```bash
git add .
git commit -m "Your message"
git push
```

### Important: never commit secrets

`.gitignore` excludes `.env`.  
Firebase keys live in `.env` locally and in **Vercel Environment Variables** for production — not in Git.

Template only: `.env.example`

---

## Step 3 — Deploy to Vercel (live site)

### 3.1 Log in to Vercel CLI

From the project folder:

```bash
npx vercel login
# or: npx vercel whoami
```

If not logged in, the CLI opens a browser device-login page. Approve it.

Account used for this deploy: Vercel user / team context **`love-a6d4`** (CLI showed username `create-applicationgupta`).

### 3.2 First production deploy

```bash
npx vercel --prod --yes
```

What Vercel does:

1. Detects **Vite**
2. Runs `npm run build` (`tsc -b && vite build`)
3. Publishes the `dist/` output
4. Assigns a production URL

### 3.3 SPA routing

File [`vercel.json`](vercel.json) rewrites all paths to `index.html` so React Router routes (`/photos`, `/notes`) work when opened directly:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### 3.4 Project rename / URLs

- Original project name: `gift-for-mansha`
- Renamed with: `npx vercel project rename gift-for-mansha gift`
- **Primary alias that still works:** https://gift-for-special.vercel.app
- Also available after rename: https://gift-love-a6d4.vercel.app
- **`https://gift.vercel.app` is taken globally** — cannot be claimed

Redeploy after changes:

```bash
npx vercel --prod --yes
```

### Alternative: deploy from the Vercel website

1. Go to https://vercel.com
2. **Add New Project** → Import the GitHub repo `gift-for-mansha`
3. Framework: Vite (auto-detected)
4. Add the same `VITE_FIREBASE_*` env vars (see Step 5)
5. Deploy

Connecting GitHub means every `git push` can auto-deploy. This project was also deployable purely via CLI without waiting on Git integration.

---

## Step 4 — Firebase (data for notes + photos)

### 4.1 Create the project

1. Open https://console.firebase.google.com/
2. **Add project** → name: `gift-for-mansha`
3. Stay on **Spark** plan ($0). Do **not** upgrade to Blaze for Storage.

### 4.2 Register a Web app

1. Project Overview → **Add app** → **Web** (`</>`)
2. Nickname: e.g. `gift-for-mansha`
3. Skip Firebase Hosting checkbox (site is on Vercel)
4. Copy the `firebaseConfig` object

Example shape (values are secrets — use yours from Console / `.env`):

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "gift-for-mansha.firebaseapp.com",
  projectId: "gift-for-mansha",
  storageBucket: "gift-for-mansha.firebasestorage.app",
  messagingSenderId: "...",
  appId: "...",
  measurementId: "..." // optional; not required by this app
};
```

Click **Continue to console** when done (closes the wizard so the sidebar returns).

### 4.3 Enable Cloud Firestore

1. Left sidebar → **Databases & Storage** → **Firestore Database**  
   (newer UI may not say “Build”)
2. **Create database**
3. Start in **test mode** is OK to begin
4. Pick any region → Enable

**About the “30 days” warning:**  
Test mode does **not** delete your data after 30 days. It only means temporary open rules expire. Publish lasting rules (next section).

### 4.4 Publish Firestore security rules

Go to **Firestore Database → Rules**, replace with the contents of [`firestore.rules`](firestore.rules), then **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /notes/{noteId} {
      allow read, create: if true;
      allow update, delete: if false;
    }
    match /photos/{photoId} {
      allow read, create, delete: if true;
      allow update: if false;
    }
  }
}
```

Without the **`photos`** block, uploads fail with:

> Missing or insufficient permissions

### 4.5 Do not use Firebase Storage for this app

Storage currently prompts **Upgrade project** (paid Blaze).  
This app was changed so photos are compressed in the browser and stored in Firestore documents instead — still free on Spark.

---

## Step 5 — Environment variables

### 5.1 Local `.env`

Create `.env` in the project root (copy from `.env.example`):

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=gift-for-mansha.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gift-for-mansha
VITE_FIREBASE_STORAGE_BUCKET=gift-for-mansha.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Restart `npm run dev` after editing `.env`.

The app reads these in `src/lib/firebase.ts` via `import.meta.env.VITE_*`.

### 5.2 Vercel production env vars

The live site only gets Firebase if the same keys exist on Vercel:

```bash
# Example pattern used during setup (one var at a time):
echo YOUR_VALUE | npx vercel env add VITE_FIREBASE_API_KEY production
```

Add for **Production** (and ideally Preview / Development too):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Or set them in the dashboard:

**Vercel → Project `gift` → Settings → Environment Variables**

### 5.3 Redeploy after adding env vars

Env vars are applied at **build** time for Vite (`VITE_` prefix). After adding/changing them:

```bash
npx vercel --prod --yes
```

---

## Step 6 — Verify the live site

1. Open https://gift-for-special.vercel.app
2. Enter password from `src/content/site.ts`
3. **Love notes:** leave a note → open on another device → should appear
4. **Photos:** upload an image → should show in the grid; 31st upload removes oldest
5. Pink “Firebase is not configured” banners should **not** appear if env vars are correct

Hard refresh if something looks cached: **Ctrl+Shift+R**

---

## Day-to-day update workflow

### Code / content change (names, password, UI)

```bash
# edit files
npm run build          # optional local check
git add .
git commit -m "Describe change"
git push
npx vercel --prod --yes   # if not auto-deploying from GitHub
```

### Only Firebase rules change

Edit rules in Firebase Console (or keep [`firestore.rules`](firestore.rules) as source of truth and paste into Console). No Vercel redeploy needed for rules-only changes.

### Only Firebase keys change

Update `.env` locally + Vercel env vars → redeploy Vercel.

---

## File map (deployment-related)

| File | Role |
|------|------|
| `package.json` | Scripts: `dev`, `build`, `preview` |
| `vercel.json` | SPA rewrites for React Router |
| `.env` / `.env.example` | Firebase web config (local) |
| `src/lib/firebase.ts` | Initializes Firestore from env |
| `src/lib/notes.ts` | Love notes read/write |
| `src/lib/photos.ts` | Photo compress + upload + 30-cap rotation |
| `src/content/site.ts` | Brand, names, password |
| `firestore.rules` | Rules to paste into Firebase |
| `REMEMBER.md` | Short cheat sheet |
| `DEPLOYMENT.md` | This guide |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Pink banner: Firebase not configured | Missing / wrong `VITE_*` on that environment | Fix `.env` or Vercel env → redeploy |
| Notes work, photos fail with permissions | Firestore rules missing `photos` match | Publish full rules from `firestore.rules` |
| `/photos` 404 on refresh | Missing SPA rewrite | Ensure `vercel.json` is deployed |
| Storage asks for money | Expected | Ignore Storage; use Firestore photo upload |
| `gift.vercel.app` unavailable | Alias already taken | Use `gift-for-special.vercel.app` or another free name |
| Old password still required after change | Forgot to redeploy | Change `site.ts` → rebuild/redeploy |

---

## Security notes (honest)

- The site password is a **simple shared gate**, not strong authentication.
- `VITE_FIREBASE_*` keys are **public in the browser** by design (Vite embeds them).
- Protection for data is mostly: obscure URL + password + Firestore rules.
- Rules allow anyone who can call your Firebase project to read/create notes and photos. Fine for a private gift link; not for highly sensitive data.
- Prefer changing the default password before sharing widely.

---

## Summary checklist

- [x] App built with Vite + React
- [x] Code on GitHub
- [x] Hosted on Vercel (free)
- [x] Firebase Spark project + Firestore
- [x] Web app config → `.env` + Vercel env
- [x] Firestore rules for `notes` + `photos`
- [x] Photos without paid Storage (compressed into Firestore)
- [x] SPA rewrites via `vercel.json`
- [x] Live at https://gift-for-special.vercel.app
