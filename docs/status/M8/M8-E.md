# M8-E 支付上線 Status — 當前規則與決定性驗證

> 更新：2026-10-18（台北）。這是支付工作目前唯一的執行清單；R01–R17 的範圍仍由
> [`ROADMAP.md`](../../ROADMAP.md) 與 [`M8-E-IMPLEMENTATION-CONTRACT.md`](../../M8-E-IMPLEMENTATION-CONTRACT.md)
> 管理。PO 已於 2026-10-17 要求繼續逐項解決；以下記錄恢復後的聚焦證據。
> 改寫前的 500 行逐次紀錄存於
> [`archive/M8-E-2026-10-17-pre-priority-rules.md`](../archive/M8-E-2026-10-17-pre-priority-rules.md)；
> 真實交易細節另見 [`M8-E-LOCAL-CHECKOUT.md`](../../M8-E-LOCAL-CHECKOUT.md) 和
> [`2026-10 月工程日誌`](../log/2026-10.md)。歷史說法不得覆蓋本頁的最新決定。

## 2026-10-18 PR #45 與同版 CI

- **遠端交付：** PO 明確允許推送付款分支並建立 PR；Draft PR #45 以 `763eeff` 對 Main `3faee94` 建立，未合併或部署。首輪 Actions #244／run 39118267500：`verify`（格式、型別、完整測試及 production build）成功；`migration-dry-run` 因 Development 已有 `20261017164829_billing_refund_case_decision`，本分支的已知遠端 migration 清單漏列而失敗；`browser-ui` 因測試仍期待舊版頁名、年費與不可選方案而失敗。Production migration preview 與 deploy 在 PR 上依設計跳過。
- **聚焦修復：** 只將已存在的 Development migration 納入允許清單，不改寫遠端歷史；`node --test scripts/development-migration-dry-run.test.mjs` 2/2 通過。方案瀏覽器斷言改對應已審定的「比較方案與價格」、年費 NT$1,150／1,450 及「查看 Pro／Prime 訂閱」；`npm run test:browser -- apps/web/e2e/plan-choice.spec.ts` 的 1440px、390px 2/2 通過，無方案 mutation。尚待推送此修正並取得新 exact-SHA CI 全綠；PR 的 CI 不是正式 Supabase migration、Live webhook 或部署證據。

## 2026-10-18 接續後的實際上線進度

