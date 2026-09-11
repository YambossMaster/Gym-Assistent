# Gym Assistant engineering roadmap

> Baseline: v1 — established 2026-09-08. Changes require explicit user approval.

本文件是正式產品工程順序與完成條件的唯一來源。日常進度、已知問題與下一個接手點
記錄在 [`PROJECT_STATUS.md`](PROJECT_STATUS.md)；兩者不可用對話記憶取代。

## 1. 產品與工程基線

### 已定案

- 主要使用者是獨立私人教練；一個 Coach 擁有一個 Workspace。
- V1 不支援工作室多人共同管理，若未來改變須新增 ADR 並重做授權模型評估。
- Student 沒有帳號，只能用限時、限資源、限動作的 Capability Link。
- V1 不收集傷病史、醫療資訊、體脂或體重等健康資料。
- V1 不處理線上付款；Lesson Purchase 是教練登錄的堂數權益，可附帶已實收金額與幣別作為教練收入紀錄，但不是金流交易。
- Web/PWA 先上線，台灣市場先行；預設時區為 `Asia/Taipei`，資料庫時間存 UTC。
- 採 online-first：保護草稿與尚未送出的訓練內容，不做任意資料的完整離線同步。
- Supabase 提供 Managed PostgreSQL 與 Auth；Fastify 模組化單體是正式資料唯一入口。
- PostgreSQL 是 System of Record；瀏覽器 localStorage／IndexedDB 只放 session、快取、草稿與待送內容。
- 單一雲端區域起步；微服務、Kubernetes、Kafka、CQRS、Event Sourcing 與多區部署不在 V1。

### 優先順序

1. 租戶隔離、學生隱私與公開投影安全。
2. 課堂、堂數、排程及訓練歷史的正確性。
3. 可驗證、可維護、可交接的模組化單體。
4. 低營運成本與可恢復性。
5. 未來的整合與 App 包裝能力。

### 規格來源

- [`CONTEXT.md`](../CONTEXT.md)：正式領域詞彙。
- [`ARCHITECTURE.md`](ARCHITECTURE.md)：前後端權責、信任邊界與部署形狀。
- [`adr/`](adr/)：已接受且不應在局部工作中推翻的架構決策。
- [`../demo/docs/DATA_MODEL.md`](../demo/docs/DATA_MODEL.md)：已驗證的產品規則與資料不變量。
- `demo/src/domain.ts` 與現有測試：正式後端規則的行為規格來源，不直接當 production implementation。

## 2. 目標系統

```text
Coach Web/PWA ─┐
               ├─ HTTPS / JSON ─> Fastify modular monolith ─> Supabase PostgreSQL
Public pages ──┘                         │
                                        ├─ Supabase Auth / JWKS
                                        └─ Worker（通知需求出現後才啟用）
```

### 模組與 Interface

| Module               | 對外 Interface             | 隱藏的實作責任                                             |
| -------------------- | -------------------------- | ---------------------------------------------------------- |
| Identity & Workspace | 驗證 Coach、解析 Workspace | Supabase JWT、workspace bootstrap、租戶隔離                |
| Student & Lesson     | 學生與堂數的完整操作       | Student、Lesson Purchase、餘額推導、刪除後果               |
| Scheduling           | 建立／移動／完成／取消課堂 | 衝突、固定排程、可用時間、交易與並行控制                   |
| Training             | 保存一堂課的訓練成果       | 動作快照、組別結果、歷史與最佳表現推導                     |
| Public Access        | 發行與兌換 Capability Link | token hash、到期、撤銷、單次使用、公開投影                 |
| Notification         | 排程與追蹤通知             | outbox、重試、LINE／Email adapter；需求出現前不啟用 Worker |

每個 Module 應提供完整業務操作，而不是把資料表 CRUD 直接暴露給前端。HTTP、PostgreSQL、
Supabase Auth 與記憶體測試版本是位於 seam 的 Adapter；測試與呼叫端共用同一個 Interface。

### 全域資料與並行規則

