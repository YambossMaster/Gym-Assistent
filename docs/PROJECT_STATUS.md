# Gym Assistant project status

> Last verified: 2026-09-11 (Asia/Taipei)

本文件是跨對話的精簡工程交接紀錄。它只回答四個問題：目前在哪裡、已完成什麼、卡在哪裡、
下一個人先做什麼。工程順序與完成條件完全依照 [`ROADMAP.md`](ROADMAP.md)；本文件不得建立
額外路線、改寫里程碑，或把對話中的臨時想法升格成工程範圍。

## Start here

新對話開始正式工程或回答進度問題時：

1. 讀根目錄 `AGENTS.md`、`README.md`、本文件與 `ROADMAP.md`。
2. 執行 `git status --short`；本文件可能落後，工作樹是當前事實。
3. 對照 Active milestone、Next handoff 與相關 Architecture／ADR／Demo 規格。
4. 檢查前一項工作的驗證證據；不要重做已完成且證據仍有效的工作。
5. 開始修改前，用一句話說明本次接手範圍及不會碰的相鄰範圍。

## Current snapshot

| Field                  | Current value                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| Active milestone       | **M3 — Student & Lesson entitlement**                                                               |
| Milestone state        | **Done**                                                                                            |
| Current branch         | `main`，M2 commit `cdfee3f` 已推送至 `origin/main`，CI #2／#3 成功                                  |
| Development database   | Supabase project `Gym Assistant`, region `ap-northeast-2`, PostgreSQL 17                            |
| Remote migration       | `20260910103000_student_lesson_entitlement`、`20260910125414_lesson_purchase_manual_income` applied |
| Formal applications    | `apps/api`, `apps/web`                                                                              |
| Archived prototype     | independent `demo/`, storage key `form-coach-mvp-v1`                                                |
| Production data status | **No production environment; do not store real customer data**                                      |

## Next handoff

**M3 Student／Lesson entitlement 已完成。**

1. 開始 M4 前讀取 Demo 排程不變量與 M3 的 `course_session` 最小 seam；不得提前建立 M5／M6 資料模型。

## Milestone status

| Milestone                        | State       | Evidence / remaining work                                                                                                                                                                                         |
| -------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0 Repository & product contract | Done        | Demo 已獨立歸檔，CONTEXT/Architecture/ADR/Roadmap 已建立；root 與 Demo checks/build 通過並形成乾淨 baseline                                                                                                       |
| M1 Cloud foundation tracer       | Done        | migration、API、Web/Auth、runtime login、雙 Coach live E2E、remote dry-run 與 CI 已完成；有使用者接受的 development credential exposure 例外（M8 前仍須輪替）                                                     |
| M2 Coach account operations      | Done        | 公開註冊／六位 OTP、Google same-email linking、recovery 完整重設與重新登入、local/global logout、settings、14 日排程/取消／立即刪除與 365 天直接刪除均已完成；daily cron／Vault／Edge Function 以隔離資料真實驗收 |
| M3 Student & Lesson entitlement  | Done        | private Student detail/edit/archive/delete、Lesson Purchase／derived balance、manual-income record/summary、two-Coach live E2E、Demo preview/checksum、desktop 與 390px 實測、remote CI #5 均完成                 |
| M4 Scheduling                    | Not started | 以 Demo 不變量為規格來源                                                                                                                                                                                          |
| M5 Training                      | Not started | 以 completed-set gate 與 autosave 規則為規格來源                                                                                                                                                                  |
| M6 Public capability links       | Not started | 後端 token/hash/redemption 尚未建立                                                                                                                                                                               |
| M7 Local resilience & migration  | Not started | 正式 IndexedDB 與 Demo import 尚未建立                                                                                                                                                                            |
| M8 Deployment & Beta readiness   | Not started | staging/production、hosting、CI、observability、restore drill 尚未建立                                                                                                                                            |
| M9 Post-V1 options               | Deferred    | 不得提前侵入 V1 核心                                                                                                                                                                                              |

## Verified baseline

| Area              | Verified fact                                                                                                                                                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository        | `demo/` 獨立保存 prototype；CONTEXT、Architecture 與 ADR 0001/0002 已建立                                                                                                                                                                          |
| Supabase          | CLI `2.116.0` linked；remote migration `20260910073809_schedule_direct_inactivity_deletion` 已套用                                                                                                                                                 |
| Database security | `app_private.workspace/student` 已部署；runtime LOGIN 僅繼承 `gym_assistant_api`，無 `auth`／DB create 權限                                                                                                                                        |
| Advisors          | Security 0 errors；有 1 個 Auth leaked-password-protection warning。Performance 僅兩個新 lifecycle 索引的 unused info                                                                                                                              |
| API               | Student list/create、Workspace derivation/settings、account deletion request/cancel/immediate、公開 registration-email check、JWKS 驗證；6 files/17 tests 通過                                                                                     |
| Web/PWA           | 自助註冊（既有帳號提示與 12 秒 timeout、6 位 OTP）、登入頁 password recovery、local/global logout、Google entry、Workspace settings、account deletion、Student list/create、PWA shell；3 files/16 tests 通過                                       |
| UI                | 2026-09-09：1440px 與 390px 註冊／登入入口實測；390px 無水平 overflow                                                                                                                                                                              |
| CI                | CI #2／#3 成功：M2 commit `cdfee3f` 與 delivery-record commit `e19c255` 的 verify（API 17、Web 16 tests）與 remote migration-dry-run 均通過                                                                                                        |
| Live E2E          | 2026-09-09 實測通過雙 Coach Auth、401、Workspace 拒絕、Student reload 與 tenant isolation；2026-09-10 新隔離帳號完成 SMTP 投遞、6 位 OTP、Workspace bootstrap、Email/password re-login、recovery delivery、global logout、14 日倒數/取消及永久刪除 |
| Secrets           | API/Web local env ignored；runtime／Auth admin key 未進 repository，但本次貼入對話的值待輪替                                                                                                                                                       |

## Open issues and risks

