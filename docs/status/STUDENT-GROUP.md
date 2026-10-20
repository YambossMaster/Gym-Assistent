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
- Contract 第 6 節已完成目前 Main 的主要自然人假設只讀影響表，定位 Plan 人數、學生更新／刪除、Training、Finance customer source、完整／個人匯出、Today／通知、Public Access 等路徑。受型別約束的既有主體是 Sol 候選；逐查詢清單、DB 約束及無資料變更 migration 檢查屬 Sol 首步。若不能可靠隔離，正式寫入群組資料前回 Contract 改選獨立群組主體。
- Product Owner 尚需決定本套件在 Roadmap 的位置、與未完成／條件式 M9／M10 的整合次序，以及是否凍結 Contract。Roadmap 第 6 節規定新編號從 M11 起且數字是發布順序，故不能自行命名就提前發布。此前不進 Sol。實作完成後仍須先供 Product Owner 檢視，再依現行 gate 做完整驗證；遠端 delivery 另需授權。

## 下一步

提交 Contract 與 Roadmap 位置建議供 Product Owner 檢視。獲准後由 Roadmap owner 記錄套件位置並凍結 Contract，才開始 Sol；Sol 首步核對逐查詢、DB 約束與 migration 設計。保留 UI 範本分支與主 checkout 的既有變更。