- 所有正式 ID 使用 UUID；每個業務資料列都能追溯到 Workspace。
- Browser 不可指定或覆寫 `workspaceId`；後端由已驗證的 `auth.users.id` 推導。
- 金額若加入，一律使用整數最小貨幣單位並記錄幣別，不使用浮點數。
- 交易敏感操作在單一資料庫 transaction 內完成。
- 可被多裝置同時修改的 aggregate 使用 `version` 做 optimistic concurrency；衝突回傳給教練決定。
- 排程衝突與堂數不足是可見警告，除非產品規則另有明文，不自動阻擋、搬移、取消或補救。
- 私人備註預設不進入公開 projection；只有明確 opt-in 的課堂分享備註可以公開。
- Capability token 只保存不可逆 hash；原始 token 僅在發行當下回傳一次。
- 資料刪除、保留期與匯出在 Beta 前定案；正式資料不以無文件的 cascade 行為處理。

## 3. 交付策略

採垂直切片：每個里程碑必須從 UI／HTTP Interface 穿過 Module 到資料庫，並以測試和可操作
的驗收流程證明。先搬低並行風險資料，再搬排程與公開連結；Demo 在完成資料遷移驗收前保持
獨立可執行。

狀態只記在 [`PROJECT_STATUS.md`](PROJECT_STATUS.md)。本文件只在範圍、順序、依賴或完成
條件改變時更新。

## 4. 里程碑

### M0 — Repository 與產品契約

**目的**：保存已驗證 Demo，建立正式產品的邊界與詞彙。

**內容**

- 將現有 React 原型保留為獨立 `demo/`。
- 建立根目錄 workspace、`CONTEXT.md`、Architecture 與 ADR。
- 凍結 `form-coach-mvp-v1`，所有舊資料變更維持顯式 migration。
- 建立 Roadmap、Project Status 與跨對話接手流程。

**完成條件**

- Demo 可獨立安裝、檢查、建置及啟動。
- 根目錄與 Demo 的責任清楚，正式產品不直接修改 Demo store 作為後端替代品。
- 新對話只讀 repository 文件即可指出當前里程碑、下一動作與已知 blocker。
- 形成可供後續 worktree 分支的乾淨 Git baseline。

### M1 — Cloud foundation tracer

**依賴**：M0。

**目的**：證明真實 Coach 身分可以安全穿過 Web、API 與 PostgreSQL，且無法越過 Workspace。

**內容**

- Supabase development project、Auth、PostgreSQL 17 與 CLI migration workflow。
- `app_private` schema、最小權限 group role 與專用 runtime login。
- Supabase JWKS 驗證；驗證 signature、issuer、audience、expiry 與 subject。
- Workspace bootstrap、Student list/create 的深模組與 memory/PostgreSQL adapters。
- React Web/PWA 登入、學生清單、新增學生與同源 `/api` proxy。
- 建立 development Coach，完成真實端到端驗證及第二 Coach 的租戶隔離測試。
- CI 至少執行 formatting、typecheck、tests、production build 與 migration dry-run。

**完成條件**

- 專用 runtime role 可連線，但無法讀取其他 schema 或取得 migration 權限。
- 真實 Supabase access token 可完成「登入 → bootstrap Workspace → 新增 → 重讀 Student」。
- 無 token、過期 token、錯誤 audience 皆為 401；前端傳入 `workspaceId` 被拒絕。
- 兩個 Coach 的資料不可互讀；自動測試與一次真實遠端測試均留下證據。
- Security Advisor 0 errors／0 warnings；Performance Advisor 無需立即處理的 error／warning。
- 所有 secrets 只存在 Git 忽略的本機或部署環境 secret store。**已核准的 M1 例外**：2026-09-09 曾在
  對話中暴露的 development database password 與 Auth secret key，使用者明確接受不輪替；值不在 Git
  或公開 payload，風險必須持續記在 `PROJECT_STATUS.md`，且不得以此例外放寬 M8 的全量輪替門檻。

### M2 — Coach account operations

**依賴**：M1。

**目的**：把測試登入提升為可供真實教練安全使用的帳號生命週期。

**內容**

- V1 採公開自助註冊：Coach 以唯一 Email 與自訂密碼建立帳號，Email 必須使用六位 OTP 驗證；管理端
  建立帳號只限 development／test。
- Google OAuth 納入正式登入方式。已驗證的相同 Email 會連結為同一個 Coach identity；若帳號僅有
  Google identity，Coach 應先以 Google 登入後從帳號安全設定密碼。已核准例外：公開註冊會先查詢
  既有 Email，並明示「此帳號已經註冊過。」；使用者接受這會揭露帳號是否存在的 enumeration risk。
