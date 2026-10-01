# Phase 14 (D-76 Cadangan Harga) evidence
- Unit: src/domain/__tests__/suggestPrice.test.ts (round-trip, closed form, infeasible, incomplete, invalid target). Full suite 466 passing.
- E2E: `PW_ROOT=$(npm root -g) APP_URL=http://localhost:4181/ node scripts/e2e-d76.mjs docs/qa/phase-14` (brownies case, Pro). Output: SUGGESTED {"20":"RM5.78","30":"RM6.78","40":"RM8.21","50":"RM10.40"}; applying 30% shows Margin 30.0%.
- Screenshots d76-*.png.
