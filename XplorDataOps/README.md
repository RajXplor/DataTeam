# Relay — X2X Migration & Parent Tokens Suite

A single Next.js 15 application that replicates two Python automation scripts
(`X2X_automation.py` and `ParentToken_Report_Generator.py`) as a browser-based
tool, deployable on Vercel with zero filesystem dependencies.

---

## 1. What's inside

Two isolated workspaces, one app:

- **X2X Migration** (`/x2x`) — uploads a Children Data Master export and an
  Emergency Contact Reports export, applies Australian data cleaning (phone
  numbers, postcodes, Medicare numbers/expiry, dayfirst dates), builds the
  130+ column Parent/Child import row structure, detects and resolves
  duplicate emergency contacts, auto-creates placeholder Parent 1 records
  where missing, and returns a UTF-8-BOM CSV plus a full on-screen audit.
- **Parent Tokens & Banking** (`/parent-tokens`) — uploads a Payment Plan,
  DS Tokens, and Guardian Financial List file, matches them into a
  Parent ID → Token import CSV, flags duplicate gateway references and
  unmatched parents/children, and optionally generates a styled "No Banking
  Details" Excel report from a fourth, optional file.

All processing happens **in memory inside the API route handler** — nothing
is written to disk, which is what makes this safe to run on Vercel's
serverless functions (their filesystem is read-only except for `/tmp`, which
this app never needs).

---

## 2. Run it locally

**Requirements:** Node.js 18.18 or newer (Node 20 LTS recommended).

```bash
# 1. Unzip the project, then from inside the folder:
npm install

# 2. Start the dev server
npm run dev

# 3. Open the app
# http://localhost:3000
```

That's it — single command, single directory, no separate backend to start.

---

## 3. Deploy to Vercel

### Option A — Vercel CLI (fastest)

```bash
npm install -g vercel
vercel login
vercel          # first deploy — follow the prompts, accept the defaults
vercel --prod   # promote to production
```

### Option B — Git + Vercel Dashboard

