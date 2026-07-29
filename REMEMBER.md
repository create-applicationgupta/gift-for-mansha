# Gift for Mansha — things to remember

## Live site
- **URL:** https://gift-for-mansha.vercel.app  
  (also works: https://gift-love-a6d4.vercel.app — project renamed to `gift`)  
  Note: `https://gift.vercel.app` is already taken by someone else on Vercel and cannot be used.
- **GitHub:** https://github.com/create-applicationgupta/gift-for-mansha
- **Unlock password:** set in `src/content/site.ts` → `password`  
  (current default: `oursecret` — change it anytime, then redeploy)

## Names & copy
Edit `src/content/site.ts`:
- `brand` — hero title (e.g. For Mansha)
- `tagline` — short line under the title
- `yourName` / `herName` — love notes author picker
- `password` — oursecret

## Photos (upload in the app — free, no Storage upgrade)
Do **not** upgrade to Blaze / paid plan. Firebase Storage now asks for money; this site stores photos in **Firestore only** (Spark free).

On the Photos page you can upload from the browser:
- Max **5** photos
- Uploading a 6th removes the **oldest** automatically
- Photos are compressed in the browser before saving (stays free)

### Firestore rules (notes + photos) — Publish these
Firebase → **Firestore Database** → **Rules**:

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

Skip **Storage** entirely if it asks you to upgrade.

## Love notes (Firebase)
Notes sync between your devices **only** when Firebase Firestore is set up.

### Project
- Firebase project: `gift-for-mansha`
- Plan: **Spark** (free — do not upgrade to Blaze)

### Keys
Local keys live in `.env` (not committed to Git).  
Same keys are stored in Vercel → Project → Settings → Environment Variables as:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Template: copy `.env.example` → `.env`

**Note:** Test mode’s “30 days” warning is about temporary open rules expiring — **it does not delete your data**. Use the rules above so access never expires.

### If notes / photos don’t sync
1. Confirm Firestore database exists
2. Confirm rules are published (above)
3. Hard-refresh the site (Ctrl+Shift+R)
4. Confirm Vercel env vars are set, then redeploy

## Deploy after changes
From the project folder:

```bash
npm run build
npx vercel --prod
```

Or push to GitHub if the Vercel project is connected to the repo (auto-deploy).

## Add a new section later
1. Create a page in `src/pages/`
2. Add a route in `src/App.tsx`
3. Add a nav item in `sections` inside `src/content/site.ts`

## Security note
The site password is a simple shared gate (not bank-level security).  
Firebase web keys are visible in the browser by design — the password + Firestore rules are what protect the notes. Don’t put highly sensitive secrets in love notes.
