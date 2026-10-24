# Gym Assistant project status

> Integrated Main router, reconciled 2026-10-24 against deployed application commit
> `5ad0d3171174503635ce0e9e9729d9bf56ca7189` and the adjacent-lesson release.
> Main code and confirmed Production deployment are recorded separately below.

## Training Coach-note save correction deployed (2026-10-24)

After the Product Owner accepted the reviewed version and authorized verification, merge and deployment, [PR #110](https://github.com/YambossMaster/Gym-Assistent/pull/110) corrected the mobile note editor so native contenteditable children and final Chinese composition text are included in autosave; the share action now says `建立連結`. PR head `4af28e7` passed [CI #396](https://github.com/YambossMaster/Gym-Assistent/actions/runs/40082901351). Main `3881657d78ebc14ffceb2e06e61caf68e2aa2414` passed all five [CI #397](https://github.com/YambossMaster/Gym-Assistent/actions/runs/40083177009) jobs and deployed with no migration to Fly release 82. The running image `GH_SHA` matches Main, its service check passes, and independent `/api/ready`, `/`, `/login` returned 200. Installed-iPhone group-note save and reopen remains unverified; the previously missing text was absent from accepted Production saves and was not recovered. [Release record](status/TRAINING-NOTE-SAVE-CORRECTION.md).

## Training adjacent lessons deployed (2026-10-24)

After Product Owner approval of the 5173/5174 design and deployment, [PR #108](https://github.com/YambossMaster/Gym-Assistent/pull/108) added same-owner `前次課堂`/`下次課堂` navigation, adjacent data prefetch and one consistent save-aware transition. PR head `12fe45f` passed [PR CI #392](https://github.com/YambossMaster/Gym-Assistent/actions/runs/40080457816); Main `5ad0d3171174503635ce0e9e9729d9bf56ca7189` passed all five [Main CI #393](https://github.com/YambossMaster/Gym-Assistent/actions/runs/40080700092) jobs and deployed to Fly release 81 with no migration. The running image `GH_SHA` matches Main, its service check passes, and independent `/api/ready`, `/`, `/login` returned 200. The public JS contains both control labels. Authenticated local desktop/mobile-preview switching passed; installed-iPhone PWA and Production lesson-to-lesson interaction remain unverified. [Release record](status/TRAINING-ADJACENT-SESSIONS.md).

## Training result sharing correction deployed (2026-10-24)

After Product Owner UI review and deployment authorization, [PR #106](https://github.com/YambossMaster/Gym-Assistent/pull/106) corrected the public Coach name, group attendance/student identity on the share page and image, compact set rows, and empty-note sharing. The existing image download flow remains. The PR head `f4193dd` passed [PR CI #388](https://github.com/YambossMaster/Gym-Assistent/actions/runs/40073488909); Main `eaac9bf7244d439e7f1336d8eafdacabaf4844f3` passed all five [Main CI #389](https://github.com/YambossMaster/Gym-Assistent/actions/runs/40073769325) jobs and deployed to Fly release 80 with no new migration. Running image `GH_SHA` matches Main, service check passes, and independent `/api/ready`, `/`, `/login` returned 200. The served JS contains the new note message; an invalid public token returned 404 with no-cache/referrer protection. Valid-link live database round-trip and installed-iPhone visual acceptance remain unverified; the original missing note text was absent from the saved record and was not recovered. [Release evidence and scope](status/TRAINING-RESULT-SHARE-CORRECTION.md).

## M11 已依 Product Owner 決定以現況結束（2026-10-24）

Product Owner 確認目前已部署版本可以使用，接受輸入體驗仍不理想，決定停止 M11 修正與重測。release 79 的工程／部署證據保持有效；安裝手機 PWA 的完整群組流程及該版 P04 完成輸入驗收未證實通過，偶發滑動／偏移列為已知限制。這是接受現況的閉案決定，不是宣稱 Bug 已根治。下方 2026-10-23 的「Next」及第 82 行舊交接為歷史紀錄，現已無 M11 待辦；詳見 [M11 Status](status/STUDENT-GROUP.md) 與 [輸入問題紀錄](status/M11-PWA-INPUT-CORRECTION.md)。

Product Owner最新三段12:58–13:03影片：release78選取與操作列位置目前正常，但完成偶發滑動。已重現三類缺口：dock按下／原生blur空窗失去位置保護；非同步fixed origin與offset相加製造移動原點；高度已恢復就提前結束觀測，漏掉晚回復的原點。分別補上手勢守位、session座標系辨識與原點穩定判斷；Next仍使用原定位策略，手動滑動仍可接手，原時間常數／CSS／尾部空間不變。

[PR103](https://github.com/YambossMaster/Gym-Assistent/pull/103) head `971676b`／[PR CI382](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39907902340)成功；合併應用Main `a1d614204cc72234cbba284bb91c33524bbc0503`與已測Web一致，[Main CI383](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39908866519)五jobs全成功。Fly79 complete，同SHA started／service passing，三入口200，公開與origin資產一致。最終affected8檔138測試通過；兩引擎各36新完成矩陣0px、9原點、36循環、108壓力、36競態與清理通過；24格式／189欄與完整歷史／同伴清單通過。新12案先紅再綠；候選離屏Next回歸也在發布前攔下修正，全部最終批次阻擋pageerror。

**六項工程／交付完成，手機驗收仍開放。** [唯一清單](status/M11-PWA-INPUT-CORRECTION.md)保留release78選取正面回報及P04完成失敗；合成viewport不能代替原生驗收。Next：多工關閉再開PWA，對比app／原生完成、先手動滑動、完成後第二動作，並保護選取／Next。不要清資料。buildId `local-1792735460451`，入口 `/assets/index-CTL9HJg9.js`。沒有API／schema／Auth／依賴／部署設定變更。

## Released baseline

| Area         | Integrated fact                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M8-D         | **Done by Product Owner acceptance on 2026-10-18.** Single-lesson scheduling and purchase-history corrections are included. No M8-D implementation or acceptance item is an M8-E prerequisite.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Main code    | PR #35 merged as `8090bf80`; PR #37 as `aaa5a929`; purchase-history documentation PR #38 as `9176956`; mobile Settings action PR #39 as `d54658b`; release documentation PR #40 as `1965d33`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Migration    | Production release applied M8-D versions `20261017105438` and `20261017110659`. Later purchase-history and mobile Settings releases had no new migration; Production preview reports none pending.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Verification | PR #37 corrected PR CI and Main CI #39058008147 passed for `aaa5a929`. PR #39 required checks passed; [Main CI #232](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39066095770) deployed `d54658b` with readiness. Independent `/api/ready`, `/` and `/login` returned HTTP 200; served CSS contained the corrected mobile selector. Installed-PWA visual recheck remains unverified.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Beta ops     | Latest Main Status recorded 0 real Coaches, 3 test accounts and two unused Beta codes. This is a historical snapshot, not a fresh Production count.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Payment      | M8-E Live worker TLS repair [PR #58](https://github.com/YambossMaster/Gym-Assistent/pull/58) deployed as d3e215b; [Main CI #274](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39142971519) passed. Documentation [PR #59](https://github.com/YambossMaster/Gym-Assistent/pull/59) merged as 66caf69 and [Main CI #276](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39144603411) passed with deployment skipped. The isolated Live Pro annual trial has one confirmed intent, owner-bound subscription 2617697, paid TWD 0 invoice 8757694 and verified trial period. Lemon, Production ledger and Coach page confirm renewal cancelled with original 2026-11-18 end. The original webhook TLS failure was repaired and signed events reconciled. Natural paid collection remains R09; no second transaction is needed for cancellation. |

M8-E acceptance corrections [PR #61](https://github.com/YambossMaster/Gym-Assistent/pull/61) merged
as `a12e5a5`; [Main CI #280](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39236640713)
passed verify, browser UI, migration checks, Production preview and Fly deployment. Fly's running
image label matches the Main SHA; readiness and independent `/api/ready`, `/`, `/login`, `/plans`
readbacks returned 200. The released payment notice shows the approved wording and one-month trial,
without a discount-code section. No new migration or Live transaction was made for this correction.

The paid Plans cards now show the PO-accepted first-subscription trial ribbon. [PR #73](https://github.com/YambossMaster/Gym-Assistent/pull/73) merged as Main `83d81dc`; [Main CI #315](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39485301501) passed verify, browser UI, migration checks, Production preview and Fly deployment. Independent `/api/ready`, `/`, `/login`, `/plans`, and public config returned 200; the served JS contains the new ribbon text. No billing rule, migration, or Live transaction changed. The [M8-E workstream](status/M8/M8-E.md) records the local screenshots, conditional-offer limitation and release evidence.

The Google login button now requests Google's account chooser on every click. [PR #75](https://github.com/YambossMaster/Gym-Assistent/pull/75) merged as `e46c686`; [Main CI #320](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39578842261) passed all five jobs and deployed the same SHA to Fly release 64. The running image label matches Main; independent `/api/ready`, `/` and `/login` returned HTTP 200, and served JavaScript contains `select_account`. Actual A-to-B Workspace switching remains unverified without two Development Google test accounts. See the [Auth correction record](status/AUTH-GOOGLE-ACCOUNT-CHOOSER.md).

M8-E abandoned-checkout recovery [PR #66](https://github.com/YambossMaster/Gym-Assistent/pull/66)
merged as `dae474fae96b3d6f08f6726b55e2ae69ad1c62cd`.
[Main CI #292](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39406922712)
passed verify, browser UI, Development migration dry-run and Production preview; only
`20261019111117_billing_abandoned_checkout.sql` was pending. Authorized
[Production release #12](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39407408898)
re-previewed and applied that migration, then deployed the same SHA. Production migration history,
status constraint, unresolved-intent index, owner inbox policy and restricted API column grants were
read back. Fly image label `GH_SHA` matches Main, service check passes, and independent `/api/ready`,
`/`, `/login` return HTTP 200; `billingLiveEnabled:true` remains. The
[checkout recovery record](status/M8/M8-E-CHECKOUT-RECOVERY.md) holds test evidence and limitations.
R09's isolated Test Mode daily renewal invoice became paid on 2026-10-19; its missed webhook,
owner-bound recovery and paid-after-cancellation correction are recorded in the M8-E workstream.
R09 remains partial: the recovery completed after the paid period ended, so in-period Coach access,
the original one-month trial first charge and Live positive collection remain unverified.
The correction was merged through [PR #68](https://github.com/YambossMaster/Gym-Assistent/pull/68)
as Main `00dff7f`; [Main CI #296](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39432337018)
passed and deployed the same SHA to Fly release 61 with passing service check. There was no new
migration; independent `/api/ready`, `/` and `/login` returned HTTP 200.

The latest M8-D copy follow-up is [PR #43](https://github.com/YambossMaster/Gym-Assistent/pull/43),
merged as `e7a20c7`. [Main CI #241](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39113661473)
passed all required jobs and deployed the same commit. Production returned HTTP 200 for
`/api/ready`, `/` and `/login`; its served JavaScript includes the revised unpriced purchase hint.
No migration was added. See the [frozen follow-up record](status/M8/M8-D-PURCHASE-PRICE-HINT.md).

The Product Owner closed the remaining M8-D package reservations. Historical limitations and
operational observations in [M8-D Status](status/M8/M8-D.md) are evidence, not an open M8-D Next.
The frozen single-lesson Contract describes the delivered change; its old local preview is not a
separate task.

The single-Student purchase empty-text correction [PR #70](https://github.com/YambossMaster/Gym-Assistent/pull/70)
merged as `d946b0e`; [Main CI #300](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39440052242)
passed required checks, Production preview and Fly deployment from the same SHA. Independent
`/api/ready`, `/` and `/login` returned 200. After refresh, the authenticated synthetic Student
page showed both empty messages at 13px with matching color and line-height. The
[release record](status/M8/M8-STUDENT-PURCHASE-EMPTY-TYPOGRAPHY.md) holds the scoped evidence and
remaining device limitation. No migration or payment change was made.

## Active workstreams

The Product Owner rejected release 70's remaining keyboard dock flicker, displacement and covered fields. PR #88 gives mobile numeric editing one internal scroll owner, keeps the dock through transient blur, positions it at the current visual viewport edge, and advances within the actual touch-release gesture. [PR #88](https://github.com/YambossMaster/Gym-Assistent/pull/88) head `fd07655764242e284fab1c07c247c23199250a43` passed [PR CI #349](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39748140843) verify/build, browser UI and migration dry-run. It merged as Main `9447eb72c0968610a360dddfe978053cb3429630`; [Main CI #350](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39748630058) passed all five jobs. Production preview found no pending migration. Fly release 71 runs the exact matching `GH_SHA` with passing readiness/service check. Independent `/api/ready`, `/` and `/login` returned HTTP 200. Local affected checks passed 80 tests; actual WebKit touch replay checked 72 exact field targets, 48 same-row transitions without scrolling, dock DOM continuity, real hit targets and free manual scrolling. **Installed-iPhone keyboard acceptance remains open** in the [correction workstream](status/M11-PWA-INPUT-CORRECTION.md).

The Product Owner rejected release 69's keyboard gap and input jumps. [PR #86](https://github.com/YambossMaster/Gym-Assistent/pull/86) corrected keyboard-session geometry and reveals a covered next field before focus, with no delayed same-row recentering. It merged as Main `1a5de19f3cc72d25e4ee05431f6fbca1b60dacdc`; [Main CI #346](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39740002135) passed all five jobs and deployed the exact SHA to Fly release 70. Running image `GH_SHA` matches, service check passes, and independent `/api/ready`, `/` and `/login` returned 200. Local affected checks passed 73 tests; actual Workspace/CSS WebKit replay passed 72 fields across single and both group views, including 48 same-row advances without page scroll. **Physical installed-iPhone keyboard acceptance remains open** in the [correction workstream](status/M11-PWA-INPUT-CORRECTION.md).

M11 Student Groups [PR #72](https://github.com/YambossMaster/Gym-Assistent/pull/72) merged as Main `2f1fb24`; [Main CI #325](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39648245349) passed verify, browser UI, Development dry-run and Production preview. [Production backup #25](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39648461248) passed isolated restore. [Production release #13](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39649133820) applied all four M11 migrations and deployed that exact SHA to Fly release 65. Supabase migration history and Fly image were read back; `/api/ready`, `/` and `/login` returned 200. Product Owner approved the browser preview and mobile layout; **installed mobile PWA acceptance remains open**. The [M11 workstream](status/STUDENT-GROUP.md) owns its exact handoff and limitations.

The installed-PWA input and member-picker correction [PR #78](https://github.com/YambossMaster/Gym-Assistent/pull/78) merged as Main `4028d377`; [Main CI #329](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39720697116) passed all five jobs and deployed that exact SHA to Fly release 66 with no pending migration. Running image `GH_SHA` matches Main; independent `/api/ready`, `/` and `/login` returned 200. The Product Owner accepted the revised picker before deployment and passed group create/edit on the installed PWA; training input alignment needed a follow-up.

The Product Owner passed group create/edit on the installed PWA but reported drifting training input alignment. [PR #80](https://github.com/YambossMaster/Gym-Assistent/pull/80) corrected visual-viewport positioning and merged as Main `13b492d`; [Main CI #334](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39724604357) passed all five jobs, including no-pending Production preview and exact-SHA Fly deployment to release 67. The running image and passing service check match Main; independent `/api/ready`, `/` and `/login` returned 200. **Single/group training keyboard alignment awaits the Product Owner's installed-iPhone PWA recheck**; see the [correction workstream](status/M11-PWA-INPUT-CORRECTION.md).

The next installed-iPhone recording showed the release 67 dock sometimes under the keyboard's native toolbar and page jitter during manual scrolling. [PR #82](https://github.com/YambossMaster/Gym-Assistent/pull/82) separated keyboard-edge positioning from a one-time visibility check per focused input and merged as Main `c10627d39e54b8db796cfb7a77eaa6cba6df0528`. [Main CI #338](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39727865977) passed all five jobs and deployed the exact SHA to Fly release 68 with a passing service check. Independent `/api/ready`, `/` and `/login` returned 200. **Physical single/group keyboard behavior still awaits installed-iPhone PWA acceptance**; see the [correction workstream](status/M11-PWA-INPUT-CORRECTION.md).

The Product Owner's 13:53 installed-iPhone recordings showed inconsistent first-focus alignment and lower set inputs obscured at release 68. [PR #84](https://github.com/YambossMaster/Gym-Assistent/pull/84) gave each focus a stable resting position and reserved enough mobile document scroll space for the iOS keyboard; it merged as Main `e1dd82d5073ac855378353dbf7b7a6d3b67a2ea2`. [Main CI #342](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39732993907) passed all five jobs and deployed the exact SHA to Fly release 69. Running image `GH_SHA` matches Main, service check passes, and independent `/api/ready`, `/` and `/login` returned 200. **Installed-iPhone single/group keyboard acceptance remains open**; see the [correction workstream](status/M11-PWA-INPUT-CORRECTION.md).

| Workstream   | Owns                                                                         | State and entry                                                                                                                                                                                                                               |
| ------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M8-E payment | R01–R17 checkout, entitlement, Live/Test isolation, backup and release gates | [M8-E workstream](status/M8/M8-E.md). Fifteen items passed and released, R08 conditionally closed; R09's Test Mode daily renewal was paid and recovered after expiry, with in-period access and original trial first charge still unverified. |

The separate [mobile PWA bottom-navigation correction](status/M8/M8-MOBILE-PWA-DOCK.md) merged as
PR #47 / `d4b9a49`. [Main CI](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39121728371)
passed and deployed the same commit with readiness; public CSS contains the fix. The Product Owner
tested the installed iPhone PWA, provided the 19:18 recording, and accepted the correction as fixed.
The cross-cutting release check is now routed from `AGENTS.md`.

The [mobile PWA Coach Note and Help correction](status/M8/M8-MOBILE-PWA-NOTES-HELP.md) merged as PR #52 / `26c9cca6`. [Main CI #262](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39128029725) passed and deployed the same commit with readiness. Public API and HTML routes, plus new guide images, returned HTTP 200. The Product Owner confirmed the installed mobile PWA looked correct after deployment; this correction is accepted.

This router records integrated facts and points to workstreams. It does not assign a global Next
across parallel branches. Select the user-requested workstream first; then read that workstream's
Status and the applicable Roadmap and Contract. A predecessor is background unless the chosen
workstream explicitly names an unmet dependency.

## M8-E boundary at this snapshot

PR #45 released the payment schema with billing closed; PR #46 fixed the isolated CSV restore.
The [encrypted Production backup and isolated restore](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39121153840)
passed with the payment schema and synthetic paid round-trip. PR #51's Test Mode missed-event
recovery fix merged as `206e115`; [Main CI #260](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39126354923)
passed exact-SHA verification, Fly deployment and readiness. At that historical checkpoint, public
config reported `billingLiveEnabled:false`; the current Live release is recorded above.

The workstream has fifteen R items passed (R01–R07, R10–R17) and R08 conditionally closed.
The PO accepted the final 390px R14 flow, and the exact-SHA release above is deployed. R09 remains
the approved natural-event follow-up; do not create a new transaction merely to close it. The
original Production Coach Live trial has a verified subscription, NT$0 paid invoice, trial period,
confirmed intent and cancelled renewal. Lemon, Production ledger and Coach page agree on the
original 2026-11-18 end. See [M8-E Status](status/M8/M8-E.md).

## Handoff rule

Before acting, record the current branch, HEAD, worktree changes and intended workstream. If the
checkout differs from Main or another workstream, its Status is branch-local evidence. Continue only
the selected workstream. Integrate a completed branch through its own review, CI and release gates;
then update this router once from the integration checkout.

See [Status protocol](status/README.md), [Roadmap](ROADMAP.md) and the selected workstream Status.