| Priority | Issue                                        | Required handling                                                                                                           |
| -------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Accepted | M1 development credential exposure           | 使用者核准 M1 完成例外；值不在 Git／public payload，M8 前仍必須全量輪替                                                     |
| P1       | 只有 development Supabase project            | M8 前建立隔離 staging/production；目前不得放真實客戶資料                                                                    |
| P2       | Supabase connector tools 可能不隨 task 載入  | 先檢查 connector；缺少時用已 linked CLI，不索取 access token                                                                |
| P2       | Full schema dump 需要本機 Docker             | 非 M1 blocker；只有 local stack 成為需求時才評估安裝                                                                        |
| P2       | Supabase leaked-password protection disabled | 啟用前須先確認 HaveIBeenPwned network/privacy tradeoff；Security Advisor 目前回報 1 warning                                 |
| Accepted | Development credential exposure              | CLI key metadata 意外輸出 legacy key values；使用者既有 M1 例外仍適用，但 M8 前必須全量輪替，且不得再揭露或複製任何 key     |
| Planned  | Email sub-addressing abuse protection        | 使用者已核准在 M8 加入 provider-aware canonicalization、rate limit 與 CAPTCHA 的整合驗收；開發期可使用受控 alias 做隔離測試 |

## Validation commands

在 repository root：

```bash
npm run check
npm run build
npm run db:push:dry
```

Demo 有獨立 completion gate，從 `demo/` 執行：

```bash
npm run check
npm run build
```

遠端 schema 變更另需 migration history、schema lint 與 Supabase Security/Performance Advisors。

## Handoff update protocol

每次工程對話若修改 code、schema、config、架構文件，或解決／發現 blocker，結束前必須：

1. 先對照 Roadmap 的 active milestone；進度、下一步與完成判定只能引用既有 milestone 內容。
2. **以完整工作包交付**：同一 milestone 中沒有未決產品決策、共享 interface／migration 序列化衝突
   或外部權限 blocker 的相容工作，必須在同一工程回合合併完成（implementation、測試、文件與
   相稱 verification）。不得只為了留下日誌而任意切成微小步驟。
3. 工作包的邊界以可驗收結果為準，而不是單一檔案或單一命令；只有遇到 Roadmap decision gate、
   外部帳號／憑證操作、需要使用者確認的不可逆影響，或既定序列化邊界時，才能把未完成項留給
   Next handoff，並須具體寫出 blocker 與可執行的恢復動作。
4. 更新 Last verified、Current snapshot、Next handoff、Milestone status 與 Open issues 的實際狀態。
5. 在下方 Engineering log 最上方新增一筆；每個完成或實質推進的工作包一筆，不以無實質結果的
   例行檢查拆分日誌。
6. 保留舊日誌的事實、決策與驗證結果。文件過長時，可把較舊的連續記錄濃縮成一筆期間摘要，
   但必須保留日期範圍、工作範圍、實際結果、關鍵驗證、決策及仍有效的問題；不得改寫結果、
   補造未執行的驗證或移除尚未解決的風險。
7. 問題解決後，從 Open issues 移除並在最新日誌記錄解法；舊日誌中重複的問題敘述可在壓縮時
   刪減，但原始問題曾發生及其解決結果必須仍可追溯。
8. 維持精簡：不要複製 Roadmap、Architecture、程式碼清單或完整命令輸出；改用精確連結、測試
   數量、結論與第一個下一動作。
9. 寫出實際執行的 verification 與結果；沒有執行就明說，不用「應該通過」。
10. 若範圍、順序、依賴或完成條件需要改變，先向使用者提出差異並等待明確同意；同意後先修改
    Roadmap，再更新本文件。未獲同意時，把它記為 Roadmap decision blocker，不得另開分支路線。
11. 架構決策在 Roadmap 核准變更後才新增或更新 ADR。
12. 以一個可執行動作寫 Next handoff，避免「繼續開發」等模糊文字。

並行分支各自保留日誌變更；整合者合併時按日期保留每筆記錄並重新計算 Current snapshot。

## Engineering log

### 2026-09-11 — LOG-036 — M3 delivery CI completion

- **Scope**：推送完整 M3 delivery commit 並確認 GitHub Actions remote gate；不改變 M4 範圍。
- **Outcome**：commit `c55a95d` 已推送至 `origin/main`；M3 正式標記為 Done。
- **Verification**：GitHub Actions CI #5（run `34565338417`）對 `c55a95d` completed successfully，verify 與 migration dry-run 均成功，耗時 55 秒。
- **Known issue**：None for M3. M8 前仍維持既有 development-only、leaked-password protection 與 credential-rotation risks。
- **Next**：開始 M4 前讀取 Demo 排程不變量，依 Roadmap 建立 Scheduling 的 transaction／concurrency contract。

### 2026-09-11 — LOG-035 — M3 390px UI acceptance

- **Scope**：完成 M3 Student detail、Lesson Purchase 與 manual-income summary 的精確 390px 實機驗收；不擴充 M4 排程或線上金流。
- **Outcome**：已登入 Chrome session 以 390×844 viewport 建立 temporary Student、登錄 3 堂／TWD 6,000，購課歷史、remaining 3／purchased 3／completed 0 與累計實收同步更新。頁面 `innerWidth` 為 390，document/body scroll width 為 375，無水平溢位；temporary fixture 已刪除並還原 viewport。
- **Verification**：精確 390px DOM／responsive 實測通過；LOG-034 的 root check、build、migration dry-run、真實 two-Coach E2E 與 desktop UI evidence 仍有效。
- **Known issue**：尚缺 M3 delivery commit 的 GitHub Actions remote CI evidence。
- **Next**：推送 M3 delivery commit，確認 GitHub Actions verify 與 migration dry-run 成功後標記 M3 Done。

### 2026-09-11 — LOG-034 — M3 manual income record and summary

- **Scope**：依使用者明確決定，將 Demo 的教練手動購課實收與收入統計納入 M3；不建立線上付款、金流或退款流程。
- **Outcome**：`lesson_purchase` 新增 `amount_minor` 與 ISO 幣別；API、repository、live E2E 與 Demo preview 皆保留該收入資料。Web 以 TWD 輸入，顯示每筆收款與按幣別分組的累計實收。修正 PostgreSQL `bigint` 在 Node adapter 的數字轉換；temporary UI fixture 已刪除。
- **Verification**：root `npm run check`（API 8 files／22 tests；Web 3 files／17 tests）、root `npm run build`、`npm run db:push:dry`、`git diff --check` 均通過；真實雙 Coach `npm run e2e:m3 --workspace @gym-assistant/api` 通過 owner receipt/detail、tenant isolation、archive 與 cleanup。Chrome desktop 實測 3 堂／TWD 6,000 會同步更新剩餘堂數、購課歷史與累計實收。Migration 已套用，Security Advisor 維持 1 個既有 leaked-password-protection warning，Performance Advisor 僅 2 個既有 lifecycle unused-index INFO。
- **Known issue**：M3 尚缺 390px Student detail／purchase layout 實測及推送交付 commit 後 GitHub CI 的遠端完成證據。現有 Chrome automation 無法讀取 device-toolbar 精確 viewport，故未將其宣告為 390px 通過。
- **Next**：以可設定 390px viewport 的已登入 browser session 實測 Student detail／purchase layout；通過後取得使用者授權推送 M3 delivery commit 並確認 GitHub CI。

