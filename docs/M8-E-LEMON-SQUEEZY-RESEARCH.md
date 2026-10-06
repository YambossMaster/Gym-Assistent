# M8-E Lemon Squeezy 可行性研究

> 研究日期：2026-10-06。此文件只評估 M8-E 的候選收款供應商，不是凍結的 Billing Contract、採購授權或啟用結帳的決定。所有外部結論均以 Lemon Squeezy 官方文件／條款為準；台灣稅務、發票及個人身分義務仍須在付費上線前另行取得適當的專業確認。

## 結論

**適合作為 M8-E 的優先候選，尚不應宣稱已可收款。** Lemon Squeezy 是 Merchant of Record（MoR）：買方與 Lemon Squeezy 交易、Lemon Squeezy 代供應商出售產品，並處理交易稅的計算、申報與繳納；這可大幅減少跨境數位服務的交易稅作業。[Buyer Terms](https://www.lemonsqueezy.com/buyer-terms)、[Sales Tax and VAT](https://docs.lemonsqueezy.com/help/payments/sales-tax-vat)

它與既有 M8-E draft 的月／年 Pro、Prime 訂閱、供應商託管 Checkout、Webhook 驗證後才開通權益、帳單入口、付款方式更新與收據／發票歷史相容。但個人商家必須完成商店啟用審核、身分與稅務資料、實際出款方式的設定；在台灣的本地憑證／統編需求與產品負責人不公開真實身分的公開界線，沒有被 MoR 自動消除。[Activate your store](https://docs.lemonsqueezy.com/help/getting-started/activate-your-store)、[Verify your identity](https://docs.lemonsqueezy.com/help/getting-started/verify-your-identity)

## 與本產品的相容部分

| M8-E 需要                                   | 官方能力與意義                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 台灣個人可作為賣方                          | Lemon Squeezy 的銀行出款支援國清單包含 **Taiwan**；官方也說明商家可用銀行或 PayPal 收款。這證實地區在供應商列出的範圍內，但不是此帳號一定通過 KYC／商品審查的承諾。[Supported Countries](https://docs.lemonsqueezy.com/help/getting-started/supported-countries)、[Getting Paid](https://docs.lemonsqueezy.com/help/getting-started/getting-paid)                                       |
| SaaS 產品適配                               | 商店啟用文件將軟體、SaaS、數位商品列為通常會核准的類型；Gym Assistant 的付費訂閱在此範圍內，但仍由 Lemon Squeezy 個案審核。[Activate your store](https://docs.lemonsqueezy.com/help/getting-started/activate-your-store)                                                                                                                                                                |
| 月繳與年繳                                  | Subscription 產品可採 standard flat-rate pricing；訂閱 API 具有續訂時間、狀態、取消、試用與帳單相關欄位，可作為伺服器權益投影的外部事實來源。[Subscriptions](https://docs.lemonsqueezy.com/help/products/subscriptions)、[Subscription object](https://docs.lemonsqueezy.com/api/subscriptions/the-subscription-object)                                                                 |
| NT$199／259、NT$1,990／2,590 的面向台灣定價 | 支援 TWD 作為店鋪／展示／收據幣別，但 Checkout 的交易最終會以即時匯率換成 **USD** 處理；必須在實測 Checkout 時確認顧客看到的金額與匯率說明。[Currencies](https://docs.lemonsqueezy.com/help/payments/currencies)                                                                                                                                                                        |
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
5. **維持零價與付費分界。** 已核准的 NT$0 方案不可被匯入 Lemon Squeezy 後自動扣款。付費只能由新 Checkout 的清楚確認開始，並在正式 Contract 冻結後才接入。
6. **驗收帳單描述與客服文案。** 付款卡帳單的官方描述為 `LEMSQZY*STORE`，不是單獨的 Form Coach Desk；在 Checkout／條款／客服入口預先清楚告知，降低未知扣款的爭議。[Statement Descriptor](https://docs.lemonsqueezy.com/help/getting-started/statement-descriptor)

## 對 M8-E 的建議定位

把 **Lemon Squeezy 暫定為首選候選供應商**，而非已選定／已啟用的支付服務。其 MoR、託管 Checkout 與 Portal 能縮小第一版的金流 UI 範圍；Gym Assistant 仍需擁有自己的訂閱／權益帳本、Webhook 去重與客服解釋。完成前節的帳戶與 Sandbox 驗證、台灣憑證路徑確認後，才能把它寫入 M8-E 的 frozen Contract、成本模型與公開條款／隱私聲明。
