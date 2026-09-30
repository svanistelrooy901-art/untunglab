# QA evidence: Phase 4 (Bahan, Pembungkusan, Peralatan Saya)

## Result

- 196 automated tests, 14 files, 0 failures. Typecheck clean. Production build with service worker succeeds.
- Repository and form-logic tests were committed before the code that satisfies them (commits marked "(red)").
- Mutation check: **27 of 27 caught** (7 new: wattage edit no longer confirms, custom equipment unconfirmed, preset overwrite, zero quantity accepted, thousands comma misread, tiny unit cost shown as RM0.00, pack-mapping change ignored).
- Screens are thin: every number comes from `src/domain` (unit cost = `normalisedUnitCost`, history = `historyChanges`). No formula lives in a page.

## Real browser check (Chromium, 390px phone viewport, then 1280px desktop)

`scripts/e2e-smoke.mjs`, run against the production build:

| Step | Result |
| --- | --- |
| Empty state teaches the next action ("Tambah bahan pertama anda") | pass |
| Saving an empty form shows per-field BM messages | pass (`02-bahan-ralat.png`) |
| RM60 / 2 kg previews RM30.00 / kg live | pass |
| Changing only the package size (2 kg to 1 kg) adds a history row: ▲ +100.0% naik | pass (`04-bahan-sejarah.png`) |
| Data survives a reload (IndexedDB) | pass |
| Packaging RM1 / 300 shows RM0.0033 / pcs | pass |
| Equipment: searchable presets, pre-filled 1,800 W, "Anggaran UntungLab" badge, "Guna nilai ini" confirms | pass (`06`, `08`) |
| Offline (network cut) reload, then data still shown | pass (`09-desktop-bahan-offline.png`) |
| Browser console errors | none |

Not covered: real iPhone Safari (Phase 11 device test), keyboard-only walkthrough, screen reader pass.