### 2026-09-10 — LOG-033 — M3 Chrome desktop UI validation and form reset fix

- **Scope**：使用授權 Chrome／Google test session 驗證 M3 Student detail／Lesson Purchase desktop flow，並處理實測發現的 UI error；不推送 shared history。
- **Outcome**：Google session 下完成「建立暫時 Student → 開啟 detail → 登錄 3 堂 → 顯示 remaining 3／purchased 3／completed 0」實測。發現購課成功後非同步 React event 已釋放、導致 `form.reset()` error；現在先保留 form reference 再 await。以 Supabase connector 確認只有 1 筆精確 temporary fixture，並刪除後由 cascade 清理購課。Security Advisor 維持 1 個已知 leaked-password-protection warning；Performance Advisor 僅 2 個既有 lifecycle unused-index INFO。
- **Verification**：Chrome live desktop UI，修正後完整 re-test 無 form reset error；Supabase project healthy（PostgreSQL 17.6）與兩輪 fixture count/delete read-back。390px UI 未執行，不能宣告完成。
- **Known issue**：M3 尚缺 390px 實測及推送交付 commit 後 GitHub CI 的遠端完成證據。
- **Next**：以已登入 Chrome session 完成 390px Student detail／purchase layout 驗收，然後請使用者授權推送 M3 delivery commit 並確認 CI。

### 2026-09-10 — LOG-032 — M3 live isolation and Demo entitlement preview

- **Scope**：補齊 M3 private HTTP 的真實 two-Coach E2E，以及不寫入資料庫的 Demo Student／Lesson Purchase preview/checksum；不提前匯入 Demo、建立 M4 排程或推送 shared history。
- **Outcome**：`npm run e2e:m3 --workspace @gym-assistant/api` 已以兩個真實 Supabase Coach 驗證 owner 購課/detail、第二 Coach 404 隔離、versioned archive；測試 Student 在 finally cleanup 中永久刪除。`migration:preview:m3` 會穩定 UUID mapping、驗證來源、報告 duplicate/orphan rows 與 checksum；legacy amount 被明確 warning 排除，因 M3 是 entitlement 非 payment，且不會改寫 Demo storage 或正式 DB。
- **Verification**：live E2E 五項檢查通過；API typecheck＋22 tests、API build 通過。前一工作包的 root check（API 20、Web 17 tests）、root build 與 remote migration dry-run 仍有效。
- **Known issue**：M3 尚缺 Student detail 的 desktop／390px 實測，以及推送交付 commit 後 GitHub CI 的遠端完成證據；正式 Demo import 仍依 M7 的 explicit-confirm flow。
- **Next**：以真實 Web session 檢查 Student detail／purchase flow 的 desktop 與 390px，然後請使用者授權推送 M3 delivery commit 並確認 CI。

### 2026-09-10 — LOG-031 — M3 Student and Lesson entitlement vertical slice

- **Scope**：建立 M3 Student detail、版本化編輯／封存／明確刪除、Lesson Purchase 與推導式堂數餘額的 Web／HTTP／module／PostgreSQL 切片；不實作 M4 排程操作或 Demo 匯入。
- **Outcome**：migration `20260910103000_student_lesson_entitlement` 已在 development 套用；`lesson_purchase` 保留 Coach private note，`course_session` 只新增 completed entitlement state。餘額一律是購課總數減已完成 session，不儲存或直接調整 balance；低／負數顯示為警告。Student edit/delete 使用 version，刪除要求明確的 `DELETE` request 並由外鍵清除相關 entitlement/session data。
- **Verification**：API typecheck＋20 tests、Web format/typecheck＋16 tests、root production build、migration dry-run 與 remote apply 成功；`git diff --check` 通過。首次 sandbox 測試／Vite／Supabase telemetry 的 `spawn EPERM` 已以核准系統環境重跑。
- **Known issue**：M3 尚未完成：缺 PostgreSQL live two-Coach E2E、Demo Student/Purchase mapping preview/checksum/re-run、desktop/390px 實測，以及交付 commit 的 GitHub CI。
- **Next**：為 M3 private HTTP contract 建立並執行隔離 live E2E，接著實作 Demo Student／Lesson Purchase migration preview/checksum。

### 2026-09-10 — LOG-030 — Milestone remote-CI completion gate

- **Scope**：依使用者明確授權，將每個 milestone 的 GitHub CI 成功設為 Roadmap 共同完成門檻。
- **Outcome**：里程碑現在必須先推送交付 commit，並確認該 commit 的 GitHub Actions verify 與 migration dry-run 成功；本機驗證不能取代遠端證據。
- **Verification**：Roadmap 與 Status 的完成門檻、M2 CI #2／#3 交付證據已對齊；`git diff --check` 通過。
- **Known issue**：None。
- **Next**：依 M3 Roadmap 定義 Student／Lesson Purchase 的 domain contract 與後端 vertical slice。

### 2026-09-10 — LOG-029 — M2 GitHub delivery and CI baseline

- **Scope**：將已完成並驗證的 M2 工作包以不混入 M3 的 commit 推送到 shared `main`，並確認遠端 CI。
- **Outcome**：M2 已推送為 `cdfee3f`（`feat: complete M2 coach account operations`）；M3 草稿已在 commit 前移除，下一次工作從乾淨的 M2 基線開始。
- **Verification**：root `npm run check`（API 6 files／17 tests、Web 3 files／16 tests）、`npm run build`、linked `db push --dry-run` 與 `git diff --check` 通過；GitHub Actions CI #2 完成成功，verify 與 migration-dry-run 總時長 1m 1s。
- **Known issue**：沒有正式 environment；M8 前仍須建立 staging/production、處理 leaked-password protection 的 privacy tradeoff、輪替已接受的 development credential exposure，並完成公開註冊 abuse controls。
- **Next**：依 M3 Roadmap 定義 Student／Lesson Purchase 的 domain contract 與後端 vertical slice。

### 2026-09-10 — LOG-028 — M2 lifecycle and recovery completion