- **R17 部署開關修復（本地，未發布）：** 發現原 Docker build 未傳 `VITE_BILLING_LIVE`，手動與自動 Fly 發布也未保持同一付款開關；即使正式資料與商家準備完成，Live Web 入口仍可能隱藏，或與 API 開關不一致而拒絕啟動。現已讓 Docker 接收 build arg，兩種發布都從 `PRODUCTION_BILLING_LIVE_ENABLED`（未設定時為 false）將同值傳給 Web build 及 Fly runtime；手動流程須與 `billing_live` 操作者選項相符。Live 發布前僅核對 Fly 的必要密鑰名稱，缺項即在 migration 前停止，不輸出值。合成 public 設定的 Web production build 成功，`deployment-config.json` 讀回 `billingLiveEnabled:true`；發布腳本／密鑰聚焦 18/18、Prettier 與 whitespace 通過。未設定 GitHub 正式變數、Fly 密鑰或實際發布；Production 仍 hard-off。正式變數、密鑰、遷移與同 SHA 部署須在各自發布授權點完成。
- **同版本機完整檢查：** 合併 Main `3faee94` 後的付款候選，在移除正式 SQL 檔尾多餘空白行後，`npm run check:affected -- origin/main` 通過：23/23 script、API 62 檔 371/371、Web 94 檔 415/415，API/Web typecheck、變更檔格式與 whitespace 通過。這是本地檢查，不是遠端 exact-SHA CI、Live 商家、正式 migration 或部署證據。SQL 僅改動結尾空白，未更改 schema。
- **R02 商店身分核對：** Live General 只顯示 `Activate your store to accept live sales` 文案與 Identity verification `Active`，無可讀的商店啟用狀態；不能單憑這行文字斷定已啟用或未啟用。商店目前名稱為 `Website Application`，而該欄位明示會出現在收據與發票；已核准公開營運名稱為 `Form Coach Desk Studio`，正式收款前須校正及讀回。未保存設定；檢視後已恢復 Test Mode。
- **R02／R16 webhook 實際入口：** Live webhook 新增表單核對公開 URL 是 `https://formcoachdesk.com/api/hooks/lemonsqueezy`，已選程式接收的 11 個 `subscription_*` 及 `subscription_payment_*` 事件；簽章 secret 尚未輸入、也未按 Save，故仍沒有正式 hook。新增公開同站 proxy 聚焦測試，用含 Unicode 與原始空白的 payload 驗 HMAC；`/api/hooks/lemonsqueezy` 的原始 bytes、`X-Signature`、content type 均完整送到內部 `/hooks/lemonsqueezy`，8/8 通過。這不證正式 webhook 收送；Live 端仍須密鑰、正式部署及真事件讀回。
- **PO 已在前一對話檢視並修正付款頁與付款須知。** 不再要求重做同一輪 UI 審閱；Live 流程及發布 Gate 仍須依各自判準驗證。
- **R02 Live 商店：** Lemon 後台已建立未發布、未顯示於 storefront 的商品草稿 1449729（FORM Coach Desk 訂閱），含四個明確 variant：Pro 月繳 2262960／NT$115 每月、Pro 年繳 2262966／NT$1,150 每年、Prime 月繳 2262967／NT$145 每月、Prime 年繳 2262969／NT$1,450 每年。各 variant 在編輯頁設原生 1 個月試用及 SaaS business-use 稅務類別；商品詳情讀回四項價／週期、Draft 及 storefront 關閉。這是目錄草稿，不代表已發布或可收款。Live Webhooks 清單仍空；建立表單已核對 callback URL、簽章 secret 與 11 個程式接受的訂閱事件選項，未儲存新 hook；General 仍提示 Activate your store to accept live sales。操作後 Test Mode 開關已恢復開啟。
- **R09 自然續扣：** Test Mode 診斷用日繳訂閱 2609055 的供應商已出現 billing_reason=renewal 的已付發票 8754514（NT$115，2026-10-18 08:17:47 UTC）；舊 tunnel webhook 收到 HTTP 400。該 merchant-side 訂閱不綁任何 Development Coach；Development 訂閱／發票 ledger 對這兩個 provider ID 均為 0，不能據此宣稱 app owner、權益或期間驗收通過。R09 仍部分。
- **R15 正式資料與備份：** Production Supabase ref febunjhpruqlywjfvuaq 仍未套用 20261017181022 付款 migration。2026-10-18 手動 GitHub 備份／隔離還原 run 39116375185 在 Main 3faee94 成功：本次加密 artifact 12132487635 已於 runner 下載、解密、校驗；斷開資料庫所有 Docker 網路後還原並讀回 Auth 4、Workspace 4 與既有 migration。這證明正式基線的真 artifact 還原，不證付款帳本：當次 Main 無付款 migration，且該版本未含 R15 的付費 fixture 與 48 小時斷言。新 artifact 建立於 2026-10-18 09:44:41 UTC；正式付款 schema、角色與付款資料還原 Gate 仍未完成。
- **R16／R17：** 尚未建立 Live webhook／完成 Live 啟用與受控真實交易；PR 首輪 exact-SHA CI 有兩項失敗，尚無全綠 CI、正式部署及 readiness／首批交易觀察。Production 付款開關保持 hard-off；付款分支已合併 Main 3faee94 並推送 Draft PR #45，尚未合併或部署。
- **下一步：** 先推送 PR #45 的聚焦 CI 修正並確認新 exact-SHA CI，再準備正式 webhook／設定與 R15 可執行交付；正式 migration、正式密鑰、Live 實付及合併／部署留在各自授權點。固定 R01–R17 計數維持 8 通過、R08 條件結案、8 部分／未驗；以下較早的 Live 商品全空或要求重看付款頁的記錄已被本段取代。

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
| **R01 部分** 前置與 Contract   | M8-D 完成；M8-E 最新產品／權限／備案無矛盾，PO 看過可用版本後同意完整 Gate。                                                                                        | M8-D 已由 PO 接受為完成且發布；M8-E Contract 分段凍結，仍需核對後續決策與同版產品行為。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **R02 未驗** Live 商家／目錄   | Dashboard/API 讀回 Live 可收款、四個核准價／週期、可用付款方式與正式 webhook，環境不混。                                                                            | Live 身分 Active、結算已連、稅務 Submitted；已建立一個 Draft 商品與四個方案 variant，storefront 關閉，Webhooks 空、仍提示 activate。Live 可收款及正式 webhook 仍未驗；Test Mode 成功不能替代。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **R03 部分** 收費與同意        | 最後確認頁及 Lemon 實際金額／週期／首扣、匯率揭露和同版條款一致，使用者明確同意。                                                                                   | 本機 115／145 目錄與 FX 修正有測試，法律仍草稿；遠端有舊價格。重點是同版價格與實際收費一致，不為小數顯示另開無限探針。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **R04 通過** 首購／回購／歸屬  | 一筆由 Coach UI 發起的一般年繳首購與一筆回購，核對 Lemon invoice、原 intent、owner 權限；買家改 Lemon Email 也不能改 owner。四方案 variant mapping 用聚焦測試即可。 | 四方案 payload 聚焦 4/4；2026-10-18 Pro 年繳首試用及 Pro 月繳無試用回購均由 UI→原 intent→Lemon 發票→真簽章 webhook→owner Pro 權限完成，買家 Email 與 owner 不同。回購發票 NT$114.89 對標價 NT$115 的差距符合已凍結 FX 規則；Live 尚需 R02/R16。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **R05 通過** 舊碼隔離與新折扣  | 已領 Beta grant 保留原期限；新的 Promotional 免卡兌碼關閉，本站不處理付費優惠碼。                                                                                   | Development 原有權限與競態證據沿用；新 Promotional 發碼／兌碼拒絕，結帳 API 拒絕 code，Lemon Test Mode 原生 Discount 欄輸入 10% 後未來月費預覽 NT$115→NT$103.50，測試碼已刪除。沒有新訂閱或收款。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **R06 通過** 試用中升級        | 同一訂閱、原 trial end 不動，確認後依 provider 權限升級，沒有立即正額扣款或第二試用；所有付費降級另由 R08 封鎖。                                                    | 2026-10-18 隔離 Pro 年試用改 Prime 年，訂閱 `2615449`、原 `trial_ends_at`／`renews_at` 不動，僅零元初始發票，owner 權限 Prime；試用中 Prime→Pro、年→月均 API/Web 封鎖。原終點真首扣仍屬 R09。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **R07 通過** 已付升級          | Coach UI 一次確認只觸發一次 PATCH；真 paid invoice 後才升權／換年，失敗保持 pending。                                                                               | 2026-10-18 隔離已付 Pro 月帳戶由 Coach UI 一次確認改 Prime 月；原訂閱 `2615463` 的唯一新 `updated` paid invoice `8749952` 為 NT$30.18，單筆 upgrade command 最終 `confirmed`、invoice evidence 綁原 owner、Prime 月 verified period 與重新整理後 UI 一致。真 webhook 發票到齊前一筆重試至第 4 次才 `done`，其餘一次；未發生第二張升級發票。paid-change／period 聚焦 26/26 通過。月改年 provider 舊證據沿用，完整到期／失敗仍由 R09 驗。                                                                                                                                                                                                                                                                                                       |
| **R08 條件結案** 付費降級      | 期末自動降級無可靠 provider 證據就不露出；取消續訂後原權限至原終點，再轉 Free。                                                                                     | 無可信近期月／年到期 fixture；已採備案並關閉自動付費降級。不要為此等待一個月／一年或再做不相干日繳探針。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **R09 部分** 首扣／續扣／失敗  | provider 已付款且 owner／invoice／variant／期間匹配才新增權限；pending、晚到、失敗不延權。用一筆普通首扣／續扣真事件加時鐘／簽章失敗案例。                          | R04 的回購已付首扣及 R07 的已付升級發票均完成 owner 權限核對；診斷 renewal `8737652` 從 pending 變 paid。2026-10-18 lifecycle／period／access 聚焦 67/67 通過。隔離訂閱 `2615581` 曾以手動 billing-anchor 重設產生 `updated` paid 發票 `8750280`，不等同正常試用終點 `renewal`；既有試用權限覆蓋已付期間，不能據此宣稱首扣成功或期間錯誤。Test Mode 診斷日繳已出現真 renewal 發票，但未綁 Development Coach 且 webhook 400／ledger 0，不能證 owner 恢復；一般 trial 原終點首扣及 owner-bound 續扣仍未證，維持部分，不等待一個月或無限買單。                                                                                                                                                                                                   |
| **R10 通過** 取消與到期        | provider 確認取消後不再續扣；權限至原終點，之後 Free 且資料保留，容量規則正確。trial／paid 各一代表案例。                                                           | 2026-10-18 Coach UI 分別取消 Prime 年試用 `2615449` 與 Prime 月實付 `2615463`；Lemon `cancelled=true`、原 `ends_at` 未動，UI 顯示不續訂及保留資料；兩帳戶現在仍 Prime，模擬原終點後均為 Free、5 學員／1 場地限制。lifecycle 聚焦含併發取消與 timeout GET 恢復通過。真日曆到期由同一時鐘規則取代等待一個月。                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **R11 通過** 退款與帳單        | provider 部分／全額退款對上同 invoice；本人只見本人 receipt；現期個案處置有授權與稽核，不能憑退款事件直接亂撤權。                                                   | 先前部分退款、一分 TWD 進位修復和兩個 Coach 真登入 receipt 本人 200／跨帳戶 404 已驗；舊 Pro 發票誤標 Prime 亦已修。2026-10-18 PO 核准隔離年繳發票 `8746552` 的 USD 40.22 全額測試退款、取消未來續訂及當期撤權。Development migration `20261017164829` 已套用，私有表 RLS／角色讀回通過；provider `2614493` 已取消、發票已退款 USD 4022 美分；真簽章 inbox `done/attempts=1`，ledger 已對帳。個案 `R11-ANNUAL-FULL-8746552` 套用一次，重跑 `already_applied`；API 角色查得訂閱權益空、方案 Free（5 學員／1 場地）。退款前 apply 拒絕；金額／期間／owner 均受工具檢查。API typecheck 與聚焦 35/35 通過。僅為 Development/Test Mode 證據。                                                                                                      |
| **R12 通過** webhook／對帳     | 真簽章事件能耐久入 inbox，漏送可安全恢復，同訂閱不重複授權；以一筆首投及一筆隔離故障／重送證明。                                                                    | R04/R07/R11 真簽章首投、耐久 inbox 與重試已有。PO 同意後，於已還原且不可達的 Test Mode webhook URL 下取消隔離訂閱 `2615581`：供應商先為 `cancelled`，inbox 仍 5 筆且 ledger 仍 active；本機有界排程讀回後新增恢復事件 `done/attempts=1`，ledger 轉 cancelled，原 owner 當下 Pro、原 verified end 後 Free，期間前後均 1 筆。首次掃描誤把已綁定 60 天訂閱 `2614961` 當孤兒取消；已停機、依官方 API 恢復為原 `on_trial/cancelled=false`、試用終點不變，修正掃描通知帶原 intent，真 worker 重驗 `done`，同版重跑無新增工作。保留該次 `dead` 稽核列。API typecheck 與聚焦 37/37 通過。掃描只涵蓋已綁定訂閱；首筆 webhook 全失依 Contract 一小時調查／重送，不從買家 Email 推定 owner。暫時 tunnel 已關，舊 hook URL 不可達，正式接收端屬 R15–R17。 |
| **R13 通過** 租戶／並發        | 非 owner 無法讀／改他人帳單或付款命令，連點／兩分頁／timeout 只有一筆 provider 交易。                                                                               | 既有 Development 真 User-JWT 兩教練測試：同一 quote 的 8 個並發 HTTP begin 共用單一 intent、provider create 僅一次，另一帳戶的 quote／intent HTTP 404 且 RLS 不可讀；R11 真 receipt 跨 owner 404。2026-10-18 追加 API runtime 角色唯讀實測：本人可見已付升級命令與發票，另一教練對同一命令、發票、訂閱皆 0 列。R07 真升級只有單次 PATCH／單張 invoice；checkout／paid-change 聚焦 12/12 覆蓋連點及 timeout 不重發，DB 交易 advisory lock 與 owner 條件由既有資料庫路徑執行。Production 密鑰與正式讀回併入 R15–R17，不額外收費重測。                                                                                                                                                                                                           |
| **R14 部分** 最終 UI 與卡付款  | PO 檢視同版桌機／390px 方案→確認→狀態→帳單、單次取消續訂文案與法律內容；已開放的信用卡付款沿用真交易證據。                                                          | 既有 Test Mode 卡實付、owner／invoice／取消與 390px 帳單證據沿用；本輪新一個月試用及 Lemon 原生折扣結帳預覽已驗，未再購買。PO 已在前一對話檢視並修正付款頁與付款須知；Live 對應流程仍待驗。依 PO 裁決，不把台灣 PayPal 或 Cash App Pay 可用性作獨立驗收。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **R15 部分** 正式 schema／備份 | 正式 migration 可重現、最小權限；新增支付資料能被加密備份並隔離還原。                                                                                               | PO 已同意完整 Gate。候選 13 表 SQL 在隔離 PGlite 執行、owner／mode FK 及 API/browser 角色 RLS 通過；billing tests 161/161、API typecheck 通過。手動備份 workflow 加入斷網合成已付六表 COPY 還原及 ≤48 小時斷言，本機同型 COPY 往返通過。正式 Supabase migration 精確 dry-run 已通過；Main 基線真加密 artifact 的隔離還原已於 run 39116375185 成功；付款 migration、付費 fixture 還原、正式角色與工作流程的 ≤48 小時斷言仍待驗；Production Live 與 Web 支付入口維持關閉。詳見本頁最上方 R15 接續段。                                                                                                                                                                                                                                           |
| **R16 未驗** 受控 Live         | R01–R15 核心通過／R08 備案後，經正式授權做一筆限額 Live 首購／取消，核對真 invoice、webhook、owner、無續扣。                                                        | 未做；Production hard-off。PO 只負責事前同意真實金額及最後付款，Agent 準備其餘。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **R17 未驗** 同版發布          | PO 接受可用版及完整 Gate 後，核對 exact-SHA CI、正式 migration、同 SHA Fly、ready／首頁／登入和首批交易觀察。                                                       | 未做；髒共用 worktree 不能直接混包 push。遠端、migration、Live 開關依既有獨立授權。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

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
