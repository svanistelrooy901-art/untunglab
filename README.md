# UntungLab

F&B profit-intelligence PWA for Malaysian home-based and micro food businesses.
Bahasa Melayu first. Works offline. No login: data lives on the device.

Source of truth: the Master Handover Pack (docs 00 to 08). Where this repo departs from it,
the departure is recorded in [DECISIONS.md](./DECISIONS.md).

## Stack

Vite, React, TypeScript, Tailwind CSS v4, Vitest, vite-plugin-pwa (Workbox).
Later phases add Dexie (IndexedDB) for on-device storage.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm test` | Run the test suite (calculation domain first) |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Typecheck, then production build with service worker |
| `npm run preview` | Serve the production build locally |
| `npm run icons` | Regenerate placeholder PWA icons |

## Layout

```
src/domain/   Costing engine. Pure TypeScript, no React, no storage, no browser APIs.
src/i18n/     Bahasa Melayu copy.
src/app/      UI shell, routes, pages.
```

The rule from Doc 03 applies everywhere: no screen implements its own profitability formula.
Every screen calls `src/domain`.

## Status

Phase 1 (project foundation) and Phase 2 (costing engine) are in progress. See DECISIONS.md.
