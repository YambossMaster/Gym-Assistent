# Student Group Contract workstream

> 2026-10-20，獨立於 `codex/group-training-ui-template` 與 M8-E 的本機工作線。基線：本地 `origin/main` `531f223`；本工作線沒有變更正式產品程式。

## Gate 與清單

| Gate     | 狀態                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------- |
| Contract | 審閱稿 [`../STUDENT-GROUP-CONTRACT.md`](../STUDENT-GROUP-CONTRACT.md) 已寫；未凍結，Roadmap 位置未核准。 |
| Sol      | 未開始。                                                                                                 |
| CI／發布 | 未開始，沒有 migration、遠端 push、PR 或部署。                                                           |

八個已知交付面向：群組管理、群組購課、排課、出席與完課、多人訓練、公開能力、封存／匯出相容、完整驗證。Contract 草稿與已接受的桌面／手機 UI 設計紀錄現已在此工作線可讀；8/8 實作均未開始。

聚焦查核：對照目前 Main 的 schema／Student、Scheduling、Training、Finance、Plan Access、Export、Public Access 路徑與既有 Demo 頁面；新文件的 `git diff --check` 已通過。文件尚未做產品實機驗收；API、migration 與 CI 均未執行，因為本工作線沒有程式或資料變更。

## 已確立與待辦

- Product Owner 已接受 `GROUP-TRAINING-ACTION-FIRST-PROTOTYPE.md` 與 `GROUP-TRAINING-MOBILE-PWA-DESIGN.md` 作為以後實作範本。兩份紀錄來自本機 `codex/group-training-ui-template` 的已接受快照，未連同 DEV 原型程式複製到此工作線。
- 本稿把舊討論稿的「逐人表單／新增動作選範圍」改為已接受的動作優先、兩種顯示模式與同一草稿。舊稿仍留在原主 checkout，沒有移動或修改。
- Product Owner 於 2026-10-20 明確要求以現有學生主體的集合型態實作學生群組，購課／排課／扣堂等原有判定與 API 盡量沿用；方案人數只計自然人，群組及重複入組不加人數。Contract 因此改為一筆受型別約束的 `student` 群組列，保留每 Session 一份 Training Record，在群組訓練組數上增加本人歸屬 ID；原 GET／PUT／完課路由、recordVersion、sessionVersion、operationId 延伸使用。相較前稿移除每人多份 Training Record、另存共享動作／筆記及 `/groups` 路由提案。這是原第 5 項「多人訓練」及第 1 項「群組管理」的方案修訂，已知實作面向仍為 8，沒有新增工作包。
- Product Owner 決定已有正式歷史的群組只能封存。現行學生刪除會級聯移除其課堂與 Training Record，故群組刪除須限於沒有購課、課堂、固定課表或訓練／財務來源的空白群組；Product Owner 再次釐清：自然人**同樣**只要有購課、個人或群組課參與、固定課表、訓練或財務正式資料，就只能封存；永久刪除僅限空白主體。原稿允許刪除有群組歷史的自然人，是自相矛盾的錯誤，已更正。既有 FK 級聯和 Student 刪除命令需設交易檢查與 DB 防護，群組 Session、成員結果與財務來源不可被抹除；同時須驗證 Auth user／Workspace 完整刪除鏈仍可完成。這是原第 1／7 項的資料保存邊界，不增加已知總數。
- Contract 第 6 節已完成目前 Main 的主要自然人假設只讀影響表，定位 Plan 人數、學生更新／刪除、Training、Finance customer source、完整／個人匯出、Today／通知、Public Access 等路徑。Sol 首步仍須逐查詢核對、DB 約束及無資料變更 migration 設計檢查；若出現具體不能沿用的路徑，先做該處最小修正，修正不足才回 Contract。
- Product Owner 補定學生名單切換為「學生／學生群組／已封存」，封存頁混列兩類並標明型態；群組在原 `/students/:id` 有自己的五區塊詳細呈現。基本資料連到成員個人頁；固定課程時間沿用群組主體；運動表現只分別顯示成員個人數據；課程紀錄在群組和參與者個人頁共用同一 Session ID；購課紀錄與餘額按各自主體嚴格分離。此為原第 1、2、3、5 項介面／投影細化，八項實作總數不變。Product Owner 已補定：群組已完成課中缺席的學生，個人課程紀錄仍顯示同一堂並標示「缺席」，但不產生本人成績；此為原第 4／5 項的驗收情境，不增加八項實作總數。
- 外部審查四點已逐項核對：①現有 API 路由可沿用，但個人課程列表、Training defaults／performance、個人匯出需補參與者或組數歸屬讀取；此專案為手寫 SQL，不引入 ORM 全域 scope，Sol 逐路徑審核並用實際查詢決定索引。②舊 `training_set` 可依遷移當下 Session owner 回填，應驗證並最終收斂為非空；先套 migration、後更新 API 的過渡寫入相容屬必要驗證。③有任何正式歷史的自然人或群組皆僅能封存，快照維持關聯列與歷史出席，不建立 JSONB 人名快照或刪後匿名席位。④一人群組已符合原先至少一人的規則，排課／完課繼續用群組課包或群組單堂價，不自動轉個人價格。這些是原第 1、3、5、7、8 項的明確化與錯誤修正；已知交付面向仍為 8，無新增工作包。
- 本次審核新增一個具體相容邊界：現有已排定 Session 可改派 owner；新增非空 `training_set.student_id` 後，個人→個人改派必須同交易重指組數，涉及群組且已有訓練內容或教練手動修改的出席狀態則拒絕改派以保護草稿；無內容時同步重建參與快照。屬原第 3／5 項必要相容檢查，優先級高，八項總數不變。
- Product Owner 尚需決定本套件在 Roadmap 的位置、與未完成／條件式 M9／M10 的整合次序，以及是否凍結 Contract。Roadmap 第 6 節規定新編號從 M11 起且數字是發布順序，故不能自行命名就提前發布。此前不進 Sol。實作完成後仍須先供 Product Owner 檢視，再依現行 gate 做完整驗證；遠端 delivery 另需授權。

