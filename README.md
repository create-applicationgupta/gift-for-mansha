# Soft Romantic Gift Site

A private gift website with a soft romantic look, a photo gallery, and shared love notes. Free to host on Vercel; notes sync with free Firebase Firestore.

## Quick start

```bash
npm install
npm run dev
```

Open the local URL, then unlock with the password in `src/content/site.ts` (default: `oursecret`).

## Personalize

1. Edit **`src/content/site.ts`**
   - `brand`, `tagline`, `yourName`, `herName`, `password`
2. Add photos to **`public/photos/`** (jpg/png/webp)
3. Update the list in **`src/content/photos.ts`** (`src`, `caption`, `alt`)
4. Optional: replace **`public/hero-mood.svg`** with your own full-bleed hero image (update `Home.tsx` if the filename changes)

## Love notes + Firebase (so notes sync on both phones)

Without Firebase, notes still work but stay in that browser only.

1. Go to [Firebase Console](https://console.firebase.google.com/) → Create a project
2. Add a **Web** app and copy the config values
3. Enable **Firestore Database** → create in **production** mode, then set rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /notes/{noteId} {
      allow read, create: if true;
      allow update, delete: if false;
    }
  }
}
```

These rules let anyone with the site URL read/create notes (the site password is the main gate). Do not put highly sensitive secrets in notes.

4. Copy `.env.example` → `.env` and paste your Firebase values
5. Restart `npm run dev`

## Deploy (free on Vercel)

1. Push this project to GitHub
2. Import the repo at [vercel.com](https://vercel.com)
3. Add the same `VITE_FIREBASE_*` variables in Vercel → Project → Settings → Environment Variables
4. Deploy, then share the URL + password with her

## Add a future section

1. Create a page in `src/pages/`
2. Add a route in `src/App.tsx`
3. Add an entry to `sections` in `src/content/site.ts`

## Scripts

| Command        | Purpose              |
|----------------|----------------------|
| `npm run dev`  | Local development    |
| `npm run build`| Production build     |
| `npm run preview` | Preview production |
