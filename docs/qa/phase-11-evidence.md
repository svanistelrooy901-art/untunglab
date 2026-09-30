# Phase 11: release-gate evidence (Doc 06)

## 1. Traceability: every acceptance item to a test

**§2 Calculation** (`src/domain/__tests__/costing.test.ts`, `operating.test.ts`, `priceChange.test.ts`, `format.test.ts`)
| ID | Test |
|---|---|
| C01 | costing.test: "C01: RM25 / 5kg flour, recipe uses 250g = RM1.25" |
| C02 | costing.test: "C02 … RM2.50 labour per portion" |
| C03 / C04 | operating.test: "C03 … RM300/month workspace", "C04 … RM15/month" |
| C05 / C06 | costing.test; menuAssembly.test (through storage); "C05 still holds with a real tariff" |
| C07 / C08 | operating.test, costing.test |
| C09 | priceChange.test, priceHistory.db.test (package-only change, normalised +100%, package delta 0) |
| C10 | format.test: negative profit displays −RM0.44 |

**§3 Full-menu regression**: M01, M02, M03 (three cases), M04 in `costing.test.ts`; M01/M02 again through real storage in `menuAssembly.test.ts`; M04 for Dashboard in `insights.test.ts` and for Laporan in `report.test.ts`.

**§4 History** (`priceHistory.db.test.ts`): baseline on create; price-only, package-size-only, package-unit-only each append one; name-only appends none; backfill no-op with history, exactly one without, idempotent.

**§5 Kos Operasi** (`operating.test.ts`, `business.db.test.ts`, `settings.db.test.ts`, `operating.view.test.ts`, `menuAssembly.test.ts`): one final value per category; switching mode adds no rows and keeps detail; floor-area equals manual %; water = bill × %; **saved appliance reused by several recipes and wattage edit updates all of them (added in this phase)**; direct utility excluded from shared; missing/zero sales is an actionable incomplete state.

**§6 Scenario** (`scenario.test.ts`, `scenarioView.test.ts`, `e2e-phase8`): chips +5/+10/+20/+30 with no write; Reset writes nothing; Apply creates one `scenario_apply` history record; History Review read-only and exact previous→current; one engine for current and scenario.

**§7 UX** (`scripts/e2e-phase11-audit.mjs`, 67 checks): see section 2 below.

## 2. UX audit (Doc 06 §7), real browser, every route
- 390px: no horizontal overflow on Dashboard, Menu, Bahan, Pembungkusan, Peralatan, Kesan Harga, Jejak Harga, Kos Operasi, Laporan, Sandaran, Lesen, Lagi, menu detail, and the Bahan sheet. Also 320px (small phones) and 1280px.
- Tap targets ≥ 44×44px on all those screens (buttons, links, tabs, selects, summaries, inputs, checkbox labels). Two misses found and fixed: the Dashboard "Simpan sandaran" link (was 17px tall).
- No English UI words and no "Sedang dibina" placeholder on any route.
- Loss conveyed by words and value, not colour: "Menu Ini Rugi" badge with ✕ icon and "−RM0.44" on menu detail and Laporan.
- Tooltips by tap: `e2e-phase5` (tap opens the Nilai Masa tip with no hover).
- Advanced calculators optional: Kos Operasi "Mudah" path usable alone (`e2e-phase5`, `e2e-phase10` free plan).
- Screenshots: `docs/qa/phase-11/`.

## 3. Whole-suite results (this commit)
- 436 unit/integration tests pass; `tsc` app and server clean.
- Browser scripts all pass: smoke, phases 5, 6, 7, 8, 9, 10 (30 checks) and the Phase 11 audit (67 checks).
- Mutation check: earlier 81/81 + 5 new (CSV formula guard, minus sign, archived menus, cross-menu total, invented numbers for incomplete) = all caught.

## 4. Defects found and fixed in Phase 11
1. Laporan was a placeholder although it is in the core navigation (D-67).
2. Dashboard backup-reminder link was a 17px tap target.
3. No test existed for "one appliance reused by several recipes / wattage edit updates all". Added; it passed (no costs are stored, so it could not fail).

## 5. Not verifiable from here (needs a real device or your accounts)
See `docs/qa/manual-phone-checklist.md` and `DEPLOY.md` section D. In short: iPhone Safari install + share-sheet backup + storage eviction, Android Chrome install, real ToyyibPay/Brevo/Cloudflare flow, Vercel/Netlify header behaviour.

## 6. Release gate statement
No discrepancy between screens for the same menu was found: Dashboard, Menu detail, Kesan Harga and Laporan read the same engine result (tests M04, `insights.test`, `report.test`, `scenarioView.test`). Open items are device/account checks only, listed above.
