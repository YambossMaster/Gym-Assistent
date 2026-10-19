# M8-E 結帳中斷與重入修正：交接 Status

> 更新：2026-10-19（Asia/Taipei）。本文件屬工作分支 `codex/m8e-abandoned-checkout`，原始基底 `45b8d70`；**起初工作樹有未提交修改與未追蹤檔案**。請在 `C:\Users\User\.codex\worktrees\m8e-payment-integration\Gym Assistent` 繼續，勿把主工作樹的其他修改混入。本文描述的是本地候選修正，**不是已合併、已部署或正式站驗收結果**。整合前須再與當時 Main 比對。
>
> 已發布 M8-E 的原登錄見 [M8-E Status](M8-E.md)，R09 的自然續扣事件仍待發生後補證據；此工作分支是另外發現的結帳路徑缺陷修正。完整節點、權威判定、出口、管理流程及例外矩陣見 [支付流程與狀態路徑圖](../../M8-E-PAYMENT-FLOW-STATE-MAP.md)。

## 1. 事件、預期及產品決定

正式站 Free 測試帳號進入 Lemon 付款介面、未確認付款即離開，稍後從方案頁再選方案，卻直接進入舊 Prime 年繳的「正在確認你的訂閱」。當時唯讀資料看到 Live 未結案意圖為 `open`，未看到對應訂閱帳本或事件；這足以證明本站路由錯誤，**不能證明供應商舊 cart 已失效**。

Product Owner 明確決定：

- 關閉 Lemon overlay 而未提交：留在本站這筆結帳頁，可重開同筆付款介面；不可進訂閱結果頁。
- 明確按「返回方案」：中斷本站這筆意圖、移除本站可取得的舊 URL，返回方案；再次選擇立即走新報價及**新**結帳意圖與連結，不要求等 15 分鐘。
- 若有已可見付款、事件、帳本，或供應商查詢失敗：先阻擋新單並核對，不把已付或不明結果假裝成取消。
- Product Owner 授權 `gym_assistant_api` 透過 RLS 僅讀取目前已驗證帳號意圖綁定的 webhook inbox，限放棄／到期核對；另明確同意關閉正式 Lemon 商店的棄購提醒郵件，以降低舊 cart URL 再寄回的途徑。
- 結帳頁同一警告只保留付款按鈕旁一處；完整支付流程需有持久文件供後續開發逐格核對。原 15 分鐘 URL 效期 + 5 分鐘核對僅供**未按返回**的背景恢復，不是返回後的等待規則。

## 2. 固定工作清單與當前進度

原定 5 項，因供應商棄購郵件路徑與 PO 提出的去重／流程文件，各新增 1 項高優先工作，總數 **7 項；6 項有本地候選或已完成證據，1 項完整驗證／交付未完成**。下列「完成」只限其描述的環境及檢查。

| #   | 工作／驗收準則                                                   | 狀態與證據                                                                                                                                  |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 重現與界定：不得把 `open` 當成已提交付款                         | 完成。正式站症狀與唯讀意圖狀態已記錄；方案頁回歸測試先紅後綠。                                                                              |
| 2   | Web 每個路徑：關窗留頁、返回放棄、重選建新單、成功訊號才去結果頁 | 本地、合成瀏覽器及真 Test Mode 關窗／重入／返回已驗。真成功訊號早於 webhook 的時序未刻意製造。                                              |
| 3   | API、provider、資料庫權威與唯一約束                              | 隔離 SQL/RLS 12/12、Development migration 與權限／併發 smoke、真 Test Mode provider／webhook／帳本／權益已驗。Production migration 未套用。 |
| 4   | 防止商店自動寄回舊 cart URL                                      | Lemon Live 商店棄購提醒已關閉並讀回；另存舊 URL 仍屬個案風險。                                                                              |
| 5   | 最小聚焦檢查及本地預覽                                           | 聚焦測試、root check／build、獨立埠 browser gate 7/7 均通過。                                                                               |
| 6   | UI 文案去重，持久記錄全流程                                      | 本地候選完成；已加入回歸測試與支付流程圖。                                                                                                  |
| 7   | 完整驗證、晚到交易、整合與交付                                   | 真 Test Mode 試用、TWD 0 發票、簽章事件、權益及取消續訂已對帳；本地已提交。遠端 CI、Production migration、部署與正式站回讀仍待完成。        |

