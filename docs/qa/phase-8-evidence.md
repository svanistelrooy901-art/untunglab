# QA evidence: Phase 8 (Kesan Harga)

## Result

- 332 automated tests, 25 files, 0 failures. Typecheck clean. Production build with service worker succeeds.
- Tests were committed before the code (commit "Phase 8 tests first (red)").
- Mutation check: **60 of 60 caught** (6 new: preview price not rounded, history review ignoring the earlier version, wrong ordering, wrong comparison record, menus that do not use the ingredient, −100% accepted).
- Current and scenario states go through `computeMenuCost` via `compareIngredientVersions`. The screen has no formula.

## Doc 06 §6 traceability

| Requirement | Evidence |
| --- | --- |
| Quick +5/+10/+20/+30% chips calculate without a DB write | scenarioView.test.ts compares ingredients, history, insights and scenarios tables before and after; browser: after choosing +20%, Jejak Harga still has 1 record |
| Reset to Current restores live values with no write | Browser: Set semula clears the result and the fields; no DB call is made |
| Apply Changes creates price history and updates the ingredient | Test: exactly one `scenario_apply` record, and the live menu equals the preview. Browser: confirm sheet, one new Jejak Harga record, Menu list shows RM12.80 |
| History Review uses the exact previous/current transition and is read-only | Test: with three records, reviewing the middle one compares 15 → 18, not the latest price; back-dated records use purchase-date order. Browser: no Apply button and no chips in review mode |
| Current and scenario use the same engine | `compareIngredientVersions` calls `computeMenuCost` for both sides; nothing else computes cost |
| Doc 03 §11 package-size-only change shows real movement | Test: 0.9 kg pack at the same price moves menu cost and shows +11.1% unit cost |
| M01 chicken +20% | Nasi Lemak 12.44 → 12.80, profit −0.44 → −0.80, margin −3.7% → −6.7%: unit test and browser (p8-01) |

Also checked in the browser: typed price and percentage stay in step, an invalid percentage is named, a menu that flips status is counted, no horizontal overflow at 390px, works offline.

Not covered: real iPhone Safari (Phase 11), screen-reader pass.
