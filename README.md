# UntungLab

F&B profit-intelligence PWA for Malaysian home-based and micro food businesses.
Bahasa Melayu first. Works offline. No login: data lives on the device.

Source of truth: the Master Handover Pack (docs 00 to 08). Where this repo departs from it,
the departure is recorded in [DECISIONS.md](./DECISIONS.md).

## Stack

Vite, React, TypeScript, Tailwind CSS v4, Vitest, vite-plugin-pwa (Workbox).
On-device storage: Dexie (IndexedDB).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm test` | Run the test suite (calculation domain first) |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Typecheck, then production build with service worker |
| `npm run preview` | Serve the production build locally |
| `npm run icons` | Regenerate placeholder PWA icons |
| `node scripts/e2e-phase9.mjs` | Browser check for Sandaran (export, refuse bad files, restore on a new device offline) |
| `node scripts/e2e-phase8.mjs` | Browser check for Kesan Harga (what-if, reset, apply, history review) |
| `node scripts/e2e-phase7.mjs` | Browser check for Dashboard, Jejak Harga and price insights |
| `node scripts/e2e-phase6.mjs` | Browser check for Menu / Resipi (Doc 06 M01 through the real screens) |
| `node scripts/e2e-phase5.mjs` | Browser check for Kos Operasi and the setup checklist (same requirements) |
| `node scripts/e2e-smoke.mjs` | Browser smoke test (needs Playwright, a running `npm run preview`, `PW_ROOT` and `APP_URL`) |
| `node scripts/mutation-check.mjs` | Break the engine on purpose and confirm the tests catch it |

## Layout

```
src/domain/   Costing engine. Pure TypeScript, no React, no storage, no browser APIs.
src/db/       On-device storage (Dexie schema, repositories). No React, no formulas.
src/i18n/     Bahasa Melayu copy.
src/app/      UI shell, routes, pages.
src/license/  Licence code, offline token check, free-plan limits.
server/       Licence server (Cloudflare Worker + D1): payment, codes, devices.
```

The rule from Doc 03 applies everywhere: no screen implements its own profitability formula.
Every screen calls `src/domain`.

## Status

Phases 1 to 12 are done (foundation, costing engine, storage + Jejak Harga, master data screens, Kos Operasi + setup checklist, Menu / Resipi, Dashboard + Jejak Harga + Insights, Kesan Harga, Sandaran, Lesen, Laporan + release QA, then a feedback round: mandatory Kos Operasi, Elektrik Mudah vs Lebih Tepat, free-plan preview). The licence server is in `server/` (see `server/README.md`); it needs your Cloudflare, ToyyibPay and Brevo setup before it can sell. QA evidence: `docs/qa/`. Decisions: `DECISIONS.md`.
