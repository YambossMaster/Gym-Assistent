# M8-E 支付流程與狀態路徑圖

> 2026-10-19 · 結帳中斷修正分支的可執行流程紀錄。已部署基線見 [M8-E Status](status/M8/M8-E.md)；本文件的「候選」行為尚未部署。產品決策以 Roadmap／Contract 為準，程式與測試是當前實作事實。舊設計稿中「建立意圖後一律先去結果頁」的敘述不適用於這次中斷修正。

## 不可跨越的邊界

- 本人 Supabase Auth → API 驗證 identity → Workspace；Web 不指定 Workspace、價錢、試用資格或權益。
- Free 沒有付費訂閱可取消；永久 Prime 可看方案比較與月年價格，但不能開始其他方案的結帳。尚有效的 Beta／其他 grant 依 API 政策攔新購買。
- 新付費訂閱只提供 Pro／Prime 月繳／年繳。本站與 Lemon 均不提供付費優惠碼；帳號首次訂閱由 Lemon 原生提供一個月試用，今天 NT$0；有已核驗訂閱歷史者跳過試用，今天應付所選方案金額。年繳顯示年總額。
- 報價、同意、建立意圖、放棄、事件、帳本、權益分層。瀏覽器回呼、URL、前端計時及付款頁顯示都不能直接賦予權益；只有本人、意圖、供應商訂閱、invoice／period 的已核驗關聯可以。
- 每 Workspace／環境最多一筆未結案意圖。外部建立結果不明時不得盲目重新送 Lemon create。任何看得到付款或查詢失敗的情況都先核對，不能建立第二筆。
- Lemon 舊 cart 在本站返回後仍可能於供應商有效。本候選在本站清除 URL 並已關閉商店棄購提醒；它不能撤銷使用者另存的舊連結，也不能證明離開前已送出的交易不會較晚完成。

## 新購買節點與每條出口

