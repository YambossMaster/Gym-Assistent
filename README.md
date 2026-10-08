# Gym Assistant

這個儲存庫用於開發可供多位私人健身教練使用的正式應用。正式產品採用本地端保持
順暢、後端保存權威資料的架構：React Web/PWA 負責互動與草稿，TypeScript 後端
負責身分、租戶隔離和正式操作，PostgreSQL 是唯一正式資料來源。

## 正式應用

正式產品位於 [`apps/api/`](apps/api/) 與 [`apps/web/`](apps/web/)。M0–M7 已完成；
M7.5 Stage 2、M8-A、M8-B、M8-B-Export 與 M8-B-Plan-Choice 已交付；Production internal Alpha
已建立，目前正進行 M8-D 的 Beta 權限與正式開放準備，尚未接納真實教練。產品目前包含：

- 可替換 Managed Auth 供應商的 OIDC/JWKS 驗證；
- 一位教練對應一個私有 Workspace；
- 不接受前端指定 Workspace 的學生建立與查詢；
- PostgreSQL schema migration；
- 本機開發身分 adapter 與租戶隔離測試。
- Supabase Auth、學生與課程權益、行事曆排課、訓練紀錄、公開能力連結；
- 場地與收支管理、可安裝的 Web App manifest，以及不快取 API 的 PWA shell。

目前的本機 Web/PWA 預覽不代表已通過實機驗收，也不是已部署的正式服務。發布順序與
商業 Beta 的付費方案、60 天進階優惠碼與永久資格規劃見 [`docs/ROADMAP.md`](docs/ROADMAP.md)；實際驗證與
下一個工作項目見 [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md)。

安裝與檢查：

```bash
npm install
npm run check
npm run build
```

變更範圍對應的驗證順序、隔離瀏覽器測試資料與提交前格式防呆，見
[`docs/VERIFICATION_WORKFLOW.md`](docs/VERIFICATION_WORKFLOW.md)。

開發時分別執行 `npm run dev:api` 與 `npm run dev:web`。Web 端只使用 Supabase 的
publishable key；資料庫密碼與 secret/service-role key 不得進入瀏覽器。

### Windows 一鍵入口

若只想直接進入現有正式應用，不必使用命令列：在根目錄雙擊
[`start-gym-assistant.cmd`](start-gym-assistant.cmd)。它會在首次需要時安裝依賴、開啟
API 視窗，確認本機 API 已可使用後，才在瀏覽器開啟 `http://127.0.0.1:5173`。
再次執行可補啟已關閉的 API 並重用既有 Web；若 API 無法啟動，入口會停下並提示查看
API 視窗的錯誤。使用期間請保留服務視窗開啟。
這是 development Supabase 環境，請勿輸入真實客戶資料。

若要在電腦上檢查手機版畫面，雙擊根目錄的
[`start-gym-assistant-mobile.cmd`](start-gym-assistant-mobile.cmd)。它沿用相同的服務啟動流程，
並開啟 `http://127.0.0.1:5173/mobile-preview.html`；應用會顯示在固定 390 × 844 的
可操作視窗內。這是桌機上的響應式預覽，實際觸控與手機瀏覽器行為仍需在手機上檢查。

資料庫設定與本機啟動方式請見 [`apps/api/README.md`](apps/api/README.md)。正式架構與
核心詞彙分別記錄於 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) 和
[`CONTEXT.md`](CONTEXT.md)；M2 的 Email OTP／Google OAuth 外部設定與驗收流程見
[`docs/AUTH_CONFIGURATION.md`](docs/AUTH_CONFIGURATION.md)。

## 工程接手

每個新工程對話先：

1. 讀 [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md)：精簡的目前進度、阻擋、必讀路由與下一接手點。
2. 執行 `git status --short`，保留既有未提交變更。
3. 按 Status 的 `Required context` 讀取當前工作包與 [`docs/ROADMAP.md`](docs/ROADMAP.md)
   指定章節；只有在依賴、回歸或歷史證據需要時才讀較早的 Milestone Status。

完成 code、schema、config 或架構變更後，依
[`docs/status/README.md`](docs/status/README.md) 更新當前工作包，必要時更新 Dashboard，並追加
當月 Engineering log。完整舊 Status 已封存但不再是每次啟動的必讀內容，因此不同對話仍可從
repository 接手，不需要依賴某一段聊天記憶。

## 現有展示版

先前完成的 React 前端展示版已完整收整至 [`demo/`](demo/)。Demo 是獨立的
React + TypeScript + Vite 專案，保留原有功能、測試、文件與
`form-coach-mvp-v1` 本機資料格式。

在 Windows 可直接執行：

```text
demo\start-gym-assistant.cmd
```

或使用命令列：

```bash
cd demo
npm ci
npm start
```

Demo 仍是獨立專案，不與正式產品的依賴、資料庫或建置流程混在一起。
