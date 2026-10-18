# Purchase-history price hint — local review

> Owner: `codex/local-notification-preview` in the isolated `m8d-single-lesson` worktree; observed base `72f60ae` on 2026-10-18. Integration state: branch-local.
> Scope: a narrow follow-up to the delivered M8-D single-lesson purchase-history flow. The M8-D release record remains frozen.

## Boundary and evidence

| Item                                                                 | State                  | Evidence                                                                                                                                                           |
| -------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Add the setting location to the unpriced single-lesson purchase hint | Done locally           | Purchase list and editor now say `尚未設定學生課堂單價（學生基本資料）`; no new control or Student profile field.                                                  |
| Focused checks                                                       | Passed locally         | `single-lesson-purchase.test.tsx`: 4/4. Affected preflight checked formatting, whitespace, Web typecheck and four related test files (16/16).                      |
| Reviewable preview                                                   | Ready                  | `http://127.0.0.1:5173/students/c31f10a5-5bff-4c61-a7bc-b21298b5e77c` showed both updated hints on 2026-10-18. Web 5173 proxies the isolated Development API 3002. |
| Full CI and remote delivery                                          | Authorized, unverified | Product Owner requested `直接 deploy` on 2026-10-18. No migration or API change; PR checks and Main exact-SHA deployment remain to be verified.                    |

## One Next within this workstream

Commit only this copy correction and workstream record, push the isolated branch, merge after required PR checks, then verify Main exact-SHA CI and Production readiness. The primary dirty checkout and API 3000 remain untouched.
