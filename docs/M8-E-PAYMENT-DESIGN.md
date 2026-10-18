# M8-E 支付與訂閱設計

> **2026-10-18 PO 修正：** Pro／Prime 月／年四個方案一律設定 Lemon 原生 1 個月試用，
> 但只有帳號首次付費訂閱可用；續訂和再次訂閱不再試用，再次訂閱結帳時付款。
> 首次扣款日可在結帳摘要標示預計日期；實際到期日與扣款由 Lemon 確認資料決定。
> 本站不收優惠碼，由 Lemon 原生 Discount 判斷及計算。付費降級不提供；取消後
> 原權益保留至原期限，回 Free 後由使用者自行重新訂閱。下方舊促銷描述只作歷史。

> 2026-10-14 · PO 已接受最新視覺方向並授權本地開發。登入後報價、結帳保存與恢復已依 [局部工程 Contract](M8-E-IMPLEMENTATION-CONTRACT.md) 實作；完整付款生命週期仍未完成。
> 新 React 預覽：`http://127.0.0.1:4177/__review/payments/checkout`（開發伺服器啟動時）。[舊 HTML](design/payment-preview.html) 已由新版取代，僅保留歷史設計。｜[官方研究與來源](M8-E-LEMON-SQUEEZY-RESEARCH.md)
> 畫面中的帳號、日期、帳單與 DEMO60 都是示意，不是正式優惠碼或交易。

## 已確認的產品方向

| 方案  | 月繳含稅標價 | 年繳含稅標價 | 權益                                           |
| ----- | ------------ | ------------ | ---------------------------------------------- |
| Free  | NT$0         | —            | 5 名啟用學員、1 個場地、既有核心功能           |
| Pro   | NT$115       | NT$1,150     | 15 名啟用學員、不限場地、本月收支與成長軌跡    |
| Prime | NT$145       | NT$1,450     | 不限學員與場地、進階功能、資料匯出與行事曆整合 |

- 只有首次 Pro／Prime 訂閱使用原生 **1 個月**試用，今天應付 NT$0；有已核驗訂閱紀錄的帳號再訂閱時 API 設 `skip_trial:true`，今天應付所選方案全額。Test Mode 四方案均已讀回原生試用設定；日期預覽不作權益或實際扣款依據。
- 本站沒有優惠碼輸入或判斷；適用折扣碼在 Lemon 結帳輸入，由 Lemon 計算。永久 Prime 資格維持不收費，不建立自動續費訂閱。
- 年繳試用結束後的首次扣款是 **整年金額**，不能只顯示平均月費；確切扣款日以 Lemon 建立的訂閱為準。
- 不假定商店審核會通過。現在可完成 Contract、介面與測試環境工程；live checkout 必須等審核與 M8-E 收款驗證完成。

