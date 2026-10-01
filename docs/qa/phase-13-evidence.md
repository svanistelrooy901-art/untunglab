# Phase 13 evidence: colourful Dashboard (D-75)

Built from the approved mock-up. Tests first (red commit), then implementation.

- Unit: `insights.test.ts` +8 (counts, plain mean, negative average, nothing complete gives null, incomplete and inactive menus excluded, best = top of ranking). 459 tests pass, `tsc` clean.
- Mutations: 3 new (average divisor, loss counted as profit, incomplete counted in the average), all caught.
- Browser: phase 7 gained 4 checks (hero −3.7% from 1 menu, tiles 0/1, hero wording for a loss, no "paling untung" for a losing menu). Phases 5 to 12 and the UX audit pass (audit: 69 checks, includes 320px, 390px and 1280px overflow and 44px tap targets). A 320px overflow caused by grid min-content was found by the audit and fixed.
- Screenshots: `docs/qa/phase-13/`.
- Layout: the Dashboard page is wider on large screens (two columns); form screens keep their narrow width.
