# Gym Assistant

這個儲存庫用於開發可供多位私人健身教練使用的正式應用。正式產品採用本地端保持
順暢、後端保存權威資料的架構：React Web/PWA 負責互動與草稿，TypeScript 後端
負責身分、租戶隔離和正式操作，PostgreSQL 是唯一正式資料來源。

## 正式應用

第一條可執行的正式垂直切片位於 [`apps/api/`](apps/api/) 與 [`apps/web/`](apps/web/)，目前提供：

- 可替換 Managed Auth 供應商的 OIDC/JWKS 驗證；
- 一位教練對應一個私有 Workspace；
- 不接受前端指定 Workspace 的學生建立與查詢；
- PostgreSQL schema migration；
- 本機開發身分 adapter 與租戶隔離測試。
- Supabase Auth 登入殼、學生清單與新增學生；
- 可安裝的 Web App manifest 與不快取 API 的 PWA shell。

安裝與檢查：

```bash
npm install
npm run check
npm run build
```

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

每個新工程對話都先讀：

1. [`docs/ROADMAP.md`](docs/ROADMAP.md)：里程碑、依賴、工程順序與完成門檻。
2. [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md)：目前進度、已知問題、驗證證據與下一接手點。

完成 code、schema、config 或架構變更後，必須更新 Project Status 並追加 Engineering log。
因此不同對話可以從 repository 接手，不需要依賴某一段聊天記憶。

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