- **Scope**：完成 M2 最後的每日帳號刪除與 password-recovery end-to-end 驗收。
- **Outcome**：以三個隔離身份驗證 365 天閒置、14 日期滿與取消：兩個 due identity 經正式 Edge Function 永久刪除，取消者未被納入；claim/release 可重試、重複 claim 為零、空批次不重複刪除。另以獨立隔離身份完成六位 OTP 註冊、recovery 郵件、recovery 頁重設密碼、被登出及新密碼重新登入；所有隔離 Auth user 與 Workspace 已清除。
- **Verification**：function response `deleted: 2, failed: 0`，第二次 response `deleted: 0, failed: 0`；due count 歸零、取消 fixture 存在後清除；M2 test Auth user／Workspace aggregate 均為 0。root `npm run check`（API 6 files／17 tests、Web 3 files／16 tests）、`npm run build`、`npm run db:push:dry` 與 `git diff --check` 通過；Security Advisor 為 0 errors、1 個已知 leaked-password protection warning。
- **Known issue**：沒有正式 environment；M8 前仍須建立 staging/production、處理 leaked-password protection 的 privacy tradeoff、輪替已接受的 development credential exposure，並完成公開註冊 abuse controls。
- **Next**：從 M3 Student & Lesson entitlement 的 domain contract 與後端 vertical slice 開始。

### 2026-09-10 — LOG-027 — M2 function-specific cron credential

- **Scope**：依使用者明確授權，建立並啟用 365 天直接刪除所需的專用排程 credential。
- **Outcome**：建立 `gym_assistant_lifecycle_cron` secret API key，但 Dashboard 不對 automation 揭露完整值，故改用更小權限的 32-byte function-specific token；它只存於 Edge Function secret store 與 Vault。daily cron 已重新註冊為 02:10 Asia/Taipei，Edge Function 在驗證 token 前不執行任何 Auth operation。
- **Verification**：Supabase Dashboard 實測 key creation 與 Vault project URL；CLI 回報 Edge Function secret configured，migration `20260910073809_schedule_direct_inactivity_deletion` dry-run／deploy 成功；唯讀 due count 為 0。
- **Known issue**：尚需以隔離資料完成 live deletion validation。
- **Next**：建立隔離帳號，驗證 365 天與 14 日期滿刪除、claim release 與 deduplication。

### 2026-09-10 — LOG-026 — M2 direct 365-day inactivity deletion

- **Scope**：使用者明確將「12 個月提醒、30 日後刪除」改為「365 天無活動即直接刪除、不寄業務信」，並要求完成最小自動化方案。
- **Outcome**：移除 reminder/outbox schema 與 API worker，改部署受 secret API key 保護的 `delete-inactive-coaches` Edge Function。它以 service-role-only claim/release RPC 防止重複處理，並經 Auth Admin API 永久刪除 due Coach；設定完成後，`pg_cron` 將在每日 02:10 Asia/Taipei 經 `pg_net` 呼叫它。14 日自主刪除倒數與立即刪除保持不變。
- **Verification**：官方 Supabase docs 確認 `pg_cron`＋`pg_net`＋Vault 的 scheduling 模式及 Admin delete server-only requirement；migration dry-run、Edge Function deploy、remote `db push`、root `check`（API 6 files／17 tests、Web 3 files／16 tests）與 `build` 均成功。未觸發任何帳號刪除；缺少專用 key 的 cron job 已立即暫停。
- **Known issue**：Vault 尚沒有專用 cron key。安全執行環境拒絕把既有廣泛 API server secret 複製作排程 key；排程啟用前需建立最小權限、僅供此 function 呼叫的 secret key。
- **Next**：取得建立／儲存專用 cron secret 的明確授權後寫入 Vault，使用隔離帳號驗證 365 天與 14 日期滿刪除、claim release 及 cron invocation。

### 2026-09-10 — LOG-025 — M2 lifecycle outbox migration deployed

- **Scope**：將已乾跑驗證的 account-lifecycle outbox schema 套用至 development Supabase project。
- **Outcome**：`20260910061820_lifecycle_worker_outbox` 已成功套用；其 durable claim／delivery state 可供後續 reminder sender 與 scheduler 使用。
- **Verification**：linked Supabase CLI `db push` 回報 migration applied；未寄送任何提醒信、未建立或變更真實使用者資料。
- **Known issue**：此 outbox 已被 LOG-026 的使用者核准決定取代；保留本記錄作為實際已部署再移除的 migration history。
- **Next**：依 LOG-026 完成直接閒置刪除的專用 cron key 與 live validation。

### 2026-09-10 — LOG-024 — M2 app-native irreversible-delete verification

- **Scope**：將永久刪除從不可自動化的 browser-native confirmation 改為產品內建、可測且可存取的確認元件，並完成授權的隔離帳號刪除驗收。
- **Outcome**：帳號安全頁現在顯示應用程式內建確認面板；須輸入 `DELETE` 才啟用永久刪除，無需 browser alert 或人工點選。發現成功的 DELETE API 回傳 `204 No Content` 時前端錯誤解析 JSON，已修正為接受空回應；隔離身份的 API DELETE 取得 204，之後註冊檢查回傳不存在，符合 Auth identity 已移除的預期。
- **Verification**：Chrome 實測 app-native modal 與 `DELETE` gating；local API 204 與 post-delete registration lookup；Web `check` 16 tests、`build`、`git diff --check` 通過。未輸出 password、OTP、token、recovery URL 或 secret。
- **Known issue**：lifecycle reminder 的 server-only sender、外部 scheduler 與隔離資料驗收仍未完成。
- **Next**：依 Next handoff 接上受限的 inactivity-reminder sender 與排程，並驗證重試／去重與 30 日後刪除。

### 2026-09-10 — LOG-023 — M2 six-digit OTP live acceptance and M8 alias-abuse gate

- **Scope**：以使用者授權的 Gmail sub-addressing 隔離帳號重跑 M2 hosted Auth acceptance，並依明確核准把 Email alias 濫用防線加入既有 M8 release scope。
- **Outcome**：新 Email/password signup 收到六位 OTP、驗證後 bootstrap 私有 Workspace、local logout、Email/password re-login、recovery request/delivery、global logout 均完成。M8 現要求 provider-aware Email canonicalization；原始 Email 保留作寄送地址，且不得以全域 `+`／`.` 移除規則誤合併帳號。開發期的受控 Gmail alias 繼續可用於隔離測試。
- **Verification**：Supabase Dashboard 讀回 6 digit OTP；Chrome local Web＋Gmail 實測上述流程。未在工程輸出或文件保留 OTP、password、access token、recovery URL 或 SMTP secret。
- **Known issue**：提醒 adapter／scheduler 和 lifecycle outbox migration deploy 仍未完成。
- **Next**：依本文件 Next handoff 實作 reminder sender、排程及 remote 驗收。

