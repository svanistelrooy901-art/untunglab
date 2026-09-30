# QA evidence: Phase 6 (Menu / Resipi)

## Result

- 287 automated tests, 21 files, 0 failures. Typecheck clean. Production build with service worker succeeds.
- Storage and assembly tests were committed before their code (commit "test: phase 6 ... (red)"). The explain and form-parser tests were written together with their code.
- Mutation check: **44 of 44 caught** (9 new: missing Nilai Masa, tariff, packaging, equipment ignored or skipped; broken Kos Operasi row read as zero; line order lost; old rows left behind on update; wrong labour divisor in the explanation; zero yield accepted).
- Screens cost menus only through `computeAllMenus` / `computeMenuCost`. No screen has its own formula.

## Doc 06 traceability

| Doc 06 | Evidence |
| --- | --- |
| M01 Nasi Lemak 12.44 / −0.44 / −3.7% / Menu Ini Rugi | menuAssembly.test.ts from stored rows; browser (p6-03, p6-04) through the real screens |
| M02 Chicken Sandwich 10.20 / 4.80 / 32% / Margin Rendah | menuAssembly.test.ts from stored rows |
| M03 live source beats stale value | No cost is stored on any menu row. Test changes an ingredient price and the menu follows; browser: Ayam RM15 to RM30 moves the menu from RM12.44 to RM14.24 |
| M04 list and detail agree | Both read `computeAllMenus`; the editor's live result uses the same assembler and engine |
| C05 oven 2000 W x 45 min x RM0.50 = RM0.75 | menuAssembly.test.ts, menuExplain.test.ts; browser (p6-06 shows RM0.7500) |
| Doc 02 §10 menu asks only menu data | Editor has name, yield, time, price, ingredients, packaging, equipment; no rent, water bill, hourly rate or sales |
| Doc 02 §10 breakdown expandable | Bahan, Pembungkusan, Masa, Utiliti Pengeluaran, Kos Operasi Bersama each open to line workings |
| Doc 04 §7 result order Kos Sebenar, Harga Jual, Anggaran Untung, Margin, status | Result card; negative profit shows −RM0.44 with the ✕ icon and label, not colour alone |
| Doc 04 §9 errors name the missing input | Browser (p6-02): "Isi Nilai Masa di Kos Operasi" and "Isi Anggaran Jualan Bulanan di Kos Operasi", each with a link |

Elektrik tab (promised in Phase 5 review): lists saved appliances with cost per hour at the saved tariff (Oven 2,000 W = RM1.00 an hour at RM0.50), with a note that the real cost is worked out in each menu (p6-05).

Browser checks ran with `scripts/e2e-phase6.mjs` at 390px then 1280px, including reload and offline. Screenshots are in `docs/qa/phase-6/`. The full-page screenshots show the pinned summary in the middle of the page; that is a screenshot artefact, not a layout bug.

Not covered: real iPhone Safari (Phase 11), keyboard-only and screen-reader passes, very large menus (dozens of lines).
