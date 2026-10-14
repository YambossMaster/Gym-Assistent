# M8-E Lemon Squeezy 可行性研究

> 初版研究：2026-10-06；支付設計補充驗證：2026-10-14（Asia/Taipei）。產品負責人表示商店仍在審核，已要求提前研究與設計支付。此文件不是凍結的 Billing Contract 或啟用正式收款的决定。下方保留初版有效研究，新增章節區分目前官方事實、設計推論及仍待驗證項目；台灣稅務、發票及個人身分義務仍須在付費上線前另行確認。

## 結論

**適合作為 M8-E 的優先候選，尚不應宣稱已可收款。** Lemon Squeezy 是 Merchant of Record（MoR）：買方與 Lemon Squeezy 交易、Lemon Squeezy 代供應商出售產品，並處理交易稅的計算、申報與繳納；這可大幅減少跨境數位服務的交易稅作業。[Buyer Terms](https://www.lemonsqueezy.com/buyer-terms)、[Sales Tax and VAT](https://docs.lemonsqueezy.com/help/payments/sales-tax-vat)

它與既有 M8-E draft 的月／年 Pro、Prime 訂閱、供應商託管 Checkout、Webhook 驗證後才開通權益、帳單入口、付款方式更新與收據／發票歷史相容。但個人商家必須完成商店啟用審核、身分與稅務資料、實際出款方式的設定；在台灣的本地憑證／統編需求與產品負責人不公開真實身分的公開界線，沒有被 MoR 自動消除。[Activate your store](https://docs.lemonsqueezy.com/help/getting-started/activate-your-store)、[Verify your identity](https://docs.lemonsqueezy.com/help/getting-started/verify-your-identity)

## 與本產品的相容部分

| M8-E 需要                                   | 官方能力與意義                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 台灣個人可作為賣方                          | Lemon Squeezy 的銀行出款支援國清單包含 **Taiwan**；官方也說明商家可用銀行或 PayPal 收款。這證實地區在供應商列出的範圍內，但不是此帳號一定通過 KYC／商品審查的承諾。[Supported Countries](https://docs.lemonsqueezy.com/help/getting-started/supported-countries)、[Getting Paid](https://docs.lemonsqueezy.com/help/getting-started/getting-paid)                                       |
| SaaS 產品適配                               | 商店啟用文件將軟體、SaaS、數位商品列為通常會核准的類型；Gym Assistant 的付費訂閱在此範圍內，但仍由 Lemon Squeezy 個案審核。[Activate your store](https://docs.lemonsqueezy.com/help/getting-started/activate-your-store)                                                                                                                                                                |
| 月繳與年繳                                  | Subscription 產品可採 standard flat-rate pricing；訂閱 API 具有續訂時間、狀態、取消、試用與帳單相關欄位，可作為伺服器權益投影的外部事實來源。[Subscriptions](https://docs.lemonsqueezy.com/help/products/subscriptions)、[Subscription object](https://docs.lemonsqueezy.com/api/subscriptions/the-subscription-object)                                                                 |
| NT$115／145、NT$1,150／1,450 的面向台灣定價 | 支援 TWD 作為店鋪／展示／收據幣別，但 Checkout 的交易最終會以即時匯率換成 **USD** 處理；必須在實測 Checkout 時確認顧客看到的金額與匯率說明。[Currencies](https://docs.lemonsqueezy.com/help/payments/currencies)                                                                                                                                                                        |
| 付款方式                                    | 一次性付款有卡、PayPal、Apple Pay、Google Pay、Alipay、WeChat Pay、Cash App Pay、部分銀行扣款；**訂閱**目前只支援卡、Apple Pay、Google Pay、PayPal。各方法會依顧客所在地與裝置出現，不能承諾台灣所有客戶都有特定方式。[Payment Methods](https://docs.lemonsqueezy.com/help/checkout/payment-methods)                                                                                    |
| 付款後才賦予 Pro／Prime                     | 官方明確提供 `subscription_created`、`subscription_payment_success`、`subscription_updated`、失敗／恢復／到期等 webhook。Webhook 必須以簽名祕密驗證；return URL 只能是 UI 返回，不能視為付款／權益證明。[Webhook Events](https://docs.lemonsqueezy.com/help/webhooks/event-types)、[Signing Requests](https://docs.lemonsqueezy.com/help/webhooks/signing-requests)                     |
| 帳單、取消與更新付款方式                    | Customer Portal 支援帳單歷史、升降級、取消／恢復、暫停／恢復與付款方式管理；API 可取用 24 小時有效的 signed portal／update-payment-method URL。即使採 Portal，官方仍要求以 webhook 同步應用程式權益。[Customer Portal](https://docs.lemonsqueezy.com/help/online-store/customer-portal)、[Developer Portal Guide](https://docs.lemonsqueezy.com/guides/developer-guide/customer-portal) |
| 顧客憑證                                    | 顧客可從 My Orders 產生 order PDF invoice；訂閱付款可從 Customer Portal 的 Billing history 產生 invoice。這是 Lemon Squeezy 的商業發票／收據能力，**不是**已驗證符合台灣統一發票或特定 B2B 憑證需求的結論。[Generate Invoice](https://docs.lemonsqueezy.com/help/orders/generate-invoice)                                                                                               |

## 費用、出款與現金流

- 平台費的官方基準是每筆訂單 **US$0.50 + 總額 5%**；美國以外交易加 1.5%，PayPal 加 1.5%，訂閱付款另加 0.5%。因此台灣客戶用一般卡訂閱的表面費率通常是 **US$0.50 + 7%**（仍以實際帳戶頁與 Checkout 為準）。[Fees](https://docs.lemonsqueezy.com/help/getting-started/fees)
- 銀行出款在美國以外為每次 1%；PayPal 出款在美國以外為 3%（上限 US$30）。出款幣別原則為 USD；銀行可選其他出款幣別並依出款時匯率轉換，另可能有銀行／換匯費。[Fees](https://docs.lemonsqueezy.com/help/getting-started/fees)、[Currencies](https://docs.lemonsqueezy.com/help/payments/currencies)
- 款項至少持有 13 天；每月 1、15 日建立出款，通常在 14、28 日支付；門檻是 US$50。故它不是即時入帳，Beta 現金流要把延遲納入預期。[Getting Paid](https://docs.lemonsqueezy.com/help/getting-started/getting-paid)
- 非美國個人／實體要提供 W-8 稅務表資料；未完成時出款可能被停用或阻擋。產品負責人須向供應商提供真實法定身分／居住國資料，這是帳戶合規資料，不代表一定要對 Gym Assistant 客戶公開。[Tax Forms](https://docs.lemonsqueezy.com/help/tax-forms)

## 不能跳過的驗證與 Contract 決策

1. **先建立 Test Mode 帳號並送商店啟用審核。** 用產品的真實服務描述、個人 KYC／W-8、台灣銀行或已驗證 PayPal 確認能否完成出款；「台灣在支援名單」不等於審核成功。
2. **台灣法務／稅務與公開身分分開確認。** MoR 處理交易稅，不保證免除對商家收到款項的所得申報。也不能把 Lemon 的 PDF invoice 等同台灣統一發票；先釐清客戶（含企業）需要的憑證與資料欄位。這也必須與 M8-C 的個資告知／公開識別風險一起解決。
3. **以正式 Test Mode 逐一驗收 TWD Checkout。** 特別確認月／年價格轉 USD 後的呈現、稅含／稅外設定、失敗與重試、退款、取消、換方案、月年切換、有效日與 Portal 行為。現有 draft 中的即時補差額／原續訂錨點是假設，不能在未測前當成 Lemon Squeezy 保證。
4. **權益只由 API 驗過的事件改變。** 建立 idempotent webhook inbox、驗 HMAC、保存 provider event／order／subscription／invoice ID、容忍重送與亂序，再把受驗證的狀態映射到既有 `plan_subscription`。首付失敗、付款失敗、退款、取消、過期與恢復都要有明確的存取結果；Portal／返回頁不可直接解鎖。
5. **維持零價與付費分界。** 歷史零價週期、現行免卡 60 天 Prime 體驗及 Beta 授權不可被匯入 Lemon Squeezy 後自動扣款。2026-10-08 Beta 修正已取代面向一般 Coach 的零價自由選購；付費只能由新 Checkout 的清楚確認開始，並在正式 Contract 凍結後才接入。
6. **驗收帳單描述與客服文案。** 付款卡帳單的官方描述為 `LEMSQZY*STORE`，不是單獨的 Form Coach Desk；在 Checkout／條款／客服入口預先清楚告知，降低未知扣款的爭議。[Statement Descriptor](https://docs.lemonsqueezy.com/help/getting-started/statement-descriptor)

## 對 M8-E 的建議定位

把 **Lemon Squeezy 暫定為首選候選供應商**，而非已選定／已啟用的支付服務。其 MoR、託管 Checkout 與 Portal 能縮小第一版的金流 UI 範圍；Gym Assistant 仍需擁有自己的訂閱／權益帳本、Webhook 去重與客服解釋。完成前節的帳戶與 Sandbox 驗證、台灣憑證路徑確認後，才能把它寫入 M8-E 的 frozen Contract、成本模型與公開條款／隱私聲明。

## 2026-10-14：提前設計支付的官方事實

### 審核中可以準備什麼

新商店預設在 Test Mode，可測 Checkout、訂閱、API 與 Webhook；正式銷售另需啟用審核。Test Mode 使用官方測試卡，不能用真卡；測試收據寄給店主／團隊，測試產品也不會自動成為 Live 產品。因此可先做完整設計、隔離實作與測試準備，不必把審核通過當成設計前提；Live 收款仍是獨立 gate。[Test Mode](https://docs.lemonsqueezy.com/help/getting-started/test-mode)

### Checkout、付款方式與在地呈現

| 項目            | 已確認事實                                                                                                                                                                                                   | 對設計的影響／待驗證                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosted Checkout | 支援導向供應商結帳頁，可調整 logo、媒體、描述、姓名與優惠碼欄位。[Hosted Checkout](https://docs.lemonsqueezy.com/help/checkout/hosted-checkout)                                                              | 2026-10-14 後續修正：僅作 Overlay 載入失敗時，由使用者選擇的完整結帳備援。                                                                           |
| Overlay         | Lemon.js 可把 Checkout 放在 modal；React 需在元件掛載後初始化。[Checkout Overlay](https://docs.lemonsqueezy.com/help/checkout/checkout-overlay)                                                              | 本輪改為主要入口；本站保留確認頁，供應商提供付款視窗。installed PWA、3DS、錢包與 PayPal 往返仍需各別驗證。                                           |
| 訂閱付款        | 卡、PayPal、Apple Pay（Safari）、Google Pay（Chrome）；實際方法由裝置／所在地決定。[Payment Methods](https://docs.lemonsqueezy.com/help/checkout/payment-methods)                                            | 不列出 LINE Pay、ATM、超商或把一次性付款可用方式誤列為本產品訂閱方式。錢包圖示只能代表可能可用。                                                     |
| 幣別            | TWD 可展示；官方原文：**“Lemon Squeezy processes all transactions in US dollars (USD)”**。以即時中間匯率換算，Lemon 不額外收這次換匯費。[Currencies](https://docs.lemonsqueezy.com/help/payments/currencies) | 保留核准 TWD 標價；確認頁清楚說明美元扣款，最終金額依供應商結帳。不能宣稱信用卡帳單必定正好 NT$115／145。                                            |
| 語言            | Create Checkout 的 locale 清單列 `zh-CN`，沒有 `zh-TW`。[Create Checkout](https://docs.lemonsqueezy.com/api/checkouts/create-checkout)                                                                       | 不傳未記載的 `zh-TW`、不承諾 Hosted Checkout 全繁中；本產品維持繁中，供應商語言待 Test Mode 確認。                                                   |
| 稅              | 支援店鋪層級含稅設定，影響未來訂閱帳單；舊帳單不回寫。[Sales Tax and VAT](https://docs.lemonsqueezy.com/help/payments/sales-tax-vat)                                                                         | 2026-10-14 Product Owner 已要求 NT$115／145 為含稅總額，年價沿用既有定價。產品設計依含稅價格呈現；商店設定本身仍未操作／實測，USD 扣款事實仍須揭露。 |

### 方案映射與 Checkout 建立

官方 Variant 可代表同一產品的不同售價／週期；PayPal 換約限同產品的 Variant。**建議**建立一個 Form Coach Desk 訂閱產品、四個 Variant：Pro 月繳／年繳、Prime 月繳／年繳。Free、既有免卡 60 天體驗碼與 Beta entitlement 留在既有 API 權益系統，不自動轉成供應商續扣；本輪新增的直接訂閱試用則走下面的供應商試用契約。[Variants](https://docs.lemonsqueezy.com/help/products/variants)、[PayPal Subscriptions](https://docs.lemonsqueezy.com/help/orders/paypal-subscriptions)

### 2026-10-14 Product Owner 補充：直接訂閱先綁付款方式，免費一個月

Product Owner 要求無優惠碼的直接訂閱經 Checkout 建立付款方式，先試用**一個月**，到期才首扣並自動續訂；既有 60 天碼仍免卡。這是兩種不同權益來源，不能混為一次「免費試用」，也不可把免卡碼換成自動續訂。

官方支援先在 Checkout 收集付款方式、到 trial end 才首扣；`subscription_created`／`subscription_updated` 的 `status=on_trial` 可作為試用權益依據，不必等 `subscription_payment_success`。首扣成功變 active，失敗進 past_due，期間取消則 cancelled。[SaaS Free Trials](https://docs.lemonsqueezy.com/guides/tutorials/saas-free-trials) **本產品映射建議：**先驗章並核對 intent／identity／Variant，再授予所選方案的 provider-trial entitlement；不記為已付款、不計入 paid revenue。首扣必須以 invoice paid 與最新訂閱狀態核對。

所有訂閱產品都可設 trial，以日／週／月／年為單位，因此四個月繳／年繳 Variant 均能設定一個月。[Free Trials](https://docs.lemonsqueezy.com/help/products/free-trials) 新整合應讀 Price 的 `trial_interval_unit=month`、`trial_interval_quantity=1`，而 Variant 的 `trial_interval`／`trial_interval_count` 已列 deprecated；續訂週期是獨立的 `renewal_interval_unit`／`renewal_interval_quantity`。[Price Object](https://docs.lemonsqueezy.com/api/prices/the-price-object)、[Variant Object](https://docs.lemonsqueezy.com/api/variants/the-variant-object) 此處是設定值／讀回驗證契約，不是宣稱 API 有建立或修改 Price 的寫入 endpoint。

UI 以 provider `trial_ends_at` 顯示首次扣款時間，不能把一個月實作成固定 30 天；試用期間 `first_subscription_item` 可能 null，cancelled 後 trial_ends_at 也可能 null，需保留已核驗期間資料與使用 ends_at。[Subscription Object](https://docs.lemonsqueezy.com/api/subscriptions/the-subscription-object)

本次官方文件未明列 PayPal free trial 排除；但也沒有找到足以保證本商店在 Test Mode 能完整驗證 PayPal／Apple Pay／Google Pay 首扣與續扣的操作文件。付款方式仍由當次 Checkout 決定；先用官方測試卡驗證 trial start、取消、到期首扣、首扣失敗，PayPal 與錢包另列真實支援與授權測試證據，不能以測試卡通過代替。[Payment Methods](https://docs.lemonsqueezy.com/help/checkout/payment-methods)、[Test Mode](https://docs.lemonsqueezy.com/help/getting-started/test-mode)

PO 後續已批准：一般一個月試用僅同帳號首次訂閱，所有方案／週期共用；取消重訂 `skip_trial=true`，直接付款。與 60 天碼是否可疊加、試用期換方案／週期如何處理仍須定案；供應商 trial 設定本身不會替我們完成帳號資格防重。不得自動吞掉既有 60 天權益。

### 同輪追加：優惠碼納入同一確認流程的能力邊界

Product Owner 已明確批准優惠碼與支付整合為同一使用者流程，未來新兌換的 60 天 Prime 碼也綁付款方式並自動續訂；永久 Prime 碼共用確認摘要但不建立自動續費訂閱。既有免卡 grants 不追溯自動轉換。最新價格是 Pro NT$115／月、NT$1,150／年與 Prime NT$145／月、NT$1,450／年，均為含稅標價；USD 處理差異仍未被 PO 接受為最後卡帳單總額的替代承諾。最新流程以 [支付設計](M8-E-PAYMENT-DESIGN.md) 為準。

Create Checkout 有 `checkout_options.skip_trial`（移除 Variant 既定 trial），**沒有**自訂 trial end／length 欄位。`trial_ends_at` 屬已建立 Subscription 的 PATCH，PayPal 不能由該 API 直接修改；因此「先建一個月試用再一律 PATCH 成 60 天」不能作為跨付款方式的可靠契約。[Create Checkout](https://docs.lemonsqueezy.com/api/checkouts/create-checkout)、[API Changelog](https://docs.lemonsqueezy.com/api/getting-started/changelog)、[Update Subscription](https://docs.lemonsqueezy.com/api/subscriptions/update-subscription)

若 Product Owner 選擇 60 天碼也綁付款方式，建議同產品另設 Prime 月／年繳的 60-day-trial Variants；Price 讀回為 `trial_interval_unit=day`、`trial_interval_quantity=60`，一般直接訂閱仍為 month／1。API 驗碼後才建立限定單一 Variant 的短效 Checkout，優惠碼原文不傳到 provider custom data；保留到期／失敗後可釋放的本地額度 reservation，驗證 provider trial 建立後才原子核銷。這是整合建議，尚未測試；若要求任意天數券，不能無條件把這組固定 Variant 設計延伸為動態 trial API。[Price Object](https://docs.lemonsqueezy.com/api/prices/the-price-object)

供應商 Discount 的 `once` 是首筆付款折扣，`repeating` 按指定月份持續，`forever` 作用於所有付款；年繳重複兩年以 24 個月表示。它是減價能力，**不是**試用期間設定；100% off 首單不等於免費 60 天，尤其年繳可能影響整筆年度費用。[Create Discount](https://docs.lemonsqueezy.com/api/discounts/create-discount) 官方本次文件未充分釐清所有 trial + discount 組合在零額首單／第一筆實扣的消耗時點，若未來新增金額折扣券需獨立 Sandbox 驗證。現有 entitlement code 不應直接同步為 Lemon 100% coupon。

若 60 天碼保留免卡，仍可在同一「方案 → 優惠碼 → 確認」畫面呈現 NT$0、到期日、到期不扣款並執行既有 server redemption；無碼者走綁付款方式 Checkout。無論選哪個付款義務，使用者只需面對一致的確認畫面與明確的下一次金額／日期，無須看供應商 Variant 或 entitlement 名詞。

Create Checkout 支援 `checkout_data.custom`、`expires_at`、`test_mode`、`preview` 和限制可選的 `enabled_variants`；省略／空的 enabled variants 會開放同產品所有 Variants。[Create Checkout](https://docs.lemonsqueezy.com/api/checkouts/create-checkout) **工程推論／建議：**API 由已驗證 Coach identity 建立短效 checkout intent，伺服器決定 Variant、金額與 opaque intent ID；不接受瀏覽器自報 Workspace、價格或付款成功。將 Variant 限為當次選擇，並在 Webhook 以伺服器保存的 intent 和 provider IDs 核對歸屬。

`preview=true` 回傳新 Checkout 的稅、折扣、TWD／USD totals，僅建立當下可得；未填完整顧客資料時不能當最終稅額。**本次檢視官方 API 目錄、Subscription PATCH、Invoice 與 preview 文件，未找到既有訂閱換方案的 proration preview endpoint。**不能把新 Checkout preview 假装成既有訂閱補差額預覽。[Checkout Object](https://docs.lemonsqueezy.com/api/checkouts/the-checkout-object)、[Update Subscription](https://docs.lemonsqueezy.com/api/subscriptions/update-subscription)

### 換約是目前最大的產品限制

| 操作         | 官方能力／限制                                                                                                                                                                                                                                                                             | Contract 必須處理                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| 卡訂閱升降級 | PATCH Variant 立即生效；預設差額進下次帳單。`invoice_immediately=true` 立即產生按比例帳單並嘗試收款；`disable_prorations=true` 停止差額計算且優先於前者。[Managing Subscriptions](https://docs.lemonsqueezy.com/guides/developer-guide/managing-subscriptions)                             | 不能把 PATCH 成功或 Variant 改變直接當升級已付款。補差額成功與權益升級需要分離。               |
| 不補差額換約 | **方案仍立即變更**，只是下一次按新價格扣款。[Managing Subscriptions](https://docs.lemonsqueezy.com/guides/developer-guide/managing-subscriptions)                                                                                                                                          | 這不是「期末排程降級」。不能用一個旗標就宣稱原有 draft 已實現。                                |
| 月年變更     | 不同週期可能改變 billing date 或立即扣款。[Update Subscription](https://docs.lemonsqueezy.com/api/subscriptions/update-subscription)                                                                                                                                                       | 所有月年組合都需要供應商金額、錨點實證；不能只按等級高低推算。                                 |
| PayPal 變更  | API 不修改；須用回傳的 `urls.customer_portal_update_subscription` 引導客戶確認，且只能同產品換 Variant。[Update Subscription](https://docs.lemonsqueezy.com/api/subscriptions/update-subscription)、[PayPal Subscriptions](https://docs.lemonsqueezy.com/help/orders/paypal-subscriptions) | 不可設計全付款方式通用的一鍵 API 升降級。                                                      |
| 取消／恢復   | 取消後到 `ends_at` 前仍有效；期末前可恢復。過期後須重新購買。[Managing Subscriptions](https://docs.lemonsqueezy.com/guides/developer-guide/managing-subscriptions)                                                                                                                         | 清楚显示「停止續訂」與實際到期日，不把取消當立即刪資料。PayPal 仍遵循其 Portal 路徑。          |
| Pause        | 可用 `void`／`free` 暫停收款，可選恢復時間；pause 與取消不同。[Update Subscription](https://docs.lemonsqueezy.com/api/subscriptions/update-subscription)                                                                                                                                   | 不因供應商有能力就開放自助暫停；若不納入本產品首版，需檢查 Portal 可見行為及外部發生時的映射。 |

**設計提案，尚非已批准政策：**第一版對降級及複雜週期變更採「停止目前续訂 → 用到期末 → 到期重新選購」，不假設原生 schedule API，也不在續扣前一秒靠排程 PATCH 賭執行順序。若想保留自動期末換約，需另做完整收款與權益一致性方案。對即時升級，只有 Portal 能明確展示且 Test Mode 驗證費用／失敗語意的路徑才開放；自製差額估算必須標為估計，不能標為供應商正式報價。這些相對 2026-10-06 draft 的取捨均需 Product Owner 核准。

### 狀態、催款、退款與 Portal

官方 Subscription 包含 `on_trial`、`active`、`paused`、`past_due`、`unpaid`、`cancelled`、`expired`。一般卡付款失敗進 `past_due`，約兩週內四次重試；仍失敗變 `unpaid`，是否到期取決於店鋪 dunning 設定。PayPal 則每五天最多兩次重試／週期，累積欠款並在兩個失敗週期後 suspend；不能共用三天三次之類自行假定的 UI 倒數。[Subscription Object](https://docs.lemonsqueezy.com/api/subscriptions/the-subscription-object)、[Recovery and Dunning](https://docs.lemonsqueezy.com/help/online-store/recovery-dunning)、[PayPal Subscriptions](https://docs.lemonsqueezy.com/help/orders/paypal-subscriptions)

**官方文件有不同層級表述：**Subscription Object 說 `unpaid` 的產品權益由整合方決定；Recovery 頁說 unpaid 時失去供應商內容存取。Form Coach Desk 應明訂自己的 grace 與 Free 恢復政策，不能用「只有 expired 才失去權益」無限延續未付費使用。建議 past_due 保留短期既有權益，unpaid 降 Free 並提供補款入口；PayPal 的欠款期間另驗證映射。以上是待批准提案，不是目前產品規則。

Portal 可提供訂閱、付款方式、帳單地址／tax ID 與完整 billing history，也可以啟用／隱藏功能。無簽名 URL 需 email magic link；API signed URL 可直接登入，應當敏感短效入口即用即取。官方列 signed subscription links 24 小時過期。[Customer Portal](https://docs.lemonsqueezy.com/help/online-store/customer-portal)、[Managing Subscriptions](https://docs.lemonsqueezy.com/guides/developer-guide/managing-subscriptions)

退款支援全部／部分，入帳可能需十天；訂閱付款退款與訂閱取消是不同事件。必須區分 `order_refunded` 與 `subscription_payment_refunded`，依 invoice ID／退款累積金額更新帳單；不可看見任何 partial refund 就撤销整個方案，也不可在未核對訂閱狀態前假定退款會停止續訂。[Refund Order](https://docs.lemonsqueezy.com/help/orders/refund-order)、[Event Types](https://docs.lemonsqueezy.com/help/webhooks/event-types)、[Subscription Invoice Object](https://docs.lemonsqueezy.com/api/subscription-invoices/the-subscription-invoice-object)

### Webhook 與對帳不能省略

官方以原始 request body 做 HMAC-SHA256，透過 `X-Signature` 驗證；Node 範例使用 timing-safe 比較。實作須先檢查簽名長度／格式，不能以重新序列化 JSON 代替原始 bytes。[Signing Requests](https://docs.lemonsqueezy.com/help/webhooks/signing-requests)

成功回應需 HTTP 200；其他狀態最多再重送三次，官方例示 5、25、125 秒，之後不再自動重試。`meta.custom_data` 會在相關 Webhook 帶回；範例沒有可直接當全域唯一 delivery ID 的欄位。[Webhook Requests](https://docs.lemonsqueezy.com/help/webhooks/webhook-requests) 官方也列出 recovered 與 success 會一同發送，不能各加一次帳。[Event Types](https://docs.lemonsqueezy.com/help/webhooks/event-types)

以下屬本產品工程建議，非供應商送達保證：

- 驗章後先耐久寫入 inbox 才回 200；test/live、store、variant、subscription/customer 綁定全部核對；缺少預期綁定進隔離待查。
- payload hash 處理同件重送；付款 ledger 另以 provider invoice ID 唯一，避免不同事件名／更新版本重複記帳。不要只用 subscription ID 去重所有狀態。
- 原始敏感 payload 限權、限保留；必要事實使用 allowlist。Portal 簽名 URL、個人地址不能出現在一般 log。
- 沒有查得事件到達順序或 exactly-once 保證；以物件 `updated_at` 防止舊版覆蓋，遇同時刻衝突或漏送以 authenticated provider GET 對帳。`updated_at` 不是跨物件全域事件序號。
- Webhook 失聯的重試窗口很短，需持久 worker、自有 retry／dead-letter、待開通返回頁 polling 和定期對帳。Return URL、前端 success event 都不是權益權威。
- Checkout POST timeout 未知結果不能無條件建立第二張；本地 intent/鎖／重入控制與「是否已成功」查核是獨立實作責任，官方本文未確認 create-checkout idempotency key 支援。

### 小額訂閱的費用意義

官網基準仍為 5% + US$0.50，加非美國 1.5%、訂閱 0.5%、PayPal 1.5%；官方也明確邀請售價低於 US$10 的商家詢問客製費率。[Fees](https://docs.lemonsqueezy.com/help/getting-started/fees) **推論：**NT$115／145 月費的固定 US$0.50 占比值得關注；年繳少付多次固定交易費，但不得自行改已批准價格。實際含稅淨額、出款費及匯率需以帳戶費率／帳單驗證，本文件不把假定匯率當即時成本報告。

## 第一方介面參考與可採用原則

### Test Mode 與商店審核的區分（2026-10-14 補充）

[官方 Test Mode 文件](https://docs.lemonsqueezy.com/help/getting-started/test-mode) 說明新商店預設處於 Test Mode，啟用商店後才可使用 Live Mode。因此審核未通過不等於一般情況下無法建立測試商品。PO 表示商店仍在審查、推測不能測試；本輪未登入檢查其帳戶，也未取得測試商品或 API 設定。先完成本機隔離開發，商店測試可用性仍待實際核對，不能聲稱真實 Overlay、扣款或 Webhook 已驗證。

| 參考                                                                                             | 第一方可確認的行為                                                                        | 適用於 Form Coach Desk 的設計推論                                                               |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [Linear Billing and plans](https://linear.app/docs/billing-and-plans)                            | Settings 集中方案、付款資訊、帳單 email、歷史與失敗／逾期；取消後資料保留，超額禁止新增。 | 現行方案先於售價表；帳單管理使用低干擾次要入口；取消確認列實際剩餘天數與超額後果。              |
| [Notion Change your plan](https://www.notion.com/help/upgrade-or-downgrade-your-plan)            | 選方案後先列訂單摘要與下次帳單估計，再確認；降級後提示目前方案結束時間。                  | 「比較 → 確認 → 付款 → 開通」分成可回復步驟，不把比較卡本身當付款確認。                         |
| [Notion Billing](https://www.notion.com/en-gb/help/billing)                                      | Billing 頂部呈現方案、月／年金額、續訂日；週期變更提供新的帳單摘要。                      | 月年切換同時顯示年總額與平均每月，主要按鈕緊鄰金額與週期。其收費語意是參考，不等於 Lemon 支援。 |
| [Lemon Squeezy Customer Portal](https://docs.lemonsqueezy.com/help/online-store/customer-portal) | 單一 store Portal 合併訂閱、卡、收據、地址與 tax ID。                                     | 本產品不重做卡號輸入；本地顯示權益與使用量，敏感帳務導向 Portal。                               |

本輪證據是公開第一方文件與其介面說明，未登入 Linear／Notion 付費帳戶、未驗收本商店 Checkout，也未檢查實際 installed-PWA 支付往返。正式驗證應聚焦重複點擊、多頁競爭、外部取消、遲到／重複／亂序事件、補款失敗、PayPal 差異、USD／稅額、月底／閏年週期以及卡與 Portal 回復流程。