| 節點                          | 進入條件與權威判定                                                                                                   | 正常出口                                                                                   | 其他出口／恢復                                                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| B00 進入／登入                | /plans、Settings 方案入口；未登入先 Auth，再回選項；選項只是意圖                                                     | B01                                                                                        | 身分無效停在登入，不建立報價                                                                                                             |
| B01 選擇方案                  | Free／Pro／Prime 比較、月年切換；目前相同方案不重選；永久 Prime 按鈕不可選                                           | B02                                                                                        | 現有 trial／active 走 M01 管理路徑；永久資格只讀                                                                                         |
| B02 付款前讀回                | 依本人取 current intent 與 billing snapshot；不能用過期 query cache 判定無單                                         | 無未結案及有效訂閱 → B03                                                                   | open → 回同一筆 B06；已送 provider 成功訊號 → B10；pending／abandon_requested／未明 → B10 或阻擋；已有有效訂閱 → M01；讀取錯誤停止並重試 |
| B03 API 報價                  | API 重新查資格、永久權、訂閱歷史與未結案意圖；只接受 Pro／Prime、月／年；5 分鐘報價                                  | B04 顯示 NT$ 今天、週期、預計日                                                            | 過期／資格或方案變動重新取得報價；價格不由 Web 重算；服務不可用停在原頁                                                                  |
| B04 同意                      | 勾選未預勾的付款須知／隱私／條款；報價、方案、週期或條款版號變更後同意失效                                           | B05                                                                                        | 未勾、報價逾時、缺資料時停在原頁，靠近按鈕只顯示一處原因                                                                                 |
| B05 建立意圖                  | API 在本人交易內再次查報價、條款、資格與未結案；先存 creating，再呼叫 Lemon 建立限定 variant、email、intent 自訂資料 | 成功存 open + URL → B06                                                                    | 同 quote 併發回既有意圖；不同 quote／訂閱衝突阻擋；Lemon create 逾時／結果不明存 pending → B10，不再自動 create                          |
| B06 本站結帳頁＋Lemon overlay | 使用 Lemon.js 開本筆 URL；僅此頁承載未完成付款                                                                       | 使用者提交且 Checkout.Success → B09                                                        | SDK 開窗失敗可重開同筆；視窗關閉 → B07；按返回 → B08；重新整理依 B02 讀回，不自動新建                                                    |
| B07 關閉付款視窗              | 沒有 Checkout.Success，沒有付款已成或未成的證據                                                                      | 留本站同一筆結帳頁，仍可重開同筆 B06                                                       | 返回方案 → B08；若其後成功事件到達 → B10／M01                                                                                            |
| B08 返回方案（候選）          | 中止延遲開窗回呼、關閉 overlay；API 查供應商自意圖建立後有無訂閱，再在 owner scope 交易檢查帳本／inbox               | 全部無付款證據 → abandoned、清本站 URL／cache → /plans；再次選擇走 B02→B03→B05，建立新意圖 | 查到訂閱／事件／帳本或查詢失敗 → 不放棄、不放新單，留原頁提示核對；若先前已提交，走 B10                                                  |
| B09 供應商成功訊號／回跳      | Lemon.js Checkout.Success 或完整頁 return 只能要求查狀態；sessionStorage 標記本頁已提交，避免刷新後誤重開            | B10「正在確認」                                                                            | 若 API／網路失敗保留待核對，不回到可再付款狀態                                                                                           |
| B10 結果核對                  | 輪詢 owner intent + billing；pending、事件未到、供應商結果未明不作成功也不作失敗                                     | 驗證訂閱、invoice／period 完成 → B11                                                       | 查詢錯誤保留「重試查詢」；open 但未提交可回 B06；已提交不可再開；abandoned 可回 /plans                                                   |
| B11 試用／已付權益            | signed webhook 或授權補償流程取供應商原始物件，驗 intent owner、store、mode、variant、customer、invoice、period      | 原生 trial → 顯示試用開始／驗證到期；付費 initial invoice → 顯示訂閱啟用 → M01             | 資料缺漏、錯帳、未付 invoice、亂序或重放：保留 pending／異常，不解鎖、不重複入帳                                                         |
| B12 無操作或過期              | open URL 約 15 分鐘效期；過期後另留 5 分鐘核對窗口                                                                   | 確認 provider 沒有訂閱且 owner inbox／ledger 沒事件後可在背景結案                          | 陰性證據不完整則繼續阻擋；此背景路徑不是按「返回方案」後的等待時間                                                                       |

## 意圖與事件狀態

| 意圖狀態          | 意義                                   | 允許的使用者動作                                              |
| ----------------- | -------------------------------------- | ------------------------------------------------------------- |
| creating          | 本站已佔用唯一名額，正在呼叫 Lemon     | 等待；不可第二次送 provider                                   |
| open              | URL 已建立，付款仍未核驗               | 可開／重開同筆，或依 B08 返回；不得僅憑 open 顯示「正在確認」 |
| pending           | 建立結果不明或付款證據尚未核齊         | 查詢／對帳；禁止新單與盲重試                                  |
| abandon_requested | 尚存歷史候選狀態；資料庫仍視為未結案   | 不建立新單；核對後結案                                        |
| abandoned         | 本站已放棄且不再回傳 URL，保留稽核紀錄 | 可重新選方案新建；晚到事件仍須稽核／補救                      |
| confirmed         | owner-bound、period／invoice 已核驗    | 顯示本人試用／付費狀態，轉 M01                                |

事件可以晚到、重複、亂序或漏送。Webhook 必須驗簽、存 inbox、冪等處理，再讀 provider 原始物件；漏送有受控補償。即使本地意圖已 abandoned，收到真付款事件也不得丟棄或假裝未發生，必須核對 owner、訂閱與重複交易。這個晚到競態是本分支尚未取得真 Test Mode 證據的發布缺口。

## 訂閱建立後的管理路徑

