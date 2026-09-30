# Phase 10 (Lesen) QA evidence

## Automated
- `npx vitest run`: 34 files, 427 tests pass (licence code/token/limits, licence storage, client, server API against fake ToyyibPay/Brevo, MemoryStore and D1Store against the same contract with real SQL).
- `tsc -b --noEmit` and `npm run typecheck:server`: clean.
- `scripts/e2e-phase10.mjs` (30 checks, mocked licence server signing real ECDSA tokens; app built with a throw-away key via `scripts/e2e-build.sh`): free limits on pembungkusan, bahan and menu (counter, disabled add, upgrade link, edit still allowed, restore blocked at limit), locked Kira Lebih Tepat tab, activation errors (unknown, revoked, two-device list, offline), successful activation, limits lifted, works offline after reload, token issued for another device rejected, over-limit data untouched, release returns to free, no console errors. Screenshots: `docs/qa/phase-10/`.
- Phases 5 and 6 e2e now activate Pro first (they use the detailed tab); smoke, 7, 8, 9 still pass on the free build.
- Mutations: full run 81/81 caught. The 14 new (free limit off-by-one, detailed tab for free, other-device token, unchecked signature, ambiguous code characters, callback hash skipped, payment not confirmed, amount not compared, third device, revoked activates, failures not counted, rate limit off-by-one, admin without token, double licence race) all caught. Two app-level mutations checked through the browser script (any token treated as pro; tab lock removed): both fail the e2e.

## Not verified here (needs you)
- Real ToyyibPay createBill / getBillTransactions / callback hash, Brevo sending, Cloudflare deploy: none reachable from this environment. See `server/README.md` step 6.
- Real-phone check of the Lesen screen and offline activation on iOS/Android (Phase 11).
