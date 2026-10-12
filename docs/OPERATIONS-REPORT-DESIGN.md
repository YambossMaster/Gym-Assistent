# Agent 營運會報格式

> 2026-10-12 產品負責人核准格式與帳號分類方向。Development 已套用分類 schema；稽核及操作工具已準備；
> Production migration、既有帳號回填與完整發布驗證仍待既定關卡。未建立管理 API、後台或排程，
> 也未改動 M8-D／M8-E 的交付門檻。

## 目的與閱讀順序

產品負責人應在一分鐘內知道：有沒有真實教練加入、是否正在使用、權益與付款是否正確、
服務與備份是否安全、開銷是否偏離預算，以及現在需要做什麼。會報依此順序呈現：

1. **一句結論**：正常／需留意／需處理，附最重要的原因；無事故時不製造警報。
2. **本週決策卡**：真實教練、使用情形、方案／優惠、付款、服務／備份、成本六項。
3. **需要處理**：最多三項，按風險與期限排序；沒有就寫「目前無需處理」。
4. **數據附註**：來源、統計期間、資料更新時間、缺漏與口徑差異。技術明細按需展開。

### 固定輸出範本

```text
Form Coach Desk｜營運會報
截止：YYYY-MM-DD HH:mm（台北）｜比較：前 7 天｜環境：Production
結論：正常／需留意／需處理 — 一句原因

用戶       真實教練總數 N（本週新 N）；測試 N；待分類 N
使用       真實教練 7 日有登入 N；7 日完成核心操作 N；首次啟用 N
方案       真實：Free N／優惠 Prime N／永久 Prime N／付費 Pro N／付費 Prime N
優惠碼     永久碼已用 N／1；60 天碼已用 N；最近到期 YYYY-MM-DD（無則略）
付款       已付款教練 N；本期成功收款 NT$N；失敗／退款 N；未上線時寫「結帳未上線」
服務       API 正常／異常；Fly p95 N ms、記憶體 N%；Production DB N／上限；最新可還原點距今 N 小時
成本       Fly 本期 US$N、月末推估 US$N–N；Supabase 本期 US$N；預算差額 US$N

需要處理
1. [事項、影響、建議動作、期限]；無則「目前無需處理」。

口徑與缺漏
- 數據期間、讀取時間與來源；哪些數字來自 Production、哪些來自供應商的組織合計。
- 未提供／無法驗證的數字寫「未取得」，不可填 0 或推定正常。
```

沒有付費結帳時，付款整行改為「結帳未上線；已付款 0；營收不適用」。沒有真實教練時，
不顯示留存率或轉換率百分比；只報人數和下一個 Beta admission 事實。首頁只顯示變化、
異常或下一步需要的資訊，詳細清單留在附註。

## 指標口徑與來源

| 指標         | 定義與排除                                                                                                                                                | 來源／節奏                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 真實教練     | Production 中已驗證 Email、擁有 Workspace，且明確分類為 `real` 的帳號；總數與本週新增加分開。測試與待分類不混入。                                         | Supabase Auth + 私有帳號分類；每週。                              |
| 測試／待分類 | `test` 含產品負責人、人工測試與自動化測試帳號；歷史無法確定者為 `unclassified`。兩者獨立列出。                                                            | 私有帳號分類；每週及每次測試後。                                  |
| 登入活躍     | 真實教練在前 7 日有 `last_sign_in_at`；僅表示登入，不代表保存過資料。                                                                                     | Supabase Auth；每週。                                             |
| 核心操作活躍 | 前 7 日 Student、Course Session 或 Training Record **現存紀錄**有更新的真實教練去重數；這是寫入代理指標，刪除或覆寫後的歷史不可回推，不能稱為完整事件數。 | 後端正式資料 `updated_at`；每週。                                 |
| 首次啟用     | 本週新真實教練中，現存 Student 至少一筆，且有已完成 Course Session 或 Training Record 的人數；先報各步人數，不在小樣本時計算轉換率。                      | 正式資料；每週。                                                  |
| 方案分布     | 以**目前有效權益**互斥分組；列出 Free、優惠 Prime、永久 Prime、付費 Pro／Prime。歷史零元選擇不等於付費。                                                  | API 權益規則 + `beta_grant`；每週。                               |
| 優惠碼       | 各類有效碼的核銷數、可用額度／截止日、核銷與生效資格是否一致、最近優惠到期日。直接核發的資格另列，不算作核銷。                                            | 私有 `beta_code`、`beta_redemption`、`beta_grant`；每週及發碼後。 |
| 付款與收入   | 僅計入付款供應商確認且對帳成功的正式環境交易；區分成功、失敗、退款與有效付費教練。測試交易和零元資格排除。M8-E 前為不適用。                               | M8-E 供應商事件／對帳；每週，月末結算。                           |
| 服務品質     | Production `/api/ready`、Fly Machine／健康檢查、前 7 日錯誤率與 p95 延遲；低樣本需標明樣本不足。單次探測成功不代表整週可用率。                            | Fly Metrics、公開健康檢查；每週，異常即時查看。                   |
| 容量         | Fly 記憶體、CPU、逾時趨勢；Production DB 大小及 Free 500 MB 比例；Supabase 組織流出及 MAU 配額。不可由少量 Alpha 流量推算最大並發。                       | Fly、Supabase Usage；每週。                                       |
| 復原能力     | 最新**成功且可還原**的 Production 備份時間、距今小時數、最近獨立還原證據；超過既定 48 小時門檻列為需處理。                                                | GitHub Actions 備份／還原紀錄；每日檢查，週報摘要。               |
| 成本         | Fly 本期實支／即將帳單、Supabase 組織方案及用量、月底推估區間與預算差額；分清已發生金額和預測。                                                           | Fly Billing／Cost Explorer、Supabase Usage／Billing；每週和月末。 |