| 節點                  | 判定與路線                                                                                                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M01 方案與帳單        | Settings 讀 owner-scoped verified period、subscription、invoice。顯示目前方案、試用／付費期間、下一次扣款或已取消的終止時間；歷史帳單不以現價重算。沒有 verified period 不顯示已啟用。              |
| M02 首次扣款／續扣    | Lemon 執行；初次 trial 結束或續費後，只有匹配的已付 invoice 與 provider period 才延長權益。R09 的自然續扣證據仍待事件發生後補驗，不另外製造交易。                                                   |
| M03 扣款失敗／延遲    | past_due、retry、未付 invoice 不延長原已驗期間；原權益最多到其原本 end，之後評估其他 grant 或 Free。供應商補款成功要對上同一期原始應付日及 paid invoice 才恢復，資料不刪。                          |
| M04 取消續訂／改 Free | Free 無取消動作。試用或付費訂閱由本人發起；provider 確認取消後停止未來扣款，保留原已驗 end 的權益，期限到改 Free；取消不是退款。未明的 provider 回應保持 pending，不再盲送。                        |
| M05 試用中改方案      | 同一 provider 訂閱、原 trial end 不變、沒有提前付款。Pro→Prime 可在驗證後立即提高試用權益；Prime→Pro 到原試用截止才生效；月年可在首扣前調整。供應商／API 實際支援矩陣以 Contract 和已驗證操作為準。 |
| M06 已付方案變更      | 只開放已驗證可立即結算的升級形狀；先顯示 API 預估，最終以 Lemon 已付變更 invoice、period 與歸屬核對後生效。付費降級與未驗證形狀不可操作；相同方案與週期不重複送出。                                 |
| M07 帳單／憑證        | 只列 owner invoices；pending／void 不提供憑證。取 PDF 時再核供應商同一 invoice、store、customer、subscription、金額、幣別。退款保留原帳單並顯示累計退額，不自動等同取消／撤權。                     |
| M08 全額退款後重購    | 只有已審核撤銷當期權益、provider 取消且原 invoice 全退的情況，可立即重新結帳；歷史保留，新單不得再拿首次 trial，新訂閱必須有自己的 paid invoice 與 verified period。一般取消未到期仍擋新購。        |

## 必查路徑與發布判準

1. 首訂月／年、重訂付全額、永久 Prime、有效 grant、現有 trial／paid、全退可重購。
2. 兩分頁同時建立、同 quote 重試、不同 quote 競爭、quote／條款／資格改變、provider create timeout。
3. overlay 正常完成、關窗不提交、關窗後原頁重開、關窗後返回並改選新方案、SDK 失敗、重新整理／登出再登入、外部 return 早於 webhook。
4. 返回後舊 URL 從本站不可取、沒有棄購郵件回送；另存舊 URL、離開前已送出而事件晚到、兩筆真付款的防護及補救須以 Test Mode 證明，不能用本地陰性查詢代替。
5. webhook 重複／亂序／漏送、帳單 email 與登入 email 不同、錯 owner／store／mode／variant、未付與延遲 invoice，均不得錯授權益。
6. 試用結束、自然續扣與失敗補款、取消至期滿、改方案、退款、帳單與收據，按各自已核驗 evidence 判定。
7. 前端每狀態只在最接近行動的地方顯示一次原因；桌機與 390px 不重複同意／警告，不以停用按鈕取代復原路徑。

目前已做聚焦單元測試與 5173 合成預覽；migration/RLS、真 Lemon 中斷與晚到事件、完整瀏覽器與遠端 gate 尚未通過。這份矩陣是後續每次改支付流程時要逐格核對的清單，不可把一條 Happy Path 通過當作整體完成。

## 對應程式與權威

- Contract： [M8-E implementation contract](M8-E-IMPLEMENTATION-CONTRACT.md)、[Roadmap](ROADMAP.md)、[工作分支狀態](status/M8/M8-E-CHECKOUT-RECOVERY.md)。
- Web：apps/web/src/pages/settings/PlansPage.tsx、billing/CheckoutPage.tsx、LocalCheckoutPage.tsx、PaymentStatusPage.tsx、lemon-overlay.ts。
- API：apps/api/src/billing/policy.ts、checkout.ts、postgres-checkout.ts、lemon-checkout.ts、routes.ts、management.ts、event-inbox.ts、period-authority.ts、trial-change.ts、paid-change.ts。
- Database：supabase/migrations/20261019111117_billing_abandoned_checkout.sql 是未套用候選。
