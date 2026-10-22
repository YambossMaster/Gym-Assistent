# M11 PWA 輸入問題：Agent 交接

## 1. 目標與目前狀態

- **目標：** 單人、群組「按時序／按學生」都能穩定選取、輸入、Next、完成及重進；整個輸入框可見、不跳動、不丟值。
- **規則：** 直接選取時定位；Next 同列不動、跨列才調整；手動滑動不拉回；完成只收鍵盤與操作列，保留剛才欄位的位置。禁止產品使用原生 alert／confirm／prompt／離頁提示。
- **保留：** 已接受的操作列、群組新增／編輯與外觀。使用者已取消底部留白優化，勿順便修改。
- **交付紀錄：** 2026-10-22 已部署 **release 75／`ea853e8`**，工程驗證通過；最新實機證據仍是 **release 74 選取失位、完成回頂及原生 confirm 失敗**。release 75 尚無新實機結果，任務未結案。
- **本地交接分支：** `codex/m11-input-handoff`，僅整理本文件、未推送；程式基線不變。

## 2. 下一個 Agent 先做什麼

1. 在 `output/m11-student-group` 核對分支、HEAD、未提交變更及本文件對應程式；保留主目錄既有修改。
2. 核對最新回報是否使用 release 75。沒有新版結果時，不把舊版失敗當新版失敗，也不盲改已接受的功能。
3. 若仍失敗，建立**舊碼會失敗的最小重現**。沿「觸控／focus → viewport → 捲動 → 關閉收尾」比對事件次序、焦點欄位、輸入框／操作列矩形、`visualViewport.height/offsetTop`、`window.scrollY`、訓練區 `scrollTop`；不要再只疊 padding 或延遲校正。
4. 修一個已證實原因，讓同一重現轉綠，再重查第 4 節。使用者已授權此修正**完整驗證後部署**；發布後核對版本，再更新實機結果。不要把整輪排查丟回使用者。

## 3. 錯誤、原因判定與防退化

下表是程式或受控重播已確認的缺陷與修正，**不代表已證明涵蓋 iPhone 的全部隨機事件**。

| 錯誤                                       | 已確認原因及修正                                                                                                                                      | 已有保護／驗證                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Next 不前進、跳兩欄或關鍵盤；操作列消失    | 缺少相容 click、pointerup／click 重複、mousedown 搶焦點、null blur／row click 誤判結束。改在有效觸控釋放時同步前進、去重並核對實際焦點。              | 觸控次序重播、精確下一欄索引、操作列及 session 持續存在。          |
| 操作列漂移、間距過大；同列跳動、滑動被拉回 | 混用 viewport 高度／offset、歷史最小值與捲動來源；固定多加 64px、重複定位也造成退化。改為一個捲動 owner，依當前可視區定位；手動滑動取消定位意圖。     | 同列不動、跨列可見、分段高度／pan、手動滑動與重點選。              |
| 直接選取失準、再點同欄無效                 | 聚焦仍在卻因全高暫態清掉模式，或首次定位後太早清除意圖，漏接晚到 scroll。保留有效 session／開鍵盤高度，處理 window／viewport 事件，同欄再點也能定位。 | 正式測試先失敗後通過；上中下／末欄選取、全高暫態重播。             |
| 完成後回原高度／頁頂；快速重進互相干擾     | 捲動鎖釋放及晚到 document scroll 破壞最後欄位位置。先記錄螢幕相對位置，短暫交接恢復；最長 2.5s，新 gesture／focus／unmount 立即取消。                 | 相同重現由位移 1820px → 0px；36 個關閉／重進競態及取消／到期測試。 |
| 座標正確卻遮擋；input 上緣裁切             | 黏住的頁首及 52px input minimum 超出 38px 容器。調整該頁頁首與 input minimum，保留外框。                                                              | 整框九點實際命中、容器範圍；完成前後及 Shell 首末欄。              |
| 瀏覽器 Cancel／OK 或離頁提示               | 五處 Training confirm 及 Training／ExportDownloads beforeunload。改既有站內 Confirmation，移除原生離頁提示，保留草稿恢復及匯出取消。                  | 全站 AST policy；6 組取消／接受；2 組真 IndexedDB 未同步重載恢復。 |

**尚未證實或不能宣稱排除：**

- 「全部只是頁面不夠高」不成立：部分末列確需補足捲動範圍，但晚到事件與容器裁切也能獨立重現。目前保留按差額補高，不回收留白。
- 已重現原因已有修正與回歸保護，但**尚不能保證原生偶發問題已徹底根治**：缺 release 75 實機結果及失敗當下事件次序。WebKit 問題紀錄只能幫助提出假設，不能當成本機根因證明。
- 若 75 仍失敗，優先驗兩個**待證假設**：晚到事件超出關閉保護窗／被新 gesture 提前取消；真正關鍵盤關閉仍保留 DOM 焦點，被誤當全高暫態。先用第 2 節時間線確認，勿直接延長 timer。
- 舊驗證漏看精確欄序／整框命中、末列、真實改值保存及關閉後事件，並把模擬鍵盤當實機；現在已補相應斷言，後續不可退回舊標準。

## 4. 唯一檢查清單

工程欄是 release 75 已取得的結果；**方框只代表實機驗收**。`[ ]` 是未可靠證明通過，保留 release 74 失敗，不因工程綠燈自動勾選。