- Email 驗證、密碼重設、登出所有裝置及帳號刪除流程。Coach 要求刪除後進入 14 日倒數，可取消；
  倒數期間可明確選擇立即刪除，期限屆滿則自動刪除。連續 365 天未有活動的帳號不寄提醒、直接
  自動刪除。三條刪除路徑都永久移除 Coach 的 Supabase Auth user 與該 Coach Workspace
  擁有的全部資料，不提供保留、匯出或復原副本。活動定義為成功完成的已驗證產品 API operation；
  token refresh、背景心跳與只讀取帳號刪除狀態均不計入活動。
- 在 SMTP 每日 300 封限制下，只允許註冊 Email 驗證碼與密碼重設兩種郵件；不得啟用
  Supabase password／identity 等 security-notification emails，或新增未經核准的應用寄信種類。
- 以上倒數與閒置處理需要每日排程；以 Supabase `pg_cron`／`pg_net` 呼叫受專用高熵 token 保護的 Edge
  Function。刪除 Auth user 前必須先撤銷所有 session，並由 server-only credential 執行，瀏覽器不得取得
  管理權限。
- Workspace settings：顯示名稱、時區與必要偏好；授權仍以不可編輯的 user ID 為準。
- Auth redirect allowlist、rate limit、CAPTCHA／自訂 SMTP 的啟用門檻。
- Session 與安全事件處理；敏感操作需要時檢查 `session_id`。

**完成條件**

- 自助註冊、Email OTP 驗證、Email／密碼登入、Google 登入與同 Email identity linking、refresh、reset、
  logout、delete 的成功與失敗路徑都有測試；Google provider 啟用後須完成真實 E2E。
- 使用者可編輯 metadata 不參與授權。
- 帳號刪除的資料後果、保留期及恢復限制有文件與確認畫面。
- 每日閒置刪除排程以隔離帳號驗證：365 天門檻、14 日期滿、取消、失敗回報與不重複執行。
- 桌面與 390px 實際驗證完成。

### M3 — Student & Lesson entitlement

**依賴**：M1；可與 M2 的 UI 工作部分並行，但共用 schema migration 必須序列化。

**目的**：正式搬移學生資料、購課與剩餘堂數。

**資料模型**

- `student`
- `lesson_purchase`
- Course Session 的最小狀態欄位，以便正確推導已使用堂數

**業務操作**

- 建立、編輯、封存、刪除 Student，明確顯示刪除後果。
- 登錄 Lesson Purchase；餘額由 purchase 與 completed session 推導，不直接改 balance。
- 學生詳情回傳畫面所需 projection，不由前端拼湊多張資料表。
- 保留私人備註不可公開的不變量。

**完成條件**

- 「剩餘堂數 = 購買堂數 − 已完成課堂」在 domain、repository 與 HTTP 層都有測試。
- 負數／低堂數可見但不自動修正。
- 兩個 Coach 的 list、detail、update、delete 均驗證隔離。
- Demo Student 與 Lesson Purchase 有可重跑、可預覽、具 checksum 的 migration mapping。
- UI 與 Demo 已驗證流程一致，桌面與 390px 通過。

### M4 — Scheduling

**依賴**：M3。

**目的**：以交易與並行控制搬移排程，是第一個高風險資料切片。

**資料模型**

- `course_session`
- `schedule_series`
- `availability_rule`
- `availability_override`
- `calendar_block`

**業務操作**

- 建立、移動、完成、取消 Course Session。
- 固定排程只向未來補足剩餘堂數，不回填過去。
- 可用時間加減、單日 override、私人封鎖與衝突 projection。
- 寫入時以 transaction 重新檢查版本、堂數與衝突；衝突結果交由 Coach 決定。

**完成條件**

- Demo DATA_MODEL 中所有排程不變量都有後端測試。
- 兩裝置同時移動／完成同一課堂時，一方成功，另一方收到可理解的 conflict。
- 固定排程 reconciliation 可重跑且不產生重複課堂。
- Calendar day/week/month、拖曳與手機流程通過實際驗證。
- 資料 migration dry-run 顯示筆數、衝突與拒絕原因，不靜默丟棄資料。

### M5 — Training

**依賴**：M3；與 M4 的 UI 可並行，涉及 Course Session 外鍵的 migration 需協調。

