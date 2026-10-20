# M8-E 支付上線 Status — 當前規則與決定性驗證

> 更新：2026-10-20（台北）。這是支付工作目前唯一的執行清單；R01–R17 的範圍仍由
> [`ROADMAP.md`](../../ROADMAP.md) 與 [`M8-E-IMPLEMENTATION-CONTRACT.md`](../../M8-E-IMPLEMENTATION-CONTRACT.md)
> 管理。PO 已於 2026-10-17 要求繼續逐項解決；以下記錄恢復後的聚焦證據。
> 改寫前的 500 行逐次紀錄存於
> [`archive/M8-E-2026-10-17-pre-priority-rules.md`](../archive/M8-E-2026-10-17-pre-priority-rules.md)；
> 真實交易細節另見 [`M8-E-LOCAL-CHECKOUT.md`](../../M8-E-LOCAL-CHECKOUT.md) 和
> [`2026-10 月工程日誌`](../log/2026-10.md)。歷史說法不得覆蓋本頁的最新決定。

2026-10-20 棄單結帳恢復已透過 [PR #66](https://github.com/YambossMaster/Gym-Assistent/pull/66)
合併 Main `dae474fae96b3d6f08f6726b55e2ae69ad1c62cd`；
[Main CI #292](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39406922712) 與
[Production release #12](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39407408898)
通過，migration `20261019111117` 與 Fly 同版部署均已讀回。此工作流的 7/7 與未刻意驗證的
少見舊 URL 個案見[專屬 Status](M8-E-CHECKOUT-RECOVERY.md)。固定 R 清單仍是 15 項通過、
R08 條件結案、R09 部分；已發生的 Test Mode 自然續扣與未驗範圍見下節。

### 2026-10-20 21:30 R09 自然續扣追查與已付後取消修正（branch-local；R09 仍部分）

- **更正 10/19 讀回：** Test Mode 原 owner 訂閱 `2617411` 的自然續扣發票 `8765177` 在 10/19 13:01:43Z 建立時為 pending，於 14:03:47Z 已轉為 paid，TWD 114.89。上一輪只查到 13:15Z，因而漏報這個後續變化；「仍待事件」已不是準確狀態。供應商 Test webhook 指向失效暫時網址，Development 未收到本次真簽章事件。10/20 10:49Z 帳本仍只有首張已付發票與截至 10/19 13:01:11Z 的 initial period，故未自動延權。
- **隔離補償與原因：** 僅使用 Development worker 與原 `intent_id`／workspace 綁定處理該訂閱和發票；先核對 provider 的 store、Test Mode、subscription、customer、variant、paid／renewal 與原 quote。日繳診斷 variant `2250530` 與標準 Pro 月繳 variant 不同，初次以標準設定處理時兩筆事件均以 `period_variant_mismatch` 安全拒絕；重新核對原 quote 為 `basic/month`、原訂閱帳本也是 `2250530` 後，才以僅限本次的 Test worker 映射重試。兩事件完成、發票 ledger 入帳，但原期間判定要求訂閱仍 active；該筆先取消下次續扣，隨後 provider 到期為 expired，故當時仍未建續期期間。
- **修正與直接實證：** 本分支從 Main `1fc4b28` 只改 `period-authority.ts` 與聚焦測試：有匹配的正額 paid renewal invoice，且取消未縮短已付週期時，允許取消或到期狀態重建該週期；pending／錯 owner、variant、金額、終點仍不能延權。authority 26/26、lifecycle 27/27 及其餘 recovery／access 聚焦測試通過，API typecheck 通過；首次合併測試有一個與本改動無關的 5 秒 Fastify 測試逾時，單檔重跑通過。修正後以同一原 owner 及 Test provider 重新處理 `8765177`，Development 實得唯一 `renewal:8765177` 期間，2026-10-19 13:01:11Z 至 2026-10-20 13:01:11Z。10/20 13:29Z 查得唯一期間數 1、目前有效期間 0，符合已取消且到期的狀態。本次沒有 Production 資料、Live 訂閱或新 Test 交易變更。
- **既有行為影響：** `renewalPeriod` 由 billing inbox worker 共用，影響正常 active 續扣、取消後晚到已付發票與 expired 後漏送補償。須保留 active paid 建期、pending／失敗不延權、跨 owner／錯價格拒絕、重放唯一期間；對應聚焦 authority／worker／access 回歸及這筆 Development 讀回。Web 與 schema 未改；Production 真實正額首扣及 Coach 在有效期間的 UI 權益仍沒有本次實證。
- **清單與下一步：** 固定 R01–R17 仍為 15 通過、R08 條件結案、R09 部分。完成受影響測試及同版審查後依既有授權交付此程式修正，核對 exact-SHA CI／部署；再於另一筆仍在有效期間內的自然原始試用首扣或續扣事件，核對真簽章或明確標示的補償、原 owner 唯一期間及 Coach 權益。正常月／年週期、Live 正額收款不能由此日繳診斷取代。

## 2026-10-19 PO 上線時序決定與目前總清單

### 2026-10-19 18:25 R14 候選同版合併部署與正式讀回

- **範圍與審查：** PO 已授權合併並部署。相對發布前 Main `7b3923a` 的 25 檔差異只在支付 API、方案／結帳／付款狀態、付款法律文案、本地支付預覽與 M8-E 文件；沒有 App Shell、其他 Coach route、共用設計 token、migration 或相依套件變更。永久 Prime 的方案比較與不可變更守衛、一般首次一個月試用、既有付款意圖的待確認／成功邊界與手機留白是直接影響面；相鄰付款狀態頁與一般方案頁一併讀回。兩軸審查未發現阻擋發布的程式／規格問題。Main 新增的 Live 取消文件保留，R01／R14 的舊「部分」列由較新的 PO 驗收取代。
- **同版檢查與部署：** 整合分支 `94898e5` 的本地 `npm run check` 通過根腳本 38/38、API 63 檔 376/376、Web 94 檔 422/422，`npm run build` 成功。[PR #61](https://github.com/YambossMaster/Gym-Assistent/pull/61) 的 [CI #279](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39236105348) 全綠，合併為 Main `a12e5a5b6e1c26e363f3c2fb42835ff48bff15db`。[Main CI #280](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39236640713) 的 verify、browser-ui、migration-dry-run、Production migration preview 與 deploy-production 全部通過；無新增 migration。Fly `formcoachdesk` 啟動機器的映像標籤 `GH_SHA` 為同一 Main SHA，service check passing。
- **獨立正式讀回：** `https://formcoachdesk.com/api/ready`、`/`、`/login`、`/plans` 均 HTTP 200；正式 HTML 載入新版 `index-Cn_XxceG.js`／`index-tsk_4tIb.css`。已登入一般帳號的方案頁保留 Free／Pro／Prime 與月年切換，Prime 賣點只列「收支報表」；既有未確認的 Prime 年繳意圖進入「正在確認你的訂閱」並提醒不要再次付款，沒有另建交易。正式 `/payment-notice` 顯示新付款與帳單文案、支付服務商說明、原生一個月試用，沒有優惠碼段落；Chrome 390px 量測 `scrollWidth=375 < innerWidth=390`，無水平溢出。這次沒有進行新的 Live 付款，亦未在正式永久 Prime 帳號重新操作方案選擇；後者的 PO 本地驗收、API 守衛與同 SHA 部署為沿用證據。
- **固定清單／下一步：** **R01–R07、R10–R17 共 15 項通過；R08 條件結案；R09 等原訂閱自然首扣／續扣事件後補。** 付費優惠碼 C01 已撤回，正式頁面維持關閉。無需 PO 現在操作；在自然事件發生後讀回 Lemon 發票、簽章事件、owner 帳本與權益，再補 R09。此段為 Main 已合併部署的正式證據，下面較早的「待推送／待驗收」段落只保留歷史脈絡。

### 2026-10-19 18:05 PO 授權整合與部署，對齊最新 Main

- **授權與範圍：** PO 明確同意將已驗收的支付候選合併並部署，R09 仍依自然事件後補；要求核對新改動是否誤傷既有功能、版面及穩定性。候選 `fe2d332` 已在隔離工作樹完成完整本地 check／build。最新 `origin/main` 為 `7b3923a`，相對舊基準只增加 M8-E Live 取消的正式文件；無程式碼或 migration 變更。
- **合併檢視：** 相對 Main 的候選差異限支付 API、方案／付款／帳單 route、隔離預覽與 M8-E 文件；未改 App Shell、共用設計 token、其他 Coach route 或 migration。只在本檔 R01／R14 驗收狀態與 Main 舊紀錄有內容衝突，已逐項保留最新 PO 結論；Main 的交易、取消及工程日誌紀錄保留。`checkout-page` 手機內距也供付款狀態頁使用，整合後須特別讀回該頁。Main 總覽依狀態協定待實際合併與發布證據成立後更新。
- **下一步：** 完成衝突解決的本地整合提交，重跑整合版檢查／建置與必要的 390px 付款狀態確認；推送既有 M8-E 分支，取得 PR 精確 SHA CI 後合併；依部署工作流程核對 Production migration、Fly 同 SHA 與正式路徑讀回。若新證據出現阻擋性回歸，先修正再發布。

### 2026-10-19 17:52 R14 手機畫面驗收與本地完整檢查

- **PO 驗收與結論：** PO 已接受修正後的 390px 結帳與付款須知底部留白，並指示繼續完整驗證。R14 既有 Test Mode／Live 真卡、唯一 owner／invoice、取消續訂與同版桌機／手機流程證據，加上本次 PO 畫面確認，已滿足本地驗收判準；R14 改列通過。此次沒有新增真實付款或正式站部署。
- **最終候選檢查：** 留白修改後重新執行根命令 `npm run check`，exit 0：格式、根腳本 38/38、API 63 檔 376/376、Web 94 檔 422/422 與型別檢查通過；`npm run build` 的 API／Web 建置成功。390px 本地瀏覽器已量測結帳卡片至頁底 32px、付款須知卡片至頁底 16px，工具列顯示時不變，兩頁無水平溢出。Vite 僅提示既有主 bundle 超過 500 kB，沒有建置失敗。
- **固定清單與下一步：** R01–R17 現為 **15 項通過、R08 條件結案、R09 依自然事件後補**；撤回的 C01 不列入待驗。此結果只屬目前隔離工作樹候選，尚未推送、進行此候選精確 SHA 遠端 CI 或正式部署讀回。先整理本地提交與最終差異，之後依 `AGENTS.md` 的遠端交付規則，列出提交、檢查、缺口與確切推送動作，取得 PO 另行授權後才推送。

### 2026-10-19 17:43 R14 手機頁底部留白修正（待 PO 檢視）

- **回饋與原因：** PO 檢視 390px 結帳和付款須知後，除底部留白太大外，其餘畫面接受。量測顯示本地驗收工具列在手機固定於底部，預覽頁的 `main-content` 因此額外預留 120px；這段只屬本地預覽。正式結帳頁本身另有 84px 手機底部內距，付款須知本身只有 16px。
- **修正與聚焦證據：** 手機本地驗收工具列改為頁面上方的一般區塊，不再要求底部預留；正式結帳底部內距縮為 `32px + safe-area-inset-bottom`，結帳頁無訊息時的回饋預留從 48px 縮至 28px。390px 本地瀏覽器實測，結帳卡片至頁底 32px、付款須知卡片至頁底 16px，工具列顯示時也同值，兩頁無水平溢出。更新版截圖已供 PO 檢視。兩份 CSS Prettier、Web typecheck、`git diff --check` 通過；首次 typecheck 因沙盒拒寫 tsbuildinfo 失敗，改用已核准的工作樹執行後通過。
- **界線／下一步：** 這是 R14 同版畫面修正，R14 仍部分，待 PO 確認縮短後的 390px 畫面。上一節完整 check／build 的綠燈屬留白修改前版本；PO 接受新畫面後依既有 gate 補驗，不宣稱新版本已通過完整 gate。沒有真實付款、Production 部署或 R09 自然事件變更。

### 2026-10-19 17:34 R14 同版本地完整驗證與 C01 清理

- **範圍與結果：** PO 同意修訂文案進入完整驗證。本地 5173 合成預覽在桌機 1280px 與手機 390px 走過方案→首次 Pro 月繳確認→模擬授權→付款狀態→帳單；另檢視取消續訂確認與取消後狀態。首次 Pro／Prime 月年四種摘要均顯示 1 個月試用、今天 NT$0 與各自標準首扣；再次訂閱顯示當次扣款、不重給試用。三個法律連結可到達付款須知、隱私權政策與服務條款；三頁無優惠碼文案，付款須知顯示新版支付服務商說明。
- **390px 與永久資格：** 上述畫面、取消對話框與法律頁沒有整頁水平溢出。永久 Prime 保留 Free／Pro／Prime 三張橫向可捲動的卡及月年價目，明示永久資格，沒有選擇方案操作；Prime 只列收支報表、不重複列匯出。取消確認說明原期限及到期回 Free，模擬取消後顯示已取消續訂、保留至原期限、不再扣款。首次自動化勾選同意失敗屬方案到結帳非同步導覽的檢查時序；等待路由與報價完成後，同一模擬流程成功，未發現產品缺陷。
- **交付清理：** 已移除隔離工作樹中已撤回 C01 的候選 migration、促銷 worker、客製價格／折扣欄位與顯示碼輸入的樣式和測試期望；來源與 migration 不再含 `billing_promotion_claim`、`drinkmorewater` 或促銷 variant 設定。保留 Lemon checkout `discount: false`、永久 Prime 方案變更的 API 防護及既有免卡 Beta 資格。清理後 5173 再讀回首次試用與永久 Prime 畫面一致。清理時舊 Lemon 測試的兩個期望仍要求優惠碼顯示，已改為禁用，聚焦 14/14 與 API 全套 63 檔 376/376 通過；Web 全套 94 檔 422/422 通過。
- **檢查與界線：** 清理後根命令 `npm run check` 單次 exit 0：格式、根腳本 38/38、API 63 檔 376/376、Web 94 檔 422/422 與型別檢查均通過；`npm run build` API／Web 成功，`git diff --check` 無空白錯誤。既有 Test Mode／Live 真卡、唯一 owner／invoice 與取消證據沿用，沒有新交易或改動正式訂閱。本地模擬不證明尚未發布的新版正式站；精確 SHA CI／正式部署與讀回也尚未執行。
- **計數／下一步：** R01 維持通過，R08 條件結案，R09 等自然事件；R14 的代理端同版本地檢查完成，仍待 PO 檢視此版 390px 畫面後才可列通過。清理後候選版不含 C01 程式與 migration。遠端推送／部署需另行授權。

### 2026-10-19 16:41 R14 PO 畫面回饋與付款文案微調

- **PO 檢視：** PO 已看過本地 R14 方案／結帳／付款須知，除兩處文案微調外表示其餘沒有問題；此為對舊一版的畫面回饋，修正後版本仍待 PO 確認可進入完整驗證。R14 不因此直接改列通過。
- **本地修正與讀回：** 結帳底部共用提醒改為「實際付款與帳單金額可能與頁面標價略有不同」；付款須知「手續費與換匯說明」首次將 Lemon Squeezy 介紹為支付服務商，保留美元換算、發卡行費用及本站不另加收訂閱處理費。同步更新付款須知原稿。本地 5173 結帳與付款須知實際讀回新文案；Web typecheck、Prettier、diff whitespace 通過。正式站尚未部署；原有 Test Mode／Live 卡付款與取消證據沿用，不新增交易。

### 2026-10-19 16:30 PO 決定暫不開放 Lemon 付費優惠碼

- **範圍／計數：** PO 撤回 C01 的付費優惠碼商業要求，本輪只保留既有首次 Pro／Prime 訂閱的 Lemon 原生 1 個月免費試用。C01 從可執行待驗項移除，不新增 R 門檻；R01 已通過、R08 條件結案、R09 自然事件及 R14 最終畫面驗收仍待完成。既有免卡 Beta 資格和永久 Prime 不受影響。Roadmap 與 Contract 已附上明確較新決定，下方 C01 候選及原生優惠碼記載均為歷史，不再是待發布要求。
- **本地關閉證據：** API quote 對任何 `code` 值回 `discount_unavailable`，舊候選優惠 quote 在建立 checkout 前被拒；Lemon checkout payload 的 `discount` 為 false，provider 對候選 introductory-price quote 也拒絕。Web 結帳不再提供輸碼欄、套用或九折展示；付款須知、服務條款中英文字及付款須知原稿移除付費優惠碼句子。5173 合成首次 Pro 月繳畫面讀回 1 個月免費體驗、今天 NT$0、預計首扣標準 NT$115，付款須知沒有優惠碼段落。API 聚焦 26/26、Web CheckoutPage 14/14、API／Web typecheck 通過。這些只證明本地候選，未部署 Production；原 C01 未發布程式與候選 migration 尚留在隔離工作樹，不得併入下一次交付，須於整合前清除。

### 2026-10-19 16:12 PO 更正永久 Prime 呈現；C01 原生優惠待選

- **R14 永久 Prime 本地候選更正：** PO 明確要求保留 Free／Pro／Prime 三卡、價目及月年切換供比較，只禁止永久 Prime 帳號選擇或變更方案，並清楚顯示永久資格；Prime 卡精簡為「收支報表」，移除重複的「收支明細匯出」賣點，不移除產品原有匯出能力。已撤回下段 15:37 的單卡候選，保留前端選擇守衛與 API `permanent_access` 拒絕；本地 `PlansPage` 聚焦測試 2/2、Web typecheck、Prettier 及 diff whitespace 通過。5173 合成「永久 Prime」畫面實際讀回三卡、月年切換、永久提示及 Prime 報表條目，方案卡無選擇操作；該本機預覽分頁已保留給 PO 檢視。正式站尚未部署，同版 PO 畫面驗收仍歸 R14 部分。
- **C01 決策待 PO：** 已核對 Lemon 官方折扣碼原生設定：百分比／固定額、指定 variants、起迄日、總兌換上限，以及訂閱 `once`／`repeating`／`forever`。官方未列本站帳號單次、首筆正額才消耗等內建設定；先前 Test Mode 已實測零元試用單即消耗 `once`／`repeating` 兌換、首張正額發票折扣 0。PO 要先選擇符合供應商原生能力的商業規則；既有 C01 首筆實扣九折本地候選保留但不擴大實作、驗證或開放 Live，待決策後修正 Contract／狀態。

### 2026-10-19 15:37 R01 合約驗收與本地入口修復

- **R01 通過（產品／Contract 判準）：** PO 本輪再次明確表示已檢視並接受原有支付產品行為與文案；重新核對最新 Contract、Free 無付費訂閱／不可取消、永久 Prime 不得另選方案、試用取消保留原期限、R08 降級安全備案與 R09 自然事件後補，未見需要新增的產品決策。先前把 R14 的正式站永久 Prime 畫面缺陷當作 R01 必須等待的前提過嚴；該介面修正與同版手機檢視留在 R14，C01 為獨立新增功能。固定 R 清單現為 **14 通過、R08 條件結案、R09／R14 兩項部分**；C01 獨立待驗。此結論不宣稱本地修正已部署或 R14 已通過。
- **永久 Prime 當時候選（已由 16:12 更正取代）：** 當時曾將比較頁收成單一 Prime 卡；PO 隨後明確更正為三卡及月年切換仍須可見，本段單卡描述不再是目標或現行本地實作。DEV 合成情境 `http://127.0.0.1:5173/__review/payments/plans` 的「永久 Prime」仍可用來檢視更正版；正式站尚未發布，R14 仍部分。
- **本地入口：** 共用主目錄缺少 `apps/api/package.json`／`apps/web/package.json`，重現 `npm ls --workspaces` 的 `No workspaces found`；未還原或覆蓋 351 個既有刪除狀態。主目錄 `start-gym-assistant.cmd` 在缺少 API workspace 時改轉到此 M8-E 工作樹。舊 5173 Vite 證實來自 M8-D 工作樹，已只停止該程序；目前 M8-E API `/ready` 200、Web `/` 200，Vite 載入的 `PlansPage.tsx` 來源指向本工作樹，主目錄 launcher 實跑可轉入並重用 5173。這是本機預覽，不是 Production 或 R14 驗收。
- **C01 維持關閉：** 本地遷移與切價 worker 已存在，檢視確認一次性 claim 的 workspace／environment 主鍵及 owner RLS、worker 僅限必要欄位更新；仍須完成實際 Development schema／角色路徑、同版 Test Mode 首筆正額 `paid`→切回標準 variant 與取消競態的必要驗證。原生 Lemon `once`／`repeating` 在 NT$0 試用訂單即兌換，不能直接公開當作首筆實扣九折。Live intro variants、正式 migration 與發布均尚未執行。
- **C01 預覽金額修正：** 5173 DEV 合成首購確認頁套用 `drinkmorewater` 後，實際瀏覽器原顯示 NT$103.5；金額格式已改為有角分時固定兩位，讀回預計首扣 NT$103.50、之後每月原價 NT$115、今天 NT$0。CheckoutPage／PlansPage 聚焦 16/16、Web typecheck、diff whitespace 通過。合成預覽供 PO 初看，並非已付發票或已上線的優惠。
- **R09 自動追蹤：** 原 10/19 21:10 的隔離日繳診斷 heartbeat 保留；另建立每日安靜追蹤 `m8-e-r09`，只在自然首扣／續扣有新結果、失敗或需使用者處置時通知，核對 provider、簽章／補償、原 owner、唯一期間與權益；不做人為改期、額外交易或把日繳證據冒充月／年方案。自然事件仍未驗，不因此改為通過。

### 2026-10-19 02:38 C01 本地候選進度（覆蓋下方舊「尚未實作」的敘述）

- **已做、未發布：** 在 `codex/m8e-live-cancellation` 的 `c4a4be8` 基底新增 C01 本地候選。`billing_promotion_claim` 遷移按 workspace 與 Test/Live 環境唯一保留／消耗優惠；伺服器報價正額首扣九折、零元試用只預留，建立意圖時以帳號列鎖序列化保留。Lemon checkout 用隔離 intro variant 與 `custom_price`，關閉第二個 Lemon 折扣入口與會誤示每次續扣都九折的預覽，並在商品描述列出首扣／後續原價。只在 owner-bound 正額 `paid` 發票經 verified-period 價格核對後消耗一次資格；發票與訂閱事件不論先後均可觸發同一已付判定。持久化背景工作以 `disable_prorations:true`、`invoice_immediately:false` 切回原價 variant，逾時先重新讀 Lemon 再重試。切價未完成時擋方案變更，取消入口保留。付款確認頁與帳單頁分別揭露首筆九折及後續原價；輸碼欄只有伺服器確認帳號有資格且方案配置 intro variant 時才顯示。既有 Live 四個優惠 variant 尚未配置，正式入口維持隱藏。
- **聚焦本地檢查：** API checkout／provider／invoice 匯差／lifecycle／Live 配置／永久 Prime／取消競態七檔 85/85，Web CheckoutPage 14/14、BillingPanel 8/8，試用及付費方案變更 6/6，API 與 Web typecheck 通過。NT$103.53 對 NT$103.50 的三分差額有明確回歸案例，依既有匯差容許判準通過；不再重開人工加速扣款。Git diff whitespace 檢查通過。這些是本地模擬與型別證據，**不代表遷移已套用、provider 已切價、Live 優惠已開或 R01/R14 驗收完成**。
- **下一個關鍵檢查與發布條件：** 先完成本地候選的 schema/RLS 與切價競態檢視，讓 PO 檢視 390px 新確認頁及既有狀態頁／永久 Prime。PO 確認該版本可進入完整驗證後，再做 Development migration dry-run／實際 owner DB 路徑、同版 Test Mode 付款事件與切價的必要核對、精確 SHA CI；Production 遷移、四個 Live intro variant／密鑰設定與 remote push／部署另依既有授權點。R09 自然事件仍獨立待時序發生。棄單保留資格不會算已使用；若既有 checkout 狀態不明，保持暫停重開並待供應商對帳確認，避免雙重優惠。
- **可檢視版本：** 本地 `http://127.0.0.1:4173/__review/payments/checkout` 的首次 Pro 月繳合成畫面已輸入 `drinkmorewater`，可見今天 NT$0、預計首扣 NT$103.50、之後每月 NT$115；頁面標示本機預覽且不會扣款。已用 in-app browser 的 390×844 viewport 讀回 `innerWidth=390`、document `scrollWidth=375`（無水平溢出），捲到付款摘要核對輸碼欄、首扣、原價、今天應付與同意／按鈕均可見；截圖 `m8e-c01-checkout-390.png` 與 `m8e-c01-checkout-390-bottom.png` 保存在本次對話視覺化輸出。這是合成畫面技術檢視，**不取代 PO 的 R14 介面驗收或正式同版檢查**。Playwright CLI 在此環境啟動無輸出後已停止，改用 in-app browser 完成最小本地觀察。

### 2026-10-19 支付頁、永久 Prime 與 drinkmorewater 接續（本地候選，未發布）

> **2026-10-19 判準更正（覆蓋下方較早的 C01 原型判斷）：** 將 NT$103.50 與發票
> NT$103.53 的三分差額視為失敗、要求 TWD 精確相等，是錯誤判斷。本 Contract 已明訂
> 以發票匯率核對，允許商品標價與處理金額有合理匯差；先前 NT$115 對 NT$114.89
> 也已接受。Lemon 官方文件明確支持 `custom_price` 持續到更換 variant，並支持
> `disable_prorations:true` 在下一次續扣改用新 variant 價格。供應商可行性已足以
> 推進**本地設計與實作**，不再為此建立新測試訂閱或要求兩次加速扣款。
> `pending` 只表示該筆人工提前的測試發票尚未證明付款，不能把它說成已付；
> 這和「價格機制是否支援」是不同問題。C01 尚未上線的真正原因是本站帳號一次性
> 預留／消耗、首筆已付後切回原價、失敗重試及月／年映射仍未實作與驗證。

- **範圍及計數（02:38 時點，已由 15:37 更新取代）：** 原固定 R01–R17 清單仍為 13 通過、R08 條件結案、R01／R09／R14 三項部分。PO 新提出的狀態頁兩個問題與永久 Prime 防改方案，列入 R01／R14 修正；`drinkmorewater` 是新增的 M8-E 商業功能 C01（P1），增加一個獨立待驗項，不重編 R 編號。此刻的可執行總清單是 R14 同版 390px、R01 最終驗收、R09 自然事件、C01 折扣碼，共四項；前三項的原判準不因 C01 改寫。
- **本地修正：** 在 `codex/m8e-live-cancellation` 的 `c4a4be8` 基底上，付款狀態頁移除開啟／等待狀態的重複手動查詢；既有意圖每 2.5 秒自動查詢。未付款者只能回到同一 Lemon checkout；收到成功回呼或查詢失敗時，不再顯示重開付款入口，失敗時提供明確重試。成功回呼的等待標記保存在本瀏覽器 session，重新載入同一意圖也不重開付款入口；跨裝置及供應商是否允許同 URL 重複提交仍需以伺服器／供應商結果為準。永久 Prime 的方案頁不顯示選擇 Pro／Prime，API 建立新結帳既有 `permanent_access` 拒絕保留；另外於試用與付費方案變更的 owner-scoped 資料庫交易中增加永久 grant 拒絕。取消既有付費續訂仍可用，以免永久 grant 疊在付費訂閱時失去停止扣款途徑。
- **聚焦證據：** Web 三檔原 17/17、API 四檔 19/19、Web／API typecheck 通過；新增重新載入保護後付款頁 13/13、Web typecheck 再通過，Git diff whitespace 檢查通過。390px 本地合成 `__review/payments` 跑完方案→確認→狀態→帳單→取消，document width 375px ≤ viewport 390px；確認頁顯示 Pro 月費 NT$115、今天 NT$0、約一月後 NT$115，取消確認與取消後顯示可用至原期限、回 Free、不再扣款。手機截圖保存於本次對話的視覺化輸出 `m8e-r14-390-local.png`。此為候選程式與合成資料，**不算同版 Production R14 通過**，也不算 PO 最終 R01 驗收。正式公開 `/deployment-config.json` 於本輪唯讀回報 `billingLiveEnabled:true`；未變更支付開關或供應商訂閱。
- **R14 已部署版 390px 唯讀回查：** 獨立 IAB 已有原隔離 Live Coach `m8e-live-20261018-01` 登入；正式 `/settings?category=plans` 讀回 Pro 年繳已取消續訂、可使用至 2026/11/18、到期回 Free／不再扣款，發票 `8757694` 已付款 NT$0，明細為原始金額 NT$0。正式 `/plans` 有 Pro 年繳 NT$1,150、Prime 年繳 NT$1,450 與原方案標記，沒有可重複結帳的操作；`/settings/checkout/status` 顯示原 Pro 訂閱已啟用、本期結束 11/18、返回帳單。各頁 document width ≤ 390px；Live 帳單明細截圖 `m8e-r14-live-390.png` 保存在本次對話視覺化輸出。這連同先前正式 390px 首購確認頁的 NT$0／首次扣款證據，補齊**已部署版本** R14 的技術手機檢視；PO 對整體介面最終驗收以及本地修正發布後的差異檢視尚未完成，因此 R14 仍記部分。本輪只讀，不曾建立另一筆 checkout、恢復或取消訂閱。
- **C01 PO 已決定的行為：** 使用者首次輸入 `drinkmorewater` 後，只讓該帳號第一筆**實際扣款**九折，同帳號嚴格限用一次；第一次訂閱若有零元試用，零元建單不應吃掉九折。帳號資格與使用次數必須由本站伺服器持久化判定，Lemon 負責實際價格、付款與發票；使用隔離首扣價時發票折扣欄可以為零，本站須在首筆已付後切回標準價。Lemon 官方公開碼只有總兌換上限與 `once`／`repeating`／`forever` 設定，未提供可直接證明同本站帳號限用一次的設定；公開共享碼不能直接上 Live 後宣稱達標。
- **C01 Test Mode 已見的供應商行為：** 正式來源的 Lemon Test Mode Pro 月費 variant `2250101` 讀回 `test_mode:true`。建立隔離測試 discount `1188027`／`DRINKMOREWATERTEST20261019`，`test_mode:true`、10% percent、`duration:once`、總兌換上限 1；這不是正式公開碼。無試用預覽的 NT$115 小計折 NT$11.50、應付 NT$103.50；有一個月試用的預覽為當次 NT$0、折 NT$0，兩次預覽後 redemption 仍 0。實際 Test Mode checkout 顯示「1 month trial free」、試用後第一次 NT$103.50、其後每月 NT$115，並標示 discount applies once；未輸入卡、未按 Start trial、未建立訂閱，診斷結帳分頁已關閉。這是供應商原生**顯示與預覽**，尚非已付發票證據。
- **C01 待 PO 最終動作的測試頁（2026-10-19 01:30 台北）：** 重新開啟上述隔離 Test Mode checkout，已填非真實測試 email、測試卡、測試持卡名及帳單區域；再次讀回今天 NT$0、試用後首次 NT$103.50、後續每月 NT$115、折扣僅一次，`Start trial` 已可按但未按。Chrome 測試頁已標記 handoff，截圖 `m8e-c01-test-ready.png`；本筆 checkout 預計 02:21 台北過期。已向 PO 請求親自按最後 `Start trial`；沒有 PO 動作時不建立訂閱，過期後須重新建立並填寫新測試結帳。這只驗供應商原生折扣生命週期，尚不代表本站帳號唯一性已實作。
- **C01 Test Mode 提交後的關鍵差異（2026-10-19 01:31 台北）：** PO 親按 `Start trial`，Lemon 顯示訂單完成。供應商唯讀 API 確認 Test Mode 訂閱 `2617960` 為 `on_trial`、原生試用終點 2026-11-18T17:30:30Z；初始訂單 `9791737` 為 paid、總額／折扣額均 NT$0。折扣兌換 `722469` 已立即歸屬這張**零元**訂單，實際折抵額 0，儘管先前結帳頁預告試用後 NT$103.50。這是 C01 的 P1 供應商語意風險：`duration=once` 與總兌換上限 1 是否仍能折抵首張正額續扣，尚無正額發票證據；在證明之前禁止 Live 公開碼與本站可用宣稱。此為供應商獨立診斷交易，沒有本站 checkout intent，所以不應在本站帳本推論或建立資格。嘗試把此測試訂閱試用終點提前兩分鐘以取得正額發票時，自動審核拒絕，理由為 PO 尚未明確授權改期及可能立即產生測試發票；已停止該操作並提出具體授權問題，不繞過審核。若 PO 授權才重新執行；否則保留原一個月試用、到期自然核對。
- **C01 決定性測試失敗與收尾（2026-10-19 約 01:37 台北）：** PO 隨後明確授權把同一 Test Mode 訂閱試用終點提前約兩分鐘、核對發票並取消後續續扣；API PATCH 回讀新 trial_ends_at／renews_at 2026-10-18T17:35:46Z。到點後訂閱從 `on_trial` 變 `active`，首張正額 subscription invoice `8758636` 出現：subtotal／total 11489 minor（NT$114.89）、discount_total 0；回讀時仍 `pending`，故**不能宣稱正額已付款結算**。同一折扣僅見零元訂單的 redemption `722469`、amount 0；供應商 UI 預告 NT$103.50 與實際首張正額發票不符。這足以使本次 `once` 方法的「首筆實際扣款九折」判準失敗，C01 保持關閉；11489 與目錄 11500 minor 的 11 minor 差額另屬 Test Mode 計費／計算待解，不能把它稱作九折。初次以 PATCH cancelled=true 取消回 422（過期的 trial_ends_at 驗證）；依 Lemon 官方 DELETE 取消 API 對同一 Test Mode 訂閱取消成功，回讀 status=`cancelled`、cancelled=true、ends_at 2026-11-18T17:35:46Z，不再有未來續扣。這不影響既有 Live Coach 訂閱；此診斷未進本站 checkout／ledger，不能用它完成 R09。
- **C01 替代假設預備（Test Mode，未提交）：** 官方 `repeating` discount 可設套用月份，但年度方案應另計月數。隔離建立折扣 `1188036`／`DRINKMOREWATER2TEST20261019`（10%、repeating 2 months、總兌換上限 1、test_mode=true），以及只在 Test Mode 的 Pro 月繳 checkout `89ba18e8-4be7-4a57-ad29-2989e02e2e9e`；關閉 Lemon 手動輸碼框但預置測試碼。表單已填假資料及測試卡，`Start trial` 可按而未按，Chrome 分頁標記 handoff，截圖 `m8e-c01-repeat-ready.png`。供應商預覽警告「前 2 個月 NT$103.50、其後 NT$115」，尚不知零元試用是否算入這 2 個月；需 PO 親按最後動作及兩張正額測試發票證明首張九折、次張原價，否則替代也失敗。已向 PO 提出第二筆純 Test Mode 訂閱的具體問題；未授權提交前不建立。原 `8758636` 最新唯讀仍 pending／折扣 0，不能算成功正額收款。
- **C01 替代假設提交後（2026-10-19 約 01:40 台北）：** PO 親按第二筆 `Start trial`，供應商訂閱 `2617986` 回讀 `on_trial`，原試用／續費日 2026-11-18T17:40:38Z；零元訂單 `9791808` paid，折扣兌換 `722471` 再次發生在零元訂單、amount 0。尚無正額發票，故 repeating 2 months 能否跨過試用及是否連續折扣兩筆正額皆未證明。已向 PO 問明確授權對此**第二筆** Test Mode 訂閱提前試用及下一次續扣、最後取消；未答覆前不改期。
- **C01 替代假設也失敗並取消（2026-10-19 約 01:45 台北）：** PO 明確授權第二筆 Test Mode 訂閱提前試用、條件式驗證後續續扣並取消。`trial_ends_at`／`renews_at` 改至 2026-10-18T17:44:34Z；到點首張正額 subscription invoice `8758699` 為 pending、subtotal／total 11489 minor、discount_total 0，與 `once` 測試同樣沒有九折。因第一張正額發票就未達標，沒有再提前製造第二張續扣發票。官方 DELETE API 取消訂閱 `2617986` 成功並讀回 status=`cancelled`、cancelled=true、ends_at 2026-11-18T17:44:34Z。兩筆診斷訂閱均已取消後續續扣；兩張正額發票仍是 pending，不能宣稱收款完成。C01 的共享 `once` 與 repeating 2 months 原生折扣均已實測失敗，Live 公開碼／本站輸碼入口維持關閉。下一個安全方向是供應商支援的首筆正額價差機制並單獨驗證，不能將預覽當作發票證據。
- **C01 官方能力與決定：** [Lemon 自訂價格](https://docs.lemonsqueezy.com/guides/developer-guide/taking-payments) 說明訂閱 `custom_price` 保留至更換 variant；[Lemon 訂閱管理](https://docs.lemonsqueezy.com/guides/developer-guide/managing-subscriptions) 說明更換 variant 加 `disable_prorations:true`，不收中途補差額、下次續扣使用新價格。PO 已批准 Test Mode／本地 Contract 原型。結合下列隔離發票，供應商價格機制的調研已夠，不再把第二張加速測試發票當作開始本地實作的前提；正式上線仍須本站帳號與付款事件控制。
- **C01 隔離 variant 原型結果（2026-10-19 約 01:57 台北）：** Test 商品 `1441189` 的隔離月繳 variant `2250118` 已發布，目錄價 NT$115、一個月試用；`custom_price=10350` minor 的結帳頁顯示今天 NT$0、試用後 NT$103.50，之後仍每月 NT$103.50，故本站須在首筆已付後切回標準 variant。PO 親按 `Start trial` 建立 Test 訂閱 `2618012`；零元初始發票 `8758759` 已付。PO 授權提前試用後，首張正額發票 `8758783` 為 pending、NT$103.53。和預告 NT$103.50 差 NT$0.03，屬本 Contract 既有匯差容許範圍，**不是原型失敗**；pending 則不能宣稱實際收款。該測試訂閱依授權取消且再次讀回 cancelled=true，未做切回與下一次續扣；這些屬本站實作及後續營運證據，不再要求新的加速 Test Mode 訂閱才能設計。Live 目錄未改，C01 入口尚未開。
- **C01 下一個本地工作：** 實作伺服器掌管的每帳號一次性優惠資格／預留與棄單釋放、月／年 intro-to-standard variant 對應、只在首筆正額 `paid` 事件後對同一訂閱切回標準 variant、冪等重試及取消競態，並做聚焦測試。既有 R09 的自然付款事件仍照原判準追蹤；不為 C01 供應商能力重做人工試用加速。Production Lemon 目錄、遷移、Live 入口與遠端發布未授權。
- **下一步與權限：** C01 原生 `once`／`repeating` 折扣確實落在零元試用訂單，不符首筆實扣規則；隔離 intro variant 加 `custom_price` 則符合官方支援的價格機制與既有匯差判準。現在優先做本站帳號一次性與已付後切回的本地實作／聚焦檢查，不再追求預覽與 TWD 發票分毫不差，也不把人工提前發票 pending 當作供應商不支援。之後給 PO 檢視本地付款狀態頁和永久 Prime；依既有 Gate 才做完整驗證、遠端 push／發布。R14 已部署版手機技術檢視完成，本地修正版待 PO 檢視；R01 最終驗收、R09 自然事件另追。原 Live 訂閱已取消續訂，毋須恢復或再付款。

### 2026-10-19 00:43 已完成項目結案與剩餘範圍

- **本次結案：** R02 Live 商家／目錄、R03 首次結帳收費與同意、R16 受控 Live 首購／取消、R17 同版部署及首筆事故修復觀察，均已有各自核心判準的直接證據；取消續訂本身確定結案，不要求等一個月再證明一次。Lemon Live 接受原隔離 Coach 的 Pro 年繳卡片試用，當天實際發票為 NT$0；本站確認頁、Lemon 最後頁及發票的當次金額一致，未來 NT$1,150／年與試用期則清楚揭露。真簽章 webhook 在已修復的正式版本補送後核對原 intent、唯一 owner／invoice／trial，取消再由 Lemon、本站與帳本共同確認。Main d3e215b 的 CI #274、正式部署、migration history 與 readiness 已成功，後續首筆訂閱及取消在正式站觀察正常。
- **不混入本次結案的事：** 今天的 NT$0 試用並非 NT$1,150 正額收款證據；原生一個月到期的自然首扣、一般續扣和失敗／恢復仍歸 R09，依 10/18 PO 時序決定後補，不讓其重開已確認的取消。R14 尚缺同版 390px 最終路徑檢視及 PO 介面驗收；R01 尚缺全套產品行為／Contract 的最終 PO 驗收。R02／R03／R16／R17 的通過只限於已實際發生的 Live 首次試用交易及已部署版本，不宣稱正額款項已結算。
- **固定清單現況：** 13 通過（R02–R07、R10–R13、R15–R17），R08 依已關閉的付費降級入口與取消到 Free 備案條件結案；3 部分（R01、R09、R14）。沒有新增 R 項、再次交易、恢復訂閱或調整原試用日期。下一個可執行動作是完成 R14 的同版 390px 方案／帳單／取消顯示核對，然後交 PO 做 R01 最終驗收；R09 等原生事件，獨立追蹤。本節是最新結論，下方較早「尚未取消」「R16 未驗」「首筆觀察未做」均為當時歷史狀態。

### 2026-10-19 00:26 R14／R16 Live 試用取消續訂已核對

- **PO 指示與操作：** PO 要求接續測試並取消隔離測試帳戶的續訂，避免試用後扣款。先於原 Coach 方案頁讀回 Pro 年繳試用、2026/11/18 首扣 NT$1,150 與 NT$0 已付發票 8757694；取消確認框明示 Pro 可用至 11/18、之後不再扣款、資料保留且回到 Free。只確認一次；本站短暫顯示「正在確認取消結果」，沒有再次送出取消。
- **供應商與本站直接證據：** Lemon Live 訂閱 2617697 明細讀回「Cancelled · Expires 18 Nov, 2026」，同一隔離買家、Pro 年繳、首筆 Paid NT$0.00，可見 Resume Subscription 而沒有續扣中的狀態。Production Supabase 唯讀核對該訂閱 status=cancelled、cancelled=true，ends_at=renews_at=2026-11-18T15:19:58Z；取消紀錄 73c4e91e-4487-4609-814a-2b2163e98578 為 confirmed。原試用終點不變，invoice/verified period 各仍唯一 1 筆，Live inbox 8 筆皆 done、無 queued/processing/dead。重新載入原 Coach 方案頁顯示「已取消續訂 年繳方案」、「可使用至 2026/11/18」、「到期後回到 Free，不再扣款」及原 NT$0 帳單；取消按鈕不再顯示。
- **結論與界線：** 這筆已成立 Live 試用的續訂已從 Lemon 與本站兩端確認取消；不需再次刷卡，也不應恢復訂閱。原期限之後實際轉 Free 尚未到日曆時間；正額收款、自然首扣／續扣仍無證據。這完成 R14／R16 中的 Live 取消子項，不把整個 R14 或 R16 宣告通過；固定 R01–R17 計數仍 9 通過、R08 條件結案、7 部分／未驗。下一步續查 R01/R03/R14 其餘使用者路徑與 R17 首筆觀察，R09 依原時序追蹤。此節取代下方「尚未取消」的歷史狀態。

### 2026-10-19 00:12 R02／R16 首筆 Live 試用已同步，取消續訂延後驗證

- **授權與發布：** PO 授權修復既有交易的不同步問題，暫緩取消續訂以保留後續取消流程驗證。[Draft PR #58](https://github.com/YambossMaster/Gym-Assistent/pull/58) 的 `ea0b8a9` 經 [PR CI #273](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39142408385) 通過後，依授權 squash merge 為 Main `d3e215bc5b70c7d0d8e3c6aeca2f4bb0463fcbee`。[Main CI #274](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39142971519) 的 verify、browser-ui、Development migration、Production migration history 與同版 Fly deploy／readiness 全成功；Web／Development migration 因無相關變更按規則跳過實作步驟，Production 無待套 migration。獨立 `/api/ready`、`/`、`/login`、`/deployment-config.json` 皆 HTTP 200；錯誤 webhook 簽章仍回 401。
- **原事件補送及對帳：** Lemon Live 原 `subscription_created`、`subscription_updated`、`subscription_payment_success` 從有效登入會話補送後，Fly webhook 回 HTTP 200。補送第一筆後本站從零帳本綁定原 intent `a399cebe-f9eb-4d0d-9a8c-f5eef412f0b2`、同一隔離 workspace `38fb2147-a922-42ec-a11b-402892d7fd1a` 與供應商訂閱 `2617697`；worker 的已綁定訂閱補償亦取得後續資源。最後 Live inbox 5 筆全部 `done`／各 1 次／無 dead，訂閱、發票、已驗證期間各唯一 1 筆；invoice `8757694` 為 `paid` TWD 0，期間 `initial/trial/basic/year` 至 2026-11-18，intent `confirmed`。付款成功原事件再次送達後，唯一性仍維持。
- **真使用者路徑：** 隔離 Coach 重新登入 Production 原 `/settings/checkout/status`，看到「Pro 訂閱已啟用」與試用開始；方案與帳單頁顯示「免費體驗中 年繳方案」、NT$1,150／年、2026/11/18 首次扣款，以及 `8757694 已付款 NT$0`。沒有第二次結帳或卡片輸入。
- **限制與下一步：** 這證明首筆 NT$0 Live 試用、真簽章 webhook、owner 綁定、帳本及使用者頁面恢復，不證正額實扣／結算、取消續訂或自然首扣。PO 明確要求先修完同步與其他付款問題，故目前**未取消續訂**，2026-11-18 的未來續扣仍可能發生。R01／R03／R09／R14／R16／R17 的未完成判準仍需逐項處理，固定 9 通過、R08 條件結案、7 部分／未驗的總計不因這次局部成功改變。接著檢查目前可做的 R01/R14 使用者路徑與 R17 首筆觀察；保留取消流程作後續明確驗證，且須在到期前完成或先保護訂閱。先前 Lemon 舊分頁過期時兩次 `Resend` 點擊未到達本站，重新載入有效登入會話後才成功；此為操作會話問題，沒有新增 Roadmap 項目。

### 2026-10-18 23:31 R02／R16 正式首筆試用的 webhook 500 事故（修復候選未發布）

- **PO 已審閱並同意完整驗證；本地 Gate 結果：** 修復先存為本地 `8aa28f4eaccc22d47310ab69043dd3d34f75e168`。`npm run check` 通過：根目錄腳本 38/38、API 62 檔 374/374、Web 94 檔 420/420，格式與 API／Web typecheck 全過；`npm run build` 的 API／Web production build 通過。官方 CA PEM 可由 Node X509 解析，`Dockerfile` 複製來源／`NODE_EXTRA_CA_CERTS` 路徑存在，dist 皆被 Git 忽略。Docker CLI 本機不可用，尚未驗 Docker image 實際封裝；需由授權後遠端精確 SHA CI／Fly build 及正式機器讀回驗證。GitHub CI scope 對這次無 Web／migration 檔案變更將回報 browser、Development migration no-op；Main 的 Production migration preview／同版部署仍必須實跑。此處完整通過只代表本機，不代表正式修復已發布或原事件已補送。
- **使用者症狀與供應商事實：** PO 親自在 Lemon 完成最後卡片／開始試用動作後，本站 `/settings/checkout/status` 數分鐘持續顯示「付款尚未完成」。Lemon Live 訂閱 `2617697` 是 `On trial`，Pro 年繳 NT$1,150，原生試用至 2026-11-18；首筆 invoice `8757694` 為 `Paid NT$0.00`，目前沒有正額收入證據。訂閱事件帶原隔離 Coach 的 intent `a399cebe-f9eb-4d0d-9a8c-f5eef412f0b2`。不要再次按「繼續付款」或重填卡片。PO 表示先處理眼下狀態，取消續訂可稍後處理；目前**未取消**，未來續扣仍可能發生。
- **決定性根因：** Lemon Live webhook 最近三筆訂閱事件送往 `https://formcoachdesk.com/api/hooks/lemonsqueezy`，其中付款成功事件回 HTTP 500；Fly 正式日誌在 webhook `PostgresBillingInbox.receive` 報 `SELF_SIGNED_CERT_IN_CHAIN`，背景 worker 持續 `billing_worker_unavailable`。正式 worker URL 指向正確 Production Supabase pooler，帶 `sslmode=require` 但未指定 root CA。Production Live inbox 0、subscription ledger 0、原 checkout intent 仍 `open`；因此 UI 持續讀到未完成。本站權益尚未確認，不能僅憑供應商試用宣稱已開通。缺漏事件補償只掃已綁定訂閱，無法從零帳本救回首筆綁定；修復 TLS 後須補送供應商原簽章事件。此事故歸入原 R02／R16／R17，未新增 Roadmap 工作項；固定計數仍為 9 通過、R08 條件結案、7 部分／未驗。
- **本地修復候選：** 隔離分支從 Supabase Dashboard 的官方下載連結取得公開 `prod-ca-2021.crt`（SHA-256 `700723581420DD1AC98FD7E9AC529F0EF210EADCAF87FC868A3AD7D114C2F3B7`），Docker runtime 設 `NODE_EXTRA_CA_CERTS`，Live worker URL 明確改 `sslmode=verify-full`，不關閉憑證驗證。正式 Fly 機器只在 `/tmp` 放 CA 進行唯讀實證：同一 worker 身分以 `verify-full` 成功 `SELECT 1`，未改服務或資料。聚焦 Vitest `live-configuration`／`lifecycle` 29/29 通過（首次合跑因載入延遲有一個 5 秒 timeout，15 秒時限重跑全過）；`git diff --check` 通過。Docker 映像、遠端 CI、正式發布與 webhook 補送均**未執行**。
- **安全及授權停點：** 目前 GitHub 正式付款變數仍為 `true`，公開新付款入口仍開；原 Main 為 `d9e1777`、正式程式為 `26c9cca6`。Agent 嘗試依先前文件的回退授權修改 GitHub 變數時，**自動核准審查拒絕**：判定這次排查授權不足以涵蓋正式設定變更。沒有修改變數或繞道操作。PO 回覆傾向趁已完成這筆付款直接修復／對帳，避免重刷卡；本輪保持付款開關現況，不再嘗試回退。下一步將此修復候選交 PO 檢視；依專案規則取得正式完整驗證、遠端 push／發布授權後，走精確 SHA CI／部署，補送原 `subscription_created`、`subscription_updated`、`subscription_payment_success`，再核對 Live inbox／唯一 owner 綁定／invoice／verified period／意圖 confirmed／Coach 頁面。之後按 PO 原意取消續訂並向 Lemon 讀回 `cancelled` 與原終止日；不能把關閉入口當成取消訂閱。

### 2026-10-18 23:16 R16 Live 結帳已備妥，待 PO 最後動作

- PO 明確授權只恢復既有隔離帳戶密碼、在獨立瀏覽器登入；Production Auth ID／Email 與 `account_class=test`、`test_kind=automation` 先獨立核對。僅該帳戶的隨機密碼已重設，存於 Git 忽略 `node_modules/.cache/m8e-prod-coach.json`，未輸出值。現有獨立 IAB 會話確實為該隔離帳戶，沒有觸碰一般 Chrome Coach。
- 正式 Pro 年繳確認頁桌機與 390px 讀回 NT$1,150／年、首次訂閱 1 個月體驗、今天 NT$0、預估 11/18 首扣 NT$1,150；PO 另行授權後，僅替隔離帳戶勾選本站付款條款同意並建立 Live checkout。Production 唯一 Live checkout intent `a399cebe-f9eb-4d0d-9a8c-f5eef412f0b2` 為 `open`，訂閱 ledger 仍 0。Lemon Live 最後頁顯示小計 NT$0.00、免費體驗 1 個月、之後每年 NT$1,150.00，卡片欄位空白、開始試用未按。已把頁面保留給 PO 親自輸入付款資料及執行最後金融動作；卡片可能有暫時授權，不能保證零暫扣。若 PO 完成，第一優先立即取消該供應商訂閱續訂並讀回確認，再查 webhook／帳本；若 PO 停止，保持無訂閱並關閉／放棄 open intent。R01–R17 計數仍為 9 通過、R08 條件結案、7 部分／未驗。
- **23:20 隱私停點：** PO 詢問卡號保密與信任後，Agent 停止讀取／截取結帳 UI，明確請 PO 暫勿按最後動作，直到其自行決定。Agent 未接收、讀取或保存卡號；隔離 Lemon checkout 保留但卡資料及 `Start trial` 均未由 Agent 操作。Production Live 訂閱 ledger 再讀回 0。若 PO 選擇完成試用，需先確認實際 provider 訂閱並立即取消續訂；若停止，保持無訂閱並結束 open intent。

### 2026-10-18 23:09 接續讀回：R16 隔離登入待恢復

- 從本地提交 `ee44543` 的乾淨工作樹接續；遠端 Main 唯讀讀回仍為 `d9e1777`。正式 `/deployment-config.json` 目前公開 `billingLiveEnabled:true`。Production `app_private` 的 Live checkout intent、subscription ledger、invoice ledger、webhook inbox、cancellation 均為 0；Lemon 後台 Live 近 30 天顯示新訂閱 0，檢視後已恢復 Test Mode。這些是目前無首筆交易的直接讀回，不證商家真收款能力；R02／R16／R17 狀態不變。
- 上輪建立的隔離 Coach `m8e-live-20261018-01@example.invalid` 仍見於 Status，但原 Git 忽略憑證 manifest `node_modules/.cache/m8e-prod-coach.json` 已不存在。一般 Chrome 登入屬其他 Coach，僅確認身分後立即關閉新分頁，沒有讀取或修改其付款資料。不可在一般帳戶做 R16。須安全恢復隔離帳戶登入或建立新的明確授權測試 fixture，再重讀正式確認頁與 Lemon 最終頁的 NT$0、未來扣款日；真實試用最後動作由 PO 親自執行，建立後立即先取消續訂並以 Lemon 讀回。現未建立 checkout、未填卡、未交易、未取消；7 項剩餘數量不變。

### 下一個對話從此處接續（2026-10-18 22:55 台北）

- **現場與版本：** 工作樹 `C:/Users/User/.codex/worktrees/m8e-payment-integration/Gym Assistent`，分支 `codex/m8e-live-release-prep`；這輪僅在本地更新文件，沒有新的遠端 push／PR／Main 合併。Main 整合基底 `d9e1777`；Production 實際程式 SHA `26c9cca6cf45af1659a7fce3f23fc11bd31b7deb`、[release #11](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39136398548) 已成功。最新已核公開 `billingLiveEnabled:true`、ready 200；**入口向一般正式 Coach 開放**，並非只有測試帳戶可見。商家真收款能力仍沒有交易證據。
- **PO 新增的費用與取消硬限制：** PO 願意考慮受控真實交易，但**不接受為了驗證而花正額款項，也不接受留下未來續扣**。這是交易條件，**不是解除先前「先打住」或立即按下結帳的指令**。下一對話開始時先讀回當前公開開關、測試帳戶與 Lemon 狀態，再向 PO 呈現最後結帳畫面的確切金額與未來扣款日；只在 PO 明確要求恢復並就該筆交易授權、最後畫面今天應付仍為 NT$0 時，才可繼續。若頁面顯示任何正額、非預期費用或條款不符，停止，不要求 PO 支付。不可縮短試用、建立正額診斷單或假設暫時授權絕不發生。
- **一旦 PO 親自完成零元 Live 試用：** 以 Lemon 訂閱建立的供應商讀回為準，**優先取消該筆訂閱的續訂，不等 webhook／帳本整套對帳完成才取消**；再獨立讀回 Lemon `cancelled=true`、原 trial/end 日期與不再續訂的供應商狀態，並核對本站對應取消狀態。若取消未確認，立即持續處理並通知 PO，不能只靠本站畫面或關閉付款入口當成已取消。確認無未來續扣後，才補核真簽章 webhook、原 Coach intent／invoice／ledger／權益與冪等證據。不得刪除必要交易稽核紀錄；隔離 Coach 與其 Git 忽略憑證待驗證及清理決定後處理。
- **不能誇大的證據：** 零元真實試用若成功，可驗 Live 首購／綁定／取消，不等於正額款項已扣、結算或退款。PO 的「不花這筆錢」限制下，不安排正額 Live 測試；R03／R16／R17 中依賴實扣的判準保持未驗，若要改採替代判準須先由 PO 明確批准 Contract／Roadmap 決策，不私下改口徑。R09 Test Mode 短週期自然續扣預計 10/19 台北 21:01、一次性接續核對 21:10；原一個月試用自然首扣在 11 月。這些自然事件等待與現在可做的 R01／R14、受控 Live 流程分開。
- **固定剩餘清單：** R01 最後 Contract／產品行為與 PO 驗收；R02 Live 商家真可收款與簽章投遞；R03 Lemon 實際結帳／發票與標價、同意一致；R09 自然首扣／續扣及失敗邊界；R14 桌機／390px 最終方案→確認→狀態→帳單／取消；R16 受控 Live 首購、取消、原 owner／權益；R17 首筆交易線上觀察。9 項已通過（R04–R07、R10–R13、R15），R08 條件結案，7 項部分／未驗，計數不變。R01／R14 的無交易核對及 R02／R03 的部分唯讀檢查不必等 10/19；任何真交易仍受上述暫停與費用限制約束。
- **交付邊界：** 本分支的文件提交尚未獲本輪逐次遠端 push 授權，不能把本地 Status 當作 Main 已整合紀錄。下一對話先跑 `git status --short`、讀 `README.md`、`docs/PROJECT_STATUS.md`、本 Status 與 Roadmap/Contract 指名段落，再核對遠端 Main／正式站；保留其他工作樹未提交內容。除非 PO 新指示，現在沒有需其立即操作的動作。

- **PO 暫停指示（22:42 台北）：** PO 明確要求先打住並完整記錄現況。已停止在隔離 Production Coach 的 Pro 年繳確認頁；付款同意尚未勾選，沒有呼叫建立 Live checkout、沒有填卡、沒有點最後交易，也未縮短試用。正式付款開關仍為 true；這是已授權發布的現況，暫停指示不等於回退授權或已驗證收款。測試帳戶與 Git 忽略憑證保留供接續，不觸碰真人帳戶；下一輪先讀本頁及實際遠端狀態，再依 PO 新指示決定是否續行。
- **正式付款開啟發布（22:33 台北，branch-local 待整合紀錄）：** PO 分別明確授權建立隔離 Production Coach，及以已通過完整 [Main CI #262](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39128029725) 的程式 SHA `26c9cca6cf45af1659a7fce3f23fc11bd31b7deb` 執行同版正式啟用／必要時回退。GitHub repository variable `PRODUCTION_BILLING_LIVE_ENABLED=true` 已讀回；[Production migration release #11](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39136398548) 的 `migrate-and-deploy` 完成 success：檢查精確提交與其 CI、正式九項 secret 名稱及 pooler，遷移預覽與套用皆回 `Remote database is up to date`，以 `VITE_BILLING_LIVE=true` 與 `BILLING_LIVE_ENABLED=true` 建置／部署同一 SHA。Fly image `deployment-01M57PV29V0DDN44X3MYYPV1W4`、機器 version 57／started／1 passing；九項 Live 付款 secret 名稱另行讀回皆為 `Deployed`；獨立請求 `/api/ready`、`/`、`/login`、`/deployment-config.json` 均 HTTP 200，公開設定 `billingLiveEnabled:true`，錯誤簽章 POST `/api/hooks/lemonsqueezy` 為 401。此為**正式付款入口已開啟**，不能再沿用下文當時 hard-off 的歷史說法；尚無受控真實交易／Live 發票／真 webhook 的通過證據，R16 未驗，R17 仍須首批交易觀察。
- **隔離正式 Coach 與真實頁面（同日）：** 授權後於 Production Supabase 為 `m8e-live-20261018-01@example.invalid` 建立一次性 Auth Coach `e006a3a5-5c2b-4f9d-a86d-bf63a8ad6ae0`；依既有 `app_private.account_reporting_test_intent` 分類 trigger 先寫入 15 分鐘 expiring intent，Auth 與分類獨立讀回 `account_class=test`、`test_kind=automation`、intent 已消耗。隨機密碼只存在 Git 忽略的本機測試 manifest，不進文件。隔離瀏覽器登入後，PO 另行同意此測試帳戶接受首次使用條款。真實 `/settings?category=plans` 顯示 Free 與空帳單；`/plans` 月繳 Pro／Prime NT$115／145，年繳 NT$1,150／1,450。從 Pro 年繳進 `/settings/checkout?tier=basic&interval=year`，讀回一個月試用、今天 NT$0、預計 2026/11/18 首扣 NT$1,150、付款須知／隱私／服務條款連結，付款同意 checkbox 預設未勾。未同意付款條款、未按建立 checkout、未填卡或交易。Chrome 原有正式真人登入會話未觸碰；隔離帳戶在受控驗證後清理，且不刪除須保留的交易稽核資料。
- **暫停後的唯一下一步：** 待 PO 主動要求恢復，再重新讀回正式開關與隔離 Coach 畫面，並取得受控 Live 結帳／真實交易的明確授權；一個月原生試用使首日 NT$0，這只能驗首購綁定／webhook／試用權益，正額實扣仍需單獨決策及驗證。若實際收款、owner、webhook 或權益出錯，依已授權回退路徑設回 false 並同 SHA 部署關閉受影響入口。R09 10/19 自然診斷及原月試用首扣後補，仍不宣稱通過。固定 9 通過、R08 條件結案、7 部分／未驗不變。

### 較早準備紀錄（以下「仍未部署／付款關閉」等只描述當時，不覆蓋上方現況）

- **Main 整合讀回（22:20 台北）：** PO 另行授權後，[PR #57](https://github.com/YambossMaster/Gym-Assistent/pull/57) 已合併為 Main `d9e17778a12ddd5a1dc0ddaff456e754caba0e8c`；[Main CI #272](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39135528857) 在該提交通過 verify、browser-ui、migration-dry-run、Production migration preview，文件版依既定條件略過 Fly deploy。Live 九項設定仍只在 Fly `Staged`，正式服務付款開關仍須另行發布；這不是已啟用收款。現從 Main `d9e1777` 的隔離分支 `codex/m8e-live-release-prep` 繼續 R02／R03／R14／R16／R17。
- **商家可售資格的最小讀回：** Lemon Live Setup 顯示建店、商店設定、身分驗證、首商品和銀行連結完成，General 的身分為 `Active`，後台可切到 Live 並讀到 Published 商品；未登入的公開 Live 結帳能顯示四種方案與卡片付款。依 [Lemon 官方 Live/Test 說明](https://docs.lemonsqueezy.com/guides/developer-guide/testing-going-live)，Live 模式在商店啟用後開放，因此這組證據支持商店已可進入 Live 銷售流程。General 的 `Activate your store to accept live sales` 是頁面說明，未找到獨立的商家狀態 API 欄位；最終能否完成付款、發票及 webhook 仍只由受控真交易判定。檢查後後台恢復 Test Mode。R02 保持部分，沒有增加 R01–R17 項目。
- **R03／R14 同版靜態對照：** Main `d9e1777` 的 Web `catalogPrice()` 依 Pro／Prime 的 TWD minor units `11500/14500` 和年繳十倍給出 NT$115／145／1,150／1,450；`CheckoutPage` 以 API quote 分別顯示今天應付、首次／本次扣款與一個月試用，同意 checkbox 預設未勾，連到付款須知、隱私與條款；`payment-copy.ts` 說明首次 NT$0、再次訂閱立即付款、取消和匯率／手續費。Lemon Live 四個價格與試用先前已由 API 讀回，公開結帳頁讀回卡片與首次 NT$0。此處只證同版原始碼與商家設定／預覽互相吻合；正式站目前仍 hard-off，尚未證 Production 真登入畫面、受控發票與 PO 對同版正式畫面的最後檢視。
- **可執行的同版發布路徑：** 最近的完整程式 Main 提交 `26c9cca6cf45af1659a7fce3f23fc11bd31b7deb` 已由 [Main CI #262](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39128029725) 全套驗證並部署；其後至 `d9e1777` 的提交只改 Markdown。現有 `Production migration release` 手動 workflow 可指定該程式 SHA，會要求此提交的四個成功 CI job、最新 Main 沒有更新的程式／migration／發布閘、正式 migration 再預覽、九項 Fly Live secret 名稱、GitHub 變數 `PRODUCTION_BILLING_LIVE_ENABLED` 與 `billing_live` 輸入一致，然後才同 SHA 部署 Web／API。需先取得付款開啟與正式部署授權，再設變數並啟動；失敗或錯價時將變數還原 false、以同一已驗程式 SHA 重部署 hard-off，核對公開 `billingLiveEnabled:false`、hook 404 與 ready。設定變數本身不是部署，只有授權後才操作。若 Main 先出現新程式提交，重新選最新完整 CI SHA，不強推舊版。
- **受控實扣方法待確認：** 四個正式 variant 都給帳戶首次付費訂閱原生一個月試用，故首次結帳當天為 NT$0；它可以驗 Live 首購、簽章、原 owner 與試用權益，不能冒充 R16 所需正額實扣。Lemon [更新訂閱 API](https://docs.lemonsqueezy.com/api/subscriptions/update-subscription) 可調整 `trial_ends_at`，但人工縮短正式試用是診斷操作，不能證 R09 自然首扣；也會改變該隔離帳戶的原承諾試用期限。若要用它縮短等待，須先建立隔離 Production Coach、用本站完成真首購、確認限額／退款處置並取得 PO 對實際交易及這個診斷方式的明確授權。未獲授權前不更動 Production 帳戶、試用日期或付款開關。
- **現在的確切下一步：** 核對正式站最後確認頁／條款與 Live 四價格的同版內容，準備受控交易帳戶及回復步驟；之後分別取得開啟付款與同版部署、受控真交易的明確授權，完成 webhook／invoice／owner／權益及關閉續訂核對。R09 10/19 自然診斷與原一個月試用仍按原判準另追，不阻擋已核准的上線時序。
- **決定：** PO 明確要求持續開發並上線；即使自然續扣／原生一個月試用首扣尚未等到，也不以日曆等待卡住 Live 準備、受控交易與發布。事件到來後補齊 R09 的 Lemon 發票、真 webhook 或明確補償、原 Coach 帳本、唯一已驗證期間與權益證據；若失敗，依受影響入口先控管再修正。這是等待順序的變更，**不是 R09 通過**，也不把日繳診斷算成月／年繳及原試用首扣。Roadmap 與 Contract 同步記錄此核准決定。
- **固定範圍與計數：** R01–R17 不新增項目。已通過 9 項（R04–R07、R10–R13、R15），R08 採安全備案條件結案；7 項仍部分／未驗。當中 R09 為上線後仍須追蹤的自然事件；上線前尚須關閉 R01–R03、R14、R16–R17 的實際必要判準，不以未到期事件取代 Live 目錄／webhook、標價與實收、使用者同意、受控真交易、同版 CI／部署／觀察。若測出會收錯款、越權或遺失資料的缺陷，先關閉受影響付款入口並修復。
- **目前已交付：** 付款 schema／加密備份隔離還原 R15 已通過；付款程式與漏送補償 PR #51 在 Main `206e115` 同版 CI／Fly 通過。PO 上線時序、R09 直接證據與現況紀錄已由 PR #55 合併為 Main `410fce2`；Live 唯讀核對由 PR #56 合併為 Main `3e5e157`。[Main CI #270](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39132462960) 的適用工作均成功，文件提交依流程跳過部署。正式站 `/api/ready`、`/`、`/login`、`/deployment-config.json` 本輪仍 HTTP 200，付款開關讀回 false；不把文件提交說成新 Fly 部署。10/18 新隔離日繳首筆 Test Mode 發票／真 webhook／原 owner 權益已核，詳見下節；自然續扣預定 10/19 台北 21:01。
- **現在可直接做：** 核對 Live 商店可售狀態、信用卡結帳方法與同版價格／條款，然後安排限額受控 Live 交易、同版 CI、部署與線上觀察。遠端 push／merge、正式部署、Live 開關及真實交易各自依 AGENTS.md 的具體動作授權；授權點以前持續完成讀取、草稿、檢查與本地修正。R09 由一次性 10/19 21:10 heartbeat 接續核對，與上述工作並行，不再阻塞上線。
- **R02／R17 變更前讀回：** 原 Chrome Lemon 登入 redirect 卡住，從頁面「回到登入」入口重新導向後已進 Dashboard；Live 模式當時讀回商品 `1449729` 為 Draft、storefront 關閉，四 variant `2262960/2262966/2262967/2262969` 分別為 Pro 月 NT$115、Pro 年 NT$1,150、Prime 月 NT$145、Prime 年 NT$1,450，週期月／年及各自原生 1 個月試用、SaaS business-use 稅類一致。Live Webhooks 頁無 webhook，Live API keys 頁未列既有金鑰；General 的身分驗證標為 Active，但頁面仍提示 `Activate your store to accept live sales`，當時的收據／發票商店名稱為 `Website Application`。Setup 清單顯示建店、商店資料、身分驗證、首商品已完成；2FA 與銀行連結等項目不可單憑此清單判定是否為啟用必要條件。Fly `formcoachdesk` 缺 `deploy/production-runtime-secrets.json` 所列 9 個 Live 付款密鑰名稱；GitHub Actions repository variables 也沒有 `PRODUCTION_BILLING_LIVE_ENABLED`。Production Supabase 只讀查 `pg_roles` 有 `gym_billing_worker` nologin，但無 `gym_billing_worker_login`，須建立受限可登入角色與專用連線，不能把 API 管理連線冒充 worker。這些都屬既有 R02／R17，剩餘項目數不增加。
- **R02 Live 商店已核准變更（branch-local 紀錄）：** PO 另行明確授權後，Lemon Live General 將收據／發票商店名從 `Website Application` 改為 `Form Coach Desk Studio`，頁面顯示 `Store settings saved`；商品 `1449729` 由 Draft 改為 Published，關閉再開詳情獨立讀回四個 variant 價格、Published 與 `Display product on storefront` 未勾。完成後已切回 Test Mode。發布商品不等於啟用本站付款；正式設定與付款開關仍未完成，沒有真實交易。此變更屬原 R02，固定剩餘計數未增加。
- **R02／R16 Live webhook 已核准變更（branch-local 紀錄）：** PO 另行授權後，Lemon Live 新 webhook `143856` 已儲存 `https://formcoachdesk.com/api/hooks/lemonsqueezy` 與程式接收的 11 個訂閱／付款事件；關閉再開後獨立讀回相同 URL、事件數與簽章密鑰。獨立產生的簽章值未寫入 Git，經加密暫存至 Fly `LEMON_LIVE_WEBHOOK_SECRET`，`flyctl secrets list` 回 `Staged`，未發布到機器。完成後 Lemon 頁面已恢復 Test Mode。正式站付款關閉時，對 `{}` 與錯誤簽章的公開 hook POST 回 404；這只證入口尚未掛載，啟用後仍須驗錯誤簽章 401、真簽章投遞、ledger 與權益。原 R02／R16 尚未全部通過，固定剩餘計數未增加。
- **R02 Live API key 已核准暫存（branch-local 紀錄）：** PO 親自在 Lemon Live 建立 `FORM Coach Desk Production API`，頁面設定到期日 2027-04-18；PO 另行授權讀取一次顯示的值並傳至 Fly。密鑰只經加密暫存檔進入受控終端，`LEMON_LIVE_API_KEY` 以 Fly staged secret 保存，未寫入 Git 或狀態文件；轉送暫存檔、終端與瀏覽器變數已清除，一次顯示視窗已關閉。`flyctl secrets list` 獨立讀回 API key 與 webhook secret 均為 `Staged`，尚未發布到機器。使用此 Live key 對 Lemon API 只讀核對：商店 `491074` 名稱 `Form Coach Desk Studio`／TWD，商品 `1449729` Published／非 Test Mode；四個 variant `2262960/2262966/2262967/2262969` 及各自 price model 依序是 NT$115 月繳、NT$1,150 年繳、NT$145 月繳、NT$1,450 年繳，均為原生一個月試用及 `saas_business` 稅類。後台已恢復 Test Mode。已暫存 secret 不代表正式服務可用；付款開關仍 false。此項未增加 R01–R17 計數。
- **R17 Production 專用 worker 已核准建立與驗證（branch-local 紀錄）：** PO 另行授權 Production Supabase `febunjhpruqlywjfvuaq` 建立 `gym_billing_worker_login` 並暫存專用連線。受限登入角色只繼承既有 `gym_billing_worker`，`rolcanlogin=true`、連線上限 5、`rolcreaterole/rolcreatedb/rolbypassrls/rolsuper/rolreplication=false`；查得付款 `app_private` schema 及 inbox／verified-period 所需權限，`auth` schema 無使用權。正式 API 既有連線讀回使用 `aws-0-ap-northeast-1.pooler.supabase.com:5432`；新角色以同一 session pooler、Supabase 官方 CA 驗證 TLS 實際登入，`current_user=gym_billing_worker_login`、付款 schema 可用、`auth` schema 不可用。只把密碼放入 Fly `BILLING_WORKER_DATABASE_URL` staged secret，讀回該名稱為 `Staged`，沒有寫入 Git 或輸出明文；本機無密碼的探針與公開 CA 暫存已清除。此項屬原 R17，固定項目計數未增加。
- **R02／R17 九項設定值已核准暫存（branch-local 紀錄）：** PO 再另行授權將 Live store `491074`、正式返回 URL `https://formcoachdesk.com/settings/checkout/status`、Pro 月／年 variant `2262960/2262966`、Prime 月／年 variant `2262967/2262969` 暫存 Fly。正式返回路徑與程式設定相符，公開頁以 `Accept: text/html` 回 HTTP 200。`flyctl secrets list` 對 `deploy/production-runtime-secrets.json` 所列九個 Live 必要名稱逐一讀回 `Staged`；密鑰值未輸出，也尚未套用到 VM。獨立讀回正式 `/deployment-config.json` 仍為 `billingLiveEnabled:false`。設定齊備不證商家可收款、真 webhook 或 Live ledger；R02／R16／R17 仍未通過，固定項目計數不變。
- **R02／R14 公開 Live 結帳只讀預覽（branch-local 紀錄）：** Lemon Live 商品分享頁顯示 Published 商品的結帳預覽，Pro 月繳列首期 NT$0、試用 1 個月後 NT$115／月；將分享連結在未登入的獨立瀏覽器打開，公開頁可載入，四個方案價位與卡付款選項均呈現。沒有填寫買家或卡資料、沒有建立正式 app intent、沒有按交易按鈕。此證據只關閉「公開結帳頁能否顯示方案與卡付款」的不確定性；不能證明 Live 商店完成收款資格、本站 owner 綁定、實扣發票、簽章 webhook 或正式權益。後台檢視後恢復 Test Mode，預覽分頁已關閉。
- **Live 啟用條件唯讀核對：** Lemon Live Setup 畫面顯示建店、商店資料、身分驗證、首商品、銀行連結已完成；2FA 尚有 Configure，折扣與 Email marketing 也未做。官方 [Activate Your Store](https://docs.lemonsqueezy.com/help/getting-started/activate-your-store) 說正式銷售須完成商家問卷與身分驗證審核，沒有將整張 Setup 清單每一項列為銷售前提。能切到 Live 不單獨證明真實結帳可收款；仍須在受控 Live 結帳前讀回商店實際可售狀態。檢視後已恢復 Test Mode。

## 2026-10-18 R09 短週期 Test Mode 診斷：首筆通過，續扣待自然發生

- **工作樹：** `codex/m8e-payment-integration`、HEAD `aa8d7f0`；本節為尚未推送的 Status 更新，沒有要求遠端 CI、Main 合併或正式部署。付款程式上一個同版 Production 已核版本為 Main `206e115`，付款開關關閉；遠端 Main 其後有其他工作線更新。
- **沿用證據：** 舊日繳診斷訂閱 `2609055` 的 Lemon `renewal` 已付發票 `8754514` 能證供應商自然續扣，但舊 webhook 回 400、沒有 Development owner／ledger／權益，不能單獨關閉 R09。R04 真首購／回購、R07 真已付升級、R12 漏送與冪等、67/67 期間／權益聚焦檢查仍沿用；這些不等同自然首扣／續扣。
- **本次隔離 fixture：** 從 Development CheckoutModule 建立原 owner intent `2c753042-159a-4450-8797-88eb6f1109f9`，暫時把本機 Pro 月 variant 指向既有 Lemon Test Mode 日繳診斷 variant `2250530`。Test Mode 結帳頁明示今天模擬 NT$115、之後每天模擬 NT$115；隔離 Email、公開測試卡及虛構地址填妥後由 PO 親自按最終支付。正式月／年 variant、Live 商店與 Production 設定未動。
- **首筆直接核對：** Lemon Test Mode 訂閱 `2617411` active，原定自然續扣 `2026-10-19T13:01:11Z`；已付 `initial` 發票 `8756781`，provider TWD 11489 minor units。暫時 webhook-only proxy 對其他路徑回 404、錯誤簽章回 401；真正 Lemon 投遞的三筆事件到 Development inbox，皆 `done/attempts=1`。未使用本地合成事件觸發首筆處理。帳本訂閱／發票綁同一原 intent，已驗證 `initial` 期間至原定續扣時點，原 Coach PlanAccess 為 Pro。正式收款開關仍關閉。
- **判準界線：** 為縮短 provider 自然事件等待，這筆診斷把日繳 variant 暫映射至應用月繳 quote；帳本 `billing_interval=month` 但 provider 與 `ends_at` 實際為一天。因此目前只驗證 Test Mode 真投遞、owner 綁定與實付首筆；短週期自然續扣仍待 10/19 真事件，**不能**當成正式月繳報價／週期或原一個月試用終點首扣的驗收。四個正式方案設定與 quote 由原 Test Mode 證據另核；R09 與完整 Test Mode 情境矩陣仍未通過，其等待順序依上方新 PO 決定調整。
- **下一步：** 保持此隔離診斷訂閱至原定 10/19 自然續扣，核對 `renewal` 已付發票、真簽章 webhook／漏送補償、同 owner ledger、唯一續期期間與權益；若暫時 tunnel 失效，明確標記未證首投並走已驗 R12 補償。之後取消此診斷訂閱並還原 Test Mode webhook URL、關閉暫時服務。另判定原生一個月試用首扣能否用短週期等效證據滿足凍結 Contract；未批准替代判準前仍列未驗。這是既有 R09 的驗證方法，不新增 R01–R17 工作項。
- **自動接續：** 已在本對話建立一次性 heartbeat `m8-e-test-mode`，預定 10/19 台北時間 21:10 核對自然續扣；暫時 tunnel／接收器現運作，但隔夜可用性不能預先保證。工作樹 Status 更新尚未推送；遠端 push 仍需獨立授權。

## 2026-10-18 R12 Test Mode 漏送補償回歸通過

- **隔離前提：** Lemon Test Mode webhook `142825` 指向已關閉的舊 tunnel，且本機沒有接收服務。已綁定的 Test Mode 訂閱 `2615463` 原本為取消、原終點 `2026-11-17T16:22:14Z`；Development 帳本同為取消，inbox 8、已驗證期間 1、發票 2、待處理事件 0。原始首試用訂閱 `2617258` 沒有更動。
- **漏送與補償：** Lemon 官方 Test Mode API 對 `2615463` 恢復續訂後回傳 active／cancelled=false；Development 帳本仍為 cancelled、inbox 仍 8。已發布版本的掃描走過 12 個已綁定訂閱、33 個資源，安全跳過 1 個舊 Test Mode variant，worker 處理 1 筆；帳本變為 active／cancelled=false，inbox 9，期間與發票仍為 1／2。這直接驗證漏送後依原 intent 補償，不靠買家 Email 猜 owner。
- **恢復原狀與冪等：** 隨即用 Lemon Test Mode API 取消同一訂閱，官方讀回 cancelled=true、原終點完全相同；第二次掃描／worker 各處理 1 筆，Development 帳本同步取消，目標 inbox 10/10 `done`，期間仍 1、發票仍 2、全 Test Mode 待處理 0。第三次掃描仍讀 12 訂閱／33 資源、跳過舊 variant 1，但 worker 處理 0；沒有重複授權。原 Coach 的 PlanAccess 仍由該已付期間提供 Prime（內部 tier `advanced`）現期權益，取消只停止續訂。
- **結論與剩餘：** R12 首投真簽章、漏送恢復、原 owner 對帳、重跑冪等及舊 variant 不阻塞後續訂閱均有直接 Test Mode／Development 證據，改為通過。固定清單現為 9 項通過（R04–R07、R10–R13、R15）、R08 條件結案、7 項部分／未驗（R01–R03、R09、R14、R16–R17）。正式 webhook 仍未建立，屬 R02／R16；R09 原始試用終點正常首扣與 owner-bound 自然續扣仍缺真事件。完整 Test Mode 情境矩陣仍未全部關閉，不能進 Live 真交易。

### Test Mode 情境狀態：R09 日曆事件依上方 PO 決策後補

| 情境                                        | 目前證據                                                                                                                                               | 判定                                                                                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 四方案價格、週期、原生一個月試用            | 四個真 Test variant 設定讀回；四方案 checkout payload 聚焦 4/4                                                                                         | 通過，依 Roadmap 不重買四筆                                                                                                                      |
| 首購免費試用、再次訂閱立即收費與 owner 綁定 | Coach UI 真首購 `2617258` TWD 0／真簽章與 Pro 月真回購 `2615463` 付費發票；intent、ledger、PlanAccess 已核                                             | 通過                                                                                                                                             |
| Lemon 原生優惠與舊碼隔離                    | 真 Test checkout 折扣預覽、測試碼已刪；API 拒絕本站付費碼                                                                                              | 通過，未另購買                                                                                                                                   |
| 試用／已付升級與禁止付費降級                | `2615449` 試用升級原終點不變；`2615463` 已付升級唯一 invoice；API/Web 降級封鎖                                                                         | 通過；到期收費歸 R09                                                                                                                             |
| 取消、到期 Free、退款與帳單隔離             | 試用及實付訂閱各一筆取消；時鐘到期規則、Test Mode 全額退款與本人／跨 owner receipt 已驗                                                                | 通過                                                                                                                                             |
| webhook 簽章、耐久、漏送與冪等              | 真簽章首投；本節 `2615463` 不可達 hook 漏送、恢復、重跑 0、新舊 variant 隔離                                                                           | 通過                                                                                                                                             |
| 連點、跨 owner、失敗及 pending 權限         | Development 真 JWT 並發、跨 owner RLS／HTTP；67/67 lifecycle／period／access 聚焦與 pending→paid 診斷                                                  | 規則通過；自然續扣的失敗／恢復仍隨 R09 真事件核對                                                                                                |
| 自然試用首扣與 owner-bound 自然續扣         | `2617258` 原試用終點為 `2026-11-18T11:23:50Z`；`2615463` 付費續扣原排程 `2026-11-17T16:22:14Z` 但已取消；舊日繳 renewal 不屬 owner-bound；行政改期作廢 | **未通過 R09**；須在未人為改期的原始到期事件核對 provider invoice、簽章／補償、原 owner verified period 與權益。現有取消訂閱不能當作續扣 fixture |
| 桌機／手機方案、同意、結帳、狀態、帳單      | PO 已檢視並修正付款頁／須知；390px 帳單、最新首購及收據讀回，PR/Main 同版 CI 成功                                                                      | R14 仍部分；最終 Live 對應流程另核                                                                                                               |

Roadmap 2026-10-18 修正明定沿用已完成的 R04–R13 真交易證據，不為「完整」重複付款；本矩陣核對每個場景的真實判準與未驗界線。R09 是目前阻止 Test Mode Gate 全關閉的關鍵真事件，不能以供應商後台調日期或未綁定日繳發票替代。下一個獨立可做工作是讀回可保持原排程、仍有效的 owner-bound Test Mode 訂閱；若沒有近期自然事件，需保留 Test Mode Gate 未通過並等待其原始到期，期間可以準備其他不啟用收款的 Live 草稿設定與可審查證據。

- **R09 可行時間窗唯讀核對：** Development ledger 與 Lemon 官方 Test Mode API 一致：已綁原 owner、未取消且不曾行政改期的 `2609277` 首次試用，原始 `trial_ends_at=renews_at=2026-11-15T09:09:08Z`，是目前最早自然首扣候選；其他有效首試用 `2614688`／`2614857` 在 11/17、`2617258` 在 11/18。所有已綁定且已有正額已驗證期間的 Test Mode 訂閱目前都已取消，沒有自然續扣候選。`2615463` 的已付 Prime 月訂閱原續扣日 11/17，但為尊重先前取消及本次恢復原狀，未在背景保留 active；若要用其自然續扣，須另獲 PO 同意恢復並在真 Test Mode renewal 後再次取消。最早首扣前，不能宣稱 R09 或完整 Test Mode Gate 通過。

- **R09 自然續扣 fixture 已準備：** PO 隨後明確允許僅將隔離 Test Mode `2615463` 恢復續訂至原 11/17 續扣，以自然測試發票核對後再取消。Lemon PATCH 與獨立 GET 回傳 `test_mode=true`、Prime 月 variant `2250110`、active／cancelled=false、無 trial、`renews_at=2026-11-17T16:22:14Z`（原日未改）；Development 補償掃描／worker 處理 1，ledger 同為 active、inbox 11、已驗證期間仍 1、發票仍 2、待處理 0。這只準備自然續扣，沒有產生 renewal 發票或通過 R09。`2617258` 未動；測試 webhook 目前指向離線舊 tunnel，自然到期前須接上受控簽章接收端，或明確標記只用補償路徑證明，不能把漏送說成首投成功。自然續扣核對後依 PO 授權再取消此 fixture。

## 2026-10-18 PR #51 同版 Main 發布，Test Mode Gate 繼續

- **交付／CI：** PO 授權推送 Status 證據提交 `95df76c52da8afd21f47e7a498a92737d2aba186`，其 [PR CI #259](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39126073384) 的 verify、browser-ui 與 migration-dry-run 全成功；後兩項依無 Web／migration 變更略過實際步驟。PR #51 已合併為 Main `206e115862a4f8ebae5dcfb3834c04d477d7eede`。[Main CI #260](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39126354923) 的 verify、browser-ui、Development migration、Production migration history、Fly exact-commit deploy 及 readiness 全成功；沒有新 migration 待套用。
- **正式站讀回：** 獨立請求 `/api/ready`、`/`、`/login` 均 HTTP 200；`/deployment-config.json` 的公開 `billingLiveEnabled:false`。CI 的 exact-commit 部署及 readiness 已證；公開 build ID 沒提供可獨立比對的 SHA，不把公開設定檔當作 SHA 證明。正式收款維持關閉，未配置 Live webhook／密鑰，沒有真實交易。
- **Test Mode 未結：** R12 的修復後隔離漏送端到端回歸已通過，詳見上節。R09 原始 2026-11-18 試用終點的正常首扣及 owner-bound 自然續扣仍缺真事件。原本這次 Pro 年繳首購的 TWD 0 試用、發票、真簽章 webhook、ledger、權益及收據已有證據；不足以宣稱全 Test Mode 情境通過。
- **下一個可執行動作：** 依凍結 Contract 整理現有 Test Mode 情境與同版直接證據，聚焦補 R09 自然首扣／續扣的可行驗證路徑；不可用行政改期冒充自然扣款。正式 Live 交易與收款開關必須等 Test Mode Gate 關閉。

## 2026-10-18 Draft PR #51 與更新後 Main 的合併準備

- **遠端狀態：** PO 已授權推送 `1d5e4ea` 與解決 Main 衝突的 `4697045b1b416a9080e0187cfe941da206804a86`；[Draft PR #51](https://github.com/YambossMaster/Gym-Assistent/pull/51) 的 head、可合併狀態和最終四個付款相關檔案已讀回。GitHub 連接器寫入回傳 403，使用此倉庫 Git 認證的 GitHub API 建立及更新 PR；未合併、未部署、未設定 Live 密鑰、未做真實交易。
- **Main 並行更新與衝突：** 遠端 Main `6c544d4a7f580354a81563090f679d66013a4a41` 納入 PWA 修復與回歸規則；原 PR head 的整合 router／月誌有兩處文件衝突。依更新後 `docs/status/README.md`，本地整合保留 Main 的共享文件原版，付款工作線只更動自有 M8-E Status。合併提交 `4697045` 已推送，PR 現可合併且最終差異僅四檔。
- **既有行為影響圖與同版 CI：** 相對分支原基底 `a38ca6f` 和目前 Main `6c544d4`，付款變更邊界只有 API Test Mode 漏送補償 worker 的訂閱讀取迴圈與掃描日誌。直接消費者是已綁定訂閱的 provider 查詢、inbox 對帳及同訂閱權益；必須維持正常訂閱和發票恢復、後續 ID 不被舊 variant 餓死、重跑不重複授權、Live 未知 variant／其他 provider 或 owner 範圍錯誤仍 fail-closed。聚焦測試 4/4 包括跳過後續 ID 與 Live 負例；相關 entitlement／period／lifecycle 65/65；Development 真 provider 掃描 12 訂閱／33 資源／跳過 1 舊 variant。[PR CI #258](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39125601413) 對 exact SHA `4697045` 成功：verify 的格式／型別／測試／build 通過，browser-ui 和 migration-dry-run 依無 Web／migration 變更成功略過對應步驟，PR 的 Production preview／deploy 略過。仍缺本次修復後隔離 webhook 漏送的端到端重驗，R12 維持部分；沒有 Production billing 行為變更或 Live 收款證據。
- **下一步：** 先取得本次 Status 證據提交的推送授權、核對該 PR CI，綠燈後再依明確授權合併 PR #51；合併後核對 Main CI、Fly 部署與付款開關仍關閉。接著完成 Test Mode 情境清單，尤其 R12 漏送回歸與 R09 原始試用終點的正常首扣／owner-bound 自然續扣；在全情境通過前不進 R16 Live 真交易。

## 2026-10-18 Main 付款關閉發布與 R15 備份修復

- **同版正式發布：** PO 明確授權 PR #45 合併及付款關閉的 Production migration／Fly 發布。PR #45 已合併 Main `0318cb4be74559cb93c91526f6b345e1da54a24a`；Main Actions #247／run 39119278228 的 `verify`、`browser-ui`、Development `migration-dry-run` 與 `production-migration-preview` 均成功。正式預覽只列 `20261017181022_billing_live_test_foundation.sql`，自動 deploy 因待 migration 跳過。手動 release run 39119563394 對同一提交完成 migration、Fly deploy 與 readiness。Production migration history 已讀回該版本；13 張付款表均存在且啟用 RLS，訂閱／發票 0；Fly release 52 機器 started、健康檢查 1/1，公開 `/api/ready`、`/`、`/login` 均 HTTP 200，`deployment-config.json` 讀回 `billingLiveEnabled:false`。Live 九個必要 Fly secret 名稱尚未設定，正式 webhook 仍空，商品仍為 Draft；正式收款仍關閉。
- **新加密備份／隔離還原：** 首次付款 schema 備份 run 39119776842 已上傳／下載加密 artifact，但隔離假付費資料的伺服器端 `COPY` 遭角色權限拒絕。PR #46 僅將隔離 runner 的 CSV 匯出／匯入改為 psql `\copy`；PR CI #248 成功，PO 明確授權合併為 Main `a38ca6fc2bad2cd92824be64c59bc553b7869fda`。Main CI run 39120996344 的 verify、browser-ui、Development migration、Production preview、同 SHA Fly 自動部署／ready 全成功；公開 `/api/ready`、`/`、`/login` 均 200，`billingLiveEnabled:false`。重跑的備份 run 39121153840 成功：正式全庫 AES256 artifact `12134830382`（保留至 2026-10-25 10:57:39 UTC）實際上傳、下載、解密與 SHA 校驗；來源恢復點 ≤48 小時；斷網容器還原 Auth 4／Workspace 4、付款 migration 與 13 表，並對六張付款表的隔離合成 checkout／subscription／invoice／period 做 CSV 刪除及回存，owner join 為 1。runner 明文與 passphrase 清理成功。R15 正式 schema／真備份與隔離還原判準通過；這不是 Live 真付費資料還原證據，正式付款帳本仍空。
- **固定 R01–R17 更新：** 目前 8 項通過（R04–R07、R10–R11、R13、R15）、R08 條件結案、8 項部分／未驗（R01–R03、R09、R12、R14、R16–R17）。R12 因本輪發現舊 Test Mode variant 可阻塞後續補償，修正須完成遠端同版交付及漏送回歸後才恢復通過；下方較早計數及 R15 未套 migration 記載均為歷史狀態，以此段及 Main 證據為準。
- **PO 新 Test Mode 驗收順序：** 任何受控 Live 真實交易之前，先以目前付款版本完成 Test Mode 全情境核對。既有 R04–R13 真供應商證據與同版 CI 作基線，但這次完整情境回歸尚未完成；逐項核對首購／回購、四方案、原生優惠、試用與已付升級、禁止降級、取消到期、退款、webhook 漏送／重放／簽章、並發與跨 owner、失敗／pending 和自然續扣，以及桌機／手機方案→結帳→狀態→帳單。逐項記錄 provider／API／帳本／權益證據與不能即時重現的限制，未通過前不開始 R16 Live 交易。
- **本輪 Test Mode 首購通過：** PO 親自於 Lemon Test Mode 按「開始試用」。隔離 Coach 由 `/plans` 選 Pro 年繳、確認 NT$1,150／年、1 個月試用及今天 NT$0，使用官方測試卡完成。Development intent `c94e9393-811a-4b43-afd1-eb1e555d3227` confirmed；Lemon 訂閱 `2617258` 為 `on_trial`、variant `2250108`、trial end `2026-11-18T11:23:50Z`；供應商試用發票 `8756158` 已付 TWD 0。真簽章 webhook 的兩筆 subscription 與一筆 invoice inbox 均 `done`、各一次；Development ledger 的同一訂閱／發票相符，唯一 `initial` verified period 為 Pro 年繳試用。Coach 重新讀回「Pro 方案／免費體驗中」、NT$1,150／年與 NT$0 已付款帳單；付款憑證入口實際開啟 Lemon Test Mode 訂單 `49107415`，顯示總額 NT$0、訂閱仍試用中。這證首購端到端，不證一個月後自然首扣或其他情境。
- **本輪漏送補償問題與修正（PR #51 CI 已通過，待合併及漏送回歸）：** Development 中舊 Test Mode 訂閱 `2614961` 指向不在目前四個正式 variant 的 `2250115`；原掃描在 `unknown_variant` 中斷，後續已綁定訂閱也得不到補償。修正為僅在 Test Mode 對這個已知版本錯誤保留 fail-closed、跳過該筆並繼續掃描，記錄 warning；Live 的未知版本與其他 provider／scope 錯誤仍失敗。聚焦測試 4/4、API typecheck 通過；重啟 Development 本機 API 後，真 provider 掃描回報 `scanned=12, resources=33, skipped=1`，後續新首購沒有被舊資料阻塞。此修正已推送 Draft PR #51，合併 Main 衝突解決後 CI #258 對 `4697045` 通過；仍未合併／部署，修復後漏送端到端回歸未做，故 R12 維持部分。
- **R09 加速試用診斷作廢並還原：** 曾在隔離訂閱 `2617258` 以供應商管理 API 暫改 `trial_ends_at` 至當日，觀察到供應商 webhook 同步更新；但凍結 Contract 要求首次試用的原始終點固定，行政改期不屬可驗收的正常首扣情境，不能由此推論產品權益缺陷或自然續扣通過。已立即改回原始 `2026-11-18T11:23:50Z`，Lemon 與 Development ledger 的 `trial_ends_at`／`renews_at` 均讀回原值，只有原始已付 NT$0 發票，verified period 原終點一致。R09 正常首扣及 owner-bound 自然續扣仍未驗。
- **暫時測試設施清理：** Test Mode webhook `142825` 已還原至原 URL；Cloudflare Quick Tunnel、僅 webhook 的本機代理、API 與 Web 測試服務已停止，3008／3009／4178 無監聽。已輸入瀏覽器的測試密碼已輪替為新隨機值，僅存 Git 忽略 manifest；測試帳戶與訂閱保留供日後 R09 原始到期核對。原 webhook URL 現不可達，下一次供應商事件前須先接回受控接收端。

## 2026-10-18 PR #45 與同版 CI

- **遠端交付：** PO 明確允許推送付款分支並建立 PR；Draft PR #45 以 `763eeff` 對 Main `3faee94` 建立，未合併或部署。首輪 Actions #244／run 39118267500：`verify`（格式、型別、完整測試及 production build）成功；`migration-dry-run` 因 Development 已有 `20261017164829_billing_refund_case_decision`，本分支的已知遠端 migration 清單漏列而失敗；`browser-ui` 因測試仍期待舊版頁名、年費與不可選方案而失敗。Production migration preview 與 deploy 在 PR 上依設計跳過。
- **聚焦修復：** 只將已存在的 Development migration 納入允許清單，不改寫遠端歷史；`node --test scripts/development-migration-dry-run.test.mjs` 2/2 通過。方案瀏覽器斷言改對應已審定的「比較方案與價格」、年費 NT$1,150／1,450 及「查看 Pro／Prime 訂閱」；`npm run test:browser -- apps/web/e2e/plan-choice.spec.ts` 的 1440px、390px 2/2 通過，無方案 mutation。修正已推至 `078f2dc`；Actions #245／run 39118646045 的 `verify`、`browser-ui`、`migration-dry-run` 均成功。PR 上的 Production migration preview 與 deploy 按設計跳過；此 CI 不證正式 Supabase migration、Live webhook 或部署。

## 2026-10-18 接續後的實際上線進度

- **R17 部署開關修復（本地，未發布）：** 發現原 Docker build 未傳 `VITE_BILLING_LIVE`，手動與自動 Fly 發布也未保持同一付款開關；即使正式資料與商家準備完成，Live Web 入口仍可能隱藏，或與 API 開關不一致而拒絕啟動。現已讓 Docker 接收 build arg，兩種發布都從 `PRODUCTION_BILLING_LIVE_ENABLED`（未設定時為 false）將同值傳給 Web build 及 Fly runtime；手動流程須與 `billing_live` 操作者選項相符。Live 發布前僅核對 Fly 的必要密鑰名稱，缺項即在 migration 前停止，不輸出值。合成 public 設定的 Web production build 成功，`deployment-config.json` 讀回 `billingLiveEnabled:true`；發布腳本／密鑰聚焦 18/18、Prettier 與 whitespace 通過。未設定 GitHub 正式變數、Fly 密鑰或實際發布；Production 仍 hard-off。正式變數、密鑰、遷移與同 SHA 部署須在各自發布授權點完成。
- **同版本機完整檢查：** 合併 Main `3faee94` 後的付款候選，在移除正式 SQL 檔尾多餘空白行後，`npm run check:affected -- origin/main` 通過：23/23 script、API 62 檔 371/371、Web 94 檔 415/415，API/Web typecheck、變更檔格式與 whitespace 通過。這是本地檢查，不是遠端 exact-SHA CI、Live 商家、正式 migration 或部署證據。SQL 僅改動結尾空白，未更改 schema。
- **R02 商店身分核對：** Live General 只顯示 `Activate your store to accept live sales` 文案與 Identity verification `Active`，無可讀的商店啟用狀態；不能單憑這行文字斷定已啟用或未啟用。商店目前名稱為 `Website Application`，而該欄位明示會出現在收據與發票；已核准公開營運名稱為 `Form Coach Desk Studio`，正式收款前須校正及讀回。未保存設定；檢視後已恢復 Test Mode。
- **R02／R16 webhook 實際入口：** Live webhook 新增表單核對公開 URL 是 `https://formcoachdesk.com/api/hooks/lemonsqueezy`，已選程式接收的 11 個 `subscription_*` 及 `subscription_payment_*` 事件；簽章 secret 尚未輸入、也未按 Save，故仍沒有正式 hook。新增公開同站 proxy 聚焦測試，用含 Unicode 與原始空白的 payload 驗 HMAC；`/api/hooks/lemonsqueezy` 的原始 bytes、`X-Signature`、content type 均完整送到內部 `/hooks/lemonsqueezy`，8/8 通過。這不證正式 webhook 收送；Live 端仍須密鑰、正式部署及真事件讀回。
- **PO 已在前一對話檢視並修正付款頁與付款須知。** 不再要求重做同一輪 UI 審閱；Live 流程及發布 Gate 仍須依各自判準驗證。
- **R02 Live 商店：** Lemon 後台已建立未發布、未顯示於 storefront 的商品草稿 1449729（FORM Coach Desk 訂閱），含四個明確 variant：Pro 月繳 2262960／NT$115 每月、Pro 年繳 2262966／NT$1,150 每年、Prime 月繳 2262967／NT$145 每月、Prime 年繳 2262969／NT$1,450 每年。各 variant 在編輯頁設原生 1 個月試用及 SaaS business-use 稅務類別；商品詳情讀回四項價／週期、Draft 及 storefront 關閉。這是目錄草稿，不代表已發布或可收款。Live Webhooks 清單仍空；建立表單已核對 callback URL、簽章 secret 與 11 個程式接受的訂閱事件選項，未儲存新 hook；General 仍提示 Activate your store to accept live sales。操作後 Test Mode 開關已恢復開啟。
- **R09 自然續扣：** Test Mode 診斷用日繳訂閱 2609055 的供應商已出現 billing_reason=renewal 的已付發票 8754514（NT$115，2026-10-18 08:17:47 UTC）；舊 tunnel webhook 收到 HTTP 400。該 merchant-side 訂閱不綁任何 Development Coach；Development 訂閱／發票 ledger 對這兩個 provider ID 均為 0，不能據此宣稱 app owner、權益或期間驗收通過。R09 仍部分。
- **R15 正式資料與備份：** Production Supabase ref febunjhpruqlywjfvuaq 仍未套用 20261017181022 付款 migration。2026-10-18 手動 GitHub 備份／隔離還原 run 39116375185 在 Main 3faee94 成功：本次加密 artifact 12132487635 已於 runner 下載、解密、校驗；斷開資料庫所有 Docker 網路後還原並讀回 Auth 4、Workspace 4 與既有 migration。這證明正式基線的真 artifact 還原，不證付款帳本：當次 Main 無付款 migration，且該版本未含 R15 的付費 fixture 與 48 小時斷言。新 artifact 建立於 2026-10-18 09:44:41 UTC；正式付款 schema、角色與付款資料還原 Gate 仍未完成。
- **R16／R17：** 尚未建立 Live webhook／完成 Live 啟用與受控真實交易；PR #45 在 `078f2dc` 的三個適用 CI 工作均成功，但尚無 Main 的正式 migration preview、正式部署及 readiness／首批交易觀察。Production 付款開關保持 hard-off；付款分支已合併 Main 3faee94 並推送 Draft PR #45，尚未合併或部署。
- **下一步：** PR #45 的聚焦 CI 修正已驗，下一步準備正式 webhook／設定與 R15 可執行交付；正式 migration、正式密鑰、Live 實付及合併／部署留在各自授權點。固定 R01–R17 計數維持 8 通過、R08 條件結案、8 部分／未驗；以下較早的 Live 商品全空或要求重看付款頁的記錄已被本段取代。

## 2026-10-18 先前 Main 整合與 R15 現場核對（以首段接續進度為準）

- **影響／判準：** 若付款分支蓋過已發布的單堂購課與工作線路由，上線會使既有功能或交付狀態倒退；通過判準是以最新遠端 Main 為基底完成本地合併，受影響的 Web 流程與型別仍通過。
- **本地整合：** 遠端 `main` 於本輪讀回 `e7a20c7421facc8f5c678f50eb8f44b406f675f9`（PR #43）。隔離付款分支原 HEAD `d123ff4`，已合併該 Main；Main 的整合 router／平行工作線規則與最新 M8-E R01–R17 清單各自保留。合併只在本地，尚未推送、部署或更動付款設定。
- **聚焦證據：** 合併後單堂購課、CheckoutPage、PlansPage 三檔 17/17；Web `typecheck` 通過；合併文件 Prettier 與 Git whitespace 檢查通過。這不替代 PO 對付款同版 UI／條款的審閱，也不是完整 Web 或 CI Gate。
- **R15 現場核對：** Supabase connector 讀回 Production `febunjhpruqlywjfvuaq` 為 `ACTIVE_HEALTHY`，migration history 仍無 `20261017181022`。正式 SQL 套用、加密 artifact 真正下載／隔離還原、≤48 小時恢復點與 Production 角色驗證仍未做，R15 保持部分。正式 Live 商店商品／webhook 本輪未取得新讀回；瀏覽器重新導向後無法穩定讀取頁面，因此 R02 仍沿用上次的未驗狀態。
- **下一步：** 先讓 PO 檢視此整合版付款流程與同版條款，再依核准範圍完成 R02 Live 商店與 R15 真還原／migration Gate；R09 真自然扣款及 R16／R17 沿固定清單處理。Production 支付保持 hard-off，遠端推送、Production migration、正式密鑰與 Live 真付款各遵守原授權界線。

## 2026-10-18 PO 最終支付規格重置

- **生效規格：** Pro／Prime 月繳、年繳四個 Lemon 方案都設定原生 30 天或 1 個月試用；
  目前 Test Mode 四個方案已讀回為原生 1 個月。**PO 本輪修正：只有帳號首次付費
  訂閱可享試用**，今天應付 NT$0；續訂與再次訂閱無第二次試用，再次訂閱今天付
  方案全額。後端沿用已核驗的首次訂閱紀錄判斷，再訂閱於 Lemon checkout 設
  `skip_trial:true`。結帳前可顯示明確標記的預計首次扣款日期與標價；實際試用終點、
  首扣、續訂與權益仍只由 provider 的 `trial_ends_at`、`renews_at`、發票確認，不拿
  預計日期作權益授權。
- **原生優惠碼：** 本站訂閱確認頁沒有輸入欄，API quote 嚴格拒絕 `code`；送 Lemon 的
  checkout 設 `discount:true`，讓 Lemon 原生欄位接收並判斷適用折扣，不預填折扣，
  也不建本站折扣計算、保留或核銷帳本。已建立的獨立 60 天付費優惠碼候選 migration
  與本地核銷邏輯已撤回；先前免付款 Beta grant 只保留已領者原期限，正式站支付開關
  仍為 off。這個新規格取代下方所有較早 Promotional 描述。
- **方案降級：** 不提供付費方案之間的降級或期末排程；試用中也拒絕 Prime→Pro 或
  年繳→月繳。只提供取消續訂，已核驗原權益至原終點，到期轉 Free，再由使用者自行
  重新訂閱。付費升級仍依已核驗的獨立流程，不把 Lemon 的立即 variant PATCH 當降級。
- **沿用既有證據，不全面重驗：** R04 已完成真正的 Lemon 零元首試用、簽章 webhook、
  發票及 owner 權益讀回；R06 已證原 trial end 不動的試用升級；R07 已證實付升級；
  R10 已證取消與原終點；R11–R13 的退款、事件恢復及租戶／並發證據繼續有效。
  這些機制沒有因改用原生 1 個月試用而失效，不再重做交易。R05 舊免卡碼案例只作歷史
  證據，新規格已關閉發碼／兌碼。R08 繼續採取消→到期 Free→自行重新訂閱的備案。
  R09 原本就沒有一般自然首扣／續扣證據，仍單列，不因本次重置要求重跑 R04–R08。
- **僅驗改動差異：** 已做結帳報價、Lemon 原生折扣欄、拒絕本站舊碼、禁止降級的聚焦檢查。
  Lemon 四個實際 variant 已各唯讀回查一次：Pro／Prime 月繳、年繳皆為 published、
  Test Mode、訂閱價格的 trial interval = month × 1，符合 PO 的 30 天或 1 個月規格。沿用 R04 的
  零元首試用證據，不另買四筆或重走整套 R01–R17。正式上線的 R02 Live 商家、R15
  schema／還原、R16 Live smoke、R17 發布及既有未結的 R09 各按原判準處理。
  PO 指出台灣 PayPal 無需額外驗收；R14 不再以 PayPal 或 Cash App Pay 可用性作為
  獨立阻擋。下方舊紀錄若寫「回購仍給第二次試用」「付費降級」或要求重測，均以本段為準。
- **本輪 PO 介面微調：** 首次結帳摘要恢復預計首次扣款日期及方案金額，再訂閱摘要
  顯示本次金額、今天付款、不顯示試用。優惠碼只在付款須知作獨立說明欄，結帳摘要
  不顯示優惠碼欄位；實際輸入仍只在 Lemon 結帳。
  付款須知與結帳頁補足小額交易手續費及匯率誤差；手續費／換匯説明改常駐欄位；
  退款文案加上取消續訂後可使用至期限結束。結帳體驗提示改為「可於體驗期間取消
  續訂，將保留體驗資格至期限結束。期限結束後將不進行扣款。」預覽與聚焦檢查證據
  見本月 LOG-644／LOG-645。
  PO 指示本輪只做介面微調，R02、R09、R15–R17 留待下一個對話，Production hard-off。
- **本輪局部證據：** API policy／checkout／Lemon payload 3 檔 24/24；Web checkout、
  本地準備頁、預覽 gateway、付費法律稿 4 檔 26/26；API/Web typecheck 均通過。
  本機 5188 首購預覽讀到 Pro 月繳 NT$115、今天 NT$0、預計 2026/11/18 首扣
  NT$115；再次訂閱預覽讀到無免費體驗、今天 NT$115 與「付款並訂閱」。付款須知
  在同版讀到獨立優惠碼欄、手續費／換匯常駐欄及退款補句。上述均為本地合成畫面，
  沒有新 Lemon 交易或 Production 證據；完整 Web 與發布 Gate 未在本輪執行。
- **現況與下一步：** 本地程式、聚焦測試及文案已按新規格整合；Test Mode 四個 variant
  原生 1 個月試用已直接讀回，Live 商店尚無四方案可讀回。本站舊 Promotional 發碼與兌換入口
  已關，已領權益仍依原紀錄讀取。
  2026-10-18 本輪 API／Web typecheck 通過；API 新規則聚焦 61/61、Web 方案／結帳／
  法律聚焦 24/24，舊斷言更新後 Lemon checkout 聚焦 9/9。本機 DEV 預覽讀回 Pro 月繳、
  1 個月、今天 NT$0、沒有本站優惠碼入口，取消續訂提示只顯示一次；付款須知同版一致。
  **原生優惠碼驗收：** 建立隔離 Test Mode 10% Lemon Discount，真正的 Lemon 試用結帳
  顯示今天 NT$0、1 個月試用，輸入後首次扣款預覽由 NT$115 變 NT$103.50；未按
  Start trial、未成立訂閱或收款，測試折扣已經 Lemon API 204 刪除。API checkout preview
  的當下 0 元折扣值不能用來證明未來金額；採用實際結帳畫面讀回。此證據只涵蓋原生
  折扣預覽，不代表未來真首扣已完成。
  未做新 Test Mode 購買或 Production 變更。同版 UI 的局部檢查已完成；後續 Gate
  沿用已驗證項目，不重做免費試用交易。R02 商店 Live 商品／webhook、R09 自然首扣／續扣、R15
  正式 migration 與還原、R16 Live smoke、R17 同 SHA 發布仍未完成，不能宣稱可上線。
- **本輪整合檢查：** `npm run check:affected -- origin/main` 的格式、diff、22/22 script、
  API typecheck、API full 62 檔 368/368、Web typecheck 通過。Web full 初跑 94 檔中的
  91 檔通過、411/414；3 個舊斷言分別仍期待舊價格、試用 Prime→Pro 降級及不可顯示
  首次扣款說明。已按新規格修正，該 3 檔聚焦複跑 8/8 通過；尚未重新執行整個
  414 案例 Web 集合，因此不可報成 full green。這不要求再做一筆 Lemon 試用。
- **剩餘門檻與順序：** R01/R03/R14 的同版 PO 畫面與條款驗收；R02 Live 商店啟用、
  四商品／價格／原生試用及正式 webhook 唯讀回查；R15 Production schema、真加密備份
  artifact 隔離還原與 ≤48 小時恢復點；R16 在上述門檻滿足後受控 Live 首購／取消；
  R17 同版 exact-SHA CI、部署、readiness 與首批交易觀察。R09 自然到期首扣／續扣
  目前缺真事件，不能由手動 `billing_anchor` 或本輪原生折扣預覽冒充；既有失敗／晚到
  防線有聚焦證據，真事件需在可取得時補證或由 PO 明確決定帶著這個剩餘風險上線。
  Production 支付仍 hard-off；本輪未套 migration、未 push、未啟用 Live、未付費。

## 2026-10-18 Main 基底付款整合：聚焦檢查通過，待 PO 檢視與完整 Gate

- 延續 R03／R17 原有工作，新增 Web 建置期 `VITE_BILLING_LIVE` 明確開關，預設 false；
  DEV 的 Test Mode 路徑仍由原開關控制。正式建置開關為 true 才掛載結帳與付款須知，
  測試卡及 Test Mode 提示只在 DEV 顯示。正式條款／隱私頁在 Live 建置時選用已準備的
  中英文付費文字，不顯示「尚未生效」。付款金額、付款服務商及法律文字仍待 PO 同版審閱。
- Web 建置產物寫入公開的 billing Live 布林值；Production API 啟動前將它與獨立的
  server-only `BILLING_LIVE_ENABLED` 比對，不一致即拒絕啟動。這只防止混版；不表示 Live
  商店已啟用，也沒有變更目前 Production 開關或部署。
- API release-boundary 聚焦 8/8、Web 法律呈現聚焦 2/2、API/Web typecheck 通過。
  其他 Web 聚焦 18/19 通過，其中 `App.internal-alpha.test.tsx` 一項因共用工作樹既有
  Landing 文案與舊斷言不一致而失敗，與付款改動無關；測試後未修改該 Landing 文案。
  Windows sandbox 內 Vitest 遇暫存檔 rename EPERM，聚焦測試改在已核准的 sandbox 外執行。
- 已建立基於本機 `origin/main` (`1965d33c`) 的受管理整合 worktree
  `C:\Users\User\.codex\worktrees\m8e-payment-integration\Gym Assistent`。API 的 billing
  模組、啟動與路由及 Web 的方案、結帳、法律與設定入口已逐檔移植，保留 Main 的 M8-D
  單堂計費、手機登入與設定導覽修正。Main Landing 價格與結帳統一為 115／1,150、
  145／1,450；刪除未經證據支持的「最受歡迎」標籤。正式候選 SQL、備份恢復增量與
  M8-E Contract 已放入整合 worktree，沒有套用 SQL。
- **整合版聚焦證據：** API/Web typecheck 通過；API billing 與 Production boundary
  18 檔 168/168、Web billing／Plans／法律／App 12 檔 48/48 通過。合成審閱路由的
  Pro 月繳首訂確認頁在桌機與 390px 讀到 NT$115／月、今天 NT$0、首次扣款
  2026/11/18、未預勾同意；390px document width = 390px，無水平溢出。截圖位於
  整合 worktree 的 `output/playwright/m8e-integrated-checkout-desktop.png` 與
  `m8e-integrated-checkout-390.png`。這是 DEV 合成情境，畫面上開發工具列會覆蓋部分
  內容；不證真 Auth、provider、Production 或 installed PWA。
- R01–R17 計數不變：8 通過、R08 條件結案、8 部分／未驗。下一步 PO 檢視整合版
  桌機／手機付款流程及同版條款；反饋修正後才開始未核准的完整 UI/CI Gate。R15 已
  獲准的資料庫／備份驗證可依原合約續做。Live 商店商品與 webhook、自然續扣、真加密
  artifact 還原與 ≤48 小時 Production 恢復點、正式 migration、Live 首購及同 SHA
  發布仍未驗。原髒 checkout 不能整包推送；整合 worktree 也尚未發布。Production
  套用、密鑰、Live 交易及遠端推送各有原核准界線。

## 2026-10-18 R15 Gate 接續：隔離 SQL／角色及正式 CLI 預覽已驗，遠端恢復仍未驗

- **工作線釐清與更正：** 這個 checkout 是落後於 Main 的 `codex/landing-footer-studio`，
  含未併入的 M8-E 支付草稿及其他分支改動。2026-10-18 本機 `origin/main` 已含
  M8-D 單堂計費 PR #35 與購課紀錄 PR #37；Main CI／migration release／部署證據見
  `codex/m8d-single-purchase-release-evidence` 的 Status。我先前把此 checkout 的舊
  M8-D Status 當成最新 Main，誤稱單堂計費未實作，現已更正。多餘的本機 DEV 預覽和
  未完成學生單價實驗已撤回。PO 明確接受 M8-D 為完成；R01 的 M8-D 前置成立，
  M8-E 其餘 Contract／同版檢查仍部分。不能將這個髒 checkout 整包推送或覆蓋 Main。

- **範圍與授權：** 維持原 R01–R17（8 通過、R08 條件結案、8 部分／未驗）。PO 於
  2026-10-18 檢視 R15 本機版後明確同意完整驗證 Gate；沒有授權 Production migration、
  設密鑰、遠端推送或 Live 交易。本輪沒有 Provider 交易或遠端部署。
- **SQL 候選：** `20261017181022_billing_live_test_foundation.sql` 與十份 Development SQL
  的非註解內容逐行比對，原差異僅為 `environment` 約束及去除預設值；追加
  `intent_id + workspace_id + environment` 複合 FK，禁止跨環境或跨 owner 綁訂閱。
  靜態讀得 13 張表、13 個 RLS 啟用、12 個顯式 test/live 約束、0 個 environment 預設值；
  refund application 由 case 複合 FK 歸屬。這不是 SQL 執行、migration dry-run 或角色驗證。
- **Runtime：** 七個帳本／owner repository 用同一個伺服器端環境參數綁 SQL，所有新增列明示
  環境；促銷兌碼重疊鎖也跟隨該環境。Checkout 回應、provider resource、真簽章 webhook、
  worker、遺漏事件掃描均拒絕 mode/store 不符。新增獨立 Live 密鑰組的設定驗證：Production
  專案及兩個資料庫連線必須同 ref、worker 必須用專用登入、Test/Live 商店或密鑰不得重用。
  Live 開關預設 false，現有 Production 沒有被啟用；Web 正式建置仍隱藏支付入口。
- **本輪決定性驗證：** 用暫存於忽略的 `output/r15-gate` 的 PGlite PostgreSQL 執行完整
  候選 SQL，13 張表建成；一筆合成 Live 已付資料的 owner／intent／subscription／invoice／
  period join 為 1，跨環境 intent 與跨 owner invoice 外鍵均拒絕；`gym_assistant_api`
  只見本人 period／invoice、不能寫 invoice，`authenticated` 不能讀私人 period；
  `gym_billing_worker` 可讀訂閱、寫 inbox，但不能改 checkout account owner 或讀 API
  paid-change 命令。PGlite 是真 PostgreSQL SQL 執行，但不是正式 Supabase 基線／遠端
  migration dry-run。API billing
  16 檔 161/161 及 typecheck 通過；Vitest 在已核准的 sandbox 外執行。
- **正式遷移精確預覽：** 2026-10-18 對 Production ref `febunjhpruqlywjfvuaq` 執行
  `supabase migration list --project-ref`，確認 `20261017181022` 僅在本機。
  首次 `db push --project-ref --dry-run --skip-vault` 因三個已在遠端、尚未列於正式本機目錄的
  歷史版本停止；暫時複製其既有 Development-only SQL 後，同一唯讀預覽只列出
  `20261017181022_billing_live_test_foundation.sql`，回報 `dryRun:true`；三份副本已清除。
  這只證明 CLI 待套用清單，**不證明在正式 Supabase 基線執行成功**，也未套用任何 SQL。
- **備份探針：** 手動 workflow 現於已斷網的還原 DB 注入合成 Test Mode 付費資料，以
  PostgreSQL CSV COPY 匯出六張依賴表、刪除、再匯入，讀回原 owner 至 invoice／period 的
  完整 join；也核對 artifact 的建立時間距還原時不超過 48 小時。本機 PGlite 已驗相同
  fixture SQL 與六表 COPY 往返，YAML/Bash 語法及 YAML Prettier 通過。**實際 GitHub
  加密 artifact 下載、Supabase 隔離還原、48 小時恢復點及 Production 角色尚未執行**；
  空表斷言不能替代該 Gate。
- **下一步與界線：** 正式 migration 在 Production migration history 尚無版本
  `20261017181022`；精確 CLI 預覽已通過，仍需於授權的隔離／正式部署流程做 Supabase 基線驗證，
  然後在正式 schema 存在後執行手動加密 artifact 還原，取得真實 ≤48 小時證據。R15
  保持部分；Production migration、遠端 push／merge、密鑰與 Live 付款各有獨立授權點。
  R14 付款方法、R09 正常續扣、R01/R02/R03、R16/R17 仍照原 register。

## 先前狀態快照：還不能上線（以首段接續進度為準）

### 2026-10-18 R02／R09／R14 唯讀回查

- Lemon Live Dashboard 的 Products 與 Webhooks 清單皆空；General 頁仍顯示
  「Activate your store to accept live sales」。身分驗證顯示 Active，但不等於可收款。
  Test Mode 開關在回查後已還原為開啟。R02 的四個 Live 方案、正式 webhook、可收款與
  真實付款方式仍未驗。
- 官方 Lemon 文件列訂閱可用卡、Apple Pay、Google Pay、PayPal，未列 Cash App Pay；
  checkout API 未提供文件化的付款方式排除參數。商家 General 頁可見 Apple Pay、
  Google Pay、PayPal Subscriptions 開關，未見 Cash App Pay 專屬開關。
  R14 的 Test Mode checkout 曾顯示 Cash App Pay，但沒有成功的訂閱付款證據，
  因此不宣稱此方法可用；R14 仍部分。
- 官方 API 唯讀讀回七筆既有 Test Mode 訂閱與其發票（`2609277`、`2614493`、
  `2614857`、`2615449`、`2615463`、`2615581`、`2615693`）：
  發票的 billing reason 僅為 `initial`／`updated`，無自然 `renewal` 已付發票。
  `2615581` 的 `updated` 已付發票 `8750280` 仍是手動 billing-anchor 測試，不可升格為
  正常原試用終點首扣或續扣證據。R09 保持部分，等候真實正常到期事件時再讀回。

- **固定 R01–R17 清單：** 8 項通過（R04–R07、R10–R13）、1 項採安全備案條件結案
  （R08）、8 項仍為部分／未驗（R01–R03、R09、R14–R17）。本輪沒有新增 Gate；R11 的
  帳單標示缺陷已歸入原項修復。
- **Production 支付 hard-off。** Live 尚未有正式商品及 webhook；Lemon 商店仍顯示需啟用
  Live sales。M8-E 本機程式與部分 Development/Test Mode 交易成立，沒有完成 M8-E 全套
  瀏覽器／CI、正式 migration、受控 Live 首購或同 SHA 部署；沒有遠端推送授權。
- **前置 M8-D 已完成。** PO 接受已發布的 Beta、單堂計費及購課紀錄修正為完成；
  M8-E 的分段 Contract 仍須依自身 R01–R17 判準驗證。
- **有效產品規則：** 現有 Promotional 碼在本站方案頁免卡領 Prime 60×24 小時，沒有
  Lemon 訂閱、到期自動扣款或另外一組 M8-E 付費碼。一般付費結帳只有 Pro／Prime 月／年
  四個選項；首次訂閱可有一次一個月試用，回購直接收費。Free 沒有可取消的訂閱。
  已付費自動降級未證實，只提供取消續訂、原權限用至原終點、之後轉 Free 的備案。
  2026-10-18 PO 補充：已核准並套用當期撤權、供應商確認取消且原發票全額退款的帳戶，
  可立即重新購買；回購直接收費，不再給第二次試用，須由新發票與新期間證明權益。
- **方案與價格：** Pro NT$115／月、NT$1,150／年；Prime NT$145／月、NT$1,450／年。
  本機目錄使用此價格；共享遠端仍可能顯示舊版 119／149，Live 商品尚未建立。不能混版發布。
- **暫時 60 天 Lemon variant：** 公開直購可繞過本站方案選擇；PO 接受活動期間有人
  從供應商取得 60 天試用的風險，停止把直購封堵、逐筆取消、proof 攻防或通知驗證
  當作上線 Gate。保留已做的 owner 綁定與取消防線，不再擴寫此支線。現有 Production
  免卡碼於 **2026-12-01 00:00 Asia/Taipei** 停止新兌換；`prime-60` 自動追蹤到期時
  關閉 Lemon 月／年 60 天 variant 的新購，既有權益不動。

## 現階段執行規則：先釐清癥結，再做最小充分驗證

1. **每次只結一個問題。** 開始前用一句話寫明「若錯了，使用者或收款會遭到什麼實際
   影響？」再寫一個可觀察的通過判準。先修根因、跑受影響的聚焦檢查、記錄結論，
   才轉下一項。新 bug 歸入 R01–R17 對應項；不因看見小差異就加新 Gate。
2. **重要性分三層，驗證量跟風險走。** 第一層是錯扣／重複扣款、漏扣後錯授權、
   跨帳戶權限、取消後仍續扣、價格或條款造成錯誤收費／無效同意、不可復原資料或
   未準備好的 Live 收款：一定要有決定性 provider／DB／權限證據。第二層是失敗恢復、
   正常互動與不影響收費判斷的顯示差異：用一筆
   代表性真交易加聚焦規則測試，或可重現的隔離整合測試。第三層是純視覺、措辭、
   非阻斷的小細節：在最後整條流程與桌機／手機驗收時一併觀察，不單獨延長付款
   開發。若細節使人無法完成付款或理解實際收費，立即升為前兩層。
3. **一個癥結只要足以判定的證據。** 同類方案用一個代表性的 Test Mode 真交易核對
   Lemon 實際 invoice／subscription、簽章 webhook、本站 owner ledger／PlanAccess；
   其他確定性排列用聚焦測試覆蓋。不為了數量重做 16 筆交易，不把所有理論邊界都
   當外部實測。既有 M8-D 已通過的免卡碼重用／Email 限制保留為基線，不重做。
   一個必要探針若暴露我方 bug，修復後重驗一次；再不成立就記明原因並採已核准的
   安全備案或關閉該入口，不無限重試。未被此規則涵蓋的新高風險須具體說出影響，
   才能升級驗證。
4. **不確定必須轉成可決定的工作。** 寫出已知事實、唯一最關鍵的未知、最小驗證、
   通過／失敗各代表的結論與安全備案。驗證後明確標「通過」「不通過已修」「條件
   結案」或「因外部條件無法驗，入口保持關閉」；不得只反覆寫「可能」「仍需更多
   證據」而沒有停止條件。局部 helper 測試不可冒充真付款，但已足以證明純規則時
   也不要求額外付款。
5. **需要 PO 按 Test Mode 最後付款時，Agent 先準備完整。** 自己建立隔離測試帳戶／
   正確方案與單一 variant checkout，設定可讀語言，預填可取得的測試姓名、Email、
   國家／郵遞區號、官方測試卡號、未來到期日與 CVC；打開 PO 能看見的**正確分頁**，
   先核對畫面上的方案、試用、今天應付與後續金額。只在最後需本人提交時請 PO 按
   一個按鈕；完成後 Agent 自行查 Lemon、webhook、DB 與權限。工具無法填完時，先
   解決工具／頁面問題，不把未準備的表單丟給 PO，也不要求 PO 代做 Agent 可做的步驟。
   測試卡與假資料只用在 Test Mode；不在 Status 記錄真卡、密鑰或個資。Live 實付須
   另列明真實金額及授權，由 PO 執行最終付款。
6. **報告要回答「做完什麼、未完什麼、下一步是什麼、需要 PO 做什麼」。** 每結一項
   更新本表與工程日誌，寫下最小證據、結論及剩餘唯一缺口。沒有需 PO 交接、重大
   意外或足夠進度需要彙報時，直接做下一項；不要把中途停下當作測試邀請。
   2026-10-17 的暫停已由 PO 後續「請開始」解除；完整 Gate、遠端／Production 操作仍依
   AGENTS.md 的個別檢視與授權點。

以上規則只縮減**重複或非關鍵驗證**，不跳過 Roadmap 的 Contract→Sol→CI、PO 看版本
後同意完整驗證、遠端推送與 Live 開啟的既有授權點。狀態定義：`通過`＝核心判準已有
充分證據；`部分`＝指出未證的核心判準；`條件結案`＝安全備案及入口限制已核實；
`未驗`＝尚無核心證據。不能因測試數量多就把 `部分` 寫成 `通過`。

## 已有的決定性證據與限制

| 事實                                                                                                                                                                                                                                                                                                                                                     | 真正證明了什麼                                                                                                                            | 不能推論什麼                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| M8-D 隔離 Production 兩帳戶測試：永久碼單次、共用優惠碼、重用、跨碼及 60 天規則通過；目前正式碼未使用                                                                                                                                                                                                                                                    | 現有免卡碼的基本兌換規則已交付                                                                                                            | 不代表它能與 M8-E 付費訂閱同時存在而不衝突                                                                      |
| Pro 月首試用 `2614857`、invoice `8747726`：Lemon 首投 200，Development inbox 三筆 `done/attempts=1`，原 intent 與 Pro 權限一致                                                                                                                                                                                                                           | 新一般月繳的真實 webhook 首投與 owner 綁定可行                                                                                            | checkout 是隔離 fixture 發起，非 Coach UI；不證明年繳／回購整條路                                               |
| Prime 月試用 `2614688`：真事件重送後 owner Prime 成立；返回 Pro 月 `8746247` 實付                                                                                                                                                                                                                                                                        | 真 provider trial 與回購付款各有局部證據                                                                                                  | 前者首投 401；後者最初靠本地簽章事件恢復，不能當完整自動鏈路                                                    |
| Pro 月→Prime 月 invoice `8746384`；Prime 月→Prime 年 invoice `8746552` 與年繳權限                                                                                                                                                                                                                                                                        | 同訂閱已付升級、實際 invoice 與權限可對帳                                                                                                 | 未由新 Coach UI 確認動作串出一筆完整交易                                                                        |
| 歷史 60 天付費 Test Mode `2614961`；無本站 intent 的 `2615038`、`2615265` 已取消                                                                                                                                                                                                                                                                         | 測試過供應商優惠 variant 與部分孤兒取消防線                                                                                               | **不是現有 Promotional 碼路徑**；PO 已接受公開直購風險，不再追此題                                              |
| 最近修正：方案頁保留免卡碼入口、付費 checkout 拒碼及舊 60 天 quote；API／Web 聚焦測試與型別檢查通過                                                                                                                                                                                                                                                      | 本機程式沒有再把現有碼導入綁卡 checkout                                                                                                   | 未經真登入瀏覽器／Development API-role 交易驗證；沒有 Production 發布                                           |
| 2026-10-18 Development：本機 User-JWT checkout smoke 通過，8 個並發請求同一 intent、跨 owner HTTP/RLS 隔離、fixture 清理；付費帳戶兌碼被拒，API role 跨 owner period 查詢為 0、兩交易同列鎖逾時                                                                                                                                                          | R05 的實際角色隔離與付費重疊防線成立；R13 的 checkout 並發也有 Development 實證                                                           | 仍未證 Coach UI 到真 provider 年繳／回購；Production 角色與密鑰不是本次證據                                     |
| 2026-10-18 PO 檢視後同意完整驗證：隔離教練由 `/plans` 完成 Pro 年繳首試用（訂閱 `2615449`、已付零元初始發票 `8749853`），另以已有訂閱紀錄的隔離教練完成 Pro 月繳實付（訂閱 `2615463`、已付發票 `8749910`）；兩筆均由 Coach UI 建立原 intent、以不同買家 Email 在 Lemon 官方測試卡付款，簽章 webhook 各兩筆 `done/attempts=1`，原 owner PlanAccess 為 Pro | R04 代表性首購、回購與 owner 綁定全鏈路通過；回購今日標價 NT$115、無重複試用，供應商 TWD 發票 NT$114.89，落在 Contract 的交易匯率容許範圍 | 只證 Development/Test Mode；Live 目錄、正式版發布仍未證。暫時 webhook tunnel 結束前須還原 Test Mode hook 舊 URL |

## R01–R17：每項只追真正阻擋它的核心判準

| ID／狀態                       | 關鍵癥結與足以通過的最小驗證                                                                                                                                        | 現在的結論與剩餘工作                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R01 通過** 前置與 Contract   | M8-D 完成；M8-E 最新產品／權限／備案無矛盾，PO 看過可用版本後同意完整 Gate。                                                                                        | M8-D 已發布並由 PO 接受；PO 10/19 再次確認支付產品與文案已檢視，最新決策及權限／備案聚焦核對無矛盾。永久 Prime 畫面修正歸 R14，C01 已由 PO 撤回；不重開 R01。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **R02 通過** Live 商家／目錄   | Dashboard/API 讀回 Live 可收款、四個核准價／週期、可用卡付款方式與正式 webhook，環境不混。                                                                          | Live 商店名稱、Published 四方案價格／週期／原生試用及 webhook 143856 已核；正式站只用 Live 設定。隔離 Coach 由本站到 Lemon Live 完成卡片試用，Lemon 建立訂閱與 NT$0 已付發票；原簽章事件在 TLS 修復後 HTTP 200、owner 帳本與權益成立，錯誤簽章仍 401。正額自然扣款留 R09，不用第二筆交易重驗商家首購。                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **R03 通過** 收費與同意        | 最後確認頁及 Lemon 實際金額／週期／首扣、匯率揭露和同版條款一致，使用者明確同意。                                                                                   | 正式 Coach Pro 年繳確認頁及 Lemon 最後結帳均顯示首日 NT$0、一個月試用、其後每年 NT$1,150；本站法律連結與付款須知由 PO 先前檢視修正，付款同意預設未勾並依授權勾選。PO 親自完成卡片最後動作，Lemon 原筆已付發票為 NT$0，與當日揭露一致。未來正額首扣的實際結果僅歸 R09。                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **R04 通過** 首購／回購／歸屬  | 一筆由 Coach UI 發起的一般年繳首購與一筆回購，核對 Lemon invoice、原 intent、owner 權限；買家改 Lemon Email 也不能改 owner。四方案 variant mapping 用聚焦測試即可。 | 四方案 payload 聚焦 4/4；2026-10-18 Pro 年繳首試用及 Pro 月繳無試用回購均由 UI→原 intent→Lemon 發票→真簽章 webhook→owner Pro 權限完成，買家 Email 與 owner 不同。回購發票 NT$114.89 對標價 NT$115 的差距符合已凍結 FX 規則；Live 對應首購另由 R02/R16 核實。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **R05 通過** 舊碼隔離與新折扣  | 已領 Beta grant 保留原期限；新的 Promotional 免卡兌碼關閉，本站不處理付費優惠碼。                                                                                   | Development 原有權限與競態證據沿用；新 Promotional 發碼／兌碼拒絕，結帳 API 拒絕 code，Lemon Test Mode 原生 Discount 欄輸入 10% 後未來月費預覽 NT$115→NT$103.50，測試碼已刪除。沒有新訂閱或收款。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **R06 通過** 試用中升級        | 同一訂閱、原 trial end 不動，確認後依 provider 權限升級，沒有立即正額扣款或第二試用；所有付費降級另由 R08 封鎖。                                                    | 2026-10-18 隔離 Pro 年試用改 Prime 年，訂閱 `2615449`、原 `trial_ends_at`／`renews_at` 不動，僅零元初始發票，owner 權限 Prime；試用中 Prime→Pro、年→月均 API/Web 封鎖。原終點真首扣仍屬 R09。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **R07 通過** 已付升級          | Coach UI 一次確認只觸發一次 PATCH；真 paid invoice 後才升權／換年，失敗保持 pending。                                                                               | 2026-10-18 隔離已付 Pro 月帳戶由 Coach UI 一次確認改 Prime 月；原訂閱 `2615463` 的唯一新 `updated` paid invoice `8749952` 為 NT$30.18，單筆 upgrade command 最終 `confirmed`、invoice evidence 綁原 owner、Prime 月 verified period 與重新整理後 UI 一致。真 webhook 發票到齊前一筆重試至第 4 次才 `done`，其餘一次；未發生第二張升級發票。paid-change／period 聚焦 26/26 通過。月改年 provider 舊證據沿用，完整到期／失敗仍由 R09 驗。                                                                                                                                                                                                                                                                                                       |
| **R08 條件結案** 付費降級      | 期末自動降級無可靠 provider 證據就不露出；取消續訂後原權限至原終點，再轉 Free。                                                                                     | 無可信近期月／年到期 fixture；已採備案並關閉自動付費降級。不要為此等待一個月／一年或再做不相干日繳探針。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **R09 部分** 首扣／續扣／失敗  | provider 已付款且 owner／invoice／variant／期間匹配才新增權限；pending、晚到、失敗不延權。用一筆普通首扣／續扣真事件加時鐘／簽章失敗案例。                          | R04 的回購已付首扣及 R07 的已付升級發票均完成 owner 權限核對；診斷 renewal `8737652` 從 pending 變 paid。2026-10-18 lifecycle／period／access 聚焦 67/67 通過。隔離訂閱 `2615581` 曾以手動 billing-anchor 重設產生 `updated` paid 發票 `8750280`，不等同正常試用終點 `renewal`；既有試用權限覆蓋已付期間，不能據此宣稱首扣成功或期間錯誤。Test Mode 診斷日繳已出現真 renewal 發票，但未綁 Development Coach 且 webhook 400／ledger 0，不能證 owner 恢復；一般 trial 原終點首扣及 owner-bound 續扣仍未證，維持部分，不等待一個月或無限買單。                                                                                                                                                                                                   |
| **R10 通過** 取消與到期        | provider 確認取消後不再續扣；權限至原終點，之後 Free 且資料保留，容量規則正確。trial／paid 各一代表案例。                                                           | 2026-10-18 Coach UI 分別取消 Prime 年試用 `2615449` 與 Prime 月實付 `2615463`；Lemon `cancelled=true`、原 `ends_at` 未動，UI 顯示不續訂及保留資料；兩帳戶現在仍 Prime，模擬原終點後均為 Free、5 學員／1 場地限制。lifecycle 聚焦含併發取消與 timeout GET 恢復通過。真日曆到期由同一時鐘規則取代等待一個月。                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **R11 通過** 退款與帳單        | provider 部分／全額退款對上同 invoice；本人只見本人 receipt；現期個案處置有授權與稽核，不能憑退款事件直接亂撤權。                                                   | 先前部分退款、一分 TWD 進位修復和兩個 Coach 真登入 receipt 本人 200／跨帳戶 404 已驗；舊 Pro 發票誤標 Prime 亦已修。2026-10-18 PO 核准隔離年繳發票 `8746552` 的 USD 40.22 全額測試退款、取消未來續訂及當期撤權。Development migration `20261017164829` 已套用，私有表 RLS／角色讀回通過；provider `2614493` 已取消、發票已退款 USD 4022 美分；真簽章 inbox `done/attempts=1`，ledger 已對帳。個案 `R11-ANNUAL-FULL-8746552` 套用一次，重跑 `already_applied`；API 角色查得訂閱權益空、方案 Free（5 學員／1 場地）。退款前 apply 拒絕；金額／期間／owner 均受工具檢查。API typecheck 與聚焦 35/35 通過。僅為 Development/Test Mode 證據。                                                                                                      |
| **R12 通過** webhook／對帳     | 真簽章事件能耐久入 inbox，漏送可安全恢復，同訂閱不重複授權；以一筆首投及一筆隔離故障／重送證明。                                                                    | R04/R07/R11 真簽章首投、耐久 inbox 與重試已有。PO 同意後，於已還原且不可達的 Test Mode webhook URL 下取消隔離訂閱 `2615581`：供應商先為 `cancelled`，inbox 仍 5 筆且 ledger 仍 active；本機有界排程讀回後新增恢復事件 `done/attempts=1`，ledger 轉 cancelled，原 owner 當下 Pro、原 verified end 後 Free，期間前後均 1 筆。首次掃描誤把已綁定 60 天訂閱 `2614961` 當孤兒取消；已停機、依官方 API 恢復為原 `on_trial/cancelled=false`、試用終點不變，修正掃描通知帶原 intent，真 worker 重驗 `done`，同版重跑無新增工作。保留該次 `dead` 稽核列。API typecheck 與聚焦 37/37 通過。掃描只涵蓋已綁定訂閱；首筆 webhook 全失依 Contract 一小時調查／重送，不從買家 Email 推定 owner。暫時 tunnel 已關，舊 hook URL 不可達，正式接收端屬 R15–R17。 |
| **R13 通過** 租戶／並發        | 非 owner 無法讀／改他人帳單或付款命令，連點／兩分頁／timeout 只有一筆 provider 交易。                                                                               | 既有 Development 真 User-JWT 兩教練測試：同一 quote 的 8 個並發 HTTP begin 共用單一 intent、provider create 僅一次，另一帳戶的 quote／intent HTTP 404 且 RLS 不可讀；R11 真 receipt 跨 owner 404。2026-10-18 追加 API runtime 角色唯讀實測：本人可見已付升級命令與發票，另一教練對同一命令、發票、訂閱皆 0 列。R07 真升級只有單次 PATCH／單張 invoice；checkout／paid-change 聚焦 12/12 覆蓋連點及 timeout 不重發，DB 交易 advisory lock 與 owner 條件由既有資料庫路徑執行。Production 密鑰與正式讀回併入 R15–R17，不額外收費重測。                                                                                                                                                                                                           |
| **R14 通過** 最終 UI 與卡付款  | PO 檢視同版桌機／390px 方案→確認→狀態→帳單、單次取消續訂文案與法律內容；已開放的信用卡付款沿用真交易證據。                                                          | 既有 Test Mode 卡實付、owner／invoice／取消與 390px 帳單證據沿用；PO 已檢視並修正付款頁與付款須知。正式隔離 Coach 已看到方案與 Pro 年繳確認頁；Live 結帳、付款後狀態／帳單及取消已完成；同版手機結帳與付款須知留白已修正並獲 PO 接受；最終候選的完整本地 check／build 通過。台灣 PayPal／Cash App Pay 依 PO 裁決不作獨立驗收。                                                                                                                                                                                                                                                                                                                                                                                                                |
| **R15 通過** 正式 schema／備份 | 正式 migration 可重現、最小權限；新增支付資料能被加密備份並隔離還原。                                                                                               | Main `0318cb4` 的手動正式 release 已套用唯一付款 migration，讀回 13 張啟用 RLS 的表與必要角色邊界；Main `a38ca6f` 的備份 run 39121153840 完成加密 artifact `12134830382` 真正下載、≤48 小時恢復點、斷網還原、六表合成已付資料刪除／CSV 回存與 owner join。備份演練當時正式帳本 0，已用隔離付費 fixture 完成還原；之後產生的 Live 唯一帳本由 R16／R17 觀察，未另對真交易資料執行隔離還原。                                                                                                                                                                                                                                                                                                                                                     |
| **R16 通過** 受控 Live         | R01–R08、R10–R15 核心核對／R09 日曆事件依 10/18 PO 決策後補，經正式授權做一筆限額 Live 首購／取消，核對真 invoice、webhook、owner、無續扣。                         | PO 親自完成隔離 Coach 的唯一 NT$0 Live 首次試用；Lemon 真發票 8757694、原 intent、簽章 webhook、唯一 owner 訂閱與試用權益已對帳。10/19 Coach 頁一次取消，Lemon、Production 取消紀錄與 Coach 頁均確認不續扣且原 11/18 終點不變。此受控交易無第二次刷卡；正額自然首扣屬 R09。                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **R17 通過** 同版發布          | 核對 exact-SHA CI、正式 migration、同 SHA Fly、ready／首頁／登入和首批交易觀察。                                                                                    | 修復 PR #58 合併為 Main d3e215b；CI #274、Production migration history、Fly 同版部署及獨立 ready／首頁／登入均成功。首次 Live webhook 的 TLS 500 根因已修，原簽章事件補送 HTTP 200；首筆唯一帳本／權益與後續取消皆在正式站觀察一致。文件 PR #59 Main CI #276 成功且按規則未重新部署。                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

## 2026-10-18 歷史停止點：已由上方 R15 接續段取代

以下是前一段對話的原始交接證據，當時的「下一段對話」命令已執行或被上方新進度取代，
不得再把 runtime 當作 Test Mode-only 或把本段當成當前 Next。

PO 明確要求停止實作並交給下一段對話；`AGENTS.md` 已新增「上下文過長可安全停下、寫完整
Status／log 交接」的規則。**唯一先做的工作是 R15 已凍結 Contract 的 Sol：審核剛建立的
正式候選 migration，完成 server-side Live/Test 環境綁定及其聚焦測試。** 不要把此草稿當
已驗證遷移，不要直接套用 Production。R14 的付款方法差異可與 R02 Live 商家讀回一起釐清；
R09 普通續扣仍是獨立未驗。保持原 R01–R17 清單，不加新 Gate。

### 最新已完成與可重用證據

- PO 已檢視 R14 桌機／390px 可用版並同意完整驗證。隔離退款帳戶由 Coach UI 完成一筆
  Pro 年繳 Test Mode 卡付款：確認頁今天 NT$1,150、無第二次試用；原 intent
  `2fd82678-ec06-440a-8efa-33d8c8049b9e` confirmed/paid，新訂閱 `2615693`，已付
  發票 `8750596` NT$1,150.16，六筆真簽章 inbox `done/attempts=1`。舊訂閱 `2614493`
  cancelled、發票 `8746552` 全額 refunded、當期撤權仍有效；舊與新 unsuperseded period
  並存時，API access／管理選新 Pro/year。390px 帳單同時見已付與已退款；Coach UI 取消
  新訂閱後仍保留新 Pro 至 2027-10-18，取消未誤指舊訂閱。唯讀確認工具是
  `apps/api/src/billing/test-mode-refund-repurchase-settlement.ts`。詳見 LOG-629 與
  `M8-E-LOCAL-CHECKOUT.md`。R14 仍為**部分**：Test Mode checkout 顯示 Cash App Pay，
  Lemon 訂閱付款方法文件卻只列卡／Apple Pay／Google Pay／PayPal；只有卡實付驗證，
  Live 商家方法未讀回。不要再用無決定性的扣款探針。
- R14 修正的 checkout 資格、舊撤權權益隔離、管理／取消選訂閱已有 Development 讀回。
  本輪先前 API 聚焦 58/58、Web 13/13；之後 API typecheck 再通過；`git diff --check`
  通過（只有既有 CRLF 警告）。桌機／390px 確認截圖在
  `output/playwright/r14-refund-repurchase-confirm-desktop.png` 與
  `output/playwright/r14-refund-repurchase-confirm-390.png`。
- R15 Contract 已由 PO 在本對話明確凍結，見 `M8-E-IMPLEMENTATION-CONTRACT.md` 開頭。
  凍結內容：server-side 綁定模式／商店／API 密鑰／簽章 secret；正式空白 Live 帳本；
  順序遷移與最小角色/RLS；加密備份的隔離還原與支付表讀回。**這不是** Production 套用、
  設密鑰、遠端推送或 Live 收款授權。

### R15 此次已動手但尚未完成

- 用 Supabase CLI `migration new` 建立
  `supabase/migrations/20261017181022_billing_live_test_foundation.sql`。從十份
  `supabase/development-only/*billing*.sql` 依檔名時間順序合併 13 張表及角色/RLS，將
  `environment='test'` 約束改成 `environment in ('test','live')`，移除 `default 'test'`，
  使插入時必須明示環境。這是**未審核、未 dry-run、未套用的候選**；複製而來的註解、
  constraint 名稱、權限與 migration 歷史相容性均須逐條審核。特別注意 Development SQL
  的十個獨立版本與正式單一版本的前後關係，及不應把 Development 測試資料帶入 Live。
  這個候選已位於正式 `supabase/migrations` 目錄；任何未隔離的 `supabase db push` 都可能
  將它列入待套用清單，完成審核與 Gate 前不要執行。
- `.github/workflows/production-logical-backup.yml` 的手動隔離還原步驟，候選式增加：
  若還原資料含 migration `20261017181022`，須見 13 張支付表及發票、期間對訂閱／owner
  的無孤兒 join；若無該 migration，清楚輸出未達支付還原 Gate。YAML Prettier 檢查通過；
  **workflow 未執行**。目前斷言驗表與參照完整性，空表也可過，不能聲稱已證明實際
  付費資料備份還原；正式套用後還須用加密 artifact 隔離還原並讀回真資料。
- 核心 runtime 仍是 Test Mode 限定：`postgres-checkout.ts`、
  `postgres-management.ts`、`postgres-access-source.ts`、`postgres-inbox.ts`、
  `postgres-trial-change.ts`、`postgres-paid-change.ts` 等仍有 `environment='test'`；
  inbox 插入還依賴資料庫預設 `test`；`start.ts` 只在 Development/local flags 建立
  `LemonTestCheckoutProvider`。因此候選 migration **無法支援 Live**，不能獨立發布。
  本次未改這些 runtime、未新增 Live 設定或密鑰。既有 Development schema 仍是
  Test Mode，沒有被候選 migration 更動。

### 下一段對話的執行順序與授權界線

1. 先讀 `AGENTS.md`、`README.md`、`PROJECT_STATUS.md`、本頁、R15 凍結 Contract 的段落、
   `ROADMAP.md` M8-E 與 `git status --short`。共用 worktree 很髒，包含其他 M8-D／UI 變更；
   **只動 M8-E 自有檔案，不清理或混包推送**。確認候選 migration／workflow 的實際 diff。
2. 審核／修正候選 SQL 的 13 張表、FK、constraint、角色 grants、RLS、environment 維度與
   歷史順序；用可行的隔離資料庫或安全的遷移預覽驗證，不把 Development 對已套用表
   直接重建。若無本機 Docker／`psql`（本機 `docker` 命令目前不存在），用已核准的
   替代工具做靜態檢查，將真正 dry-run 標未驗，不能以此充當通過。
3. 用一個經驗證的 server-side environment/store/config 將 API checkout、owner access、
   management、trial／paid change、inbox／worker 及 provider adapter 一致綁定；每筆 SQL
   明示環境，模式與商店錯配 fail closed。保留 Production billing hard-off，先以聚焦單元、
   DB 角色/RLS、跨環境負例驗證；測試只在 Development/Test Mode 或隔離環境。
4. 完善備份 restore 斷言：正式 schema 在還原 DB 確實存在；有付費資料後核對 owner、
   subscription、invoice、period 的實際還原內容與最新可恢復點 ≤48 小時。先讓 PO 檢視
   R15 可審查版本，依 `AGENTS.md` 的 Gate 再進完整 CI／migration dry-run。Production
   migration、設定 secret、遠端 push／merge、Live 收款各需其既定明確授權。
5. R15 後依原清單處理 R14/R02 可用方法與 Live 商家、R09 正常續扣、R01 其餘同版檢查、
   R03 同版價格／法律，再進 R16 受控 Live 與 R17 exact-SHA 發布；不要因 Test Mode 成功
   宣稱可上線。當前 8 項通過、R08 條件結案，其餘仍部分／未驗。

### 停機與外部狀態

Test Mode hook `142825` 已用 `test-mode-webhook-repoint.ts --restore` 還原至原先的
`https://charging-relax-intent-cigarettes.trycloudflare.com/hooks/lemonsqueezy`。該舊 Quick
Tunnel URL 現不可達，**目前沒有可接收下一筆 Test Mode webhook 的服務**。本輪 Cloudflare
Quick Tunnel、webhook-only proxy `3009`、API `3008`、Web `4178` 均已停止；後續真 provider
事件必須先建立可達接收端並驗簽。Production 支付 hard-off；無 Production schema／secret
操作、無遠端推送、無 Live 交易。除了已凍結 R15 Contract，PO 此刻無需再提供資料；下一
對話應先完成上述本機 Sol，再送可檢視版本給 PO，而非直接要求上線授權。
