# Gym Assistant project status

> Last verified: 2026-09-08 (Asia/Taipei)

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

| Field | Current value |
| --- | --- |
| Active milestone | **M1 — Cloud foundation tracer** |
| Milestone state | **In progress** |
| Current branch | `main`，M0 clean baseline 已建立 |
| Development database | Supabase project `Gym Assistant`, region `ap-northeast-2`, PostgreSQL 17 |
| Remote migration | `20260907144520_initial_identity_workspace_student` applied |
| Formal applications | `apps/api`, `apps/web` |
| Archived prototype | independent `demo/`, storage key `form-coach-mvp-v1` |
| Production data status | **No production environment; do not store real customer data** |

## Next handoff

**完成 M1 真實端到端驗證。**

1. 先輪替曾在對話中暴露的 Supabase database password；不要把新值貼進對話或文件。
2. 建立 `gym_assistant_runtime` login，使其繼承 `gym_assistant_api` 的最小權限；密碼只存本機
   Git-ignored `apps/api/.env` 及未來 secret store。
3. 建立 development Coach 測試帳號；決定帳號識別資料前需要使用者確認。
4. 啟動 API/Web，完成「登入 → Workspace bootstrap → 新增 Student → reload 後重讀」。
5. 再用第二個 Coach 證明無法讀取第一個 Coach 的 Student。
6. 將命令、結果、問題與下一動作追加到 Engineering log；滿足 Roadmap M1 全部條件後才
   把 milestone 改為 Done。

## Milestone status

| Milestone | State | Evidence / remaining work |
| --- | --- | --- |
| M0 Repository & product contract | Done | Demo 已獨立歸檔，CONTEXT/Architecture/ADR/Roadmap 已建立；root 與 Demo checks/build 通過並形成乾淨 baseline |
| M1 Cloud foundation tracer | In progress | migration、API、Web/Auth、測試已完成；缺 runtime login、test Coaches 與 live tenant-isolation E2E |
| M2 Coach account operations | Not started | 先決定邀請制或自助註冊 |
| M3 Student & Lesson entitlement | Not started | 現有 Student 只是 tracer，Lesson Purchase 尚未建模 |
| M4 Scheduling | Not started | 以 Demo 不變量為規格來源 |
| M5 Training | Not started | 以 completed-set gate 與 autosave 規則為規格來源 |
| M6 Public capability links | Not started | 後端 token/hash/redemption 尚未建立 |
| M7 Local resilience & migration | Not started | 正式 IndexedDB 與 Demo import 尚未建立 |
| M8 Deployment & Beta readiness | Not started | staging/production、hosting、CI、observability、restore drill 尚未建立 |
| M9 Post-V1 options | Deferred | 不得提前侵入 V1 核心 |

## Verified baseline

| Area | Verified fact |
| --- | --- |
| Repository | `demo/` 獨立保存 prototype；CONTEXT、Architecture 與 ADR 0001/0002 已建立 |
| Supabase | CLI `2.116.0` linked；remote/local migration `20260907144520` 一致；schema lint 無錯誤 |
| Database security | `app_private.workspace/student` 已部署；browser roles 無 private-table access；runtime LOGIN 尚缺 |
| Advisors | Security 0 errors/0 warnings；Performance 0 errors/0 warnings，只有新索引 unused info |
| API | Student list/create、Workspace derivation、JWKS 驗證；2026-09-08：4 files/9 tests、build 通過 |
| Web/PWA | provisioned-only Auth、Student list/create、PWA shell；2 files/5 tests、build 通過 |
| UI | 1440px 與 390px 登入畫面通過；390px 無水平 overflow |
| Secrets | `.env.local` ignored；repository 未包含 database、secret 或 service-role credentials |

## Open issues and risks

| Priority | Issue | Required handling |
| --- | --- | --- |
| P0 | Database password 曾出現在對話 | live E2E 前由使用者輪替；新值只進 secret store／ignored `.env` |
| P1 | 缺 runtime LOGIN 與 development Coaches | 建立後完成 live flow 與雙 Coach isolation E2E |
| P1 | 只有 development Supabase project | M8 前建立隔離 staging/production；目前不得放真實客戶資料 |
| P2 | Supabase connector tools 可能不隨 task 載入 | 先檢查 connector；缺少時用已 linked CLI，不索取 access token |
| P2 | Full schema dump 需要本機 Docker | 非 M1 blocker；只有 local stack 成為需求時才評估安裝 |

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
2. 更新 Last verified、Current snapshot、Next handoff、Milestone status 與 Open issues 的實際狀態。
3. 在下方 Engineering log 最上方新增一筆；每次工程結束都必須有新日誌。
4. 保留舊日誌的事實、決策與驗證結果。文件過長時，可把較舊的連續記錄濃縮成一筆期間摘要，
   但必須保留日期範圍、工作範圍、實際結果、關鍵驗證、決策及仍有效的問題；不得改寫結果、
   補造未執行的驗證或移除尚未解決的風險。
5. 問題解決後，從 Open issues 移除並在最新日誌記錄解法；舊日誌中重複的問題敘述可在壓縮時
   刪減，但原始問題曾發生及其解決結果必須仍可追溯。
6. 維持精簡：不要複製 Roadmap、Architecture、程式碼清單或完整命令輸出；改用精確連結、測試
   數量、結論與第一個下一動作。
7. 寫出實際執行的 verification 與結果；沒有執行就明說，不用「應該通過」。
8. 若範圍、順序、依賴或完成條件需要改變，先向使用者提出差異並等待明確同意；同意後先修改
   Roadmap，再更新本文件。未獲同意時，把它記為 Roadmap decision blocker，不得另開分支路線。
9. 架構決策在 Roadmap 核准變更後才新增或更新 ADR。
10. 以一個可執行動作寫 Next handoff，避免「繼續開發」等模糊文字。

並行分支各自保留日誌變更；整合者合併時按日期保留每筆記錄並重新計算 Current snapshot。

## Engineering log

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
