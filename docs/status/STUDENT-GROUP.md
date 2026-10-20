# M11 Student Group workstream

> 2026-10-21，Sol 位於獨立工作樹 `output/m11-student-group`、分支 `codex/student-group-sol`；已對齊 `origin/main` `6c3703c`。Product Owner 授權後推送的 PR #72 草稿提交為 `7c4ee1f`，工作樹原主 checkout 與 Contract 工作樹未更動。

## Gate 與清單

| Gate     | 狀態                                                                                                                                               |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract | Product Owner 於 2026-10-20 核准 [M11 正式 Contract](../STUDENT-GROUP-CONTRACT.md)；已編入 [Roadmap](../ROADMAP.md)，可進 Sol。                    |
| Sol      | 前 7 項已有分支實作；Product Owner 於 2026-10-21 同意進入完整驗證。Development 真 DB API 與真 Supabase Auth 登入後主流程通過；剩餘矩陣情境見下方。 |
| CI／發布 | PR #72 為草稿；`7c4ee1f` 的 verify、browser-ui、Development migration-dry-run 均通過。Production migration、預覽、部署及合併未執行。               |

八個已知交付面向：群組管理、群組購課、排課、出席與完課、多人訓練、公開能力、封存／匯出相容、完整驗證。前 7 項已有分支實作，第 8 項已取得 Development 與第一筆遠端 CI 證據；未完成的隔離還原、裝置／並行情境及 Production 證據不得視為整體完成。總數仍為 8，未新增工作包。

正式驗證進度（2026-10-21）：Product Owner 明確放行。Development 專案 `yvhijxhtelujfsaplzpi` 在隔離 migration 清單的 dry-run 分別只列出 M11 基礎與第一筆後續修正，前兩筆已套用；第三筆見下段，Production 未變。套用前 1,190 筆舊訓練組數、16 筆 Student、163 筆 Session，舊組數權益主體皆可唯一追溯；套用後仍為 1,190 筆、0 筆空歸屬／錯歸屬、0 筆群組（既有資料仍是個人）。新表 RLS 已開、兩條政策存在，`anon`／`authenticated` 對兩表沒有 SELECT。回滾式 `supabase/tests/student-group-contract.sql` 在 Development 通過：三人上限、群組不得作自然人成員／出席者／組數 owner、跨 Workspace、種類不可改、舊 API 個人組數自動指派、正式歷史硬刪阻擋、空白成員刪除、Auth→Workspace 完整刪除及他 Workspace 保留；測後 0 筆測試學生／Auth 殘留，舊組數仍 1,190 筆。測試首次揭露既有 `training_exercise`→`exercise_definition` FK 妨礙整帳刪除，已用後續 migration 改為可延遲檢查並重測通過。這是原第 7／8 項高優先級資料保存邊界，不增加總數。

本輪 API／Web typecheck 與 production build、Calendar／HTTP 24 項、Scheduling／Training 10 項、Web 狀態／草稿 23 項聚焦測試通過；Calendar 完課已與 Training 完課共用群組 owner 鎖順序並清理缺席組數、確認待出席，外部日曆於允許顯示姓名時帶群組名單摘要。舊 HTTP 刪除測試依凍結 Contract 改為驗證有購課者回傳 409。`check:affected` 規劃選到 API／Web 全套；格式與腳本 23 項先通過，API 全套測試在發現舊斷言後持續無結果，已中止並用對應 24 項測試重測通過。Web 全套首次執行亦因缺進度資訊而中止；改用 verbose 逐項輸出後，API 64 檔／384 項與 Web 94 檔／424 項全數通過（exit 0），exact-SHA CI 尚未開始。

Development 真實 API 驗證（2026-10-21）：Product Owner 明確核准建立並測後刪除一個限兩條連線、僅繼承 `gym_assistant_api` 的臨時登入角色。以兩個隔離 Auth／Workspace、測試用 Development 身分驗證器、正式 Fastify 路由和 PostgreSQL adapters 執行：兩名自然人及一群組建立、跨 Workspace 404、群組兩堂購課、群組課排課與參與快照、Calendar 完課只扣群組一堂且兩人 present、重開恢復一堂、Training 完課指定一人 absent 仍只扣群組一堂、缺席者個人歷史保留同一 Session 並標 absent。此驗證走真實 Development DB 和 HTTP handler，但使用測試身分，**不等於真 Supabase Auth／登入後 browser 驗收**。