## 3. 目前候選實作位置

- **Web：** `apps/web/src/pages/settings/PlansPage.tsx` 在報價前重新讀本人意圖與訂閱，`open` 回原本站結帳、已提交去結果、未明阻擋；`billing/CheckoutPage.tsx` 只在 Lemon `Checkout.Success` 後進結果，關窗留頁，付款旁單點提示；`billing/LocalCheckoutPage.tsx` 處理返回時關窗、中止延遲回呼、呼叫放棄 API、清舊 URL／報價快取、回方案；`billing/lemon-overlay.ts` 支援關窗及取消開窗、session 標記；`billing/PaymentStatusPage.tsx` 僅處理已提交或待核對結果。相關樣式、gateway、types、review fixture 與測試均在同一 `billing/` 樹。
- **API：** `apps/api/src/billing/checkout.ts` 的本人意圖狀態／放棄決策、`lemon-checkout.ts` 的供應商訂閱查詢、`postgres-checkout.ts` 的同 owner 帳本／inbox 檢查、`routes.ts` 的 `POST /v1/billing/checkouts/:id/abandon`。相關 adapter/smoke/test 檔亦有修改。查到付款證據或 provider 查詢失敗時 fail closed；成功放棄才把本站意圖標成 `abandoned` 並清 URL。
- **資料庫：** `supabase/migrations/20261019111117_billing_abandoned_checkout.sql`（**未追蹤、未套用候選**）增加狀態／唯一索引覆蓋 `abandon_requested`，並對 API role 授予限定 inbox 欄位 SELECT 與 owner 意圖綁定 RLS。切勿把靜態 SQL 檢視當成權限測試。
- **文件：** `docs/M8-E-PAYMENT-FLOW-STATE-MAP.md`（未追蹤）是 B00–B12、M01–M08、狀態與發布矩陣；`docs/M8-E-IMPLEMENTATION-CONTRACT.md`、`docs/M8-E-PAYMENT-DESIGN.md` 加入指向它的連結。若文件和程式不一致，下一位 Agent 應以當前程式／測試核實並修訂，不假設候選流程已驗證。
- **預覽：** 本地 `http://127.0.0.1:5173/__review/payments/checkout` 可供 PO 檢視文案與佈局；review gateway 是合成模擬，不會建立真 Lemon 交易。交接時重新確認 5173 是否仍由此工作樹供應，不能只憑 Port 號推論。

## 4. 已觀察的外部狀態及核對限制

- **Lemon：** Live 商店棄購提醒設定 Off 已存檔並重新載入；這只封住供應商自動提醒郵件這一條路。Lemon overlay 關閉並無已確認的即時 cart 撤銷能力。使用者另存 URL、瀏覽器仍開著舊付款頁，或關閉前已提交付款，都可能在本站清 URL 後完成。官方棄購郵件文件：https://docs.lemonsqueezy.com/help/online-store/abandoned-cart-emails。
- **Supabase Development：** 專案 ref `yvhijxhtelujfsaplzpi`；唯讀 SQL 見 inbox RLS 已啟用、`gym_assistant_api` 對 inbox 的 SELECT 當時為 false，API 對 checkout intent 與 subscription ledger 可讀；現行唯一索引僅含 `creating/open/pending`，新 migration 未套。Production ref `febunjhpruqlywjfvuaq`；此分支未對 Production DB 做變更。
- **Migration 阻礙：** 本地 Supabase CLI 2.120.0 的 Development `db push --dry-run --project-ref yvhijxhtelujfsaplzpi --skip-vault` 回 `DbPushMissingLocalError`。Development 遠端有此工作樹及主 checkout 都找不到的 10 個 migration 版本：`20261014100438`、`20261015045150`、`20261015045333`、`20261015063738`、`20261015093501`、`20261016163000`、`20261017074143`、`20261017082340`、`20261017085708`、`20261017164829`。**不要用 `supabase migration repair` 改寫歷史來讓 dry-run 表面通過**；先找對應來源／隔離資料庫或其他可審計的安全驗證途徑。
- **未做的事：** 沒有真 Lemon Test Mode 提交、沒有新真實付款、沒有 DB migration/RLS 寫入驗證、沒有完整瀏覽器矩陣、沒有遠端 CI、沒有本分支提交／推送／合併／部署。Main 正式站仍可能出現原症狀。

