# Fix: TDZ Chunk Crash (`Cannot access 'ct' before initialization`) and Mobile Blank Loads

**Goal:** Eliminate the runtime error in a minified chunk and fix mobile blank
loads by:

1. removing Terser,
2. simplifying chunk splitting to a single vendor chunk, and
3. temporarily forcing the PWA service worker to self-destroy so clients fetch
   fresh assets.

> **Scope:** Focused on blocking issues only. Icon/manifest warnings can be
> handled later.

---

## 1) Create a fix branch

```bash
git checkout -b fix/tdz-chunk-crash
```

---

## 2) Update `vite.config.(ts|js)` — remove Terser + simplify chunks

**Instructions:**

1. Open `vite.config.ts` (or `vite.config.js` if that’s used).
2. **Delete** any `minify: 'terser'` and **remove** any `terserOptions` block.
3. **Ensure** default esbuild minification (do **not** set `minify` explicitly).
4. **Replace** any custom `manualChunks` with a single vendor split.

**Replace your `build` block with the following (merge with other options as
needed):**

```ts
build: {
  target: 'es2020',
  sourcemap: true, // TEMP: keep for this deploy to verify
  rollupOptions: {
    output: {
      // Collapse all node_modules into one vendor chunk to avoid cross-chunk TDZ issues
      manualChunks(id) {
        return id.includes('node_modules') ? 'vendor' : undefined;
      },
      chunkFileNames: 'assets/[name]-[hash].js',
      assetFileNames: 'assets/[name]-[hash][extname]',
    },
  },
},
```

> If an existing `rollupOptions.output.manualChunks` exists, **replace** it with
> the function above.

---

## 3) Make the PWA service worker self-destroy for one deploy

**Purpose:** Prevent stale service worker from serving old chunks that don’t
match the new build (common cause of “works on desktop, blank on phone”).

1. In the same `vite.config.(ts|js)`, find where `VitePWA` is initialized.
2. Add `selfDestroying: true` and ensure the Workbox flags are present.

**Example (merge with existing plugin config):**

```ts
import { VitePWA } from 'vite-plugin-pwa';

VitePWA({
  registerType: 'autoUpdate',
  manifest: false, // keep using /public/manifest.json
  selfDestroying: true, // TEMP: one deploy only
  workbox: {
    cleanupOutdatedCaches: true,
    skipWaiting: true,
    clientsClaim: true,
  },
});
```

> Do **not** remove other PWA options you already have; just add/merge the
> above.

---

## 4) (Optional) Quick guard against circular imports

Run once locally; don’t block the fix if not installed.

```bash
npm i -D madge
npx madge --circular src || true
```

If it outputs cycles, capture the list; otherwise proceed.

---

## 5) Build, deploy, and verify on mobile

```bash
npm run build
# deploy as usual
```

**On phone:**

- Fully close the PWA/app or tab.
- Reopen the site (or reinstall the PWA if previously installed).
- Confirm the app boots without the TDZ crash and renders normally.

---

## 6) Remove temporary flags and redeploy

After confirming the fix on mobile:

1. In `vite.config.(ts|js)`:
   - **Remove** `selfDestroying: true`.
   - (Optional) set `sourcemap: false` again.
2. Rebuild and deploy:
   ```bash
   npm run build
   ```

---

## 7) Commit messages (suggested)

- `chore(build): remove terser and simplify manualChunks to single vendor`
- `fix(pwa): temporary selfDestroying SW to flush stale caches`
- `chore(build): disable sourcemaps + restore PWA after verification`

---

## 8) Emergency fallback (only if the crash persists)

If the error still appears on a small subset of devices, temporarily bundle into
a single JS file to prove it’s chunk-order related:

**For one build only**, add:

```ts
rollupOptions: {
  // ...
  output: {
    manualChunks(id) {
      return id.includes('node_modules') ? 'vendor' : undefined;
    },
    chunkFileNames: 'assets/[name]-[hash].js',
    assetFileNames: 'assets/[name]-[hash][extname]',
  },
  inlineDynamicImports: true, // TEMP ONLY: disables code splitting entirely
},
```

Build and deploy, verify mobile, then **remove** `inlineDynamicImports`
immediately and keep the single-vendor approach.

---

## Expected results

- **Runtime:** No more
  `Uncaught ReferenceError: Cannot access 'ct' before initialization` in
  minified chunks.
- **Mobile:** First load succeeds (no blank screen), with the service worker no
  longer serving stale assets. Subsequent deploy (after removing
  `selfDestroying`) restores normal PWA caching.
