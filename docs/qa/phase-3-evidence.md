# QA evidence: Phase 3 (on-device data layer + Jejak Harga)

## Result

- 145 automated tests, 12 files, 0 failures (`npm test`). Typecheck clean. Production build with service worker succeeds.
- Tests were committed before the repository code (commit "test: phase 3 ... (red)"); the suite failed, then went green.
- IndexedDB runs under `fake-indexeddb` in tests (`src/test-setup.ts`). Real-browser behaviour is confirmed in the Phase 11 device test.

## Doc 06 §4 traceability

| Requirement | Covered by |
| --- | --- |
| Baseline record on create | priceHistory.db.test.ts "creating an ingredient writes exactly one baseline record" |
| Price-only / package-size-only / package-unit-only append one record | same file, three tests |
| Multi-field update appends exactly one | "a multi-field update appends exactly one record" |
| Name-only and identical save append none | two tests |
| Old records unchanged after later edits | "records are snapshots" |
| Update and delete of history rejected | "immutability" (3 tests incl. unique seq) |
| Backfill: none when history exists; one record, idempotent otherwise | "backfill" (2 tests) |
| Comparison uses normalised unit cost (C09: +100%, package delta 0) | domain priceHistory.test.ts + db "package-size-only" |
| Ordering by date then seq, back-dated entries | db + domain tests |
| Atomicity (failed history write rolls back ingredient) | "atomicity" (2 tests) |
| One operating-cost row per category, mode switch keeps detail | business.db.test.ts (3 tests) |

## Mutation check

`node scripts/mutation-check.mjs`: **20 of 20 caught** (12 from Phase 2 + 8 new: name-only writes history, package size ignored, wrong ordering, no baseline, backfill not idempotent, immutability hook removed, duplicate category allowed, operating save creating a new row).

## Architecture guards

The db layer imports no React, router or Vite, no app/i18n code, and contains no profitability formula. Domain guards from Phase 2 still pass with the new `priceHistory.ts`.
