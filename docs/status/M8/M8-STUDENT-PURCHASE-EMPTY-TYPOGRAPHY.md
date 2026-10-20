# Single Student purchase empty-state typography — delivery in progress

> Owner: `codex/student-purchase-empty-typography` in the managed `student-purchase-empty-typography` worktree; observed 2026-10-20 (Taipei).
> Base: `origin/main` `904fdbc` after final local rebase; integration: branch-local until merge.
> Scope: post-M8-D formal Web visual correction requested by the Product Owner. No Roadmap scope, domain contract, migration or payment change.

## Boundary and impact

- Outcome: on `/students/:id`, `尚無購課紀錄。` uses the same 13px color and line-height as `尚未建立固定課表。`.
- Changed presentation: only the empty purchase paragraph and its scoped CSS rule. The existing fixed-series CSS block, populated purchase rows and all other paragraphs remain as before.
- Representative cases: no purchases shows the corrected text; purchase-present still renders ledger rows; the unchanged fixed-series empty text is the visual peer.
- The Product Owner authorized direct deployment on 2026-10-20, including full verification and remote delivery. No database or payment mutation is needed.

## Inventory and evidence

| Item                                   | State                   | Evidence                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Locate mismatch and direct consumers   | Done                    | Purchase fallback inherited card paragraph size; fixed-series empty text had explicit 13px CSS.                                                                                                                                                                                                                                                           |
| Apply scoped correction                | Done                    | `student-purchase-empty` has its own 13px, `#646a60`, 1.55 line-height rule. The fixed-series rule remains intact.                                                                                                                                                                                                                                        |
| Focused verification                   | Done                    | Changed-file format, Web typecheck and related tests 16/16 passed. The first full Web suite caught a selector-shape assertion after moving the fixed-series declarations; restoring its original block fixed this.                                                                                                                                        |
| Desktop and 390px presentation         | Done for scoped preview | Playwright loaded a two-card preview using a copy of the actual Web stylesheet. At 1280px and 390px both empty messages computed to 13px, 20.15px line-height and `rgb(100, 106, 96)`; 390px document width equaled viewport width. Images are ignored local artifacts in `output/playwright/`. This does not prove the authenticated full Student route. |
| Local build and full gate              | Done                    | Root `npm run check` exited 0 after correction: engineering script tests 39/39, API tests 384/384, Web tests 428/428, format and typechecks passed. Root `npm run build` exited 0; Vite retained its existing large-chunk advisory. `git diff --check` passed.                                                                                            |
| Remote release and Production readback | Pending                 | Push scoped branch, open and merge PR after required checks, confirm exact Main SHA deployment/readiness, then inspect the real Student route.                                                                                                                                                                                                            |

## One Next within this workstream

Push the scoped branch and follow its exact-SHA PR/Main CI and Production deployment. After release, read back the real Student page; record any unavailable authenticated or installed-PWA evidence precisely. The Product Owner has already authorized deployment and needs no further action for this scope.
