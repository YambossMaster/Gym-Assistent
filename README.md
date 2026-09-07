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

資料庫設定與本機啟動方式請見 [`apps/api/README.md`](apps/api/README.md)。正式架構與
核心詞彙分別記錄於 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) 和
[`CONTEXT.md`](CONTEXT.md)。

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
