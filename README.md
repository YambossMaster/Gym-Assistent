# Gym Assistant

Gym Assistant（目前介面品牌為 **FORM Coach Desk**）是給私人教練使用的本機優先單頁應用程式。它包含今日課表、學生與購課管理、固定排程、日／週／月行事曆、訓練紀錄、動作庫、學生動作表現趨勢，以及具時效性的學生分享／改期頁面。每個動作可擇一使用重量或次數作為最佳表現指標；只有成功完成的組別會進入最佳紀錄。教練可從課堂查看本次、上次與個人最佳，也可從學生詳情集中查看所有動作的上次、個人最佳與歷史趨勢。行事曆會依固定排程補齊學生剩餘堂數，並在週檢視同時呈現可排課與私人時段。

課堂中的訓練紀錄會在內容變更後自動儲存；若教練立即離開頁面，尚在等待中的變更也會先完成保存。課堂頁首的學生頭像與姓名可直接前往該學生的詳情頁。

目前是可編輯的 React + TypeScript + Vite 專案，不是只能重新生成的靜態成品。每個主要功能頁都有獨立原始碼，因此可在 VS Code、WebStorm 或其他 TypeScript IDE 中針對局部修改。

## 開始使用

需求：Node.js 20 以上與 npm。

### Windows 一鍵入口

在專案根目錄雙擊 `start-gym-assistant.cmd`。它會在需要時安裝依賴、啟動本機伺服器，並自動開啟 `http://127.0.0.1:5173/today`。使用期間請保留命令視窗開啟；關閉視窗即會停止本機伺服器。

`index.html` 是 Vite 的建置模板，不是可直接雙擊執行的靜態網頁。若直接開啟，它只會顯示正確啟動方式。

### 命令列入口

```bash
npm ci
npm start
```

`npm start` 會自動開啟應用；開發時若不想自動開瀏覽器，也可使用 `npm run dev`。正式檢查與建置：

```bash
npm run check
npm run format
npm run build
npm run preview
```

## 常用修改位置

- 頁面與功能流程：`src/pages/`
- 共用介面元件：`src/components/`
- 排程、衝突、堂數等純邏輯：`src/domain.ts`
- 本機資料與操作：`src/store.tsx`
- 資料型別：`src/types.ts`
- 示範資料與動作目錄：`src/seed.ts`、`src/exerciseCatalog.ts`
- 全域視覺樣式：`src/styles.css`
- 路由組合：`src/App.tsx`

更多細節請見 [架構](docs/ARCHITECTURE.md)、[資料模型](docs/DATA_MODEL.md)、[開發流程](docs/DEVELOPMENT.md)與[測試規則](docs/TESTING.md)。

## 目前邊界

資料保存在瀏覽器 `localStorage`，目前沒有後端帳號、雲端同步或真正的 LINE OA 整合。分享連結也是 MVP 級本機資料能力；清除瀏覽器資料或換裝置後不會自動同步。
