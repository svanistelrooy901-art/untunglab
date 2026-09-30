# Phase 12 evidence: feedback round from local testing

Source: your comments after running the app locally (electricity rule, Kos Operasi clarity, free-user preview, chart size).

## What changed (decisions D-70 to D-73)
1. **Kos Operasi is mandatory** (all six categories; RM0 via "Tiada kos ini"). Menus stay incomplete and name the missing ones.
2. **Appliance electricity follows the Elektrik mode.** Mudah: no appliance cost, no tariff asked, Peralatan hidden in the menu builder, no double count. Lebih Tepat: per recipe as before (C05 RM0.75).
3. **Free users can open Kira Lebih Tepat**, fields disabled, with upgrade link. An already-detailed row stays editable.
4. **Kos Operasi rows** have "+ Isi" / "Sunting" and ›, a clearer intro and live "n / 6" progress (items 1 to 3 only).
5. **Jejak Harga chart** capped at 320×136px.

## Tests (written first, red commit before implementation)
- 451 unit/integration tests pass (+15): `operatingRules.test.ts` (mandatory categories, RM0 counts, archived/direct rows count as filled, Mudah no double count, Mudah no tariff, Lebih Tepat tariff still required, hidden lines kept, section state), domain tests for `missingCategories`, `appliancesCounted`, the new issue and both gaps named together, entitlement `detailedOperatingAccess`.
- Existing fixtures now fill all six categories with explicit RM0 (`fillOperatingZeros`), so old expectations (M01 −RM0.44 etc.) are unchanged.
- Browser: `e2e-phase12.mjs` (20 checks, run twice for stability) covers the screens above. Phase 5, 6, 7, 8, 9, 10, smoke and the Phase 11 UX audit were updated for the new rules and pass (the audit still checks overflow and 44px targets on every screen).
- Mutations: 8 new (forgotten category read as zero, Mudah double count, archived Elektrik row, archived row as missing, sales gap hidden, detailed row stuck behind paywall, free edit of Lebih Tepat, builder shows appliances in Mudah) all caught. Full run: 93 of 93 valid mutations caught (one obsolete Phase 10 mutation, replaced by the new free-plan ones, was removed).

## Screenshots
`docs/qa/phase-12/`: blank Kos Operasi (six "+ Isi" rows), all filled, Jejak Harga desktop and mobile. `docs/qa/phase-10/p10-05-tab-pratonton.png`: the free-user preview.

## Behaviour changes to know about
- Existing menus that have appliance lines stop counting them when Elektrik is Mudah (their cost can drop). The builder note says why.
- Anyone with fewer than six Kos Operasi rows sees "Kos Operasi belum lengkap" on every menu until filled.
