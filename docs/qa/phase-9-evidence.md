# QA evidence: Phase 9 (Sandaran, offline hardening)

## Result

- 349 automated tests, 27 files, 0 failures. Typecheck clean. Production build with service worker succeeds.
- Tests for export, restore, refusal of bad files, atomicity and the reminder were committed before the code (commit "Phase 9 tests first (red)").
- Mutation check: **67 of 67 caught** (7 new: checksum not verified, references not checked, restore merging instead of replacing, newer format accepted, price-history guard left open, negative amounts accepted, reminder one day late). One older mutation pattern went stale because the guard code changed; it was updated and caught.
- A real defect was found by the tests: Dexie runs the delete guard on `clear()`, so the immutable price-history guard blocked every restore. Fixed with a narrowly scoped flag (D-56), and a test proves the guard is armed again afterwards.

## Acceptance evidence

| Requirement | Evidence |
| --- | --- |
| Backup is a complete, versioned file | backup.db.test.ts: envelope, all tables, checksum; browser: file downloaded with the expected name and structure |
| Restore into an empty device gives identical data and identical costs | Test compares costs, history, operating costs and tariffs; browser: a brand-new browser profile shows Nasi Lemak RM12.80 / −RM0.80 / −6.7% exactly as on the original |
| Restore replaces, never merges | Test with existing data on the target; browser: RM99 chicken price is replaced by the backed-up RM18 |
| Bad files are refused before anything changes | Tests: not JSON, truncated, other app, newer format, tampered data, missing table, bad row, broken reference, duplicate id/key. Browser: tampered, truncated and foreign files each show a plain-language reason and no preview |
| Restore is all-or-nothing | Test forces a failure mid-restore; the previous ingredients and history are unchanged |
| Works offline | Browser: on a fresh device with the network off, the file is chosen, previewed and restored |
| User is reminded to back up | Test of the rule; browser: reminder shown with data and no backup, gone after saving |
| Storage protection | The app requests persistent storage at startup; the Sandaran page shows the result and can re-request |

Browser checks ran with `scripts/e2e-phase9.mjs` (1280px for the original device, 390px for the new device, including the download and offline steps). Screenshots are in `docs/qa/phase-9/`.

## Not covered (needs the real phone, Phase 11)

- iPhone Safari: the share sheet / "Save to Files" path (D-57), whether persistent storage is granted, and how long Safari keeps data for a home-screen app.
- Large backups (hundreds of ingredients).