**目的**：搬移訓練紀錄並保留即時輸入與離頁不遺失體驗。

**資料模型**

- `exercise_definition`
- `training_record`
- `training_exercise`
- `training_set`

**業務操作**

- 動作庫建立、編輯、封存與篩選。
- Training Exercise 保存名稱、metric 與 definition identity 快照。
- Training Record draft autosave、離頁 flush、server version conflict。
- 只有 `completed` set 進入 previous、personal best、趨勢與動作統計。

**完成條件**

- kg/lb 換算、weight/reps metric、歷史匹配與 completed gate 測試完整。
- 網路中斷時草稿留在 IndexedDB；恢復後由 Coach 可見地重送。
- 多裝置衝突不做 last-write-wins 靜默覆蓋。
- 私人 note 不出現在預設分享 projection。
- 課堂頁與學生表現頁在桌面及 390px 通過。

### M6 — Public capability links

**依賴**：M4；Training result link 另依賴 M5。

**目的**：讓無帳號 Student 安全讀取一項 projection 或執行一項操作。

**資料模型與安全**

- `capability_link`：purpose、resource、token hash、expires/revoked/used timestamps。
- 原始 token 不寫 logs、analytics、資料庫或 browser storage。
- 每一 purpose 使用獨立 projection 與 redemption operation。

**業務操作**

- 發行、撤銷、到期與重新發行連結。
- 公開訓練結果讀取；note 僅在該連結 `includeNote` 明確開啟時加入。
- 改期候選時段與單次兌換；transaction 內重新驗證 availability、block 與 conflict。
- 公開入口 rate limit、濫用監控與安全回應。

**完成條件**

- valid、expired、revoked、used、tampered 與競爭兌換都有測試。
- 同一單次 token 的並行 redemption 最多一個成功。
- 公開 payload 有欄位 allowlist 測試，Student private note 永遠缺席。
- Coach 已開啟畫面能收到或重新抓取公開操作結果。

### M7 — Local resilience and migration

**依賴**：M3–M6 的目標 schema 穩定。

**目的**：安全接管現有 `form-coach-mvp-v1`，並提供有限、可理解的斷線保護。

**內容**

- IndexedDB 僅保存草稿、快取、待送 operation 與 UI preference。
- 每種待送 operation 明定 idempotency key、重試、取消與衝突處理。
- 建立 Demo export → validate → preview → import 流程；保留來源備份與 migration report。
- migration 順序：settings/exercises/students → purchases → training → scheduling → capability links。
- 切換前不更名或清除 `form-coach-mvp-v1`；清除需使用者明確確認。

**完成條件**

- 中斷／重連／重複送出／部分成功／版本衝突有自動化與實際測試。
- 匯入可重跑，不重複建立；每個拒絕項目有原因。
- 原始 localStorage 備份在使用者確認前可恢復。
- 正式畫面不再把 localStorage 當 System of Record。

### M8 — Deployment and Beta readiness

**依賴**：至少 M1–M7 的 Beta 範圍完成。

**目的**：從可開發系統提升為可供外部教練試用且可營運的服務。

**環境與交付**

- Local、Staging、Production 使用不同 Supabase projects、Auth 設定與 secrets。
- 選定 Web/API hosting；同網域 `/api` 路由、TLS、custom domain 與 deployment rollback。
- CI：format、typecheck、tests、build、migration lint/dry-run、依賴與 secret scan。
- migration 與應用部署分離；向後相容後再移除舊欄位。

**營運與安全**

- 結構化 logs、request ID、error tracking、uptime、DB/pool 指標與告警。
- 自動備份、恢復文件及至少一次 staging restore drill。
- Privacy policy、資料匯出、帳號刪除、保留期與事件處理流程。
- 公開端點 rate limits；Security/Performance Advisor 與 dependency audit 納入 release gate。
- 公開註冊的 Email canonicalization／normalization：只對有明確、已驗證語意的 provider 規則處理別名，
  保留原始 Email 作為通知地址；不得以全域移除 `+`、`.` 等猜測規則誤合併不同收件者。與 rate limit、CAPTCHA、
  device／network abuse signals 一起驗證，避免子位置指定被用於重複優惠、免費額度或假帳號濫用。
- 建立最小 audit events；避免把學生內容與 token 寫入 logs。