## 5. 高優先風險及完成判準

1. **P0：一般路徑已提交付款、本站結果晚到。** Lemon `Checkout.Success`、已到 inbox／ledger 或供應商已查到訂閱時，該本人意圖保持待核對，禁止同一帳號重複付款；查詢失敗也只擋這筆未明意圖。關窗但未提交且查無證據，按已定產品決策立即返回方案並可新建，不要求所有人等 URL 15 分鐘。刻意另存舊 URL／兩分頁同時付款是不同且少見的個案；驗證事件歸屬與異常對帳／補救，不用它推翻普通流程。
2. **P0：DB/RLS 候選未實跑。** 在隔離環境驗 migration 套用、未結案唯一索引、本人與跨帳號 inbox SELECT、不同 environment／intent、放棄交易的 ledger/inbox 競態；需看到正負證據。若 DB 權限或狀態不合，API 放棄一律 fail closed，不發布候選。
3. **P1：真 Lemon 中斷與重入路徑。** 真 Test Mode 覆蓋開 overlay→關窗留本站→同筆重開；返回方案→新 quote／intent／URL；成功回呼／外部回跳早於 webhook→僅核對；刷新、雙分頁與失敗恢復。比較方案、價格、試用、權益及 390px/桌機，確保不影響已發布路徑。
4. **P1：整合和發佈。** PO 檢視版本後才能進完整驗證 gate。合併前與當前 Main 比對，只帶本工作分支需要的變更；需精確提交、CI、migration、同 SHA 部署／readiness 證據。R09 是自然事件，另按原 Status 追補，不應為本缺陷製造付款。

## 6. 下一位 Agent 的單一路線

**現在的下一步：在此工作樹先核對本 Status、狀態路徑圖與目前 diff／tests，然後設計並執行「不改寫遠端 migration 歷史」的隔離 DB/RLS 驗證。** 此步能決定放棄 API 是否有真實資料庫權威；失敗即修復並重測，不跳到正式站。

其後依序：① 核對 5173 來源並提供 PO 檢視去重畫面與返回／重選；② 取得 PO 對此版本可進完整驗證的明示後跑真 Lemon Test Mode 和晚到／雙付款風險矩陣，必要時修正；③ 聚焦回歸、完整 gate、比對 Main、提出精確遠端動作及已知缺口；④ **只有取得該推送／合併／部署動作授權後**交付，確認同 SHA CI 與 Production。這次使用者只要求交接文件，未授權新的 Production 變更或遠端交付；目前也不需要 PO 進行真付款。

如受阻，記錄哪個判準未過、保持受影響入口關閉，更新本 Status 的確切 resume 點。整合 owner 才修改 `docs/PROJECT_STATUS.md` 與月誌；不要把此分支候選狀態直接寫成 Main 事實。

## 2026-10-19 接續核對（本地隔離驗證；未交付）