### 2026-09-10 — LOG-022 — M2 OTP configuration verification and lifecycle worker foundation

- **Scope**：重驗 hosted Email OTP 長度，並開始既定的 account-lifecycle worker/outbox 工作包。
- **Outcome**：Supabase Dashboard Email provider 讀回 OTP length 為 6 digits；本機六位 UI／verify contract 保持一致。新增 lifecycle outbox migration 與 worker domain seam：到期／提醒後閒置刪除採可重試 claim，閒置提醒只在 sender 成功後標記，失敗釋放以供重試；Auth delete 本身仍經 server-only executor。
- **Verification**：核准系統環境 root check（API 6 files／17 tests、Web 3 files／15 tests）與 root build 通過；worker focused tests 2 項與 API 合計 7 files／19 tests 通過。Dashboard 直接讀回 6 digit setting；未輸出 OTP、password、token 或 SMTP secret。
- **Known issue**：新的 lifecycle outbox migration 尚未 deploy；提醒實際寄送 adapter、外部 scheduler 與其隔離資料驗收尚未完成。完整 hosted self-service signup／OTP acceptance 也待建立隔離測試身份後重跑。
- **Next**：取得建立隔離 Gmail alias 測試帳號及其結束後永久刪除的即時確認，完成六位 OTP acceptance；之後接上受限的 inactivity-reminder sender 並 deploy／驗證 outbox。

### 2026-09-10 — LOG-021 — M2 SMTP recovery, account-security UX, and OTP length correction

- **Scope**：依使用者明確授權的永久刪除後，重跑 exact Gmail 的完整公開註冊；同步完成帳號安全頁的 recovery UX
  收斂與 Auth email template 品牌化。
- **Outcome**：永久刪除後以 aggregate SQL 確認 Auth user、Workspace 與 Student 均為 0；全新 self-service signup 的
  Auth signup/resend 取得 200，Brevo 記錄為 sent/delivered/opened。當時 hosted project 發出八位 OTP，曾驗證、bootstrap
  與 Email/password 再登入成功，但使用者隨後明確指定產品必須為六位。Web、Roadmap、Architecture、Auth configuration 已
  固定回六位；hosted Auth 設定尚待同步確認後才可重跑並將本項記為 6 位 acceptance。帳號安全頁已移除「寄送密碼重設信」；
  直接設定/變更密碼留在已登入處，recovery email 僅在登入頁「忘記密碼」流程可寄出。Confirm signup 與 reset-password
  template 已在 Supabase Dashboard 儲存為 FORM Coach Desk 樣式；為避免額外消耗 SMTP 額度，儲存後未另寄一封只供視覺比對的測試信。
- **Verification**：Chrome live signup/OTP/Workspace/login、Supabase Auth logs、Brevo delivery logs、aggregate deletion
  SQL；六位修正後 root `npm run check` 通過（API 6 files/17 tests、Web 3 files/15 tests）且 `npm run build` 通過。測試輸出
  未保留 password、OTP、token 或 SMTP secret。
- **Known issue**：SMTP transport blocker 已解除；hosted OTP length 尚未確認為六位；14 日／閒置刪除的 worker/outbox 與其
  notification deduplication 尚未實作。
- **Next**：依本文件 Next handoff 先同步 hosted OTP 為六位，重跑完整註冊驗收，再實作 lifecycle worker/outbox。

### 2026-09-10 — LOG-020 — M2 verified-email UX correction and SMTP re-test

- **Scope**：依使用者問題，重新驗證 exact Gmail 的 recovery delivery，並校正已登入帳號安全頁的驗證信入口。
- **Outcome**：recovery send 仍回 `Error sending recovery email`，沒有收件匣驗證可做。已移除帳號安全頁的「重新寄送
  驗證信」：登入中的 Coach 已是 verified Email；重送六位 OTP 只保留在未完成註冊驗證的流程。
- **Verification**：Chrome live recovery send re-test；live account-security modal 確認不再有重送驗證信、仍有密碼重設；
  root `npm run check` 通過（API 6 files/17 tests、Web 3 files/15 tests）與 `npm run build` 通過。
- **Known issue**：SMTP delivery 仍是 P1 外部 blocker；worker/outbox 尚未實作。
- **Next**：從 Supabase Auth／SMTP provider logs 取得 recovery send failure 的安全錯誤類別並修正，然後用 exact Gmail 重跑 recovery。

### 2026-09-10 — LOG-019 — M2 registration feedback and SMTP re-test

- **Scope**：依使用者明確核准，將既有 Email 的註冊行為由 enumeration-safe generic response 改為公開明示「此帳號已經註冊過。」；
  為註冊呼叫加上 12 秒回應上限，並重跑授權的 Gmail password-recovery 寄信測試。
- **Outcome**：API 現以 server-only Supabase secret key 分頁查詢 Auth users，公開 endpoint 僅回傳 `exists`；browser 不接觸
  管理 key，註冊前先顯示既有帳號訊息，且 Auth signup 未回應時在 12 秒結束等待。這是 Roadmap 記錄的已接受
  account-enumeration risk。使用 exact `hsuehgreat@gmail.com` 發送 password recovery 仍回 `Error sending recovery email`，
  因此沒有可驗證的收件匣郵件；沒有嘗試變更密碼、刪除帳號或改用 Gmail `+` alias。
- **Verification**：Chrome live recovery send re-test；local public endpoint 對 `hsuehgreat@gmail.com` 回傳 `{ "exists": true }`；
  root `npm run check` 通過（API 6 files/17 tests、Web 3 files/15 tests）與 `npm run build` 通過。
- **Known issue**：SMTP delivery 仍是 P1 外部 blocker；worker/outbox 尚未實作。
- **Next**：從 Supabase Auth／SMTP provider logs 取得 recovery send failure 的安全錯誤類別，修正後以 exact Gmail 重跑 recovery，
  再由使用者提供另一個可讀取測試收件匣完成新帳號 OTP。

### 2026-09-10 — LOG-018 — M2 live Google/linking and lifecycle smoke test

- **Scope**：依使用者授權，使用已登入 Chrome 的 `hsuehgreat@gmail.com` 執行 live Google OAuth、same-email identity
  linking、Email delivery 與可逆 deletion countdown 測試。