擴充真 DB／API 情境（2026-10-21）：同一限權限臨時角色下，群組 Session 完課讀回僅一筆 `session_lesson_source` 配到群組購課；Finance 當月僅一筆 NT$400 場地費，未因兩人重算。重開恢復餘額；Training 完課一人缺席時，公開成果仍含各人出席狀態且不洩漏教練私有筆記。零價群組無課包時僅產生一筆 NT$0 `generated_single` 購課與一堂來源；缺價群組產生 `pending` 來源且不產生購課。跨 Workspace GET／PATCH 均 404；原個人購課／建課／完課仍配到本人購課、顯示於本人歷史。測試 fixture 及臨時角色皆已刪除。

真 Supabase Auth／瀏覽器驗收（2026-10-21）：以 Development 的一次性 synthetic Coach 完成真 Auth 密碼登入；本機正式 OIDC verifier、Fastify 與 PostgreSQL adapters 接收 JWT，Web 連 Development 公開設定。瀏覽器建立兩位自然人與一群組，名單仍為 2 位學生及 1 個群組；群組購買 2 堂後餘額 2；Calendar 建立含兩名參與者的共課，完課後餘額 1，群組課程歷史指向同一 Session。課堂中乙標缺席，甲以 50kg／8 次／RPE 7 完成一組並確認「已儲存」；甲個人課程歷史顯示該共課，個人餘額仍 0。390px 實際群組詳細頁截圖已檢視，`innerWidth=scrollWidth=390`；320px 是先前隔離預覽證據，尚非真登入流程。測試 Auth、Workspace、Student、Session、Venue、分類 intent、臨時 DB role 精確清理後讀回皆 0；本機忽略的密碼、JWT、公開 Web 設定已刪除。這是本機 Development 瀏覽器驗證，不等於安裝手機 PWA、Production 或 exact-SHA CI。

對齊 Main 後本機 gate（2026-10-21）：`codex/student-group-sol` 已無衝突 rebase 到當時 `origin/main` `d946b0e`。`npm run check` exit 0：Prettier、根目錄 39 項腳本測試、API 64 檔／392 項、Web 94 檔／430 項全部通過；`npm run build` exit 0，API TypeScript 和 Web Vite 產物正常，僅既存大 chunk 提示。`git diff --check` 通過。完整隔離邏輯備份還原尚無證據：本機沒有 `pg_dump`、`pg_restore`、Docker；現有 GitHub 備份／還原 workflow 僅對 Production 執行，不能用 Development 的局部 SQL 檢查冒充還原。需在後續可用的隔離執行環境證實，Production 尚未套 M11 migration。