- 仍在 `codex/m8e-abandoned-checkout`、HEAD `45b8d70` 的未提交工作樹；主 checkout 未併入。原 7 項清單不增加：#3 的隔離 SQL/RLS 子驗證取得證據，#7 完整驗證與交付仍未完成。
- 在 Git 忽略的 `output/checkout-db-tooling` 使用 PGlite 0.5.10，先執行 `20261017181022_billing_live_test_foundation.sql`，再實際執行候選 `20261019111117_billing_abandoned_checkout.sql`。11 項正負斷言通過：本人且同環境 inbox 可讀、跨 owner／無 Workspace 不可讀、API 不可讀 digest／寫 inbox、瀏覽器角色不可讀、`abandon_requested` 仍占唯一名額、owner 事件阻止放棄、沒有事件時可改 `abandoned` 並清 URL、跨 owner quote FK 被拒。這是隔離 PostgreSQL SQL/RLS 事實，不是 Development/Production Supabase migration 套用或併發晚到證據。沒有修補遠端 migration 歷史。
- 原候選程式的 API 3 檔 27/27、Web 3 檔 22/22 聚焦測試重跑通過。候選程式未因本輪驗證改動。正確 worktree 的 Vite 預覽目前在 `http://127.0.0.1:5180/__review/payments/checkout`，頁面及修正後模組 HTTP 200；5173 不能視為本分支來源。PO 已回覆「檢視後同意進入完整驗證」，准入 UI／Lemon Test Mode gate；此同意不含 Production migration、Live 付款、遠端推送或合併。
- **風險定位已更正：** Lemon checkout URL 在原設定到期前可能仍有效，且按登入 email 的陰性查詢若付款 email 改變會漏查；這是少見的舊頁再付款或跨分頁個案風險，不是讓所有人等 15 分鐘的理由。正常路徑的重點是已提交付款但本站事件晚到時只阻擋該本人意圖、回查後核對。隔離 SQL 僅證資料結構容許兩筆 ledger，不證一般使用者會重複付款。PO 的「返回後立即新報價／新意圖」決定維持有效。
- Development ref `yvhijxhtelujfsaplzpi` 的 migration 清單唯讀重查，十個 Development-only billing 版本確實存在；本工作樹只有第一份來源，另九份可在主 checkout `supabase/development-only/` 找到。Development 尚未套用新候選。不可用 `migration repair` 造出表面一致。若需直接在 Development 驗證，先設計可審計、不誤套 R15 正式基礎 migration 的方案。
- **下一步：** 依已定立即重選流程，完成真 Test Mode 關窗／重開、返回／新報價，以及成功回呼早於 webhook 的本人意圖核對；針對少見舊頁／改 email／雙分頁案例驗證異常偵測與個案補救，不新增普遍等待。其後完成 Development migration、完整 gate、Main 比對與獨立遠端授權。R09 自然續扣仍屬原 M8-E 追補。

### 同日後續：瀏覽器與 migration 路線

- 隔離 PGlite 斷言增至 **12/12**：在 `abandoned` 舊意圖後建立新意圖，資料庫允許同一 owner／environment 的舊、新兩筆 subscription ledger 並存。這是雙付款風險的正向重現，並非「會發生真交易」的機率證據；未測多連線交易排程。
- Supabase CLI 2.120.0 用忽略的 `output/checkout-migration-preview` 暫存目錄，補齊 10 份 Development-only 既有 SQL，對 Development ref 執行 `db push --dry-run --skip-vault` 回 `dryRun:true`，待推清單是 `20261017181022_billing_live_test_foundation.sql` 與 `20261019111117_billing_abandoned_checkout.sql`。第一份正式基礎會與 Development 已分段建立的付款表衝突，故不能直接 push；本輪未 push、未 repair、未改遠端 schema。
- PO 已檢視並同意進入完整驗證。Playwright 真瀏覽器對 **合成 review gateway** 在本工作樹 5180 驗證：勾同意才可開始；開模擬 overlay→關閉仍留同筆本站結帳與重開入口；重開後關閉→返回方案→選 Prime 顯示新方案／報價並要求重新勾同意；桌機與 390×844 均無水平溢出。合成 gateway 不連 Lemon，不證 provider URL、Test Mode 交易或跨分頁競態。瀏覽器 screenshot 位於本工作樹 Git 忽略的 `.playwright-cli/`。
- 目前本工作樹沒有 API 的本地環境檔或本回合繼承的付款／DB 環境變數；3000 埠的既有 API process 不屬本工作樹。真 Test Mode 必須先配置隔離 API、Development DB 以及可達 webhook，依既定立即重選流程驗證。不得把其他 worktree 的 3000 API 與本分支 5180 Web 混成整合證據。