| 實機項目                   | 通過條件                                                                                     | 工程結果／實機狀態                                              |
| -------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [x] P01 操作列             | 高度及可點位置穩定，不閃爍、不誤觸底層。                                                     | 使用者已接受；維持。                                            |
| [ ] 基本輸入（F01–F03）    | 每次選取都有操作列；Next 精確進一欄、鍵盤保持開啟；最後欄才完成。                            | 工程通過；75 實機待驗。                                         |
| [ ] P02／P05／P06 可見性   | 首、中、末列及任意起始高度直接點選；整個 input 不被操作列、頁首或自身容器裁切。              | 九點／容器檢查通過；74 選取曾 FAIL，75 待驗。                   |
| [ ] P03 前進／滑動         | 同列不動、跨列一次到位；手動滑動不追，下一次選取再定位；連按不漏進或跳兩欄。                 | 工程通過；75 實機待驗。                                         |
| [ ] P04 完成／重進         | 完成或原生關閉後仍見剛才欄位、不回頂；涵蓋動畫、晚到事件、兩種 blur／resize 次序及立即重進。 | 時序完成位移 0px；74 曾 FAIL，75 待驗。                         |
| [ ] 保存／模式（F04、F12） | 逐欄輸入不同值、保存重開、切群組檢視，不丟值、不改錯學生；三模式八格式皆適用。               | 24 組／189 欄 fixture 保存通過；非新的正式 DB 證據。            |
| [ ] P07 站內確認           | 移除、完成群組、改缺席、衝突重載用站內視窗；取消保留、接受一次；無原生離頁提示。             | policy／6 組流程／2 組草稿恢復通過；75 手機待確認，可只按取消。 |
| [ ] 同伴流程               | 桌機 Enter 正常且無手機 dock／鎖頁；320px 不遮擋；教練筆記切換、工具列與保存正常。           | 工程通過；手機同伴待驗。                                        |

若再改碼，先驗基本輸入，再驗全部受影響歷史情境；不可只交出新測試數量或一張穩定後截圖。

## 5. 程式與重現入口

未標完整路徑的檔案位於 `apps/web/src/pages/training/`：

| 檔案                                                                                       | 用途                                            |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `TrainingWorkspace.tsx`、`SetInputAdvanceDock.tsx`                                         | focus／blur／模式切換、觸控前進、站內確認。     |
| `useSetInputViewport.ts`、`set-input-dismissal.ts`                                         | 捲動 owner、定位意圖、viewport 暫態及關閉交接。 |
| `TrainingWorkspace.gesture.test.tsx`、`set-input-dismissal.test.ts`                        | 已確認時序缺陷與 helper 生命週期回歸。          |
| `apps/web/src/styles.css`                                                                  | 操作列、頁首、input 外框及捲動範圍。            |
| `apps/web/src/pages/settings/ExportDownloads.tsx`、`scripts/native-dialog-policy.test.mjs` | 第二個離頁提示來源、全站禁止原生訊息檢查。      |

- **環境陷阱：** Web TypeScript 鎖定 **7.0.2**、root 工具 **5.9.3**。曾因預載版本不同，使本機過、CI #364 失敗；policy 因此放 root，不可搬回 Web 使用其不提供的 compiler API。需要 `npm ci` 時先停本工作樹 Vite，避免 Windows 鎖檔。
- **聚焦回歸：** 在 `apps/web` 執行 `npx vitest run src/pages/training/TrainingWorkspace.gesture.test.tsx src/pages/training/set-input-dismissal.test.ts --maxWorkers=1`；root 執行 `node --test scripts/native-dialog-policy.test.mjs`。
- **本機隔離頁：** `apps/web/output/pwa-input-review.html`，Vite 原使用 5180；最小關閉重現 `output/playwright/m11-close-race-repro.js`。完整腳本同目錄的 `m11-run-matrix.ps1`、`m11-run-temporal.ps1`、`m11-session-race-template.js`、`m11-inapp-dialogs.js`、`m11-draft-reload.js`。
- `output/` 是忽略檔，其他機器可能沒有；缺檔時重建同等隔離測試，保留精確欄序、全框命中及事件時間序列。模擬 viewport／攔截 API 不等於 iPhone 鍵盤或正式 DB 驗證。

## 6. 證據與維護規則

- **發布：** `ea853e8216c8151fe064ab47e91f05922c5617f7`；[PR #95](https://github.com/YambossMaster/Gym-Assistent/pull/95)、[Main CI #366](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39801710987)。完整檢查、browser、migration／部署通過；Fly 同 SHA、健康檢查、三入口 200 已讀回。
- **工程證據：** `output/playwright/2441d38/`；正式讀回 `output/github/m11-session-race-production-readback.json`。涵蓋 24 組格式、15 個時序、36 個競態、27 欄 Next、Shell 6 案及同伴流程。
- **最後失敗素材：** `C:/Users/User/Downloads/` 的 `ScreenRecording_10-22-2026 21-46-06_1.mp4`、`21-45-29_1.mp4`（同前綴）、`IMG_0655.PNG`，均為 release 74。歷史曾反覆工程通過卻實機退回，release 73 又發生取消部署太晚；必須先驗再發布，部署成功不等於功能通過。
- **完整歷史：** `git show bb3672e:docs/status/M11-PWA-INPUT-CORRECTION.md`；整合紀錄見 `docs/status/log/2026-10.md`。

後續只更新目前結論、原因判定、必要證據及待驗項；逐輪過程進工程日誌，不再追加多份「目前狀態／唯一 Next」。本次整理僅改文件，未新增驗證、改程式或部署。