遠端交付（2026-10-21）：Product Owner 明確授權推送分支及建立草稿 PR。Main 再新增文件提交 `6c3703c` 後，M11 分支無衝突 rebase 並推送 exact SHA `7c4ee1f3729436113eb59a4aee7f695f2ae63208`；[PR #72](https://github.com/YambossMaster/Gym-Assistent/pull/72) 為 draft、open、mergeable。GitHub Actions CI run `39472693400` 對該 SHA 的 `verify`、`browser-ui`、`migration-dry-run` 全部 success；`production-migration-preview`、`deploy-production` 為 skipped，符合草稿狀態。PR 檔案清單無 `.env`、測試憑證或忽略的輸出。此證據只屬 PR 分支，不代表已 merge、Production migration 或部署。

真實 API 情境首次揭露第三條整帳刪除鏈缺陷：有完成課來源時，既有 `session_lesson_source`→`lesson_purchase` FK 的立即檢查擋住 Auth→Workspace 級聯；前次回滾測試未含購課來源。新增 `20261021010300_m11_workspace_lesson_source_deferred_fk.sql` 將該 FK 改為可延遲檢查；隔離 dry-run 只列此 migration，Development 套用後擴充的 rollback SQL 和兩筆真實 fixture 整帳刪除皆通過。精確 ID 讀回 Auth、Workspace、Student、Session、來源皆為 0；臨時角色已撤銷、刪除並確認 `pg_roles` 為 0。本機忽略目錄中的密碼／連線檔已刪除。這補完原第 7／8 項的整帳刪除證據，不新增工作包。

Product Owner 放行後重試 API 全套 `npm test --workspace @gym-assistant/api`：Vitest 啟動後約 90 秒沒有任何測試結果，已中止（exit 1）；這次中止不是測試斷言失敗；改用 verbose 後確認 PDF 匯出案例耗時，API 全套 384 項、Web 全套 424 項均通過。Web 僅有既存 React act(...) 測試警告。新 migration 的決定性檢查是擴充的 Development rollback SQL 與真 fixture 清理，皆通過。SQL 不由 Prettier 解析；Status Markdown 已格式化，`git diff --check` 通過。

Development Supabase Advisor：安全檢查沒有 M11 新表警告；全專案另有既存 Auth 密碼洩漏防護警告，非本包 schema 問題。效能資訊提示 M11 四條複合 FK 缺完整覆蓋索引（成員兩條、參與者與組數各一條；[說明](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)）。目前 M11 新表無正式資料，對應查詢已有以 Workspace／group／student／session 前綴建立的索引；待真群組流量與 `EXPLAIN` 證據再判定是否加完整 FK 索引，不把資訊級提示視為發布阻擋。外部行事曆名單查詢已於 Development 用 `EXPLAIN` 確認 SQL 可解析，群組成員快照由 Session 主鍵索引取得。

Sol 聚焦證據（2026-10-20 至 21，本機分支）：API／Web TypeScript typecheck 通過；先前 8 個 API 聚焦測試檔共 42 項通過，最近受影響的 6 檔 28 項及公開能力／Student 的 4 檔 22 項重查通過（後者一項在批次執行逾 5 秒，單檔重跑 3/3 通過；不同批次有重疊案例）；另新增群組建課回應快照案例，Scheduling 單檔 5/5 通過；2 個 Web 名單／草稿測試檔共 23 項通過；`git diff --check` 通過。隔離 DEV 預覽 `/__review/m11-group` 使用正式群組訓練元件，桌面、390、320、兩種檢視模式及一人缺席狀態已實際截圖；修正窄螢幕欄位擠壓。截圖在忽略的 `output/playwright/m11-*.png`。此段是進入完整驗證前的版面聚焦證據；後續 Development DB 約束與回填驗證見上方，不代表登入後完整瀏覽器流程、真實購課／扣堂及 CI gate 完成。Vitest 在預設 Windows 沙盒因暫存 `EPERM` 改用已核准的外部執行路徑。未操作 Production、未遠端交付。

### Sol 工作盤點與目前結果

| #   | 面向           | 本機已做                                                                                                                                                                                                                                | 仍待收斂／關鍵證據                                                      |
| --- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | 群組／成員     | `student.kind`、成員交易、名單／詳細頁、封存及歷史硬刪防護；未來課同步，移出有草稿者回滾；版本衝突回傳最新主體／成員／未來課，封存個人後遞增相關群組版本                                                                                | DB FK／並行與封存實測                                                   |
| 2   | 群組購課       | 沿用群組 owner 的課包／單堂價格；真 DB 已證一組一堂、重開恢復、零價／缺價、場地來源與 Finance 一筆；真瀏覽器購課 2 堂完課剩 1 堂                                                                                                        | 遠端 exact-SHA 與 Production 證據                                       |
| 3   | 排課／快照     | 單次、週期與改派交易建立參與快照；個人歷史依參與快照；真瀏覽器 Calendar 建一堂兩人成員共課                                                                                                                                              | DB 鎖與系列生成並行、Today／重複排課真瀏覽器情境                        |
| 4   | 出席／完課     | 出席保存在原訓練命令，完課清掉缺席者組數，兩個完課入口共用來源配置                                                                                                                                                                      | 原子扣堂／場地費、全員缺席、重開及結果修正的 DB 證據                    |
| 5   | 多人訓練       | 同一草稿動作、本人組數、兩模式檢視與個人成長查詢；真登入後一人缺席、另一人完成一組並儲存；390px 實際群組頁無水平溢出                                                                                                                    | Product Owner 視覺意見、安裝手機 PWA 與完整兩模式真瀏覽器情境           |
| 6   | 公開能力       | 群組成果加允許的出席與本人組數；結果連結版本納入 Session、群組與參與者版本；改期仍移整堂                                                                                                                                                | allowlist、跨 Workspace、舊連結及真 UI 流程                             |
| 7   | 封存／匯出相容 | 個別訓練匯出僅本人組數、Today 自然人數、封存確認數量；完整 DB 備份理應包含新表                                                                                                                                                          | 回填前後筆數、舊 API 過渡、完整隔離還原及帳號刪除鏈                     |
| 8   | 正式驗證       | PO 已放行；Development 三筆 migration、回填／FK／RLS／舊寫入／整帳刪除；場地費、零價／缺價、公開結果、個人舊路徑真 DB API；真 Auth 瀏覽器主流程；本機根目錄 check、API／Web 全套 392／430 項及 build、PR `7c4ee1f` 三個適用 CI job 通過 | 完整隔離還原、安裝手機 PWA、320px 真登入及剩餘並行情境、Production gate |

## 已確立與待辦

- Product Owner 已接受 `GROUP-TRAINING-ACTION-FIRST-PROTOTYPE.md` 與 `GROUP-TRAINING-MOBILE-PWA-DESIGN.md` 作為以後實作範本。兩份紀錄來自本機 `codex/group-training-ui-template` 的已接受快照，未連同 DEV 原型程式複製到此工作線。
- 本稿把舊討論稿的「逐人表單／新增動作選範圍」改為已接受的動作優先、兩種顯示模式與同一草稿。舊稿仍留在原主 checkout，沒有移動或修改。
- Product Owner 於 2026-10-20 明確要求以現有學生主體的集合型態實作學生群組，購課／排課／扣堂等原有判定與 API 盡量沿用；方案人數只計自然人，群組及重複入組不加人數。Contract 因此改為一筆受型別約束的 `student` 群組列，保留每 Session 一份 Training Record，在群組訓練組數上增加本人歸屬 ID；原 GET／PUT／完課路由、recordVersion、sessionVersion、operationId 延伸使用。相較前稿移除每人多份 Training Record、另存共享動作／筆記及 `/groups` 路由提案。這是原第 5 項「多人訓練」及第 1 項「群組管理」的方案修訂，已知實作面向仍為 8，沒有新增工作包。
- Product Owner 決定已有正式歷史的群組只能封存。現行學生刪除會級聯移除其課堂與 Training Record，故群組刪除須限於沒有購課、課堂、固定課表或訓練／財務來源的空白群組；Product Owner 再次釐清：自然人**同樣**只要有購課、個人或群組課參與、固定課表、訓練或財務正式資料，就只能封存；永久刪除僅限空白主體。原稿允許刪除有群組歷史的自然人，是自相矛盾的錯誤，已更正。既有 FK 級聯和 Student 刪除命令需設交易檢查與 DB 防護，群組 Session、成員結果與財務來源不可被抹除；同時須驗證 Auth user／Workspace 完整刪除鏈仍可完成。這是原第 1／7 項的資料保存邊界，不增加已知總數。
- Contract 第 6 節已完成目前 Main 的主要自然人假設只讀影響表，定位 Plan 人數、學生更新／刪除、Training、Finance customer source、完整／個人匯出、Today／通知、Public Access 等路徑。Sol 首步仍須逐查詢核對、DB 約束及無資料變更 migration 設計檢查；若出現具體不能沿用的路徑，先做該處最小修正，修正不足才回 Contract。
- Product Owner 補定學生名單切換為「學生／學生群組／已封存」，封存頁混列兩類並標明型態；群組在原 `/students/:id` 有自己的五區塊詳細呈現。基本資料連到成員個人頁；固定課程時間沿用群組主體；運動表現只分別顯示成員個人數據；課程紀錄在群組和參與者個人頁共用同一 Session ID；購課紀錄與餘額按各自主體嚴格分離。此為原第 1、2、3、5 項介面／投影細化，八項實作總數不變。Product Owner 已補定：群組已完成課中缺席的學生，個人課程紀錄仍顯示同一堂並標示「缺席」，但不產生本人成績；此為原第 4／5 項的驗收情境，不增加八項實作總數。
- 外部審查四點已逐項核對：①現有 API 路由可沿用，但個人課程列表、Training defaults／performance、個人匯出需補參與者或組數歸屬讀取；此專案為手寫 SQL，不引入 ORM 全域 scope，Sol 逐路徑審核並用實際查詢決定索引。②舊 `training_set` 可依遷移當下 Session owner 回填，應驗證並最終收斂為非空；先套 migration、後更新 API 的過渡寫入相容屬必要驗證。③有任何正式歷史的自然人或群組皆僅能封存，快照維持關聯列與歷史出席，不建立 JSONB 人名快照或刪後匿名席位。④一人群組已符合原先至少一人的規則，排課／完課繼續用群組課包或群組單堂價，不自動轉個人價格。這些是原第 1、3、5、7、8 項的明確化與錯誤修正；已知交付面向仍為 8，無新增工作包。
- 本次審核新增一個具體相容邊界：現有已排定 Session 可改派 owner；新增非空 `training_set.student_id` 後，個人→個人改派必須同交易重指組數，涉及群組且已有訓練內容或教練手動修改的出席狀態則拒絕改派以保護草稿；無內容時同步重建參與快照。屬原第 3／5 項必要相容檢查，優先級高，八項總數不變。
- 已確認封存後繼續排課的既有 bug 確實列在 Contract 第 2／8 節，但現行 `StudentModule.update` 只更新 `student.active`，`reconcileSeries` 只看 `schedule_series.active`。Contract 進一步要求封存同交易停用 Series、取消未開始的 scheduled Session；封存後手動建課／新增 Series 被拒，自動排課重查 owner active 並與封存序列化，恢復不自動重建。屬原第 1／3 項的必要修正，八項總數不變。
- 外部審查的 kind 防呆方向採納，但其 `FOREIGN KEY (group_id, 'group')` 並非 PostgreSQL 合法語法。Contract 指定同 Workspace 的 `(workspace_id,id,kind)` 唯一鍵，以及子表受 CHECK 限制的固定種類判別欄加三欄複合外鍵；成員、參與者和訓練組數須在 DB 層拒絕 group 冒充 person，並維持完整帳號刪除。這是原第 1／3／5／8 項資料約束細化，總數不變。
- Product Owner 於 2026-10-20 核准凍結 M11 Contract，並明確選擇先調整 Roadmap 讓 M11 優先於 M9／條件式 M10 整合。Roadmap 第 6 節已記錄編號與發布順序的明示例外；M9／M10 名稱與原有範圍不變。M11 Sol 可在獨立工作線開始，與其他工作線共用的 migration／Module 介面須序列化；Sol 實作完成後先供 Product Owner 檢視，完整驗證及遠端 delivery 仍遵守原關卡。此為 Roadmap 順序與 Contract 凍結決定，不代表 M11 已交付。

### 現有行為影響圖（Sol 起始基線，尚未執行回歸）

| 共用邊界                           | 必須保留的既有行為                                 | Sol 時最小決定性檢查                                                                                                                                                                                                                                                                                                     |
| ---------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Student／Plan                      | 個人學生建立、修改、額度和隔離；群組不占自然人名額 | 個人與群組各建立一筆，方案人數只加一；已到學生上限但未超額時可建群組；真正 overCapacity 的既有寫入限制仍在；有正式資料的個人與群組硬刪均被拒，空白主體才可刪；完整帳號／Workspace 刪除仍可完成；跨 Workspace、group 入 group 或 group 作 person 參與者／組數 owner、版本衝突均由 DB 與 API 拒絕。                        |
| Scheduling／Lesson／Venue／Finance | 原單人排課與單堂來源；每 Session 一次扣堂及場地費  | 封存個人／群組後既有未來課取消、Series 停用，手動與自動建課均被拒，並行重算不補生；單人路徑回歸；群組與個人課程列表對同堂指向同一 Session，缺席者仍顯示該堂及缺席標記；群組三人或一人完成皆只扣群組一堂、場地一筆，仍用群組價格；改派 owner 時組數歸屬與參與名單保持一致；個人與群組購課／餘額互不混算；缺價與零價分開。 |
| Training／Web                      | 單人舊 payload、記錄版本、草稿與輸入格線           | 舊組數回填完整並在新舊 API 切換期間持續有歸屬；單人讀寫往返不變；三選項名單及兩類詳細頁正確；群組兩模式讀寫同一份記錄，個人組數不串改，群組只列每人成績入口，缺席和衝突可恢復。                                                                                                                                          |
| Public Access／Export／Growth      | 舊單人成果與個人成長、私有欄位 allowlist           | 單人連結仍可用；群組連結只含本堂允許資料；個人課程紀錄依 owner 或參與者投影，個人運動表現／匯出只含本人組數，所需索引以查詢計畫確認。                                                                                                                                                                                    |

上述為 Sol 起始時的回歸影響圖；目前 Development migration 及部分真 DB API 已取得證據，登入後 browser／device 尚未驗證。正式回歸範圍依 `docs/VERIFICATION_WORKFLOW.md`。

## 下一步

下一個動作：將這份 PR #72 遠端證據更新推送至已授權的工作分支，確認新 exact-SHA 的 CI；然後以草稿 PR 持續完成可行的封存／系列生成並行與窄螢幕情境。完整隔離還原與安裝手機 PWA 仍需可用的隔離還原執行環境及實際裝置；未取得前不可宣稱 M11 完成。Production migration／部署／merge 不屬本次授權，須另行明確範圍與釋出證據。真 API 與 Auth 瀏覽器 fixture、臨時 DB 角色已精確清除；Development 三筆 migration 已套用，Production 未套用。主 checkout、Contract 及已接受的 UI 範本工作樹保持原狀。
