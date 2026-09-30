# QA evidence: Phase 5 (Kos Operasi, setup checklist, tooltips)

## Result

- 244 automated tests, 17 files, 0 failures. Typecheck clean. Production build with service worker succeeds.
- Tests were committed before the code (commit "test: phase 5 ... (red)").
- Mutation check: **35 of 35 caught** (8 new: zero sales accepted in storage and in the form, tariff rows piling up, future tariff treated as current, reset wiping the simple amount, broken rows hidden from allocation, workspace method flag ignored, a getter that writes inside a live query).
- The overview shown on the screen is built only from domain functions (`finalMonthlyAmount`, `sharedOperatingTotal`, `allocateOperating`), so it cannot disagree with the costing engine.

## Bug found by the browser check and fixed

The first browser run showed the setup page stuck on "Memuatkan…". Cause: a settings getter created the business record inside a live query, which is read-only. Fixed by making the getters read-only, and a regression test now runs them inside a read-only transaction (it failed before the fix).

## Doc 06 §5 and Doc 02 §6 to §9 traceability

| Requirement | Evidence |
| --- | --- |
| One final value per category, Mudah or Lebih Tepat | operating.view.test.ts; browser: Ruang Kerja RM300 from Lebih Tepat, Gas RM270 from Mudah |
| C03 RM2,000 x 15% = RM300 | operatingForms.test.ts; browser (p5-03) |
| C04 RM100 water x 30% = RM30 | operatingForms.test.ts; browser |
| C07 RM600 / RM6,000 = 10% | operating.view.test.ts; browser (p5-04: RM600.00 and 10.0%) |
| Missing or zero expected sales explains exactly what to enter, never zero overhead | operating.view.test.ts; browser (p5-02) |
| Floor-area method derives the percentage; % chips 10/15/20/25/Lain-lain | operatingForms.test.ts, operating.test.ts; browser |
| Return to Mudah keeps Lebih Tepat data; explicit reset only | settings.db.test.ts; browser ("Lebih Tepat data kept after Mudah") |
| One row per category, no duplicates | business.db.test.ts (Phase 3) and unique index |
| Elektrik warning against double counting; tariff in RM/kWh | browser (p5-05) |
| Tooltip opens on tap, not hover (Doc 04 §6) | browser |
| Data survives reload; works with the network off | browser |
| No console errors | browser |

Browser checks run with `scripts/e2e-phase5.mjs` at 390px, then 1280px. Screenshots are in `docs/qa/phase-5/`.

Not covered: real iPhone Safari (Phase 11), keyboard-only and screen-reader passes.
