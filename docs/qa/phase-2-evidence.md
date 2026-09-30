# QA evidence: Phase 2 (costing engine)

Measured against Doc 06. Domain scope only: no UI, no storage yet.

## Result

- 103 automated tests, 8 files, 0 failures (`npm test`).
- Typecheck clean (`npm run typecheck`). Production build with service worker succeeds (`npm run build`).
- Tests were committed before the engine (commit "test: phase 2 acceptance suite ... (red)"), then the engine made them pass.

## Doc 06 traceability

| Doc 06 | Covered by | File |
| --- | --- | --- |
| C01 | RM25 / 5kg, 250g = RM1.25 | costing.test.ts |
| C02 | RM25/h, 60 min, yield 10 = RM2.50 | costing.test.ts |
| C03 | RM2,000 x 15% = RM300 | operating.test.ts |
| C04 | RM50 x 30% = RM15 | operating.test.ts |
| C05 | 2000W x 45 min x RM0.50 = RM0.75 | costing.test.ts |
| C06 | 0.75 + 0.0625 + 0.125 = RM0.9375 per batch; RM0.046875 at yield 20 | costing.test.ts |
| C07 | RM600 / RM6,000 = 10% | operating.test.ts, costing.test.ts |
| C08 | RM25 x 10% = RM2.50 | operating.test.ts, costing.test.ts |
| C09 | RM60/2kg to RM60/1kg = +100%, package delta 0 | priceChange.test.ts |
| C10 | −0.44 displays −RM0.44 | format.test.ts |
| M01 | Nasi Lemak 12.44 / −0.44 / −3.7% / loss | costing.test.ts |
| M02 | Chicken Sandwich 10.20 / 4.80 / 32% / low | costing.test.ts |
| M03 | Live source beats stale cache; orphan fallback flagged; orphan without cache is incomplete | costing.test.ts |
| M04 | Dashboard summary equals menu detail | costing.test.ts |
| §5 Kos Operasi | One value per category, mode switch keeps data, no duplicate rows, floor-area equals manual %, water, direct vs shared, zero sales | operating.test.ts |
| §6 Scenario (engine part) | Chips +5/10/20/30 with no mutation (frozen inputs), same engine for current and scenario | scenario.test.ts |

Not yet coverable (needs later phases): Doc 06 §4 price-history records (storage), §6 Reset/Apply persistence, §7 UX, §8 release gate.

## Do the tests catch bugs? Mutation check

`node scripts/mutation-check.mjs` breaks the engine on purpose in 12 ways and confirms the suite fails each time.
Result: **12 of 12 caught.** Cases: stale cache beating live cost, packaging divided by yield twice,
missing sales read as zero overhead, price change on sticker price, dropped minus sign, Loss not overriding margin,
direct utilities still counted as shared, mode switch deleting advanced data, scenario mutating live data,
wrong labour divisor, silent unit conversion, inverted floor-area ratio.

## Architecture guards (tests)

The domain imports no React, router, Dexie or Vite, touches no browser or storage APIs,
does not import from the app layer, and uses `Math.abs` only in display formatting (Doc 03 §14).