- **Outcome**：Google OAuth consent 回到 Web，資料庫核對為 1 個 Auth user、Email+Google 兩個 identities、1 個
  Workspace、0 個 Student，故同 Email linking 不會建立第二個 Workspace。14 日倒數顯示正確 due time，取消成功。
  Email OTP 與 password recovery 都失敗於 Supabase `Error sending … email`；SMTP Settings read-back 顯示 custom SMTP
  enabled、host/port/name 有值，但 sender email 與 SMTP username 為空。未做立即永久刪除，避免刪除使用者的既有帳號。
- **Verification**：Chrome live flow、Gmail 搜尋、Supabase Dashboard SMTP read-back、只回傳 aggregate 的 Auth/Workspace SQL
  核對。測試不輸出 password、OTP、token、SMTP secret 或個人收件匣內容。
- **Known issue**：SMTP 完整設定是所有寄件測試與 inactivity reminder 的 P1 blocker；lifecycle worker/outbox 尚未實作。
- **Next**：project owner 補齊並儲存 SMTP sender email/username；重跑 OTP/recovery 收信，然後實作 worker/outbox。

### 2026-09-10 — LOG-017 — M2 deletion contract and E2E boundary

- **Scope**：依使用者確認，將立即、到期與閒置刪除定義為永久移除 Coach 的 Auth user 與全部
  Workspace-owned data；完成手動刪除的 API/UI/database vertical slice，並檢查 SMTP rate limit 與現有 live E2E。
- **Outcome**：migration `20260909174245_account_lifecycle` 已部署，記錄 14 日 deletion due date、server-side
  `last_activity_at` 與 inactivity notice state；API 支援排程、取消、明確 `DELETE` 的立即刪除，立即刪除會先撤銷
  session，再以 server-only Supabase key 刪除 Auth user，既有外鍵 cascade 永久清除 Workspace/Student。Web 已加入
  明確後果、倒數、取消與瀏覽器二次確認。Dashboard 截圖確認 email limit 為 20/h；既有 M1 live E2E 重跑通過。
- **Verification**：root `npm run check` 通過（API 6 files/16 tests；Web 3 files/14 tests）、`npm run build` 通過、
  `npm run db:push:dry` 回報 remote up to date；migration 已用 Supabase connector 套用。Security Advisor 0 errors、
  1 個 leaked-password-protection warning；Performance Advisor 僅兩個新 lifecycle index 的 unused INFO。M1 live E2E
  通過 authentication、401、client Workspace 拒絕、owner reload、tenant isolation。
- **Known issue**：到期／閒置的 worker/outbox 與唯一 inactivity reminder 尚未實作；Email OTP 與 Google OAuth 的完整
  live E2E 需要受控收件匣（API/IMAP 讀 OTP）及 project owner 首次 consent 的 Google test user。沒有這些帳號時，
  不能假稱已實測第三方登入或收信流程。
- **Next**：建立受控 OTP 收件匣與 Google test user，將它們只填入 ignored E2E env，接著實作 lifecycle worker/outbox
  並執行完整 M2 live acceptance matrix。

### 2026-09-10 — LOG-016 — M2 Auth configuration remediation

- **Scope**：在使用者明確授權後，直接修正 Supabase Auth 的 signup OTP template 與開發 callback allowlist。
- **Outcome**：Confirm sign up template 已從 `{{ .ConfirmationURL }}` 改為六位 `{{ .Token }}`；Site URL 已改為
  `http://localhost:5173`，Redirect URLs 已新增 localhost／127.0.0.1 的 5173、5174 origins。這些變更已由
  Dashboard read-back 確認。email/hour 欄位嘗試設定 12 但未持久化：值被清空，Save 不啟用。
- **Verification**：Supabase Dashboard success feedback 與 saved template／URL read-back；未寄測試 Email，避免
  在 300/day guardrail 未能設定時無謂消耗 SMTP 額度。
- **Known issue**：email/hour rate limit 的 Dashboard 行為待釐清；真實 Auth E2E、account-data deletion decision
  與 server-side activity definition 仍未完成。
- **Next**：讓 email/hour rate limit 可持久化，然後使用明確測試帳號執行完整 M2 Auth E2E。

### 2026-09-10 — LOG-015 — M2 Auth configuration inspection and lifecycle policy

- **Scope**：檢查使用者完成的 Supabase Email／SMTP／Google 設定，並依明確授權將 deletion、inactivity
  與 SMTP email-budget policy 納入 M2 Roadmap。
- **Outcome**：確認 public signup、Confirm Email、Email provider、Google provider、custom SMTP（Brevo）均
  啟用，per-user email interval 為 60 秒；所有 Supabase security-notification emails 關閉。發現 confirmation
  template 使用 `{{ .ConfirmationURL }}` 而非 Web OTP flow 所需的 `{{ .Token }}`，且 Site URL 是
  `http://localhost:3000`、Redirect URLs 為空；project email/hour limit 亦未設。為免寄出不可完成的測試信，
  未執行 live signup／recovery/Google E2E。
- **Verification**：Supabase Dashboard read-only inspection；linked migration history 指令無錯誤。對照當前
  Supabase Email Templates／Google Auth 官方文件，確認 OTP flow 與 Google setup 要求。
- **Known issue**：帳號／Workspace 資料在立即、到期及閒置自動刪除時的後果與保留期，及 server-side
  activity 定義仍未決；這兩項不能由現有 `auth.users` cascade 推論。
- **Next**：完成 Next handoff 的三項 Auth 設定修正，再以明確測試帳號執行完整 M2 live acceptance matrix。

### 2026-09-09 — LOG-014 — M2 server-authoritative Workspace settings

- **Scope**：完成 M2 可獨立交付的 Workspace settings vertical slice，包含 display name、IANA time zone
  與 version-based conflict handling。
- **Outcome**：新增 API `GET/PATCH /v1/workspace-settings`、memory/PostgreSQL adapters、Web settings modal 與
  向後相容 migration `20260909160000_workspace_settings`；前端不傳 Workspace ID，API 仍從 verified identity
  推導 owner Workspace。stale write 回傳 409，畫面要求 Coach 重新讀取後自行決定。新增
  [`AUTH_CONFIGURATION.md`](AUTH_CONFIGURATION.md)，集中外部 Auth/Google 啟用與 live acceptance matrix。
- **Verification**：root `npm run check` 通過（API 6 files／14 tests；Web 3 files／13 tests），root `npm run build`
  通過，`npm run db:push:dry` 僅列出此 migration，`npm run db:push` 已成功套用至 linked development project。
- **Known issue**：首次正式 self-service Auth／Google E2E 仍依賴外部控制台設定；account deletion 的資料生命週期
  仍是 M2 decision blocker。新增 settings modal 尚不能在未設定正式自助登入前以 live Coach session 做瀏覽器驗收。