**含稅與扣款幣別的差異仍須定案。** Lemon 支援店鋪層級 tax-inclusive pricing，可使结帳不額外加稅，但其交易以 USD 處理。消費者的台幣卡帳單可能有匯差或發卡行費用，不能保證剛好 NT$115／145。若「最後台幣帳單完全等於標價」是硬性要求，需改選真正 TWD 扣款的供應商，而不能靠文案或調整售價達成。現稿揭露此差異，尚未把接受 USD 結算當已批准。[官方幣別](https://docs.lemonsqueezy.com/help/payments/currencies)、[含稅設定](https://docs.lemonsqueezy.com/help/payments/sales-tax-vat)

## 使用者的完整流程

```text
網站方案介紹 / Settings「查看所有方案」/ 額度限制入口
  → /plans：選 Pro 或 Prime、月繳或年繳
  → 未登入則登入，再回到原本選項（選項不是權益授權）
  → /settings/billing/checkout：首次試用或再次訂閱直接付款的摘要＋續訂同意；本站不提供優惠碼輸入欄
  → 原頁開啟 Lemon Squeezy Checkout Overlay：付款方式、原生優惠碼、帳單資料、最終條款
  → 原頁確認中 → 試用已開始 / 尚未完成（完整結帳頁備援使用 return route）
  → Settings「方案與帳單」：trial 到期日、首次扣款、續訂、取消、憑證
  → 首次扣款成功：付費使用中 → 月／年自動續訂
      └ 扣款失敗：更新付款方式 → 補款成功 / 停止付費權益
```

### 選方案與確認

保留既有 `/plans` 與 `/settings?category=plans` 的分工。比較頁用三張卡、全頁共用月年切換；預設月繳，年繳標「省 2 個月」，以年總額作主價格。支付啟用後不顯示舊的優惠兌換區。持續不使用缺乏證據的「最受歡迎」徽章。

確認頁桌機左側是方案與付款方式說明，右側是訂閱摘要；390px 垂直排列，確認按鈕緊鄰金額與同意文字，不設遮擋內容的固定浮層。顯示今天 NT$0、1 個月試用、期滿後所選方案價格；確切首次扣款日以 Lemon 結帳和已建立的訂閱為準。

主要按鈕「設定付款方式，開始免費體驗」。按鈕前須有未預勾選的續訂同意，列出 1 個月試用、期滿後含稅金額與週期。修改 tier 或 interval 後清除同意，重新提供完整摘要。付款同意另有版本與稽核紀錄，不混用既有一般條款同意。

付費方案變更只顯示經 provider 證實的升級；不提供付費降級。取消至原期限後轉 Free，使用者才可重新選方案結帳。

### 結帳與返回

依 2026-10-14 PO 的站內付款方向，第一版採 **Checkout Overlay 為主**：後端建立限定方案的 Checkout URL，前端用 Lemon.js `LemonSqueezy.Url.Open(url)` 在目前頁面開啟供應商結帳視窗。使用者不需先離開本站；付款欄位仍由 Lemon 處理，本產品不收集卡號。原先整頁跳轉是整合簡化提案，不是供應商限制，現已取代。[官方 Overlay](https://docs.lemonsqueezy.com/help/checkout/checkout-overlay)、[Lemon.js](https://docs.lemonsqueezy.com/guides/developer-guide/lemonjs)

載入 SDK／開啟視窗期間保留確認頁与選項，防止重複建立訂閱。若失敗，原處顯示重試及「改用完整結帳頁」；使用者選擇後才導向同一有效 checkout，不自動跳轉、不另建交易。關閉視窗不等於取消訂閱或付款失敗，回到原摘要並查詢 intent；`Checkout.Success` 只觸發 API 重新確認，依 verified provider state 顯示試用或付費結果。可更新付款方式的 signed URL 也優先使用官方支援的 Overlay；完整 Customer Portal 與 PayPal 改約不假定可嵌入。

手機、installed PWA、銀行 3DS／PayPal／錢包授權可能涉及不同視窗或外部驗證；目前沒有本商店實測證據，不能把「站內結帳入口」宣稱為所有付款方式全程零跳轉。驗證焦點恢復、捲動鎖定、鍵盤與安全區、關閉後重新開啟、SDK/CSP/網路失敗及外部驗證返回。正式畫面使用供應商 Overlay，不複製其卡號表單。

訂閱可用信用卡／簽帳卡、Apple Pay、Google Pay、PayPal，依當次裝置、地區與商店設定顯示；不宣稱支援 ATM、超商、LINE Pay、Alipay 訂閱。供應商 locale 文件列 zh-CN，未列 zh-TW；本產品保持繁中，但不承諾外部結帳全繁中。[付款方式](https://docs.lemonsqueezy.com/help/checkout/payment-methods)

返回頁不得直接顯示「付款成功」：試用開始沒有收訂閱費。只有 API 已驗證 `on_trial` 的訂閱才顯示「試用已開始」；實際付款成功則顯示「訂閱已啟用」。等待 webhook 時顯示「正在確認你的訂閱」，有限次重新查詢後提供「重新確認」與「返回方案與帳單」。不因等待超時就引導重新購買。

付款視窗被關閉、返回遺失或 PWA 在外部瀏覽器完成時，重新開啟 Settings 可從本人訂閱投影恢復；重新登入後仍能恢復。URL query、Lemon.js success callback、Email 或使用者提交的 provider ID 都不能賦予權益。

### 管理、取消與帳單

目前方案卡保持「Prime 方案 → 月費／年費方案 → 狀態」的資訊順序。試用顯示首次扣款日期；已付費顯示下次扣款日期；取消後顯示已確認的可用期限及到期 Free。續訂取消是次要文字按鈕，但可直接找到，不設挽留迷宮。

取消確認列出到期時刻、之後不扣款、資料保留，以及實際超額後果。試用取消保留至核驗的 `ends_at`；此映射要以 sandbox 驗證，不能只靠前端倒數。恢復須在可恢復期限內且經供應商確認；已過期重新結帳，不自動再送試用。PayPal 需要走供應商支援的 Portal 確認路徑。

依 PO 2026-10-14 後續審閱，**移除常駐「付款方式」欄位與管理區，只保留「帳單」**。付款資料由供應商管理；只有扣款失敗時，才在該筆待付款帳單／通知提供「處理未付款帳單」補救入口，避免把解決付款問題的能力一併移除。

### 帳單列表與明細

帳單位於現有 Settings → 方案與帳單，接在目前方案卡下方；不另外造一個收費 Dashboard。正式實作使用既有 App Shell、分類導覽、`SettingsPanelHeading`、字級 tokens、`FormSelect` 與 `useDialogBehavior`；目前獨立 HTML 只作流程與資料層級示意，不是可直接移植的正式 UI 元件。

| 表面       | 設計                                                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 列表       | 最新在前；日期／帳單編號、當期方案與週期、狀態、帳單金額、明細按鈕。帳單方案與金額取歷史快照，不跟目前售價重算。                                                                     |
| 篩選與載入 | 全部／已付款／退款／待付款。正式版每頁 10 筆、游標「載入更多」，保留篩選与已載資料；變更篩選重設游標。少量紀錄不顯示分頁。                                                           |
| 手機       | 每筆同一邏輯行改為兩欄：日期和總額優先，方案與狀態次之，明細入口保持可點；沒有橫向表格捲動。                                                                                         |
| 明細視窗   | 帳單編號、日期、當期方案、首次／續訂／變更費用、供應商可得的稅前金額、折扣、內含稅、含稅總額、USD 處理金額、退款累計與淨額。不存在的明細不自行算出；若有可信期間快照才顯示服務期間。 |
| 狀態       | paid 已付款、pending 待付款、void 已作廢、refunded 已退款、partial_refund 部分退款。訂閱扣款失敗與 invoice pending 分別映射，不能虛構供應商 failed invoice status。                  |
| 憑證       | 明細提供「取得 PDF 憑證」；由本人 API 核驗帳單歸屬後取該筆 invoice URL。pending 沒有 URL 時顯示尚未提供，不建立假下載。局部失敗保留明細並可重試。                                    |
| 空狀態     | 無付款紀錄顯示尚無帳單；若供應商確有 NT$0 invoice，顯示零額帳單而非隱藏；試用不是假定有／沒有 invoice 的依據，零額不算營收。                                                         |
| 退款       | 原帳單金額保留；另外顯示已退與退款後淨額。取消訂閱不等於退款，部分退款不等於方案失效。                                                                                               |

`GET /api/billing/invoices`、`GET /api/billing/invoices/:id`、取得該筆憑證 operation 是待凍結接口。必須由本人 identity／Workspace mapping 核驗歸屬；列表、明細、憑證皆禁止跨租戶。API 只回允許的帳務資料，不回卡號尾碼、付款方式欄位、完整地址或 provider payload；前端使用 Coach-scoped memory query。列表不含 signed PDF URL，點擊才取，對外連結不進一般 log、分析或持久快取。

供應商 invoice API 支援帳單／USD 金額、稅、累積退款及憑證 URL；PDF URL 有簽名但官方說不會到期，因此不可套用 Portal 的 24 小時期限假設。詳細安全處理見工程 Contract。此憑證不宣稱為台灣統一發票。[Invoice Object](https://docs.lemonsqueezy.com/api/subscription-invoices/the-subscription-invoice-object)

### 本輪示意稿修正

依 2026-10-14 最新畫面回饋，優惠碼僅留標題、輸入與套用，無效提示為「優惠碼無效或不適用」，錯誤仍保留固定高度。金額明細移除重複說明，今天應付採較小字級；條款勾選框使用獨立樣式並保留鍵盤焦點。成功視窗直接使用既有 `--white`、`--paper`、`--ink`、`--lime` 色彩，採黃綠底墨黑勾號與墨黑底淺色文字按鈕。三列明細維持相同字級、行高及間距，日期下緊接「當日起每月／年 NT$…」說明；關閉按鈕為 44px 點擊範圍與 24px 圖示。參考圖只作版面參考，不沿用其森林綠配色。

付款視窗開啟後，entry → 確認中 → 試用已開始全程更新同一 dialog，底下原確認頁與 URL 保持不變；確認前留在原頁；確認成功後按「完成」、關閉或 Escape 都進入方案與帳單，不留在可再次付款的頁面。正式版收到付款成功事件後由後端核驗，再更新權益，不能把此示意稿的模擬按鈕當真實供應商畫面。完整結帳備援只在錯誤時由使用者選擇，不放在正常路徑。實際商店／銀行驗證仍須測試。

設計稿 v3 移除獨立付款方式管理，新增帳單篩選與部分退款明細，依现有 Settings 的暗綠方案卡、分類導覽与白底帳單面板對齊。正式 UI 以既有 React 元件與實機審閱為準，不能以獨立示意稿代表已完成產品視覺驗收。

## 優惠管理與供應商配置

**共用前台流程與後台 Billing Module；60 天碼仍屬本產品試用資格，不冒充 Lemon 折扣券。** 供應商百分比／固定金額 Discount 決定付多少，不能把年費 100% 折一單當免費 60 天。

建議一個 Form Coach Desk product，六個可映射的 variants：Pro 月／年與 Prime 月／年各為 `month / 1` trial；另兩個 Prime 月／年為 `day / 60` trial。Price 的 `trial_interval_unit` 與 `trial_interval_quantity` 是現行欄位。新 Checkout 沒有任意 trial-end 參數，不能一律先建立一個月再延長，因為 PayPal API 改約受限。[Price](https://docs.lemonsqueezy.com/api/prices/the-price-object)、[Create checkout](https://docs.lemonsqueezy.com/api/checkouts/create-checkout)

伺服器驗碼後保留資格，建立短效限定單一 variant 的 checkout；只有核驗 subscription 建立成功後才原子核銷。放棄結帳不消耗優惠碼。資格予約、checkout 期限與 webhook 遲到要一起處理：不能僅憑本地超時釋放，須確認供應商是否已建立訂閱。若確認超時，顯示「正在確認」並對帳，避免同一資格出現第二個有效訂閱。

隱藏 variant 不等於存取控制。Provider 的直接購買／Portal 變更入口可能繞過本地優惠資格，必須 sandbox 驗證能否限制試用 variants 與公開商店入口。每個訂閱需匹配未消耗的合法 intent；不合法或重複 provider 訂閱進異常佇列並停止其未來收費，不能僅拒絕權益卻放任自動扣款。若無法限制或可靠補償，阻擋優惠 variant 上線，不能稱防重已完成。

第一版沿用既有碼建立、撤銷與稽核能力，擴充 trial policy、適用方案、有效時間與核銷結果；不另造大型客服管理台。原始碼、digest、付款授權連結不寫入一般 log；回應不得洩漏其他帳號是否使用。

## 訂閱與權益的工程邊界

Billing Module 新增供應商 adapter；Plan Access 繼續集中有效 tier、額度與功能政策。不能把舊 `plan-subscription.ts` 的本地時間 rollover 當真實扣款或續約事實。

| 供應商／本地事實                              | 顯示與權益建議                                                       |
| --------------------------------------------- | -------------------------------------------------------------------- |
| checkout 尚未確認                             | 原有權益；不提前解鎖                                                 |
| 已驗 `on_trial` 且歸屬及資格有效              | 所選 trial tier，保存核驗 trial end，不記營收                        |
| 首扣／續扣成功且 invoice、subscription 均核對 | 付費 tier 至核驗期間，invoice 唯一記帳                               |
| `past_due`                                    | 更新付款方式；既有權限只到已核驗的已付期間末日，不延長               |
| `unpaid`／expired 或已付期間到期              | 回到其他合法 grant 或 Free；資料不刪除                               |
| cancelled 但 `ends_at` 未到                   | 保留核驗期間權益；不預計續扣                                         |
| 部分退款                                      | 更新 invoice，權益依內部個案決策；不得一律保留或一律撤銷所有資格     |
| 全額退款／爭議／paused                        | 分別核對，退款按已批准的內部準則與個案決策；爭議／paused 不冒充退款  |
| 永久 Prime                                    | 維持永久權益，不推銷重複訂閱；若已有收費訂閱需明示停止續訂與核驗結果 |

卡與 PayPal 催款節奏不同，UI 只顯示供應商確認的時間；不知道下次重試時刻就不畫倒數。供應商的催款與重試不延長本產品已核驗的已付期間；超過期間，即使沒有新事件也停止該付費權益。過期補款不得被當作新試用。降級／到期沿用既有 Free 5 人／1 場地與 over-capacity policy，保留讀取、封存及恢復途徑。

規劃 API operations：本人 `GET /api/billing`、`POST /api/billing/quote`（含碼評估）、`POST /api/billing/checkouts`、`GET /api/billing/checkouts/:intent`、`POST /api/billing/portal`、取消與恢復 operations，以及 provider webhook。這些是待凍結介面，沒有新增到實際 server。

伺服器由 verified identity 解析 Workspace；禁止 browser 自報 Workspace、provider customer、金額、試用天數或 variant。報價附 version／有效期限；创建 checkout 重查價格、資格與既有訂閱，並用 Workspace 鎖及 idempotent intent 防重。價格、trial 或碼改變回明確 conflict，要求重看條件。

私有持久資料候選：provider customer/subscription mapping、checkout intent、trial eligibility/reservation、verified invoice ledger、webhook inbox、consent audit、reconciliation cursor。所有金額保留 provider currency 與原始整數尺度，額外保存展示幣別，不能把既有 TWD 整元與 provider cents 混用。Test 與 live 各自隔離，禁測試訂閱授正式權益。

Webhook 用 raw bytes 驗 HMAC-SHA256 與 timing-safe compare；先耐久入 inbox 再回 200。相同 payload 去重不取代 invoice ID 唯一約束，避免 recovered + success 重複計費。亂序事件不能單看接收時間，需物件版本及 authenticated GET 對帳；供應商不可用時保留已核验狀態、顯示同步中，不能自行宣告付費成功。持久 worker 有自有 retry／dead-letter，待處理 intent 與即將到期訂閱定期對帳。[簽章](https://docs.lemonsqueezy.com/help/webhooks/signing-requests)、[重送](https://docs.lemonsqueezy.com/help/webhooks/webhook-requests)

## 已確認的升降級政策與待驗證項目

供應商 PATCH variant 會立即更換，不是期末排程；本輪未找到既有訂閱 proration preview API。PayPal 改約需要 Portal 確認。[官方訂閱管理](https://docs.lemonsqueezy.com/guides/developer-guide/managing-subscriptions)

PO 於 2026-10-14 確認下列規則，取代先前首版提案：

| 變更                        | 生效與費用                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 已付款年繳 → 月繳           | 現有年期結束後轉月繳；包括 Pro 年繳 → Prime 月繳。首次試用期間的月／年選擇不受此限制                                                  |
| Pro → Prime（符合週期限制） | 剩餘已付期間折抵新方案整期費用，付款核驗後立即生效，週期重新起算                                                                      |
| Prime → Pro（符合週期限制） | 原期間結束後生效；Prime 月繳 → Pro 年繳也屬降級                                                                                       |
| 同方案月繳 → 年繳           | 立即結算、剩餘已付期間折抵，年繳週期重新起算                                                                                          |
| 相同方案、相同週期          | 不變更、不產生另一筆付款                                                                                                              |
| 免費試用中更換付費方案      | 同一訂閱、原試用截止日不變；Pro→Prime 立即取得 Prime 試用權益，Prime→Pro 於試用截止日轉 Pro；月／年可在首次扣款前自由改選，不提前扣款 |
| 免費試用中取消目前付費訂閱  | 在目前訂閱的管理處取消自動續訂；原試用權益保留至期限，期滿轉 Free，資料保留。Free 本身沒有續訂可取消                                  |
| 任何付費方案 → Free         | 在「期滿變更」選 Free，與取消續訂共用同一操作：保留目前已核驗權益到原期限，停止下次扣款，期滿回 Free；不建立 Free 訂閱                |

2026-10-16 PO 更正先前「年費轉月費不開放」：已付年費可選，但於年期滿生效。
首次免費試用尚未付款，月／年繳可自由改選；原試用截止日不變，首次依最後確認週期扣款。
試用中只有 Pro／Prime 權益升降：Pro→Prime 立即，Prime→Pro 到原試用截止日。升級不再給新的試用。
例如已用一半的 NT$115 月繳 Pro 升級 NT$145 月繳 Prime，參考折抵為 NT$57.50，
新一期應付 NT$87.50；不是只收舊期間剩餘天數的價差。金額以實付可折抵額與確切期間計算，
不使用折扣前牌價；供應商幣別、四捨五入與實際帳單仍須核對。

官方 API 的 `invoice_immediately=true` 與 `billing_anchor=0` 提供立即結算和重設起點能力，
但仍需 Test Mode 驗證組合後的折抵、首筆費用、續訂日與付款失敗行為。`disable_prorations`
不代表延後換方案，不能用它假裝期末降級；預定變更需要持久化與避免舊方案續扣的交接機制。
尚未開放正式升降級操作；試用中換約仍待凍結，不可無意觸發立即首扣。
[更新訂閱 API](https://docs.lemonsqueezy.com/api/subscriptions/update-subscription)

凍結前集中確認以下事項：

1. 接受含稅 TWD 標價但 USD 扣款，或改找 TWD 扣款供應商。
2. PO 已進一步確認：一般一個月與 60 天優惠碼試用皆僅限同一帳號首次訂閱，所有方案／週期共用；取消重訂直接收費且 `skip_trial=true`。先前成功建立過任一試用訂閱就不再具有首次資格。資格由後端持久判斷，不能只靠 provider email。
3. 60 天取代一個月、不累加；原免卡優惠使用者保留原條件。若要轉成綁卡，需明確同意；原期限如何保留、剩餘天數如何跨 PayPal 處理，要另驗證。建議舊優惠先用完再直接付費，不強制遷移。
4. 升降級規則已確認；2026-10-17 已移除最多 7 天寬限。供應商執行、試用中換約、MoR 自行退款與爭議的異常處理仍須完成。一般退款原則依新內部作業準則，個案可由 PO 覆核。
5. 首扣提醒：建議到期前 7 天、1 天與當日失敗通知。先核對 provider 實際郵件，不重複寄；若需自建，加入 outbox 與寄送驗證。不把未實作提醒写成服務承諾。

已核准的價格、一般一個月 trial、優惠碼 60 天綁付款自動續訂、統一結帳入口不再重問。上述未決政策不阻擋設計稿審閱，但必須在對應正式工程前凍結。

## 視覺與狀態規格

沿用 FORM 米白紙色、近黑內容、萊姆綠重點與繁中字體。參考 [Linear pricing](https://linear.app/pricing) 的少量主要差異和次要詳細比較、[Notion pricing](https://www.notion.com/pricing) 的共用月年選擇、[Notion billing](https://www.notion.com/help/billing) 的續訂摘要。借鑑資訊結構，不照抄其席位定價、政策或未取得的登入後画面。

| 狀態                         | 呈現及恢復                                             |
| ---------------------------- | ------------------------------------------------------ |
| Loading / Refreshing         | 首次局部骨架；刷新保留可讀資料，關閉可能過時的付款提交 |
| Invalid code / Error         | 表單原處固定訊息空間，保留碼與選項，可修正再試         |
| Mutating                     | 單一進行中提交、保留按鈕寬度，不能連點建第二筆         |
| Conflict                     | 顯示最新方案／金額，重新確認；不同帳號的 intent 回 404 |
| Empty                        | 尚無付款紀錄，不生成假收據                             |
| Pending return               | 可重查／返回帳單；不能假定成功或失敗                   |
| Checkout abandoned           | 恢復摘要，核驗無有效訂閱後才可重新進入                 |
| Failed / cancelled / expired | 清楚下一步、實際權益期限、資料與額度後果               |

鍵盤可操作月年選擇、優惠碼、同意與 modal；dialog 可 Escape 關閉並回焦；狀態透過 aria-live，訊息不只靠顏色。手機按鈕至少 44px、必要金額不藏 tooltip，390px 無橫向溢出。設計稿提供情境下拉選單；它是審閱工具，不進正式產品。

## 實作與驗證接手

先審閱此設計與政策，再凍結 M8-E Contract。按順序完成 Billing adapter／安全持久狀態、統一 checkout／trial／優惠、Settings 與取消／恢復、worker／對帳／失敗與退款。商家審核期間可進行核准的 test-mode 工程，不啟用 live charge。

必要證據針對風險而非重跑所有舊 Happy Path：一個月月底／閏年、60 天精確期間、年費首次扣整年、trial取消免首扣、過期重訂不得重試用、優惠重放／直接 variant 購買、兩分頁及不同帳號競爭、checkout POST timeout、回跳先於 webhook、重複／乱序／漏送、首扣失敗與續扣失敗、部分／全部退款、PayPal 改約、卡與錢包裝置差異、TWD 顯示及 USD 實扣、tax-inclusive read-back、正式與測試環境隔離。

本輪交付為研究、產品設計、獨立互動稿與價格文案修正；設計稿展示檢查不等於正式 browser acceptance。尚無 provider Test Mode 交易、資料庫 migration、完整 CI、live charge 或 installed-PWA 支付驗收；不得稱支付功能已完成。

## 2026-10-14 最新 PO 審閱決策

- [對外付款須知與條款修訂稿](M8-E-PAYMENT-NOTICE.md)與[內部退款準則](M8-E-REFUND-OPERATIONS.md)是本輪補充依據；相衝突的早期草案以本節為準。45 天是收到申請的期限，不是退款保證，也不是供應商技術期限。
- 結帳前提供付款須知、服務條款、隱私權政策入口，原選項與優惠碼保留；明示 USD 處理，正常價格不再反覆標含稅。中英文正式條款及政策須與付款須知同版發布；本轮仅备妥修訂稿，未發布。
- 支付確認成功後完成／關閉返回方案與帳單，正式用 replace 導航；返回鍵、重新整理、直接舊 URL 均依後端真實狀態阻止再建訂閱。確認中禁重複結帳，延遲時可重新查詢。每帳號鎖、checkout intent 冪等、重複 provider 訂閱偵測與補償仍是服務端必要條件，不能用前端導航代替。
- 示意稿 v4 修正成功與 pending 離開、session 內再入保護及文件入口，只供流程審閱；視覺已被 PO 否決，正式版必須依既有 App Shell／Settings 重新設計，不把 v3／v4 標為視覺核准。
- 退款由 Lemon 後台處理，帳單依退款 webhook 和對帳自動更新，Email 不觸發帳務更新；尚未實作或 sandbox 驗證。內部權益決策獨立於供應商帳單事實，保留操作稽核與例外調整能力，不把退款矩陣公開。