### 現有行為影響圖（Contract 階段，尚未執行回歸）

| 共用邊界                           | 必須保留的既有行為                                 | Sol 時最小決定性檢查                                                                                                                                                                                                                   |
| ---------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Student／Plan                      | 個人學生建立、修改、額度和隔離；群組不占自然人名額 | 個人與群組各建立一筆，方案人數只加一；已到學生上限但未超額時可建群組；真正 overCapacity 的既有寫入限制仍在；有正式資料的個人與群組硬刪均被拒，空白主體才可刪；完整帳號／Workspace 刪除仍可完成；跨 Workspace、錯誤種類與版本衝突被拒。 |
| Scheduling／Lesson／Venue／Finance | 原單人排課與單堂來源；每 Session 一次扣堂及場地費  | 單人路徑回歸；群組與個人課程列表對同堂指向同一 Session，缺席者仍顯示該堂及缺席標記；群組三人或一人完成皆只扣群組一堂、場地一筆，仍用群組價格；改派 owner 時組數歸屬與參與名單保持一致；個人與群組購課／餘額互不混算；缺價與零價分開。  |
| Training／Web                      | 單人舊 payload、記錄版本、草稿與輸入格線           | 舊組數回填完整並在新舊 API 切換期間持續有歸屬；單人讀寫往返不變；三選項名單及兩類詳細頁正確；群組兩模式讀寫同一份記錄，個人組數不串改，群組只列每人成績入口，缺席和衝突可恢復。                                                        |
| Public Access／Export／Growth      | 舊單人成果與個人成長、私有欄位 allowlist           | 單人連結仍可用；群組連結只含本堂允許資料；個人課程紀錄依 owner 或參與者投影，個人運動表現／匯出只含本人組數，所需索引以查詢計畫確認。                                                                                                  |

上述涉及共享 schema／Module／Web，正式 Sol 的回歸範圍依 `docs/VERIFICATION_WORKFLOW.md`；目前沒有 live、device 或 migration 證據。

## 下一步

提交 Contract 與 Roadmap 位置建議供 Product Owner 檢視。獲准後由 Roadmap owner 記錄套件位置並凍結 Contract，才開始 Sol；Sol 首步核對逐查詢、DB 約束與 migration 設計。保留 UI 範本分支與主 checkout 的既有變更。