1. Push this folder to a new GitHub/GitLab/Bitbucket repository.
2. In the [Vercel dashboard](https://vercel.com/new), import that
   repository.
3. Leave every setting on its default — Vercel auto-detects Next.js,
   the build command (`next build`), and the output directory. Click
   **Deploy**.

No environment variables are required for this app to function.

---

## 4. A known platform limit — and how this app handles it

Vercel Functions (which is what your `/app/api/*` routes compile to) cap
**both** the request body and the response body at **4.5 MB**. This is a
hard platform limit, not a Next.js setting — see
[Vercel's Functions limits docs](https://vercel.com/docs/functions/limitations).

This app's API routes return the processed file as base64 JSON alongside the
audit data, which is what makes the rich, instant on-screen results possible
without a database or blob storage — but it means the *combined* size of
your uploaded files plus the generated output needs to stay under that 4.5 MB
ceiling.

In practice, a single childcare service's Children Data Master + Emergency
Contact exports are almost always well under 1 MB combined (a few hundred
children across 130+ mostly-short-text columns), so this is unlikely to
affect normal use. If you do hit it:

- Both workspaces show an inline warning client-side before you submit if
  your combined upload looks large.
- The API routes pre-check the response size server-side and return a clear,
  actionable error — never a generic platform 413 — telling you to split the
  source file (e.g. by class/room for X2X, or run the No Banking Report as
  its own batch for Parent Tokens).
- If you outgrow this regularly, the standard fix is to move file upload to
  [Vercel Blob client uploads](https://vercel.com/docs/storage/vercel-blob/client-upload)
  so files bypass the function body limit entirely — this would be a
  meaningful architecture change beyond this app's current single-request
  design, so it's intentionally not included unless you need it.

---

## 5. Known dependency advisory — please read before production use

`npm audit` will report a **high-severity** advisory in the `xlsx`
(SheetJS Community Edition) package: prototype pollution and a ReDoS issue
when parsing a maliciously crafted file
([GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6)).
The SheetJS maintainers have not published a fix to the public npm registry
— a patched build exists only on their own paid CDN, which this app
deliberately does not depend on.

What this actually means for this app, and what's been done about it:

- **CSV uploads never reach the vulnerable code at all.** Every CSV file is
  parsed by a small, dependency-free text parser in `lib/file-parsing.ts`
  (built specifically to avoid a separate SheetJS date-guessing bug — see
  the comment at the top of that file) — SheetJS's parser is never invoked
  for CSV input. Most exports from childcare/finance systems are CSV, so in
  practice this is the path most uploads take.
- **Genuine binary Excel files (.xlsx/.xls) still use SheetJS** to read them
  (there's no good reason to hand-write an OOXML/OLE2 binary parser). As
  defense-in-depth, every row built from a parsed Excel file explicitly
  rejects `__proto__` / `constructor` / `prototype` as column names before
  they're used as object keys — this closes the specific downstream vector
  the advisory describes for *this app's* usage, though it cannot guarantee
  protection against every possible exploitation path inside SheetJS's own
  internals, since that code isn't something this app can patch.
- **Vercel Functions all have a hard execution timeout** (`maxDuration = 60`
  is set on both API routes) — so even a worst-case ReDoS hang on a
  maliciously crafted Excel file fails safely as a timeout, not an
  indefinitely-stuck function.
- This app has no database and stores nothing between requests, so there's
  no persistent state a successful exploit could corrlate or exfiltrate
  beyond the single request's own data.

If your team's risk tolerance requires a fully patched dependency chain,
the SheetJS-recommended path is migrating Excel *reading* to their paid CDN
build or to another actively maintained library — that's a deliberate
scope decision left to you rather than baked in here, since it changes the
dependency story in a way you should sign off on.

---

## 6. Project structure

```
app/
  layout.tsx               Root shell — sidebar + main content area
  page.tsx                  Home dashboard, links into both workspaces
  globals.css               Brand tokens, component utility classes
  x2x/page.tsx              X2X workspace route
  parent-tokens/page.tsx    Parent Tokens workspace route
  api/x2x/route.ts          X2X API route (Node runtime, in-memory only)
  api/parent-tokens/route.ts Parent Tokens API route

components/
  Sidebar.tsx                Persistent workspace navigation
  FileDropzone.tsx           Shared, stateless upload control
  x2x/X2XWorkspace.tsx       X2X form + state (isolated, local only)
  x2x/X2XResults.tsx         X2X audit/results display
  parent-tokens/ParentTokensWorkspace.tsx   PT form + state (isolated)
  parent-tokens/ParentTokensResults.tsx     PT audit/results display

lib/
  x2x-logic.ts              Full X2X processing port (faithful to source)
  parent-tokens-logic.ts    Full Parent Tokens processing port
  file-parsing.ts           Shared CSV/Excel reading layer (no type guessing)
  client-utils.ts           Browser-side download/formatting helpers
```

---

## 7. Updating brand colours

Every brand colour lives in one place — `tailwind.config.ts`, under
`theme.extend.colors.brand`. Change a hex value there and it propagates
everywhere automatically; no other file references raw hex codes.

---

## 8. Troubleshooting

**`npm install` fails on an unrelated package** — delete `node_modules` and
`package-lock.json`, then retry; this is almost always a stale lockfile from
a different Node version.

**Build fails on Vercel but works locally** — check the Vercel build logs
for the exact error; this is most commonly a case-sensitivity issue (Vercel's
Linux build environment is case-sensitive, your local machine may not be) in
an import path.

**A generated file looks empty / a column is blank that shouldn't be** — this
almost always means a source column header doesn't exactly match what the
script expects (extra whitespace, a renamed export column). Open the uploaded
file and compare its header row against the field names referenced in
`lib/x2x-logic.ts` or `lib/parent-tokens-logic.ts`.

**Date fields are in wrong order (month/day swapped)** — the X2X pipeline
parses dates with dayfirst=true to match the original Python script. If your
source system exports dates in MM/DD/YYYY format, you'll need to adjust the
`_date()` helper in `lib/x2x-logic.ts` to try month-first before day-first
for ambiguous dates (where both day and month are ≤ 12).

**"Processing failed" with a 5xx error and no clear message** — check the
Vercel Function logs in your project dashboard. The most common cause is a
source file with an unexpected encoding (the app expects UTF-8 or UTF-8-BOM;
a Windows-1252 file with special characters will throw inside the parser).