**完成條件**

- 全新環境可由文件與 automation 重建。
- staging smoke、production smoke、rollback 與 restore drill 都有日期及證據。
- 至少一位真實試用 Coach 完成核心流程；問題分級並有退出 Beta 的標準。
- 無 P0/P1 問題、無未處理 Security Advisor error/warning、所有 secrets 已輪替。

### M9 — Post-V1 options

完成 Beta 後才評估，不能提前侵入核心里程碑：

- LINE／Email／Push 通知與 Worker/outbox。
- Capacitor、App Store、Google Play。
- 商業訂閱與線上付款。
- 工作室、多 Coach membership 與角色。
- 健康或醫療資料；如要加入，必須另做隱私、合規與資料最小化評估。

## 5. 決策門

以下問題到達指定里程碑前才需要決定；在此之前使用保守預設：

| 最晚時間    | 決策                               | 未決時預設                         |
| ----------- | ---------------------------------- | ---------------------------------- |
| M2 開始     | 教練帳號取得方式                   | 已定案：公開自助註冊＋Google OAuth |
| M2 完成     | 自訂 SMTP、CAPTCHA 與 session 限制 | 僅 development 環境可開放註冊      |
| M3 刪除功能 | 資料保留、復原與匯出政策           | 不提供不可逆批次刪除               |
| M7 開始     | 舊 Demo 資料的匯入 UX              | preview + explicit confirm         |
| M8 開始     | Web/API hosting 與網域             | 不建立 production 環境             |
| Beta 前     | 錯誤追蹤、監控、隱私文件與試用條款 | 不邀請外部 Coach                   |

## 6. 可並行與必須序列化

### 可並行

- 已凍結 HTTP contract 後的 Web UI 與對應 Module implementation。
- 不同 Module 的純 domain tests 與 adapter tests。
- 文件、監控設計與不改 schema 的部署 automation。
- Demo 的獨立 bug fix，前提是不改正式資料契約。

### 必須序列化

- Supabase migrations 與 migration history。
- 共用 aggregate／Interface 的變更。
- Demo import mapping 與正式 schema 的同步修改。
- production deployment、資料 backfill、欄位移除與 secret rotation。
- `PROJECT_STATUS.md` 合併；整合者必須解決而不是丟棄各分支日誌。

並行工作使用不同 Git worktree／branch；每個分支只負責一個清楚的 Module 或交付物。

## 7. 每個里程碑的共同完成門檻

一個里程碑只有在以下條件全部滿足時才能標為完成：

1. Interface、資料不變量、錯誤模式及授權規則有文件。
2. migration 可重跑或具明確一次性語意，且本機／遠端 history 一致。
3. domain、adapter、HTTP 的成功、拒絕、租戶隔離與並行風險有相稱測試。
4. 根目錄 `npm run check` 與 `npm run build` 通過。
5. 變更畫面在桌面與 390px 實際操作，沒有水平溢出或不可達功能。
6. Supabase schema 變更通過 lint 與 Security/Performance Advisors。
7. secrets、private note、capability token 與個資未出現在 Git、logs 或公開 payload。
8. `PROJECT_STATUS.md` 已更新：狀態、驗證證據、問題、下一個接手點與工程日誌。
9. 使用者可感知或架構行為改變時，對應文件與 ADR 已同步。
10. milestone 的交付 commit 已推送至 shared branch，且該 commit 觸發的 GitHub Actions CI
    （至少 verify 與 migration dry-run）已完成成功；本機檢查不能取代遠端 CI 證據。

## 8. Roadmap 變更規則

- 日常完成項目只更新 `PROJECT_STATUS.md`，不要在本文件堆積日誌。
- 工程對話不得自行修改本 Roadmap 的範圍、順序、依賴、產品基線或完成門檻。
- 發現 Roadmap 必須改動時，先停止受影響的工程，向使用者提出現況、建議差異、理由、影響
  與替代方案；只有取得使用者明確同意後，才能先修改本文件，再依新版本繼續工程。
- 推翻「已定案」內容除使用者明確同意外，必須同時新增 ADR，說明原因、替代方案與
  migration 後果。
- 新里程碑使用穩定 ID；已被日誌引用的 ID 不重新編號。
- 每次變更檢查 README、Architecture、CONTEXT 與 ADR 是否出現矛盾。