- **Next**：依本文件 Next handoff 啟用 Auth/Google 外部設定，執行真實 self-service identity E2E，並定義
  account deletion 的資料後果。

### 2026-09-09 — LOG-013 — M2 public Coach identity baseline

- **Scope**：依使用者核准，將 M2 從 provisioned-only 改為公開自助註冊、Email OTP 驗證與 Google OAuth
  同 Email identity 的完整 Web/Auth client 工作包。
- **Outcome**：Roadmap、Architecture 與 Web UI 已改為 Email/password 註冊、六位 OTP、password recovery、
  local/global logout、Google sign-in entry 與 Google-only Coach 登入後設定密碼；管理端建立帳號限定 development/test。
  已存在的 identity 一律以 generic signup response 處理，避免帳號枚舉與重複註冊訊息洩漏。
- **Verification**：root `npm run check` 通過（API 5 files／11 tests；Web 3 files／12 tests），root `npm run build`
  通過；實際檢查 1440px 與 390px 的登入／註冊，390px `scrollWidth` 未超出 viewport；OTP 入口可達。沙箱內
  Vitest 初次遭 Windows `spawn EPERM`，已改由核准的系統環境完成。
- **Known issue**：Supabase public sign-up、OTP template／redirect allowlist、custom SMTP/rate-limit/CAPTCHA 與
  Google provider 尚未由帳號擁有者在外部控制台啟用，故未宣告真實 Auth E2E 或 M2 完成；帳號刪除資料生命週期
  亦尚未定案。
- **Next**：依本文件 Next handoff 啟用 Auth/Google 外部設定，執行真實 self-service identity E2E，並定義
  account deletion 的資料後果。

### 2026-09-09 — LOG-012 — M1 remote CI completion evidence

- **Scope**：驗證使用者設定 GitHub Actions repository secrets 後的 CI remote migration dry-run。
- **Outcome**：CI #1 attempt #2 成功；verify 與 migration-dry-run 都完成，正式 CI gate 已可使用。
- **Verification**：GitHub Actions run `34363602965` attempt #2：verify 23 秒（API 5 files／11 tests、Web
  2 files／5 tests），migration-dry-run 22 秒，workflow success（28 秒）。
- **Known issue**：使用者接受不輪替曾出現在對話中的 database password／Auth secret key；這仍不符合
  Roadmap M1 的 secret-handling completion criterion，且尚未取得修改該 criterion 的明確核准。
- **Next**：使用者決定輪替，或明確核准 Roadmap completion-criterion 變更；決定前維持 M1 In progress。

### 2026-09-09 — LOG-011 — Formal product remote baseline and first CI run

- **Scope**：將已驗證的 formal product baseline、CI workflow、M1 E2E 與 Status 推送至
  `origin/main`，並驗證第一次 GitHub Actions run。
- **Outcome**：`d8833ab`、`4681ffe`、`64a55d6` 與 `0d7e8f6` 已推送；CI #1 的 verify job 成功，
  migration-dry-run 如預期因三個 repository secrets 均缺失而失敗。
- **Verification**：GitHub Actions run `34363602965`：verify 23 秒完成，API 5 files／11 tests、Web
  2 files／5 tests 通過；migration-dry-run 在 Require Supabase CI secrets 步驟以 exit 1 結束。
- **Known issue**：agent 無法從本機安全地取得或傳送 `SUPABASE_ACCESS_TOKEN` 至 GitHub；使用者已授權
  寫入 secrets，但需在 GitHub repository secrets 頁面自行輸入三個值，且不得貼進聊天。
- **Next**：使用者設定三項 repository secrets 後，re-run CI #1 的 failed jobs；完成時更新本文件並
  重新判定 M1。

### 2026-09-09 — LOG-010 — M1 remote migration verification and accepted risk

- **Scope**：完成 M1 CI 工作包中可由目前本機與 Supabase CLI 執行的遠端 migration verification，並
  記錄使用者對既有 credential exposure 的決定。
- **Outcome**：`npm run db:push:dry` 確認 linked remote 無待套用 migration、seed 或 role；使用者明確
  選擇不輪替曾出現在對話中的 database password 與 Auth secret key。
- **Verification**：2026-09-09 remote dry-run 成功，CLI 回報 `Remote database is up to date.`；本回合
  先前 root `npm run check`（API 11、Web 5 tests）及 `npm run build` 已通過。
- **Known issue**：GitHub Actions 尚未設定三項 CI secrets、尚無首次 workflow run。未輪替的 credential
  exposure 是使用者接受的風險，但現行 Roadmap M1 completion criterion 仍不允許將此 milestone 標為 Done。
- **Next**：取得使用者明確授權後，將既有 `SUPABASE_ACCESS_TOKEN`、`SUPABASE_DB_PASSWORD`、
  `SUPABASE_PROJECT_ID` 寫入此 repository 的 GitHub Actions secrets，並 dispatch CI workflow。

### 2026-09-09 — LOG-009 — Delivery-package handoff rule

- **Scope**：將 Status 的工程交接粒度改為以同一 milestone 內可安全合併的完整工作包為單位。
- **Outcome**：明定相容工作需一起完成 implementation、測試、文件與 verification；只有產品決策、
  外部帳號／憑證、不可逆確認或既定序列化邊界可留下 handoff，並禁止為日誌任意拆分微小步驟。
- **Verification**：對照 Roadmap 未改動範圍、順序、依賴或完成條件；確認下一個 M1 工作包仍是
  credential rotation、CI secret 設定與首次 remote CI evidence；root `npm run check`（API 11、Web
  5 tests）及 `npm run build` 通過。
- **Known issue**：旋轉 database password 與 Auth secret key 是外部安全設定；依作業安全規則必須由
  使用者在 Supabase Dashboard 完成最終提交，完成前無法安全取得新的 CI 值或宣告 M1 完成。
- **Next**：使用者完成兩項 rotation 後，將新值只存入 ignored local env／GitHub Actions secrets，並執行
  remote migration dry-run 與 CI workflow。

### 2026-09-09 — LOG-008 — Live Auth and tenant-isolation verification

- **Scope**：以 server-only Auth secret key 建立 development Coaches 並執行正式 M1 live E2E。
- **Outcome**：兩個 auto-confirm Coach 已建立；API runtime、Web publishable config 與 live verifier
  都使用 ignored local env，沒有將 credential、token 或 response body 輸出。
- **Verification**：兩位 Coach email confirmed；`npm run e2e:m1` 通過真實 Auth、401、client
  Workspace 拒絕、owner create/reload、第二 Coach isolation 五項檢查。
