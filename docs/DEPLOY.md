# Putting it online

The scanner needs https, so the app has to be deployed before the camera can be
tested at all. That is the main reason to do this.

Repo: <https://github.com/vladimirbrusov83-hub/Food_log> (private)

---

## First time

### 1. The database

FoodLog has **its own Neon project** — not IronLogWeb's, not ClientProgram's. If
it needs recreating: a new project at [console.neon.tech](https://console.neon.tech),
then the **pooled** connection string (the hostname has `-pooler` in it).

```bash
npm run db:push
```

Creates the tables and loads the 434 foods. Takes about a second. Safe to run
again.

### 2. The Vercel project

At [vercel.com/new](https://vercel.com/new), import `vladimirbrusov83-hub/Food_log`.
Next.js is detected; no build settings need changing.

Add two environment variables, for **all three** environments (Production,
Preview, Development):

| Name | Value |
|---|---|
| `DATABASE_URL` | the Neon pooled connection string |
| `APP_PASSCODE` | the passcode that opens the app |

Or from the terminal:

```bash
vercel link
vercel env add DATABASE_URL production
vercel env add APP_PASSCODE production
```

### 3. Deploy

Push to `main`. Vercel builds and deploys in about thirty seconds.

### 4. Test the camera

The part that has never been tested. On the phone, over https:

1. Open the site, enter the passcode.
2. A meal → **+ Add food** → **Scan** → **Start camera**.
3. Allow camera access when iOS asks. **It asks once** — if you say no, it is
   Settings → Safari → Camera to undo.
4. Scan something from the kitchen that Open Food Facts has.
5. Scan something it doesn't, and go through the manual form.

Both paths matter. The second one is most of American groceries.

### 5. Add it to the home screen

Safari → Share → Add to Home Screen. It opens full-screen with its own icon
(`app/manifest.ts`; icons in `public/icons/`, drawn by
`node scripts/build-icons.mjs` in IronLog's style). The home-screen app keeps its own cookies, so
it asks for the passcode once, then remembers it for a year.

`public/sw.js` caches only Next's static files and shows `offline.html` when
there is no network. It never caches pages — the diary is live data.

---

## Afterwards

```
git add -A
git commit -m "..."
git push
```

Vercel deploys on its own, in roughly thirty seconds. There is no
`vercel --prod` step here.

### The one rule about the schema

**`npm run db:push` is manual, and it runs before the code that needs it.**

One Neon database serves both local and production, and Vercel never runs
`db:push`. So if a change adds a column:

1. `npm run db:push` locally — the column now exists in the one database
2. *then* push the code that reads it

The other way round gives you a production app querying a column that isn't
there.

---

## Environment variables

| Name | Notes |
|---|---|
| `DATABASE_URL` | Neon **pooled**. The app connects on first query, not at import, so a build without it still succeeds. |
| `APP_PASSCODE` | Changing it signs out every open browser — by design, since the cookie is derived from it. Also kept in the Mac Keychain: `security find-generic-password -s foodlog-passcode -w` |

Locally they live in `.env.local`, which is gitignored. The repo is private now, but the rule stands.
Nothing with a password in it goes in a tracked file, private repo or not.

To pull production's values down:

```bash
vercel env pull .env.local
```

---

## If something is wrong in production

**Everything 500s** — almost always `DATABASE_URL` missing or wrong in Vercel's
settings. Check all three environments have it; a Preview deploy with no
variables fails exactly like a broken app.

**The app loads but has no foods** — `db:push` was never run against that
database.

**The camera does nothing on the phone** — check the address bar really says
`https://`. Then check the site wasn't denied camera access earlier: iOS
Settings → Safari → Camera.

**A deploy succeeded but the app queries a missing column** — the schema rule
above, in the wrong order. Run `npm run db:push` and reload; no redeploy needed,
since it is the same database either way.

**Neon is asleep** — the free tier suspends an idle database and the first
request after that takes a few seconds. It is not a bug.

---

## Rolling back

Vercel → the project → Deployments → an earlier one → Promote to Production.

Note that this rolls back *code only*. The database is shared and does not roll
back, which is the other reason schema changes go first and are additive
wherever possible.