### 2026-10-19 PO 校正：比例與既定決策

PO 指出本輪把普通的付款結果晚到與刻意保存舊 URL／雙頁付款混為一談，並錯誤提出全面等待 15 分鐘。**撤回此提議**；原定返回方案後立即重新選擇、建立新報價與新結帳不變。正常提交付款的可觀察訊號要進待核對並只限制該本人意圖；沒有提交且核對陰性可立即重選。少見的刻意雙頁付款列為個案異常與補救驗證，不作所有人的等待門檻。

### 2026-10-19 雙分頁修正、Development 與 Test Mode 驗證（尚未交付）

- PO 的既定比例決策不變：關閉 Lemon 視窗留在同筆本站結帳；按「返回方案」且未提交、本人付款證據陰性時立即放棄本站意圖，重選立即建立新報價、意圖與 Lemon checkout。沒有對所有帳號加 15 分鐘等待。少見雙分頁案例是在原 7 項清單的 #2/#3/#7 內補強，不新增產品範圍。
- 雙分頁修正：`lemon-overlay.ts` 對同一帳號/intent 使用瀏覽器 Web Locks，第一分頁開付款視窗時第二分頁顯示回原分頁提示；`BroadcastChannel` 傳遞 Lemon `Checkout.Success` 訊號。經本人驗證的 `POST /v1/billing/checkouts/:id/submitted` 只把該意圖轉 `pending` 並清本站 URL，不授權訂閱；另一分頁轉結果查詢。`pending` 到期仍經原 15+5 分鐘背景核對與供應商陰性查詢才釋放；普通按返回不受該計時限制。Web Lock 是同源同瀏覽器防重開，不能撤銷手動保存於外部的 Lemon URL 或保證跨裝置互斥。
- 真瀏覽器揭露 Web HTTP gateway 對無 body 的 `abandon` POST 仍帶 JSON 標頭，Fastify 在進入路由前回 500。已改成送 `{}`，同時涵蓋 `submitted`，新增 gateway 回歸測試。真 Test Mode 同帳號重測 `abandon` HTTP 200 並立即回 `/plans`。
- Development migration：以 Git 忽略的暫存 workdir 收齊十份既有 Development-only migration，排除會與既有分段表衝突的 R15 正式 foundation；套用前 dry-run **只列** `20261019111117_billing_abandoned_checkout.sql`。已只對 Development `yvhijxhtelujfsaplzpi` 套用此 migration；之後同一 workdir 的 dry-run 為 `upToDate:true`。未修補 migration 歷史、未變更 Production。
- Development 真 PostgreSQL/已驗證 User JWT：隔離兩帳號 smoke 見同意圖並發 8 請求只建一筆、外帳號不得存取、重新建立 Module 可恢復；本人 inbox 事件可見、外帳號與未設 Workspace 不可見、API 角色不能讀 `digest`；本人事件已到時放棄回 409；`submitted` 本人轉 `pending`，外帳號 404，後續放棄仍 `pending`。所有 smoke 自建 Auth/Workspace/inbox 測試資料已清理。Development 的舊分段 inbox 僅允許 `test` environment；`live`/`test` 交叉權限另有隔離 PGlite 12/12 證據，不能把它說成 Development Live 實測。
- 真 Lemon Test Mode：本分支 API 3008/Web 5181 使用同一 Development ref，建立單一隔離測試帳號；瀏覽器見 Pro 月繳 `NT$0 today`、Lemon 真 iframe 與「开始试用」按鈕。點 Lemon 自身關閉控件後 iframe 消失，本站留原結帳且可重開。修復 HTTP body 後按返回立即到方案，再選 Prime 月繳，DB 唯讀確認舊 Pro `abandoned` 且 URL 清空，新 Prime 為不同 intent/不同 Lemon checkout ID、狀態 `open`。沒有按「开始试用」，無真訂閱、invoice/webhook/權益證據。此帳號及忽略憑證已精確刪除，刪除前確認訂閱帳本為零。
- 兩個已登入真 Chromium 分頁：第一頁持有同筆 Lemon 視窗時，第二頁得到 `checkout_open_elsewhere` 提示；**合成** `Checkout.Success` 訊號後兩頁都去結果頁，Development DB 該筆 `pending` 且 URL 清空、無授權訂閱。合成訊號不等於真 Lemon 支付或 webhook。測試帳號已清理。
- 完整本地 gate：第一次 root check 在同時運行 Test Mode API/Vite 時，API 財務報表 3 項各 20 秒超時；停服務後該檔 4/4 通過，第二次 `npm run check` 全綠（腳本 38/38、API 382/382、Web 428/428）。`npm run build` 通過。正式 Playwright `npm run test:browser` 原定 5178 被其他服務占用；未停止該服務，改用 Git 忽略等價設定跑 5182，7/7 通過（含 1440px/390px）。`git diff --check` 無 whitespace 錯。遠端 Main 唯讀確認 `c5aa717`，本分支基底 `45b8d70` 之後 Main 只改 `AGENTS.md`，沒有付款程式/migration 交集；本工作樹的 `AGENTS.md` 改動應在整合時單獨處理，勿混入付款提交。
- **未完成 #7：** 真 Test Mode 最終「开始试用」與其後 webhook、訂閱/發票帳本、權益、事件晚到回跳尚未驗；Production migration、遠端 commit/push、CI、部署都未做。需新建隔離帳號並以本分支 API/Web 重開真 Test Mode 付款頁，填好可控測試資料，將最後提交交由 PO，立即回讀 provider/inbox/ledger/entitlement；另做個案舊外部 URL 晚到對帳，不增加普遍等待。Windows computer-use 在本輪準備可操作 Chrome 視窗時因無法高信心判定目前 URL 而停止該 UI 工具，本輪沒有對 Chrome 執行付款操作；下一輪可用受支持的可見瀏覽器方式重試，不得繞過 URL/交易確認限制。取得真支付與完整結果後，再整理精確提交與測試證據，提出單獨遠端推送/合併/Production 授權。此工作樹仍未提交、未推送、未合併、未部署。