- **Known issue**：database password 及本次貼入對話的 Auth secret key 必須輪替；CI secrets 與首次
  remote migration dry-run 尚未完成。
- **Next**：輪替兩項已暴露 credential，更新 local/CI secret store，並執行首次 GitHub Actions run。

### 2026-09-09 — LOG-007 — Supabase runtime connection

- **Scope**：建立正式 API 專用 database login，並同步 API/Web 的本機 Supabase 設定。
- **Outcome**：`gym_assistant_runtime` 已建立並繼承 `gym_assistant_api`；64 字元隨機密碼只寫入
  Supabase 與 ignored `apps/api/.env`，Web 使用 publishable key；Session Pooler TLS 連線成功。
- **Verification**：runtime 實測可使用 `app_private.workspace/student`，不可使用 `auth` schema 或
  database create；root check（API 11、Web 5 tests）與 build 通過；Security Advisor 無 notices，
  Performance 僅既有 unused-index INFO。
- **Known issue**：database password 仍須輪替；兩個 auto-confirm development Coaches 尚待瀏覽器
  傳送測試帳密的即時確認，live E2E 與 CI secrets/run 尚未完成。
- **Next**：取得即時確認後，在 Supabase Dashboard 建立兩個 development Coaches 並執行 live E2E。

### 2026-09-09 — LOG-006 — Repeatable M1 live E2E verifier

- **Scope**：建立使用真實 Supabase Auth token 與正式 API 的 M1 live verification command。
- **Outcome**：`npm run e2e:m1` 可重跑雙 Coach 登入、401、client Workspace 拒絕、Student 建立／重讀與
  tenant isolation；設定只放 ignored `.env.e2e`，輸出不含 credentials、token 或 response body。
- **Verification**：API typecheck 與 5 files/11 tests 通過，包含完整成功流程與 Auth error 不洩漏測試。
- **Known issue**：database password、runtime login、development Coaches 與首次 live run 仍待完成。
- **Next**：輪替 database password，建立 runtime login 與兩個 development Coaches 後執行 `npm run e2e:m1`。

### 2026-09-08 — LOG-005 — Formal CI verification gate

- **Scope**：補齊 M1 CI formatting、typecheck、tests、production build 與 remote migration dry-run workflow。
- **Outcome**：root check 現在先驗證正式 repository 格式；GitHub Actions 分成無 secrets 的 verify job
  與需要三項 repository secrets 的 migration dry-run job。Supabase 唯讀盤點確認 runtime login 與 Auth users 皆為零。
- **Verification**：root formatting、API 9 tests、Web 5 tests 與 production build 通過；remote migration
  `20260907144520` 一致，Security Advisor 0 notices，Performance 僅 unused-index INFO。
- **Known issue**：database password 尚未輪替，故未建立 runtime login、Coach 或 CI secrets，也未執行 live E2E／首次 CI。
- **Next**：輪替 database password，建立最小權限 runtime login 與兩個 development Coaches。

### 2026-09-08 — LOG-004 — M0 clean baseline

- **Scope**：審查並收錄 Demo 歸檔、正式 application skeleton、Supabase migration、Web/Auth 與工程文件。
- **Outcome**：確認 56 個歸檔路徑保真，只有 CHANGELOG 與 development guide 因歸檔位置做預期調整；
  secret scan 僅命中角色名稱、註解與 example 假值，ignored secrets/build artifacts 未納入；M0 完成。
- **Verification**：root check（API 9 tests、Web 5 tests）與 build、Demo check（61 tests）與 build、
  `git diff --check`、Supabase CLI `2.116.0` migration dry-run（remote up to date）皆通過。
- **Known issue**：database password 尚需輪替；runtime login 與 development Coaches 尚未建立，M1 live E2E 未完成。
- **Next**：輪替已暴露的 database password，再建立最小權限 runtime login。

### 2026-09-08 — LOG-003 — Durable roadmap and cross-task handoff

- **Scope**：建立 Roadmap、Project Status，並讓根目錄 agent guide 強制讀取與更新。
- **Outcome**：里程碑、依賴、共同完成門檻、當前狀態、blockers 與下一接手點已落盤；Status
  採精簡更新／忠實壓縮，且 Roadmap 任何變更都須先取得使用者明確同意。
- **Verification**：核對 root、formal apps、Demo、migration、Architecture、ADR 與 Git status；
  所有本機 Markdown links 可解析，`git diff --check` 無內容錯誤，root check（14 tests）與 build 通過。
- **Known issue**：工作樹尚未形成乾淨 baseline；M1 live E2E 尚未完成。
- **Next**：審查並建立 baseline，輪替已暴露的 database password，再建立最小權限 runtime login。

### 2026-09-08 — LOG-002 — Formal Web/Auth tracer

- **Scope**：新增 `apps/web` React/Vite/PWA，接上 Supabase Auth 與 Student HTTP Interface。
- **Outcome**：完成 provisioned-only sign-in、session refresh、Student list/create、同源 `/api` proxy
  與不快取 API 的 service worker。
- **Verification**：API 9 tests、Web 5 tests、root check、production build 通過；1440px 與 390px
  登入畫面實際檢查，無 mobile horizontal overflow。
- **Known issue**：沒有 test Coach 與 runtime DB login，因此尚未做遠端 E2E。
- **Next**：建立 development-only runtime/account 後驗證真實 token 與 tenant isolation。

### 2026-09-07 — LOG-001 — Supabase foundation

- **Scope**：選定並連結 Supabase，建立第一個正式 API／database vertical slice。
- **Outcome**：建立 `app_private.workspace/student`、最小權限 group role、JWKS verifier、Fastify
  Student Module、memory/PostgreSQL adapters 與正式架構 ADR。
- **Verification**：migration dry-run/push 成功、local/remote history 一致、schema lint 無錯誤、
  Security Advisor 0/0、Performance Advisor 0/0 加一個 unused-index info。
- **Known issue**：connector tools 未在該 task 暴露，改用官方 CLI；schema dump 因無 Docker 未執行。
- **Next**：建立專用 runtime login 與真實 Auth E2E。

## Log entry template

```markdown
### YYYY-MM-DD — LOG-NNN — Short title

- **Scope**：本次明確負責的 Module／交付物。
- **Outcome**：實際完成的狀態與重要決策。
- **Verification**：執行的命令、測試數量、遠端檢查或 UI 尺寸。
- **Known issue**：仍存在的 blocker／risk；沒有則寫 None。
- **Next**：下一個接手者第一個可執行動作。
```