Supabase 計費 MAU 與產品真實教練數不同：它依計費週期計算 Auth 使用，可能包含測試帳號、
開發專案及本期已刪除帳號。先看 Production 專案使用量，再切回 All projects 確認**組織合計**
配額。Fly 流量與 Supabase 流量分別列示；不相加成「總流量」。月末成本推估必須寫明以
目前天數外推，資料不足時只報已發生費用與預算保留。

## 最少需要的帳號標記

這些是**營運分類**，不是 Coach 可自行切換的角色、方案或權限。分類存於
`app_private.account_reporting_classification`，以 Auth user ID 為鍵；沒有紀錄就視為
`unclassified`。它不放在可由使用者修改的 Auth `user_metadata`，也不對 Web、一般 Coach API
或公開 Data API 開放。

| 欄位                                       | 可用值／用途                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `account_class`                            | `real`、`test`、`unclassified`。`unclassified` 只用於待核對的既有／匯入帳號，必須在會報單獨顯示，不能預設算成真實。 |
| `test_kind`                                | 僅 `test` 使用：`owner`、`manual`、`automation`。讓產品負責人帳號與一次性測試帳號可分辨，但都從真實用戶統計排除。   |
| `classified_at`、`classified_by`、`reason` | 記錄誰、何時、為何分類或改判；變更另留稽核事件。不得透過一般帳號自行改成 `real`。                                   |

分類跟**帳號**走，而不是每筆 Student 或 Course Session 各貼一次標籤。測試應在已標記的
測試 Workspace 進行；若真實帳號混入測試資料，會報標出資料污染並人工核對，不能假設
可以靠帳號標記清除。自動化建立帳號時，建立流程必須在測試開始前同步標記 `test`，
清理時核對 Auth、Workspace 與分類紀錄。新公開註冊先列 `unclassified`；營運者核對已驗證
Email 與 Workspace 後，才透過私有操作工具標為 `real`。這需要在首次會報前完成，不因
走過公開註冊流程就自動算成真實教練。分類失敗時維持 `unclassified` 並在會報列為待處理。

其他容易混淆的狀態應從**既有權威紀錄推導**，不再加手動真假標籤：

- 方案＝有效 tier；來源＝Free／優惠碼／直接永久核發／供應商確認的付費訂閱。
- 優惠碼＝`permanent` 或 `promotional`、是否撤銷、核銷數與截止日；不新增 tester 碼。
- 付款＝供應商環境（測試／正式）、交易狀態與是否已對帳；M8-E 才建立付款權威。
- 帳號生命週期＝已驗證、待刪除／已刪除，與營運分類分開。
- 所有報表列明 Production／Development 來源和擷取時間，避免混用環境。

## 異常與省略原則

需處理訊號包括：真實帳號待分類、測試交易混入正式收入、優惠碼核銷數與生效資格不符、
付款與權益不同步、備份最新可還原點超過 48 小時、健康檢查失敗、持續記憶體／錯誤率
惡化、容量接近服務限制或成本明顯偏離預算。每個訊號都附來源與建議動作；沒有證據時
寫「待查」，不臆測根因。

例行會報不列 Auth Email、學生姓名、優惠碼原文／雜湊、私有訂閱 URL、逐筆 API 日誌、
Machine ID、所有資料表筆數、單次 404 或純技術性配額。僅在處理付款失敗、資料異常等
具體個案時，按必要最小範圍另列可識別帳號。留存、流失、LTV、ARPU 等比率等有足夠
真實付費樣本並定義口徑後再加入，初期以人數、變化和明確風險為主。

## 後續落地界線

Agent 使用 [`OPERATIONS-REPORT-QUERIES.sql`](OPERATIONS-REPORT-QUERIES.sql) 的唯讀查詢，
再讀 Fly Metrics／Billing、Supabase Usage／Billing 與 GitHub Actions 備份結果，按本文件
範本整理即可，無須自建後台。每次須確認 Production project、台北截止時間和供應商更新
延遲。正式收款數在 M8-E 上線前固定寫「結帳未上線」，不得從零元方案列推測。

分類操作工具由擁有私有 DB 權限的營運環境執行：

```text
npm run ops:classify --workspace @gym-assistant/api -- list
npm run ops:classify --workspace @gym-assistant/api -- set <user-uuid> test owner <actor> <reason>
npm run ops:classify --workspace @gym-assistant/api -- set <user-uuid> test automation <actor> <reason>
npm run ops:classify --workspace @gym-assistant/api -- set <user-uuid> real - <actor> <reason>
```

`set` 在一筆交易中寫分類與稽核事件；同值重跑不增加事件。`list` 只輸出 Workspace 擁有者
的 UUID 與分類，不輸出 Email。指令會顯示目標環境；Production 執行時須提供
`DEPLOYMENT_TARGET=production`、`EXPECTED_SUPABASE_PROJECT_REF` 和對應的
`SUPABASE_URL`／`DATABASE_URL`，不接受不同專案的 DB 連線。Production 現有三個帳號
必須以 Auth ID 一一確認後回填：
產品負責人為 `test/owner`，兩個內部 Alpha 帳號為 `test/manual`；不可用建立順序或
目前方案猜測身分，也不可批次把所有未分類帳號標成真實。正式回填前須完成 migration
預覽、套用與權限讀回。在此之前，每份會報把真實／測試數標示為「依 Alpha 紀錄人工核對」。

排程與通知頻率待產品負責人另行指定；此文件本身不會啟動自動定期執行。