### 2026-10-19 @Chrome 真付款準備與瀏覽器阻礙（未提交）

- 依 PO 指定改用 @Chrome，**沒有再使用 Windows Computer Use**。此分支 API `127.0.0.1:3008` 與 Web `127.0.0.1:5181` 重啟，建立隔離 Development/Test Mode Coach `fixture-account-recovery-real-1019.json`（Git 忽略），以其本人帳號在 @Chrome 由方案頁選 Pro 月繳。本網站顯示今天 NT$0、體驗 1 個月、預計 2026-11-19 首扣 NT$115；同意後建立 Test Mode intent `6079a73a-2a0f-4b68-b981-e85390be8285`。Lemon 獨立分頁確認測試模式與同一 Pro 月繳、NT$0 小計、試用 1 個月；**未按「开始试用」**。
- 同源 Lemon overlay 在這次 @Chrome 會話的 iframe 一直空白；將同一筆 provider checkout 在 @Chrome 獨立分頁開啟後，Lemon 主畫面正常，但 Stripe 卡片元件只有約 2px 高，沒有可輸入卡號的欄位，「开始试用」維持 disabled。重載與切換 Taiwan 帳單國家後仍如此。再填測試姓名時 @Chrome 控制逾時並失去連線；其後瀏覽器 inventory 只剩 in-app browser 與 MCP Apps，沒有 Chrome。不能把此事當成產品或 Lemon 一般使用者的故障定論，需在恢復 @Chrome 後以可見畫面查明。
- 為實測簽章事件，從 winget 官方 `Cloudflare.cloudflared` 安裝 2026.10.1（installer hash 驗證成功）；開 Quick Tunnel `https://serve-digit-topic-housewares.trycloudflare.com`，只轉本地 webhook-only proxy `3009` 到 API `3008`。本地／公網 GET 非 webhook 回 404，錯誤簽章 POST 回 401。既有 Test Mode hook 142825 在此輪開始時指向不可解析的 `discrete-long-chef-styles.trycloudflare.com`，並非 `.env.billing-runtime` 中更舊的 URL；先記錄真實原值，暫指新 tunnel 後讀回 testMode=true／事件 11 類。因無法提交交易，已**恢復到本輪開始的原 URL**並停 Quick Tunnel；沒有 Production／Live hook 變更。
- 已用隔離帳號本人 JWT 讀回 current intent 為 `open`；worker 限定 DB 唯讀查該 intent 的 subscription ledger 0、webhook inbox 0。故實際交易與 webhook／發票／權益／晚到事件驗證仍未完成；不要宣稱付款成功。隔離帳號和忽略憑證暫保留，以便 @Chrome 恢復後重試；checkout URL 有時效，應由本站重新發起，勿使用逾期舊 URL。
- **下一個唯一動作：** 恢復 @Chrome 連線後，在本地分支 Web 重新開此隔離帳號的 Test Mode 結帳，確認 Stripe 測試卡欄位真正可操作；同時重建並驗證 webhook-only tunnel，臨時改 Test Mode hook。填好測試欄位後，依 browser hand-off 規則把最終「开始试用」交 PO 親自按；立即讀回 provider、真簽章 inbox、invoice/period/ledger/entitlement，驗晚到／雙分頁。若 Stripe 仍空白，最小化診斷後記錄明確阻礙，不改用 Windows Computer Use。其後比對 Main、整理本分支 commit 與完整 gate；遠端 push/merge、Production migration/部署仍需另外授權。原 7 項清單不增，#7 未完成。

