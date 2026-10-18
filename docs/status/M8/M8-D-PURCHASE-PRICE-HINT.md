# Purchase-history price hint — released

> Owner: `codex/local-notification-preview` in the isolated `m8d-single-lesson` worktree; released Main commit `e7a20c7421facc8f5c678f50eb8f44b406f675f9` on 2026-10-18.
> Scope: a narrow follow-up to the delivered M8-D single-lesson purchase-history flow. The M8-D release record remains frozen.

## Boundary and evidence

| Item                                                                 | State          | Evidence                                                                                                                                                           |
| -------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Add the setting location to the unpriced single-lesson purchase hint | Done locally   | Purchase list and editor now say `尚未設定學生課堂單價（學生基本資料）`; no new control or Student profile field.                                                  |
| Focused checks                                                       | Passed locally | `single-lesson-purchase.test.tsx`: 4/4. Affected preflight checked formatting, whitespace, Web typecheck and four related test files (16/16).                      |
| Reviewable preview                                                   | Ready          | `http://127.0.0.1:5173/students/c31f10a5-5bff-4c61-a7bc-b21298b5e77c` showed both updated hints on 2026-10-18. Web 5173 proxies the isolated Development API 3002. |
| Full CI and remote delivery                                          | Passed         | Product Owner requested `直接 deploy`. PR #43 CI #240 passed, then Main CI #241 deployed `e7a20c7` with all five jobs successful. No migration was applied.        |
| Independent Production read-back                                     | Passed         | `/api/ready`, `/` and `/login` returned 200 with HTML Accept for SPA routes. Served `/assets/index-BHyDTjo_.js` contains the exact new hint.                       |

## Completion boundary

The copy correction is released. No further action remains in this workstream. The primary dirty checkout and API 3000 were not changed.
