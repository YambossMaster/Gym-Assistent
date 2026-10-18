# M8-E 退款作業準則（內部）

> 2026-10-14 PO 決策。只供內部客服與工程使用，不輸出到公開條款、付款須知或前端 bundle。Development/Test Mode 個案工具及 schema 已在隔離個案驗證；Production 尚未套用或啟用支付。

## 申請與決策

- 原則不退款；特殊案件透過 Email，由 PO 逐案判斷，不設定公開保證退款條件。
- 一般申請於該笔付款完成後 45 天內提出；以客服收信時間 <= 付款完成時間 + 45 × 24 小時計，保存原始 UTC，客服顯示台北時間。多筆帳單各自計時，不從註冊、試用開始或最近一筆付款重算。按時提出但審核較晚，不因此拒絕。法律與 MoR 依規則處理的例外保留。
- 記錄帳號、invoice ID、申請時間、退款金額／幣別、理由、審核者、續訂決定、權益生效時間與例外依據；不索取完整卡號。付款事實以供應商為準。
- PO 最新指示取代舊稿「部分退款一律保留當期功能」的預設：當期退款且不是重複扣款或歷史帳單，預設取消未來續訂、結束該筆付款對應的付費權益並回到 Free，資料保留。全額／部分退款均須記錄個案決策；PO 可明確批准保留或延後結束等例外。
- 重複扣款：只退重複款，保留正常付款對應的權益；若實際建立兩個訂閱，另取消重複訂閱，不能取消正確那個。
- 歷史帳單：不得誤傷後來正常付款的當期資格。獨立永久資格或其他合法權益亦不可連帶刪除；Free 指不再有其他有效授權時的結果。
- 在執行前以 Email 向該使用者說明本案退款金額、未來是否續訂與付費功能何時結束，避免退款完成才突襲收權。決策矩陣不公開，個案後果須透明。
- 全額退款以該筆原交易由 Lemon Squeezy 實際處理的 USD 金額全數退回原付款方式為核對基準；部分退款先核對供應商可執行的幣別與金額，事前向客戶說明，執行後以供應商回傳的 USD 退款額對帳。個案通知同時列明原交易與退款的 USD 金額、供應商顯示的 TWD 金額及退款後的續訂／權益安排，避免把商品標價或即時匯率誤當退款承諾。持卡人實際卡帳單的換匯匯率與發卡行自行收取的國外交易費可能使入帳金額與購買時的本幣帳單不同。對於依法可由持卡人負擔、且經核實屬於發卡行或卡組織的差額，本站不承諾自動補足；不得將尚未查明的差額一律推定為顧客負擔。法定解除／返還、重複或錯誤扣款、供應商處理錯誤及個案承諾仍須依適用規則處理，不能以此概括免責。
- Test Mode 曾出現結帳 NT$115、供應商 TWD 發票 `total=11498`，全額退款 `refunded_amount=11499`，但原交易與退款的 USD 均為 355 美分。此為供應商內部 TWD 表示與 USD 處理間的進位差異之合理推論，**不是**已證實的發卡行費用。對帳只在供應商明示全額退款、USD 金額相符且 TWD 差一個最小單位時，將有效退款額限制於原 TWD 發票額；保留原始報值與 USD 證據供稽核。其他超額、缺少 USD 證據或真正的銀行端爭議仍進異常核對，不以這個例外自動補貼或扣減客戶款項。

## 初期操作與自動同步設計

1. 收到申請，核對付款、退款及是否已有爭議；避免重複退款。收到申請先建立待審案件；核准當期退款後，依已記錄決策完成退款、停止續訂及恢復 Free，不得只退錢卻繼續收取下一期費用。重複扣款、歷史帳單或其他已批准例外依個案處理。
2. 保存該案退款與權益決定，再於 Lemon Squeezy 後台對正確帳單退款；需停止續訂時另行取消並讀回確認。不憑 Email 或前端手動把帳單標成已退款。
3. `subscription_payment_refunded`（訂閱付款）及 `order_refunded`（訂單）事件由後端驗簽、核對歸屬、讀回帳單，依唯一付款識別更新原金額、累計已退與淨額。完整／部分退款均覆蓋；重送、亂序不得重複退款或重複收回權益。
4. 帳單同步自動執行，不依賴人工發出完成 Email。漏接通知由重試與定期對帳補回，前端重新取得最新資料；不承諾即時入帳，也不以銀行尚未入帳重做退款。
5. 權益處理套用已記錄的個案決策，由授權後端 operation 執行並留稽核；不能看到任一 refunded 就一律 Free。外部／MoR 自行退款或缺少決策的事件先更新帳單，再進異常核對，不能憑退款額度猜案件原因。
6. 確認退款、取消續訂（如適用）與本地權益均符合決策，再 Email 告知已完成；若只完成一部分，據實通知並追蹤修復。