### 2026-10-19 @Chrome 恢復後重試與收尾

- @Chrome 稍後自行恢復；先前要求 PO 手動重連屬過早求助，已直接接續，無需 PO 處理連線。原 Lemon 頁的 `StripeElement` 和 Link 輸入元件均只有約 2px 高；@Chrome console 有 Lemon 自家 `useCheckoutState`/`app` bundle 的 `TypeError: Cannot read properties of undefined (reading 'props')`，同時也有 AdBlock 擴充的連線訊息。兩者的因果尚未證明，不應把 AdBlock 當成已確認根因。
- 在 @Chrome 從本站按「返回方案」，供應商陰性查詢後立即回 `/plans`；同帳號馬上重新選 Pro，產生第二筆新 checkout。其 Lemon 獨立頁再次沒有卡片欄位，`开始试用` disabled，且同一 Lemon runtime TypeError 再現。第二次也按本站「返回方案」立即回 `/plans`。Development 權威 DB 讀回兩筆意圖 `6079a73a-2a0f-4b68-b981-e85390be8285` 與 `41ede94a-e833-4c18-80ac-9a59851d70a7` 均為 `abandoned`，該 workspace 的 subscription ledger 為 0；第一筆 webhook inbox 0。沒有使用 15 分鐘全面等待，也沒有真付款。可見截圖在主 checkout 的 Git 忽略 `output/checkout-db-tooling/chrome-lemon-card-missing.png`。
- 已恢復 Test Mode hook 到本輪開始的原值、停止臨時 Quick Tunnel，並停止本輪 API `3008`/Web `5181`；隔離 Development 帳號與忽略憑證仍保留。**現在唯一阻礙**是 Lemon 在此 @Chrome 會話的真卡片元件無法載入。後續先用此隔離帳號和 @Chrome 做一項最小診斷：檢查另一個乾淨 Chrome 情境或供應商頁是否仍有相同 runtime 錯誤；若可載入，再重建只公開 webhook 的 tunnel、確認 Test Mode hook 和錯誤簽章 401，建立新意圖並完成最終手動試用及 provider/inbox/ledger/權益對帳。若錯誤仍再現，記錄 provider 阻礙與可重現證據，不在 webhook 未準備時提交。原 #7 與遠端交付仍未完成，遠端/Production 授權規則不變。

