# QA evidence: Phase 7 (Dashboard, Jejak Harga, Insights)

## Result

- 312 automated tests, 24 files, 0 failures. Typecheck clean. Production build with service worker succeeds.
- Tests for the dashboard model, insights, Jejak Harga trails and the history reader were committed before their code (commit "Phase 7 tests first (red)").
- Mutation check: **54 of 54 caught** (10 new: closed alert ignored, alert key not tied to the price event, trend upside down, plus ranking order, drops never alerting, alert for unused ingredient, affected-menu count, Jejak Harga order, several loss menus linking to one menu, sign dropped from a movement).
- The Dashboard reads `computeAllMenus`, the same function as the Menu screens. It has no formula of its own.

## Doc 06 / Doc 02 traceability

| Requirement | Evidence |
| --- | --- |
| M04 Dashboard and Menu detail show exactly the same cost, profit, margin, status | insights.test.ts compares each ranked figure to the engine result with strict equality; browser: dashboard ranking and Menu list both show RM12.44 / −RM0.44 / −3.7% |
| Doc 02 §13 lead with actionable conditions | "Nasi Lemak sedang rugi" is the first item; browser p7-02 |
| Doc 02 §13 "Harga ayam naik 7.1%", "3 menu terjejas" | "Harga Ayam naik 7.0%" with "1 menu terjejas: Nasi Lemak" and cost per kg RM15.00 → RM16.05; p7-03 |
| Doc 02 §11 latest pack price and latest normalised unit cost | Jejak Harga card, p7-04 |
| Doc 02 §11 Perubahan and % on normalised unit cost | +RM1.050/kg (+7.0%) |
| Doc 02 §11 package-size-only change shows real movement | RM50.40 for 1 kg to RM50.40 for 0.9 kg shows +RM5.600/kg (+11.1%); unit test and browser |
| Doc 02 §11 history immutable, ordered by purchase date | Back-dated update sorts by date (unit test); records cannot be edited (Phase 3 tests) |
| Doc 04 §8 deep link to Kesan Harga / Menu detail | Insight links checked in browser; Kesan Harga itself is Phase 8 |
| Doc 03 never guess | Menus with missing setup are listed as "belum lengkap" with the first missing item named and are left out of the ranking |

Browser checks ran with `scripts/e2e-phase7.mjs` at 390px then 1280px, including reload and offline. Screenshots are in `docs/qa/phase-7/`.

Not covered: real iPhone Safari (Phase 11), screen-reader pass, many-menu performance.

## Follow-up after review

Alert threshold set to 10%, price alerts can be closed (and stay closed after reload; a new price change alerts again), and Jejak Harga cards have a trend graph (p7-04a-graf.png). Browser check now 18/18.