正式工程需提供可用且受權限控管的內部個案決策記錄與重跑入口，可用操作工具，不必新增公開管理台。後台退款成功、本地權益更新失敗須可重試與告警，不能要求客服直接改資料庫。

## Development/Test Mode 個案操作（已完成 R11 隔離驗證）

- `apps/api/src/billing/refund-case-operator.ts` 只接受 Development 專案連線與 Test Mode 金鑰，使用 `gym_billing_worker_login`，不開放 Coach HTTP route。資料表分開保存核准與套用紀錄；應用程式只讀取已套用且匹配當期 verified period 的撤權決定。退款 webhook 本身不撤權。
- 內部核准文件放在 Git 忽略的 `output/billing-test-mode/refund-cases/<case>.json`，含 `caseRef`、`invoiceId`、`decision`（`revoke_current` 或 `retain`）、`approvedRefundUsd`（USD 美分）、`reviewer`、`reason`、`requestedAt`、`customerNotifiedAt`；當期撤權另填 `effectiveAt`，特殊情況填 `exceptionBasis`。保留客戶通知與 PO 核准的外部稽核來源，不將信件內容或完整卡號放入此檔。
- 在 `apps/api` 以 `.env` 和 `.env.billing-worker` 啟動 `node --env-file=.env --env-file=.env.billing-worker --import tsx src/billing/refund-case-operator.ts prepare <絕對路徑 JSON>`。它會核對供應商 Test Mode invoice、既有 owner、金額及當期期間，並記錄核准；同一 invoice 的未結案個案會拒絕第二次準備。
- 依已核准個案，人工在供應商針對正確 invoice 執行退款；需結束當期權益時，另停止同一訂閱的未來續訂並讀回。退款與取消不是上述 `prepare` 指令自動發動的操作。
- 供應商回讀後，以同一環境執行 `... refund-case-operator.ts apply <caseRef>`。它要求 USD 累計已退增量**恰等於**核准額；當期撤權另外驗證當期 invoice 關聯與供應商已取消續訂，才寫入不可變的套用紀錄。重跑會回報 `already_applied`。若 provider 回值不同或期間已變，停下人工檢視，不猜測處置。
- 2026-10-18 隔離個案 `R11-ANNUAL-FULL-8746552` 已完成：PO 核准全額 USD 40.22、取消續訂及當期撤權；Test Mode 發票 `8746552` 回報 `refunded`、USD 4022 美分，簽章 inbox `done/attempts=1`，Development 套用記錄 USD 4022 美分，重跑為 `already_applied`，API 角色查得訂閱權益空、方案 Free。供應商原 TWD 130528 分、退款原始回值 130529 分，本站對帳按已記錄的一分進位規則保存有效退款 130528 分。此前已有部分退款實證。此驗證只限 Development/Test Mode；Production 尚無此 schema／工具，也沒有支付開關。
- 2026-10-18 PO 核准此類「全額退款、已取消續訂、當期撤權已套用」帳戶立即重新購買。回購無第二次試用、今日依新方案收費；舊發票留在歷史，舊期間不再給權或擋結帳。Development API 角色已證明該個案能再購、普通取消仍被擋；新訂閱及新舊期間並存的真付款驗證仍列 R14。

[官方事件](https://docs.lemonsqueezy.com/help/webhooks/event-types) · [退款](https://docs.lemonsqueezy.com/help/orders/refund-order) · [幣別與 USD 處理](https://docs.lemonsqueezy.com/help/payments/currencies) · [發票金額欄位](https://docs.lemonsqueezy.com/api/subscription-invoices/the-subscription-invoice-object)