### 2026-10-19 真 Test Mode 試用、取消續訂與整合前核對（最新）

- 原 7 項工作清單不變；#1–#6 已有本地／Development 證據，#7 在真 Test Mode 關鍵交易證據取得後仍因遠端與 Production 交付未完成而保持 partial。PO 已明確授權所有 Test Mode 驗證；最後的「开始试用」依瀏覽器交接規則由 PO 親自按下。
- 此分支獨立 API 3008、Web 5181 使用 Development/Test Mode。隔離 fixture user ID 為 c916ef9c-f55b-4c03-8095-d2ce82223d51；Pro 月繳意圖 390f5adf-9bb8-4fb4-a89b-8d734e088eb2。本站與 Lemon 都顯示今天 NT$0、1 個月免費試用、之後每月 NT$115；使用測試卡，沒有真實扣款。
- 同一 Lemon 結帳的 Stripe 卡片 iframe 在 Chrome／乾淨 in-app browser 分別約 344px／330px，測試卡欄位可填；先前約 2px 的塌縮未穩定重現。一般 Chrome 的 Lemon 頁實際帶入另一個既有買家 email，乾淨情境呈現隔離帳號 email。本次在乾淨情境完成；官方文件表明 checkout email 是預填值，訂閱 API 可按 buyer email 查詢，但 Order／Subscription 物件沒有直接查 checkout 自訂 intent 的屬性。改 email 舊頁交易仍屬個案風險，不能把登入 email 陰性查詢說成絕對證據；維持 PO 決定，不加普遍等待。
- 臨時 tunnel 只連到 3009 webhook-only proxy；本地／公網非 webhook GET 404、錯誤簽章 POST 401。Test Mode hook 142825 曾暫指 regard-fruits-metallica-numerous.trycloudflare.com，讀回 testMode=true、11 類事件；對帳後已還原原值 discrete-long-chef-styles.trycloudflare.com/hooks/lemonsqueezy，並停止此輪 tunnel 與 proxy。Live hook 未動。
- PO 提交後 Lemon 顯示訂單完成。Provider 訂閱 2620364 起初 on_trial，發票 8766073 為 paid／TWD 0，原試用到期 2026-11-19T15:16:18Z。Development 對同一意圖讀到 confirmed、1 筆訂閱帳本、1 筆發票帳本、1 段 basic/month 試用 verified period；6 筆相關 signed inbox 均 done 且 error_code 為 null。本人 Settings 顯示 Pro 免費體驗、2026/11/19 首扣和 NT$0 已付款帳單。
- 已在本人 Settings 取消此隔離 Test Mode 訂閱續訂；本站顯示已取消續訂、到期回 Free。Provider 讀回 cancelled=true、status=cancelled，trial_ends_at 與 ends_at 均保留 2026-11-19T15:16:18Z。沒有為本修正製造 R09 自然續扣。
- 本地 check 全綠（腳本 38/38、API 382/382、Web 428/428）、build 通過、獨立埠 browser gate 7/7、diff --check 通過，均是程式變更後、真試用前既有 gate；真試用後未改程式。遠端 Main 531f223 對比本分支基底 45b8d70 只改 AGENTS.md（PR #63–#65），付款程式／migration 無交集。本分支自身 AGENTS.md 改動必須排除付款提交。
- 未以新付款刻意製造 Checkout.Success 早於 webhook、改買家 email 的舊 URL 二次交易。既有合成雙頁／提交訊號及本輪真 webhook-first 路徑各自有證據，不能互稱完整涵蓋。Production 未套候選 migration，正式站仍可能有原返回／重選缺陷。
- **現在的下一步：** 本地付款候選程式、migration、流程文件與本 Status 已提交，AGENTS.md 排除；確認精確 HEAD、diff、ignore 及本地 gate。向 PO 呈交具體遠端動作與缺口，取得分開的 push/merge/Production migration/部署授權後才執行同 SHA CI、migration 及 Production readiness。未授權時停在本地可審查提交，不修改 Main router。原 M8-E R09 仍待自然續扣事件。
