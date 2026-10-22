# M11 學生群組與手機 PWA 輸入：完整問題紀錄及接手檢查清單

## 2026-10-22 目前發布：release 75 已部署；21:46實機問題待新版確認

**本節為目前狀態。五項工程／交付工作已完成；沒有宣告原生iPhone或M11結案。** [正式入口](https://formcoachdesk.com)，應用Main **ea853e8216c8151fe064ab47e91f05922c5617f7**，Fly **release 75 complete**。公開buildId **local-1792681874134**，入口 **/assets/index-Bz9fg-ib.js**。使用者取消底部留白優化，本次沒有回收留白，也沒有更改CSS、既有操作列或input外框。

### 完成的五項工作及證據

1. **影片與紅色重現完成。** 21:45／21:46影片的偶發選取失位、完成回頂及IMG_0655原生confirm均重新列為缺陷。pristine Main在三項viewport回歸、四項原生訊息檢查失敗；受控晚到document reset令最後欄163.5→1983.5px。相同重播修後163.5→163.5，位移0px。未聲稱取得iPhone原生事件trace。
2. **修正數值session生命週期。** 聚焦中的暫時全高viewport保留最後開鍵盤高度，window scroll亦重查焦點意圖。完成後以剛才欄位的螢幕相對位置交還document，最長2.5s處理晚到關閉事件；新gesture、重新聚焦、unmount立即取消。手動滑動不追、保留最少尾部空間。沒有常駐輪詢或頁高優化。
3. **移除產品原生訊息。** 五處Training confirm統一採用既有站內Confirmation：單人／群組移除、群組完成、已完成改缺席、衝突捨棄。Training及ExportDownloads不再註冊原生beforeunload提示；保留IndexedDB草稿、outbox、自動儲存／恢復提示與匯出取消。root工具層新增全站AST policy，會攔下原生alert／confirm／prompt／beforeunload；舊版再次FAIL、新版PASS。
4. **鎖定環境完整工程重查完成。** npm ci後確認Web TypeScript7.0.2／工具5.9.3。affected exit0：格式、whitespace、Web型別、10檔126/126，工作流程23/23，獨立policy1/1。再重跑24/24三模式八格式／189欄九點命中、不同值保存reload、同列穩定、72次直接選取、16次群組切換；15/15 temporal完成0px、27欄延後Next、Shell首末欄6/6、1440px／320px／筆記同伴；36/36關閉競態／快速重進／手動取消；6組站內確認取消／接受、可見與焦點；100ms及2.5s未回應保存的真IndexedDB重載恢復2/2，全部通過。最終原始JSON與摘要已凍結於忽略的 **output/playwright/2441d38/**。模擬viewport及fixture API不是實機OSK或新的DB／扣堂證據。
5. **exact-SHA CI、合併、部署及獨立讀回完成。** [PR #95](https://github.com/YambossMaster/Gym-Assistent/pull/95) 最終head **2441d388001b506745cfa245446ed9581a1fe64b**，[PR CI #365](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39800232035)成功：full check/build、root41／API402／Web499、browser7、migration no-op。合併後Web與候選diff為空。[Main CI #366](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39801710987)五個jobs全部success，Production history匹配且無pending，才部署。Fly machine started、image GH_SHA精確匹配、service passing；正式/api/ready、/、/login均200，公開／origin版本與入口JS一致，SHA256 **79c5b12570e757133f61ec87c56fa70707586c33f5c90279e8ba7d6c6e33190e**。讀回 **output/github/m11-session-race-production-readback.json**。無API、schema、Auth、依賴版本或部署設定變更。

PR CI #364的測試工具失敗保留：最初本機提供5.9，但Web lock為7.0，policy誤用native compiler不提供的JS API；因此未合併／未部署。搬至既有root工具層、npm ci對齊並重新紅綠及全量重跑後，才採用#365／#366綠燈。未跳過失敗，沒有將第一次本機127/127當成最終鎖定證據。個別GitHub job metadata短暫落後時另核對canonical run conclusion與完整原始log；Main最終五項job success已直接讀回。

### 保留未勾的實機檢查

| 項目         | release75需確認的可觀察結果                                          | 狀態                                      |
| ------------ | -------------------------------------------------------------------- | ----------------------------------------- |
| [x] P01      | 已接受操作列高度及位置，保留                                         | 已由使用者接受                            |
| [ ] P02／P05 | 上中下、最後欄、快速關閉重進／再點同欄：整個輸入框可見、無遮擋或消失 | release74實機FAIL；75待驗                 |
| [ ] P03      | Next同列不動、跨列可見，手動滑動不被拉回                             | 工程重跑通過；原生仍未完整核准            |
| [ ] P04      | 完成／原生關閉只收鍵盤與dock，動畫及稍後事件後仍保留剛才欄位，不回頂 | release74實機FAIL；75待驗                 |
| [ ] P06／K15 | 首末欄完整外框／input不被自己的容器裁切                              | 工程九點及容器範圍通過；原生未勾          |
| [ ] P07      | 移除動作顯示站內「取消／移除動作」，取消保留組數；沒有原生Cancel／OK | 工程全站policy及6組流程通過；75手機待確認 |

原F／K／I中未取得原生證據的項目維持未勾選。**唯一Next：** Product Owner從多工關閉PWA再重開，保留網站資料；重驗直接選取、完成及站內移除提示（可只取消，不必刪真實資料／扣堂）。回報後才更新實機項目。發布已確認，不需再提供遠端授權、帳號或清除草稿。已保存本地交付分支 `codex/m11-session-race-release`，文件整合不改應用程式。

以下保留當時狀態與決策；下方「目前／Next」均屬歷史快照，現況以上節唯一Next為準。

## 2026-10-22 21:46 實機退回與修正過程：選取／完成偶發失位、原生訊息禁止（歷史）

**本節取代下方 release 74「工程完成」的當前結論。** Product Owner 的 `21-46-06`（35.63s）及 `21-45-29`（19.24s）錄影再次證明選取偶發不可見、完成後回頂；IMG_0655 顯示移除動作仍使用原生 confirm。原生 P02／P04／P05 重新標為 **FAIL**，其餘未證明的實機項目維持未勾選。操作列與 input 外框沿用已接受版本；**底部留白優化已由使用者明確取消，本輪不回收留白**。

工作樹 `output/m11-student-group`，分支 `codex/m11-input-session-race`，基底 Main `3874bbb0dc92bb3e4e8746a5918786a1dae5dbb2`；正式應用仍為 release 74 / `89e08b6`。既有「完整驗證後部署」授權適用於本次繼續修正；順序為重現、修正、全部受影響驗證、exact-SHA CI、合併／部署／讀回，不能因單一模擬通過提前部署。

### 本輪有界清單（共五項）

1. **完成：影片與可失敗的重現。** 抽幀在忽略的 `output/playwright/video-review/race-{long,short}.jpg`。長片約 19–22s 完成後頁面回頂／大片空白，再重新進入；短片有選取低位／遮擋。沒有原生 event trace，不能聲稱已唯一辨識 iPhone OS 缺陷。以實際 Workspace／CSS 注入晚到 document reset：舊版最後欄 top **163.5 → 1983.5**，位移 **1820px**、window scroll=0；候選同序列 **163.5 → 163.5 / 0px**（`m11-close-race-repro.js`）。
2. **完成修正及工程重查：數值 session 時序。** 鍵盤已開且 input 仍聚焦時，暫時全高 viewport 不再把輸入 surface 撐大；window scroll 也重查仍有效的焦點意圖。完成交還 document 後，僅在最長 2.5s 的關閉交接內修復晚到 scroll／resize，以最後欄位的螢幕相對位置為準；新 pointerdown／touchstart／wheel、重進或 unmount 立即取消。沒有常駐輪詢、沒有移除既有尾部空間。三個正式 regression 已在 pristine Main 各自 FAIL，再修至 PASS。
3. **完成修正及工程重查：禁止產品原生訊息。** 訓練五處 confirm（單人／群組移除動作、群組完成扣堂、已完成群組改缺席、捨棄衝突草稿）統一使用既有站內 Confirmation。全站掃描另找出 Training 與 ExportDownloads 的 beforeunload 原生離頁訊息，移除 listener，保留 IndexedDB 草稿／outbox／autosave 及匯出中狀態／取消。這是同一禁止原生訊息規則的第二 consumer，非新功能或 Roadmap 擴張。舊版四項正式測試全部 FAIL；AST 掃描確實找到五個 confirm 及兩個 listener。確認取消不得刪資料／扣堂，確認接受只執行一次；補上全站 policy regression，防止再引入原生 alert／confirm／prompt／beforeunload。
4. **全部通過：重跑受影響檢查。** 三模式八格式／189欄／保存 reload、Next 與全框九點、首次／末欄、延後 scroll、分段 viewport／pan、快速完成重進、手動取消、桌機／320px／筆記、Shell 邊界；新站內確認取消／接受與離線草稿 reload。Windows WebKit／模擬 viewport／攔截 API 證據不等於 iPhone OSK 或新的 DB／扣堂證據。
5. **待驗證後交付：** affected check、exact-head PR／Main CI、Fly 同 SHA／資產／健康讀回；部署後交付可辨識版本給實機重驗。不能把工程 PASS 勾成原生 PWA PASS。

**目前 Next：** 已完成npm ci（Web TypeScript7.0.2／root工具5.9.3），policy移至scripts並重新先紅後綠。最終鎖定環境affected exit 0：format／whitespace／Web typecheck、10檔126/126 Web測試、23/23工作流程測試，另獨立policy 1/1通過。產品碼與2757b1a相同；接續在同PR提交工具相容修正、exact-head完整CI，同時鎖定環境重跑受影響瀏覽器；兩者全部成功後才合併／部署／讀回。無需 Product Owner 操作真實課堂或提供新帳號。未改API／schema／Auth／群組建立介面／CSS／依賴版本／部署設定。

外部資料只用於設計可失敗的時序重播：[WebKit #254861](https://bugs.webkit.org/show_bug.cgi?id=254861)、[#226689](https://bugs.webkit.org/show_bug.cgi?id=226689)；[MDN beforeunload](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event) 確認 preventDefault 會觸發瀏覽器訊息，不能在瀏覽器關閉事件中以非同步站內對話框取代。既有本地草稿／站內操作確認分別處理其可恢復與需決定的操作。

### 本輪瀏覽器重新驗證（目前候選，未部署）

| 範圍             | 實際結果與界線                                                                                                                                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 三模式 × 八格式  | 24/24，189欄逐欄不同值／保存 reload、整框九點命中、不超出容器、同列不動、72次直接選取、16次群組切換全部通過。                                                                                                                                                                                                 |
| 既有完整時間序列 | 15/15 temporal（分段高度／pan、延後捲動、手動取消、再點選、兩種原生關閉順序），完成位移均0px；27欄 Next 延後捲動通過；Shell 首末欄6/6、完成後全框命中。1440px Enter／保存、不鎖 body、不顯示手機 dock；320px群組兩模式；390px數值→筆記／工具／保存皆通過。                                                    |
| 新增關閉競態壓力 | `m11-session-race-{solo,timeline,student}.js` 共36/36：晚到 document reset 先／後 viewport、0／80／350／650ms 間隔、全高 transient、viewport pan、完成／原生 blur、關閉未完立即重進。一般關閉位移均0px；重進欄全框命中，手動 gesture 後不再拉回。這是受控事件重播，不是iPhone event telemetry。               |
| 站內確認         | 新獨立 WebKit context 未 suppress beforeunload，原生API替身遇呼叫即失敗。6/6組通過：單人／群組兩檢視移除取消／接受、完成群組取消／只接受一次、已完成改缺席取消／接受、衝突取消保留123／接受刪本地稿並reload至伺服器fixture40。逐案檢查視窗完整可見、焦點及畫面；只攔截fixture API，不作新的正式扣堂／DB證據。 |
| 未同步草稿／離頁 | 輸入123後100ms，以及2.5s已送出未回應兩案：真 IndexedDB已有草稿、beforeunload不被preventDefault、無原生API呼叫，真reload後恢復123及站內恢復提示，2/2通過。保留既有store／outbox，不要求清網站資料。                                                                                                            |

JSON證據在忽略的 `output/playwright/m11-placement-{matrix,temporal,next,shell,peer}-results.json`、`m11-session-race-results.json`、`m11-inapp-dialogs-results.json`、`m11-draft-reload-results.json`。先前多瀏覽器並行時一個既有矩陣unit超過5s，未算通過；最後關閉診斷瀏覽器後以正式 affected preflight 統一重跑。原生實機 P02／P04／P05 仍為 FAIL／待新版驗收，沒有自動勾選。

### 遠端 CI 攔下的工具相容問題（未合併／未部署）

PR #95 head 2757b1a 的 PR CI #364 / run 39797381313：browser 7/7通過，API402通過，但Web型別檢查FAIL。原因為本機node_modules實際提供TypeScript5.9，Web lock指定7.0.2；新增policy測試呼叫7.0不提供的JS compiler API。這不是產品回歸通過證據，亦不能用本機127/127掩蓋。第4／5項重新開啟：執行鎖定npm ci，將全站AST policy搬至既有儲存庫script層（root/API既有5.9 JS compiler），不改依賴／產品碼；重跑policy紅綠及affected、再送新exact-head full CI。

## 2026-10-22 release 74 發布快照（歷史，已由21:46實機退回）

**本節為release 74發布時快照。五項工程／交付工作當時5/5完成，之後已由21:46回報重新開啟；沒有宣告原生 iPhone 或 M11 結案。** 新版正式入口：[Form Coach Desk](https://formcoachdesk.com)。應用 SHA **89e08b6270e7287a878887d13851a8f675f2c863**，Fly **release 74 complete**；公開 buildId **local-1792673603571**，入口 **/assets/index-DUHrX0EU.js**。先從多工關閉已安裝 PWA 再重開，保留網站資料與既有草稿；現在只需實機重驗「任意高度直接選取、Next 同列／跨列、完成保持原位置」及原 F／K 清單。

- **修正與根因：** 選取／Next 保留焦點定位意圖以處理稍後的 native scroll／resize，手動滑動立即取消；完成前讀取最後欄位幾何再解除 scroll owner，只補實際不足的尾部空間，頁首不返回遮擋。另解除 measurement／RPE input 的全域 52px minimum 與 38px 外框衝突，保留既有外框和已接受 dock。先前中心點檢查漏掉 input 上緣被自身容器裁切，現已加入全框九點及 blur 後容器範圍。
- **完整重新驗證：** 最終 CSS 候選 e1e6a390a079051a87f1c0f9b056ddbf82cd6d0f，24/24 三模式八格式、189 欄九點命中／不同值保存 reload／同列不動／不超容器，72 次直接點選、16 次群組切換；15/15 temporal 完成位移均 0px、27 欄延後 Next、Shell 首末欄 6/6、1440px／320px／筆記同伴全部通過。CSS-only affected format／whitespace／Web typecheck exit 0，沒有相關 unit test 被誤算為 browser 證據；hook 三個新回歸及 97/97 affected 已於前一應用完成。Windows WebKit + 模擬 keyboard／fixture API 不取代實機或新 DB 證據。
- **exact-SHA 發布：** [PR #93](https://github.com/YambossMaster/Gym-Assistent/pull/93)，[PR CI #360](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39780549432) 成功，完整 check/build、root 40／API 402／Web 484、browser、migration no-op。應用 Main 的 [完整發布 CI](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39781532911) 所有必要 jobs 成功、Production history 匹配且無 pending，才部署。Main Web 與候選內容相同。無 API／schema／Auth／依賴／部署設定修改。
- **獨立讀回：** Fly machine started，image GH_SHA 與上述應用 SHA 相同，service passing；正式 /api/ready、/、/login 200，正式網域與 Fly origin 的 app-version／assets／入口 JS 相同，入口 SHA256 b2d6cb855321bd1ae4e6d5f1848a843c878c7fce1bff00029b69b24c7f0d073c。原始讀回 output/github/m11-final-production-readback.json；browser JSON 為 output/playwright/m11-placement-{matrix,temporal,next,shell,peer}-results.json。
- **剩餘與 Next：** P01 已由使用者接受；P02–P06、F／K／I 原生安裝 PWA 項未勾選，不把 release 72 的實機 FAIL 因工程 PASS 自動關閉。所有本次受影響工程清單已重新檢查；已部署可供 Product Owner 手機驗證。未操作真實課堂、帳號或草稿衝突。release 73 的晚取消與 input 裁切失敗保留在下方歷史，不隱藏。

以下是修正、失敗與中間發布歷史；目前下一步以上述已部署版本為準。

## 2026-10-22 最新補驗：release 73 已發布，發現並修正數值控制項自身裁切，完整工程重查通過，待最後發布

**當前正式版本：release 73／Main `9b2594310a2b26e987a5dfa81c2c34c91d3367be`，不是 release 72。** [PR #92](https://github.com/YambossMaster/Gym-Assistent/pull/92) 候選 `71eca63` 已完成下方工程檢查，PR CI #358（run 39777343356）成功；Main CI #359（run 39777910807）五個 jobs 均 success，但部署後才生效的取消令整個 run conclusion 為 cancelled：root 40／API 402／Web 484、完整 check/build、browser、migration no-op、Production history 匹配無 pending；Fly release 73 complete、同 SHA started／service passing，正式 `/api/ready`、`/`、`/login` 200。公開 buildId `local-1792671994815`，入口 `index-UlCi0TLk.js`，正式網域／Fly origin 同資產。這只證明 release 73 已發布，不代表原生問題通過。

原四項工程工作完成後，**新增第 5 項 P1**：補上原 fixture 未帶入的 CoachWorkspace 頁首／底部導覽 DOM 與 CSS 邊界，三模式首欄／末欄完成後九點命中。不是新增功能；其目的為排除完成後仍看不到剛編輯欄位。按學生首欄雖位移 0，上方三個取樣點卻命中 row，故立即判 FAIL。自動部署取消請求送出時 deploy job 已完成，獨立讀回確認 release 73；沒有聲稱已成功阻止發布，採最小後續修正，不退回已知定位失敗的 release 72。

### 第 5 項工作／P06（修正及完整工程重查完成，待最後 CI／發布）

- [ ] **P06 / K15：input 不能被自己的容器裁切。** 選取中與完成後，所有數值 input 的上下邊界應在 measurement-control 內，且九點命中；首欄／末欄、單人／群組兩檢視、八格式都重查。這是 P05 的新具體失敗，不可用欄位中心點可點代替。
- **確定原因：** 全域 `input { min-height:52px }`，但數值 `measurement-control` 只有 38px（overflow hidden），input 本身 height 36px 被 min-height 撐至 52px。完成後按學生首欄 input top 163.5、container top 178.5，頂部 15px 被裁掉；上方三點失敗，中心／下方仍可點。這也說明為何只檢中心點會漏掉。
- **最小修正：** `.measurement-inputs input` 加 `min-height:0`，直接 RPE input 亦解除 min-height 並使用既有 label 的 100% 高度，讓既有 36px input 遵守原本 38px 控制項設計。外框／排版、dock、定位 hook、API／DB 不改。相同 Shell 六案由 FAIL 轉 **6/6 PASS**，完成位移都是 0px。
- **最終重查完成：** 24 格式矩陣全部改成九點命中，新增 blur 後所有 measurement input 不超出容器；重跑 15 案 temporal、27 欄 Next、六個 Shell 邊界與桌機／320px／筆記同伴。全部通過後推送本分支 `codex/m11-input-control-clip`、exact-head CI、合併、部署、讀回。未做新的實機勾選。
- **影響面：** measurementInputs 的八格式單人及群組兩檢視、桌機同元件；保留現有 38px 外框。只修 measurement 時，矩陣又攔下同列轉 RPE 會移動：RPE 仍被全域 52px 撐大，已一併讓其遵守既有外框。純 CSS 修正，既有三個 hook regression 及 release 73 full suite 是未變邏輯基線；新 CSS geometry 由真瀏覽器重跑，不能以未選出 unit test 當證據。

**三行 CSS 的最終結果：** 全部 **24/24、189 欄**重新跑完，逐欄九點命中、完整不遮擋、同列不動、每例改值保存 reload、八格式在 blur 後不超出容器通過；72 次直接選取／自由滑動、16 次群組檢視往返通過。重新執行 **15/15 temporal**（所有完成位移 0px）、**27 欄 Next** 延後捲動／九點命中／一致高度，以及 **Shell 6/6** 首欄／末欄完成可見／導覽恢復。1440px Enter／保存、320px 兩群組模式、390px 手動滑回頁首切筆記與筆記保存同伴皆重新通過。正式檢查 `npm run check:affected -- origin/main` exit 0：format／whitespace／Web typecheck；CSS-only 無 statically related unit tests，未將此當 browser pass。最終原始及摘要仍在 `output/playwright/m11-placement-{matrix,temporal,next,shell,peer}-results.json`。原生實機項目仍保留未勾。
以下 19:32 回報與 release 72／73 的工程紀錄保留，當前 Next 以本節為準。

## 2026-10-22 19:32 實機退回：release 72 定位／完成失敗，本輪工程驗證已通過

**本節取代下方「實機待驗／唯一下一步」的舊結論。** Product Owner 的兩支 iPhone 錄影已證明 release 72 仍未修好；已接受操作列固定高度，保留其設計與位置。不可再把模擬矩陣通過寫成原生問題通過。

本輪分支 `codex/m11-input-placement`，基底 Main `8cedad4c964e19ccb2b075b4ce77d15f25e6993e`（應用 release 72 為 `a8f298d`）。沿用已授權的「完整驗證後部署」順序。範圍僅 Training 數值 viewport、對應 CSS 與回歸；不改 API／DB、群組設計或穩定的操作列。

### 四項有界工作（目前 3/4 完成；待遠端 CI／部署）

1. **完成：影片／紅色重現。** `19-32-07`（12.10s）約 1–4s 選取／前進時，數值列在操作列後方；約 10–11s 完成後內容返回上方。`19-31-22`（30.53s）約 9–12s、18–20s、27–29s 完成／重進時內容位移。來源為 Downloads 中使用者指名的兩支 mp4，未當成程式指令。抽幀位於忽略的 `output/playwright/video-review/{short,long}.jpg`。
2. **完成：直接選取／Next／完成分開處理。** 已完成修正及受影響整組驗證。直接選取無論原本高度皆定位；Next 保留同列位置並確保跨列不遮擋；完成只結束鍵盤／dock，維持剛才欄位的可見位置，不返回進入時高度。手動滑動取消定位意圖；下一次選取再建立。
3. **完成工程重查：全部受影響清單。** 三模式 × 八格式輸入保存／reload、上中下／整張課表末欄、延後 native scroll、鍵盤多階段 resize／pan、完整輸入框多點 hit test、完成前後逐幀位置、重進、手動滑動、快速連按、桌機與筆記切換；F／K／I 原清單全部核對。已發布的 API／DB 未改，沿用其證據，不把 mock 保存當新 DB 證據。
4. **下一步：exact-SHA CI／部署／正式讀回。** 原生 iPhone PWA 安裝驗收在部署後，仍須分開記錄；不得事先勾選通過。

### 新增及重新開啟的驗收條件

| 檢查                                | 操作與通過條件                                                                             | release 72 實機結果／本輪狀態                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| [x] P01 / F05–F06                   | 操作列固定高度與可點位置，切欄不亂跳                                                       | 使用者明確接受；維持，不重新設計                   |
| [ ] P02 / F07 / K03,K09,K11         | 從任意原始高度直接選取，鍵盤動畫及瀏覽器延後捲動後輸入框仍全部可見，不被操作列／頁首蓋住   | **FAIL**，兩片；新回歸先紅後修                     |
| [ ] P03 / F08–F10 / K03,K06–K08,K10 | Next 同列不動、跨列正確；包含課表最末列、延後捲動／viewport 改變；手動滑動不拉回           | **FAIL**，短片前段；重跑完整矩陣                   |
| [ ] P04 / F11 / K14                 | 完成／原生關閉不重新定位、不返回原始高度；欄位保持視覺位置，僅鍵盤與 dock 收起，再點能重進 | **FAIL**，兩片；新增獨立檢查，不能用 dock 隱藏代替 |
| [ ] P05                             | 每次焦點動作檢查整個 input 矩形及內部多點命中，動作至穩定的時間序列；有遮擋即失敗          | 舊矩陣只檢定位後中心點，證據不足，必須重查         |

### 已確認原因與驗證缺口

- `m11-placement-repro.js` 修正前：延後內部捲動令 input bottom **416**、dock top **414**，重疊；完成前 input top **164**，完成後 **669**，回跳 **505px**。這是 Windows WebKit + 明確注入的瀏覽器捲動，不聲稱已攔到 iPhone native event log。
- 舊 hook 第一次定位後即清空 pending，之後的 native scroll／keyboard resize 不再檢查所選欄位。新增兩個正式 regression，修前各失敗（384 vs 164、344 vs 132），修後通過。手動 touchmove／wheel 仍取消校正。
- 完成時 React 先移除 focused class，該 class 同時控制 fixed／overflow 容器，捲動位置在 cleanup 讀取前就失去。viewport 鎖改由 effect 的 root class 持有至 cleanup；釋放前記錄最後欄位的實際位置，再交還 document。僅當實測缺少捲動範圍時增加最少尾部空間，離開 Workspace 清理。
- 同一 browser 重現修後：延後捲動後 input top **163**，bottom **215**，dock top **414**；完成前後 top **163 → 163**，位移 **0px**。尚不足以單獨結案，仍需第 3／4 項。
- 外部依據：WebKit 的 [focus preventScroll 問題紀錄](https://bugs.webkit.org/show_bug.cgi?id=236584) 說明焦點與 native scroll 邊界；此歷史紀錄不是本機 iOS 版本仍有同 bug 的證明。本輪以事件後實際幾何作判斷，不依賴 preventScroll 必然成功。

### 本輪完整工程檢查（2026-10-22，基底 8cedad4 + 本輪四檔）

| 原清單／範圍                                       | 重新執行的證據與結論                                                                                                                                                                                                                                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F01–F04,F12 / K01,K02,K12,K13 / I01–I12 的工程部分 | `m11-run-matrix.ps1` 逐案保存 **24/24**（單人／按時序／按學生 × 八格式），**189 欄**不同值、精確 touch Next、保存 reload；16 次群組檢視往返，72 次上中下直接點選、自由滑動與完成重進皆通過。實際 API／DB 與原生鍵盤不在 mock 證據內。                                                   |
| F05–F10 / K03–K11 / P02,P03,P05                    | `m11-temporal-{mode}.js`：三模式、整張課表末欄、80／350／730px 起始點，740→600→480px 高度及 20→55→90px viewport pan；每次九點 hit test、延後捲動後 10 個取樣，共 **9 場景／90 個延後捲動取樣**通過；滑動不追、重點恢復定位。                                                            |
| F08–F09 / K03,K06,K07 / P03                        | `m11-next-temporal.js` 三模式 **27 欄**，每次 Next 後另外注入 160px 延後 native scroll，欄位精確索引、完整矩形與九點命中、一致 anchor 通過。這是受控事件注入，不冒稱 iPhone event log。                                                                                                 |
| F11 / K14 / P04                                    | 上述 temporal 共 **15 案**（九次 dock 完成，三模式各兩種原生關閉先後），完成前後欄位位移全為 **0px**；完成後九點命中也通過。整張課表尾端實測只需補 347／338／373px，反覆重進不累加。                                                                                                    |
| 桌機／窄手機／筆記直接 consumer                    | `m11-full-peer-verify.js`：1440px Enter、改值保存 reload、dock 隱藏、不鎖 body；320px 群組兩模式各九欄；390px 數值手動滑回頁首→一次真 click 切教練筆記、工具列、實際筆記輸入保存皆通過。locator 自動 scrollIntoView 被焦點定位拉回，故明確使用真實手動滑動路徑，未以 force click 迴避。 |
| 格式／型別／正式回歸                               | 最終 `npm run check:affected -- origin/main` **exit 0，6 檔 97/97**、Web typecheck、changed format、whitespace 通過；新增三個正式 regression。前兩項先紅後綠，第三項驗末欄完成最少補高與重複完成不累加。                                                                                |
| G01–G13 / E01–E06                                  | 無群組建立／編輯、API、Auth、資料權屬、依賴或部署設定變動，保留既有接受基線；未處理真實課堂或草稿衝突，未要求額外帳號。E06 歷史停止已被本輪修正與先驗再部署指示取代。                                                                                                                   |

**所有 P／F／K 的原生實機核准仍未勾選**（P01 已由使用者接受）。上述 PASS 僅指本輪工程檢查；release 72 原生 FAIL 不會因模擬 PASS 自動關閉。

完整驗證另外攔到：完成後雖位移 0，sticky 頁首返回仍會覆蓋末欄；已改為該 Training 頁首維持普通文流，完成不重新蓋住剛編輯的欄位，滑回上方可見、筆記模式不套用，離開 Workspace 清除。增加完成後九點命中才重跑 temporal。早期長 CLI 工作有逾時／重複 dialog handler，未計入 PASS；改成單格式／單模式執行並確認 JSON 結果，隔離 fixture 的 beforeunload 提示由測試 suppress，未宣稱驗證正式草稿離頁保護。

本地 JSON：`output/playwright/m11-placement-{matrix,temporal,peer}-results.json`，畫面 `m11-placement-complete-{solo,timeline,student}.png`。本輪原始重現、script、影片抽幀均在忽略的 output，無 DEBUG 正式碼。原生安全回復點為 release 72 `a8f298d`；它本身仍有已知定位問題。Next：提交四檔、授權 PR exact-head full CI，成功後才合併／部署，再讀回版本。

以下為歷史發布及交接紀錄，不能覆蓋本次實機 FAIL。

## 2026-10-22 最新結果：部署前完整驗證通過，release 72 已發布，實機待驗

**順序已依最新指示完成：完整驗證 → 合併 → Main 發布檢查 → 部署 → 獨立讀回。** 本輪發布關卡 4/4 完成；原六項清單的工程／交付部分完成，iPhone PWA F／K 實機結果仍未取得，不能宣告 M11 或原生鍵盤問題已結案。

| 證據               | 最終結果                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 修正版本           | [PR #90](https://github.com/YambossMaster/Gym-Assistent/pull/90)，最終 head `e1bc8359bf2f3611dab4b13d096079edd14a4904`；squash Main／應用 SHA **`a8f298d991c42e4c00df1d089258e00be5b11595`**。合併後 Web 與已驗證候選 diff 為空。                                                                                                                                                                      |
| 部署前完整 CI      | [PR CI #354](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39762927100) 成功：root **40**、API **402**、Web **481** 測試，完整格式／型別／production build、桌機／手機 browser-ui、無 migration 的成功 no-op。最終 affected preflight **98/98**。                                                                                                                                        |
| 受影響完整 browser | 最終版本重新跑 `output/playwright/m11-full-verify.js`，3 檢視 × 8 格式 **24/24**、**189 欄**不同值輸入／精確 touch Next／保存 reload、16 次群組檢視往返、72 個上中下直接點選、自由滑動、完成／重進皆通過。Windows WebKit、模擬鍵盤與 API。                                                                                                                                                             |
| 同伴流程           | `m11-full-peer-verify.js`：1440px Enter／保存 reload／dock 隱藏／不鎖 body；320px 群組兩模式各 9 欄命中／前進／完成；390px 數值→筆記一次 click／tap 切換、工具列、數值鎖清理、實際筆記輸入保存皆通過。完整驗證曾攔下筆記切換缺陷，修正後重測再發布，詳見下方。                                                                                                                                         |
| Main 發布 CI       | [Main CI #355](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39763437009) **五個 jobs 全部成功**：verify、browser-ui、migration-dry-run、production-migration-preview、deploy-production。Main full check/build 同為 root 40／API 402／Web 481。Production history log：`Linked database migration history matches this commit.`，無 pending／無 SQL 套用。                              |
| Fly 執行證據       | **release 72，status `complete`**；machine `874ddec06064d8` 為 started；image label `GH_SHA` 與 `a8f298d...` 完全一致；image digest `sha256:72634cbdfd1fb53c3bf54183b9348b3f187fb59cc70e692d3b61a0dccce990c4`；`servicecheck-00-http-3000=passing`。                                                                                                                                                   |
| 獨立正式站讀回     | `https://formcoachdesk.com/api/ready`、`/`、`/login` **200**，SPA 讀回帶 `Accept: text/html`。正式網域與 `formcoachdesk.fly.dev` 的 app-version、assets 和入口 JS SHA256 相同；首頁引用新版入口。buildId **`local-1792665235858`**，入口 `/assets/index-BYi9hcyN.js`，SHA256 `bb1e8a3b0453e9e45e4a9343922305eed80c0f4987f3d85771201296f42133b4`。buildId 不是 Git SHA，Git 身分由 CI／Fly label 證明。 |
| 影響範圍           | 正式產品僅三個 Training 檔案的焦點／dock／tab 交接；兩個正式測試檔新增共 31 案例；無 API、schema、Auth、共用 CSS、依賴或部署設定變更。群組建立／編輯與已接受設計保留。未操作真實課堂或草稿。                                                                                                                                                                                                           |

### 目前唯一下一步：Product Owner 安裝 iPhone PWA 實機驗證

正式入口：[Form Coach Desk](https://formcoachdesk.com)。先從多工畫面關閉已安裝 PWA 再重新開啟，確保重新載入新版；保留現有草稿及衝突選擇，不要求清除網站資料或重建帳號。可識別版本為 release 72／應用 `a8f298d`，公開 buildId `local-1792665235858`。

先檢查 F01–F03：單人與群組按時序／按學生，點任一數值欄，確認操作列出現；連續「下一格」精確前進且原生鍵盤持續開啟。再按原清單檢查同列／跨列／末列、手動滑動後重點、實際輸入保存重開、完成後重進及數值→筆記切換。**所有原生 iPhone F／K 項仍待實機，原清單不勾成通過；工程測試、CI、發布與 HTTP 成功不取代此結果。**

本地證據：`output/playwright/m11-final-verification-summary.json`、`m11-full-{view}-{format}.png`、`m11-full-desktop.png`、`m11-full-320-{timeline,student}.png`；獨立讀回腳本及原始摘要 `output/github/m11-production-readback.{ps1,json}`。均為忽略的測試輸出。發布證據文件分支 `codex/m11-input-verification-release`，基底為上述應用 Main；本段不改應用或再部署。

以下授權、在途 gate 與本機交接段落為歷史過程，當前狀態以本節為準。

## 2026-10-22 目前授權：先完整驗證，再部署

Product Owner 已明確指示「請先完成完整驗證後，再進行部署」，並保留先前「尚未部署，請先進行部署，才能手機 PWA 實機驗證」的發布授權。因此本候選可執行完整驗證、提交／推送 PR、必要檢查通過後合併 Main 及部署；不再等待本機預覽核准。安裝 iPhone PWA 驗收仍排在部署之後，未以測試或部署成功代替。

發布關卡共 4 項：

1. **Main／候選核對：完成。** GitHub 及 `git fetch origin main` 確認 Main 仍為 `cd5402e6cb782d3c4d7f1d28a42e743efb6140e9`，候選只有本輪五個 Web 檔及三份交接／發布文件；正式產品只改三個 Training 元件／hook，沒有 API、schema、Auth、共用 CSS、依賴或部署設定變動。97 項 affected preflight 沿用同一版已完成證據。
2. **完整部署前驗證：執行中。** 按 F／K 清單及直接 consumer 做 Training 桌機／手機、單人八格式及群組兩檢視輸入、保存重開、模式切換與教練筆記；完整 check/build 和既有 browser-ui 由本 PR exact-SHA CI 執行。沒有 migration 變動，Development migration job 應為正式 no-op；Main 的 Production history preview 仍須成功且無 pending，才允許自動部署。沿用未變的正式 API／DB 已發布邊界，fixture 保存結果不升格為新 DB 證據。
3. **授權合併／部署：待第 2 項通過。** 先記錄 PR head、所有必要 checks，再以該 head squash merge；Main exact-SHA 的 verify、browser、migration、Production preview 全通過後才由既有 workflow 部署。任何必要檢查失敗先修正，不跳過。
4. **正式服務／版本讀回與實機交接：待部署。** Main SHA、Fly running image `GH_SHA`、service checks、公開 `/app-version.json`、`/api/ready`、`/`、`/login` 獨立讀回；之後交付明確版本供 Product Owner 安裝 PWA 檢查 F01–F12／K01–K13。本輪原生鍵盤通過與否仍未確定。

下方「待檢視／未授權」為此前本機交接快照，已由本節最新指示取代。分支仍為 `codex/m11-input-incident-status`；正式站因限制環境 DNS 讀取失敗尚未取得新事實，改用允許的網路路徑重查，不把 DNS 錯誤當產品故障。

### 完整驗證發現的同伴缺陷（部署前攔下）

- 已建立 [PR #90](https://github.com/YambossMaster/Gym-Assistent/pull/90)，首版 head `449821ba52fd4e00d458979725631455b3bd7cf8` 的 [CI #353](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39761476160) 通過 full check/build（root 40、API 402、Web 480 測試）、browser-ui 與無 migration 的正式 no-op。尚未合併／部署。
- `m11-full-verify.js` 完整 24 組（3 檢視 × 8 格式）通過 189 個逐欄不同值、精確 touch Next、每例保存 reload、16 個群組檢視往返、72 個上中下直接 touch、自由手動滑動及完成。這些仍是 Windows WebKit、模擬 viewport 與攔截 API；非實機／DB 證據。
- **P1，同伴流程失敗，維持部署關卡 2 未通過：** `m11-full-peer-verify.js` 在數值輸入中切「教練筆記」時失敗；最小 `m11-note-switch-repro.js` 證明 mouse click／touch tap 都不切換（`aria-selected=false`）。mousedown 的原生 button focus 提前 blur 數值框，釋放 click 前解除 body 鎖導致按鈕移位；程式切換 tab 亦未明確清除數值模式，新 Workspace 回歸在修正前證明 tab 已選但 dock 留著。這是已規劃第 2／5 項直接 consumer，沒有增加 Roadmap 範圍。
- **最小修正：** 僅數值輸入期間，tablist mousedown 阻止提前搶焦點，等原有 click 執行分頁切換；明確選 tab 時 blur 數值框並清除數值模式。數值列的 retarget click 仍保留輸入，鍵盤 tab 導覽保留。
- 修正後最小測試 2/2（明確切筆記結束、數值 row click 不結束）；相同真 click／tap 均一次切到筆記（`aria-selected=true`、note visible、numeric=false）。新增一個正式回歸，本輪新增共 31 個。最終 affected preflight exit 0：格式、whitespace、Web typecheck、7 檔 **98/98** 通過。整組同伴檢查亦通過：1440px Enter 精確前進、改值保存 reload、dock 隱藏與 body 不鎖；320px 群組兩模式各 9 欄實際可見／命中／前進／完成；390px 數值→筆記切換、工具列、清除數值鎖與實際筆記輸入保存。接續新 head CI 及完整矩陣重查；舊 head 綠燈不作新版本證據。
- GitHub connector 建 PR 重試後仍 `403 Resource not accessible by integration`；以既有 Git credential（僅記憶體、無輸出／存檔）呼叫官方 REST 建立同一工作分支 PR，已附加至本 chat。Git push exit 0，`credential-cache unavailable; no unix socket support` 為前置 helper 訊息，既有後續 helper 已成功送達並讀回 SHA。
- 正常網路唯讀已確認部署前 Fly running image `GH_SHA=9447eb72c0968610a360dddfe978053cb3429630`；公開 app-version buildId 是本地格式 `local-1792658253914`，不能拿它當 Git SHA。發布後以 Main CI、Fly image label 與公開資產合併建立版本證據。

## 2026-10-22 恢復工程：本機候選完成，待檢視與完整交付

Product Owner 已在新對話明確要求接手、徹底檢查與修正；下方歷史「停止修改」限制已由本次恢復指示取代。遠端 push、merge、部署及完整 CI gate 尚未獲本版授權。

- 工作樹：`output/m11-student-group`；分支 `codex/m11-input-incident-status`；HEAD `cd5402e6cb782d3c4d7f1d28a42e743efb6140e9`。保留接手時三份未提交文件及主目錄大量既有刪除。
- 有限清單共 6 項：①接手及影響盤點、②F01–F03 失敗迴圈、③焦點／操作列修正、④定位與 K 清單聚焦檢查、⑤輸入保存及同伴流程的**本機部分已完成（5/6）**；⑥可檢視版本已備妥，仍待 Product Owner 檢視、完整 gate、遠端授權及實機。原生鍵盤與裝置項未完成，不能宣告問題已徹底修復。
- 基底與最後部署的 Web 程式相同（`cd5402e` 對 `9447eb7` 無既有 Web 差異）。變動邊界預定為 Training 路由的 dock、viewport hook、焦點事件；不改群組已接受介面、API、DB、權限、App Shell 或共用 CSS。

| 直接使用流程       | 必須保留                                     | 決定性聚焦檢查                                                | 仍缺證據                       |
| ------------------ | -------------------------------------------- | ------------------------------------------------------------- | ------------------------------ |
| 單人所有紀錄格式   | 按畫面欄序前進、值保留、同列不動、最後欄完成 | 真 TrainingWorkspace 焦點／事件與 viewport 回歸；本機隔離預覽 | 真 iPhone 鍵盤及全格式裝置矩陣 |
| 三人按時序／按學生 | 同一草稿、每組自然人成員、模式切換不丟值     | 多模式欄序與輸入保存預覽                                      | 真 iPhone PWA                  |
| 桌機數值欄         | 不鎖 body、不顯示手機 dock，Enter 正常       | 桌機聚焦檢查                                                  | 本版完整 browser gate          |
| 教練筆記           | 現有焦點模式、工具列及手動捲動               | 既有 gesture 測試與預覽同伴檢查                               | 本版真 iPhone 同伴檢查         |

失敗迴圈：`npx vitest run src/pages/training/TrainingWorkspace.gesture.test.tsx -t 'viewport height expands|same still-focused' --maxWorkers=1`（cwd `apps/web`）。兩項均在未修改實作時 FAIL：仍有焦點時 viewport 增高移除 dock；再點同欄無法恢復。這證明目前程式可發生狀態與 DOM 焦點分離，不證明使用者 iPhone 最新失敗的完整事件序列。首次沙箱執行遇暫存 rename EPERM；沙箱外重跑得到上述斷言。

### 本輪確定的缺陷與最小修正

1. **仍聚焦時 viewport 增高卻清掉編輯狀態**：舊 hook 僅憑高度判斷關鍵盤，移除 dock，但 DOM input 仍聚焦，再點同欄也不觸發新 focus。現在同時核對 DOM 焦點，且點既有焦點欄也能恢復輸入狀態。
2. **釋放 click 目標變為欄位祖先時，父層誤判離開**：加強 WebKit touch 檢查在保存重開、手動滑動後點中段欄位時，實際發生 active input 索引 9、dock 消失；最小 row-click 測試也在修正前 FAIL。父層現在核對目前焦點是否仍是本工作區數值 input，再決定是否結束。相同真 touch 路徑修正後通過。這是本輪真正新增而舊 Next-only 腳本未覆蓋的失敗迴圈。
3. **一次釋放可能執行兩次**：pointerup 已前進後，detail=0 click 仍執行，兩欄情境會再完成並 blur；重播序列在修正前 FAIL。現在消耗後續 click，不依 detail 決定；鍵盤新啟用會重置該判定。這證明程式對該序列的缺陷，不證明最新 iPhone 恰收到此序列。
4. **後續 mousedown 可搶走焦點**：新增精確重播 pointer release → 相容 mousedown 的預設按鈕 focus → click，舊版焦點錯誤，修正後維持正確下一欄。保留同步 gesture 中 focus；新增防止 mousedown 搶焦點。
5. **完成／原生離開的收尾**：明確完成時直接結束數值模式，不等 viewport 才移除 dock；對 viewport-before-blur 順序補 deferred DOM focus 檢查。這個相反順序先 FAIL，再修正並重查。null-blur-focus 的正常換欄仍不拆 dock。

以上全在原有③／④／⑤項內完成，未擴張為新 Roadmap 包；保持既有每個動作內的欄序與動作邊界、群組介面、數值規則和保存 API。

### 本輪證據（全部為 `cd5402e + working tree`，未提交）

- 最終 `npm run check:affected -- cd5402e6cb782d3c4d7f1d28a42e743efb6140e9` **exit 0**：8 個變更檔（含原有 3 份文件），Web 5、API 0；變更檔 Prettier、diff whitespace、Web typecheck、7 個靜態相關測試檔 **97/97**。本輪新增 30 個案例，含三模式 × 八格式的 24 個實際改值／精確欄序／完成重進／mock save-reopen 案例。
- Windows Playwright WebKit、390×844、真正 `tap()`（但 visualViewport／鍵盤為模擬）：既有 `output/playwright/pwa-surface-check.js` 通過單人 18、按時序 27、按學生 27 欄，共 **72 個精確欄位、48 次同列不捲動**；實際 `elementFromPoint`、dock 不中斷、root 不跟著捲、8px 模擬可視下緣間距、自由滑動及完成通過。
- 加強版 `output/playwright/m11-input-incident-check.js` 在父層 click 修正前抓到上述直接點選 FAIL；修正後三模式皆通過 **72 欄逐欄填入不同值、touch 前進、mock 保存後 reload 精確讀回、上／中／下直接 touch、手動捲動不拉回、viewport 增高仍保留 dock**。保存寫入是 fixture 攔截 API 後存在隔離 localStorage；不是正式 API／DB 寫入證據。
- `pwa-surface-peer-check.js`：1440px 桌機不鎖數值捲動／dock 隱藏，390px 教練筆記焦點及工具列保留，沒有數值 padding。最終父層 click 修正另由受影響 gesture 測試覆蓋。
- 數值預覽原 fixture 不完整：`measurements` 未使用的維度沒有補 `null`，導致 `validMeasurements` 拒絕整份草稿、看似儲存中但未發出 mutation。已確認草稿存在、request=0，再對照有效性規則定位；補齊**合成 fixture**後保存／重開通過。未改正式保存規則，不把此問題當真實資料遺失。
- Chrome 首次連線沙箱 server 逾時，改沙箱外 loopback server 後實際頁面可讀；後續 viewport set／reset 均遇 `js execution timed out; kernel reset`，Chrome 尺寸狀態無法確認。已改 Playwright CLI 隔離 WebKit 診斷，並為使用者建立不需調整 Chrome 尺寸的 iframe 預覽。Windows 沙箱後續啟動亦出現兩次 `CreateProcessSecurityEnvironment ... 0x80070020`；受影響命令經允許的沙箱外執行取得上述結果。
- 暫時 `[DEBUG-m11-save]` 正式原始碼訊息已移除；五個 Web 變更沒有 API、DB、Auth、App Shell、共用 CSS 或部署改動。輸出位於已忽略的 `output/`、`apps/web/output/`、`.playwright-cli/`。
- 技術依據：[WebKit user activation](https://webkit.org/blog/13862/the-user-activation-api/)（touch pointerup 與 touchend 的手勢資格）、[W3C Pointer Events](https://www.w3.org/TR/pointerevents/latest/)（pointer 取消與 click 的關係）。來源說明事件邊界，不是裝置通過證據。

### 功能／歷史清單的本機證據對應與剩餘界線

| 項目                  | 本輪已檢查                                                                          | 尚未建立的證據                                                   |
| --------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| F01–F03、K01–K02、K12 | viewport／focus／row click 失敗轉通過；真 WebKit tap 精確前進與反覆進入             | iPhone PWA 原生鍵盤持續開啟，最新兩項實機失敗已消失              |
| F04、F11–F12、I12     | 24 個三模式八格式改值保存重開；真瀏覽器三模式不同值 reload、完成重進                | 本版正式 API／DB round-trip、真裝置全部格式；既有服務層未改      |
| F05–F10、K03–K11、K13 | 模擬 viewport 下同列、跨列、末列、間距、實際命中、手動滑動與直接重新聚焦            | 原生鍵盤／工具列、開關動畫、視窗平移、固定位置連按的完整實機觀察 |
| I01–I11               | 包含 offset、viewport 增高、null handoff、精確索引、命中與 touch；記錄 fixture 限制 | 模擬不是 iOS，原清單不勾為裝置完成                               |
| G01–G13               | 未修改已接受群組新增／編輯與出席／兩檢視呈現；群組直接 consumer 聚焦測試通過        | 本版完整整合及裝置 gate，不重設計群組                            |
| E01–E06               | 已恢復工作；未要求未部署版本實機操作；未要求額外帳號／Prime、未碰真實草稿           | 部署後才安排安裝 PWA 實機；E06 歷史停止已由本輪指示取代          |

F／K／I／G／E 原清單保留未勾；下方 release 71 FAIL 為歷史部署結果，不被本機測試取代。

### 可檢視版本與唯一下一步

- 已啟動本工作樹 Vite，僅 `127.0.0.1:5180`。入口：[訓練輸入本機檢視](http://127.0.0.1:5180/output/m11-input-review.html)。提供單人／按時序／按學生，390px iframe，鍵盤空間明列為模擬；合成模型保存至 localStorage，所有 fetch 由 fixture 攔截。不是 Production／真鍵盤。
- 預覽本身已用 WebKit touch 驗證第一欄 → 精確第二欄（index 1）。截圖：`output/playwright/m11-input-review.png`；各模式數值截圖 `m11-incident-{solo,timeline,student}.png`。已向 Codex 提交開啟此 URL（工具回傳 queued）。
- 下一步：Product Owner **只需檢視目前本機候選，決定是否準備進入完整驗證**；不要求現在替 agent 做整輪排查或安裝未部署版本。本版沒有沿用舊版驗收／遠端授權。
- 檢視核准後，依原 Contract 跑尚缺的完整流程與服務／裝置 gate；遠端 push／merge／Production 發布前，先提供最終 commit、檢查、缺口與精確動作，另取得明確授權。部署後才能確認原生 iPhone PWA 的 F／K 項並決定結案。
- 仍在本地未提交候選；僅本 Status 與五個 Web 原始檔為本輪修改。接手時 `PROJECT_STATUS.md` 及月誌的原有未提交內容保留，不以分支作者身分改寫整合事實。

## 恢復前交接快照（歷史，不是目前停止指令）

> 更新：2026-10-22，release 71 交接後再次被 Product Owner 判定失敗。
> **目前狀態：功能未達標。使用者要求停止程式修改，先完成此份交接。**
> 最新實機回報：①按「下一格」直接關閉鍵盤、結束輸入，沒有前進；②有時點選輸入框不出現「下一格」操作列。
> 目前最後確認的部署：Fly release **71**，應用 SHA `9447eb72c0968610a360dddfe978053cb3429630`；文件 Main `cd5402e6cb782d3c4d7f1d28a42e743efb6140e9`。
> 本次僅文件整理，分支 `codex/m11-input-incident-status`，基底為上述文件 Main；尚未推送或合併，未修改、回滾或重新部署應用。

## 1. 接手者先讀：任務與執行順序

1. 本文件是本段對話的完整要求、修改歷史、問題總表及驗收清單；較早 M11 Sol 紀錄見 [STUDENT-GROUP.md](STUDENT-GROUP.md)。下方舊版英文紀錄是歷史證據，不是目前成功結論。
2. **目前只獲要求整理交接。不要因先前的修正／合併／部署預先授權而自行恢復修改程式。** 使用者明確要求恢復工作後，再開始修正。
3. 恢復時先執行第 2 節「功能要求」清單，基本功能過關後，依第 3 節逐個檢查所有歷史錯誤，最後跑第 4 節跨流程矩陣。不得只測最新一個 Bug。
4. 任何修正都要保留其他項目的結果。改動影響先前通過項時，該項重開為待驗；不得沿用舊結果或只增加新測試數量。
5. 最後一次操作的兩個失敗已足以判定 release 71 不符合基本功能，不能再標成「已修復、只剩使用者確認」。本次沒有新增影片；最新文字回報就是失敗證據。
6. 工作目錄：`D:/Programs, Codes, Projects/Projects/Gym Assistent/output/m11-student-group`。主目錄有大量原有變更／刪除，請保留；接手先查此隔離工作樹的 branch、HEAD、dirty files、AGENTS 與本文件。

### 接手時的檔案與證據入口

- 目前本地只有本 Status、`docs/PROJECT_STATUS.md`、`docs/status/log/2026-10.md` 三份未提交文件變更；不要覆蓋這份交接，也不要誤認已同步到 Main。
- 焦點／失焦狀態：`apps/web/src/pages/training/TrainingWorkspace.tsx`；觸控／Next：同目錄 `SetInputAdvanceDock.tsx`、`set-input-navigation.ts`；鍵盤 session／捲動：`useSetInputViewport.ts`；版面：`apps/web/src/styles.css`。本次沒有修改這些檔案。
- 現有測試：同目錄 `TrainingWorkspace.gesture.test.tsx`、`SetInputAdvanceDock.test.tsx`、`set-input-navigation.test.ts`，以及 `apps/web/src/mobile-app-behavior.test.ts`。特別核對 mocked visualViewport／jsdom 的限制，不能把它們當原生鍵盤。
- 先前忽略的本機檢查：`output/playwright/pwa-surface-check.js`、`pwa-surface-peer-check.js`，預覽 fixture 在 `apps/web/output/pwa-input-review.{html,tsx}`；是測試輔助，不是正確性規格。15:49 影片聯絡表在 `output/diagnostics/pwa-1549/contact.jpg`。
- 本段錄影位於 `C:/Users/User/Downloads/`，檔名列於各輪 T00–T06；圖片為使用者附檔。最新 release 71 失敗只有本對話文字，未附新影片。不要憑舊錄影推定最新失敗的事件順序。

### 判定方式

- `[ ]`：尚未可靠證明此項在目前版本達成；包含「已失敗」及「待驗」。
- `[x]`：限定在明確列出的版本、環境與操作中通過。歷史驗收另列，不自動勾到目前版本。
- 每次執行都填：**版本 SHA／裝置與系統／操作步驟／實際結果／通過或失敗／證據**。
- 單元測試、模擬 viewport、Windows WebKit、CI、HTTP 200、部署成功，只證明各自檢查內容；不能代替已安裝 iPhone PWA 的鍵盤、觸控與視窗移動。

## 2. 我們真正要求的功能：先檢查這一關

以下是使用者逐次澄清後的目前要求。**操作列固定在鍵盤上方；焦點操作時定位輸入框；手動滑動期間不追著輸入框重新定位。**

| 檢查    | 功能與操作                                      | 必須出現的結果                                                                   | 目前判定                                                               |
| ------- | ----------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [ ] F01 | 從未輸入狀態點選任一訓練數值輸入框              | 鍵盤開啟，顯示「下一格」操作列；每次進入輸入都有效                               | **失敗：release 71 最新回報有時沒有操作列**                            |
| [ ] F02 | 在尚有下一欄時按一次「下一格」                  | 精確前進目前畫面順序的下一個輸入框；不是維持原欄，也不是跳兩欄                   | **失敗：release 71 最新回報沒有前進**                                  |
| [ ] F03 | 在尚有下一欄時連續使用「下一格」                | 鍵盤持續開啟，不必關鍵盤、重點輸入框、再開鍵盤                                   | **失敗：release 71 最新回報直接關閉鍵盤、結束輸入**                    |
| [ ] F04 | 在各欄實際輸入值，再前進、儲存與重開            | 原有輸入／保存行為正常；焦點切換不丟值、不意外改其他欄或其他學生                 | 待驗；沒有實證資料遺失，不得寫成已發生                                 |
| [ ] F05 | 鍵盤開啟後觀察操作列，切欄、換列、連按          | 操作列始終在鍵盤及其原生工具列的上方、小幅間距；不被遮住，也不漂到很高           | 待實機確認；8px 是先前實作目標，並非使用者指定的唯一判定標準           |
| [ ] F06 | 在同一按鈕位置連按「下一格」                    | 操作列不閃爍、不消失重現、不改變可點位置，不露出底下按鈕造成誤觸                 | 歷史失敗，release 71 尚無可靠通過證據                                  |
| [ ] F07 | 第一次點選輸入框，包括原本已可見的欄位          | 鍵盤顯示後把該列一次定位到一致的可見高度；不能被操作列或頁首覆蓋                 | 待驗；使用者明確要求第一次也定位                                       |
| [ ] F08 | 已定位後，前進同一列的下一欄                    | 高度不變，不額外上下捲動，不先跳過頭再回來                                       | 歷史反覆失敗，待驗                                                     |
| [ ] F09 | 前進至下一列，尤其接近頁尾的最後幾列            | 一次平順調整到同樣可見位置，輸入框完整露出，不被任何列遮擋                       | 歷史反覆失敗，待驗                                                     |
| [ ] F10 | 定位完成後自由上下滑動頁面，再次點欄位／按 Next | 滑動時不強制拉回、不抖動；操作列保持位置。下一次焦點操作再定位一次               | 待驗；手動移開後可在下一次焦點操作定位，不等於每個 scroll event 都校正 |
| [ ] F11 | 最後欄位顯示「完成輸入」，完成後再次點欄位      | 只有真正完成／主動離開才結束輸入；再點欄位仍能正常進入。不得把普通 Next 當成完成 | 待驗；目前普通 Next 提早結束已是 F02／F03 的失敗                       |
| [ ] F12 | 單人及多人兩種檢視逐一操作                      | 單人原有輸入能力保留；多人「按時序／按學生」均符合 F01–F11                       | 整體未過關；最新回報未逐一指明哪些模式，不能假定其他模式正常           |

### 要求曾如何改變：禁止拿舊要求覆蓋新要求

1. 起初希望操作列靠近輸入框下方；多次對不準後，使用者放棄貼齊欄位，改成固定在鍵盤上方。
2. 13:04 回報後，使用者明確澄清：只在點選欄位／Next 時確保欄位可見，不能持續強制保持可見；手動滑動必須自由。
3. 補充：可見區域必須扣掉「下一格」操作列；Next 換列要再次確保可見。
4. 13:53 回報後，再明確要求：第一次即使已可見也要先定位，與後續焦點切換一致。
5. 14:31 與 15:49 回報再次強調：同列不應無故換高度，不能跳過頭再拉回；操作列不能離鍵盤過遠、閃爍、亂跑或造成誤觸。
6. 以上是同一份累積要求，必須同時成立；不能每輪只實現最後一句。

## 3. 歷史錯誤檢查清單：基本功能通過後逐項排查

每一項都要按指定動作實測；不能用另一個測試的通過代替。**下面未勾選不代表全部在 release 71 都已重現，而是尚未可靠排除。**

| 檢查    | 曾出現的錯誤                         | 如何重查／應不再出現什麼                                     | 歷史／目前證據                                                   |
| ------- | ------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| [ ] K01 | Next 只完成輸入、關鍵盤，不前進      | 從非最後欄開始連續前進，確認欄位索引與鍵盤持續開啟           | 11:06 首次回報；release 66 後曾改善；**release 71 再度回報失敗** |
| [ ] K02 | 點選輸入框卻沒有 Next 操作列         | 首次進入、離開重進、不同高度重點、不同模式都重查             | **release 71 最新新增／回報的問題**                              |
| [ ] K03 | 自訂操作列覆蓋正在輸入的欄位         | 首列、中段、末列逐一點選／Next；欄位中心實際可點，值完整可見 | 11:06、12:21／12:23、15:49 等回報                                |
| [ ] K04 | 操作列掉到鍵盤或原生鍵盤工具列後面   | 不同頁面高度點欄、換列、開關鍵盤，操作列全部可見             | 13:04 回報                                                       |
| [ ] K05 | 操作列浮在鍵盤上方很遠               | 比較鍵盤上緣與操作列下緣；切換欄位不能累積空隙               | 12:21／12:23 漂移；14:31 明確指出間距過大                        |
| [ ] K06 | 明明同一列，Next 仍上下移動          | 已定位的一列連續輸入重量／次數／RPE，列的高度保持一致        | 13:04、14:31、15:49 反覆回報                                     |
| [ ] K07 | 換欄／換列跳過頭，之後又跳回來       | 連續跨列觀察一次動作至穩定期間，不能有第二次反向校正         | 14:31 回報                                                       |
| [ ] K08 | 使用者上下滑動想對準時畫面抖動、抽搐 | 聚焦後手動滑動並停止，頁面不得自行拉回或持續校正             | 13:04 回報；「最後對準」不表示過程可接受                         |
| [ ] K09 | 第一次聚焦與 Next 的定位規則不一致   | 原本可見的第一欄也定位；Next 同列不得突然再換一個高度        | 13:53 兩段影片回報                                               |
| [ ] K10 | 越靠頁尾越無法對準／輸入框被鍵盤擋住 | 長課表最後幾列與最後一欄逐一操作；不能只驗證最上方幾列       | 13:53，且使用者實際滑動證明頁面並非沒有空間                      |
| [ ] K11 | 有些高度正常，有些高度失準           | 從上、中、下不同高度直接點選；重複開關鍵盤後再做             | 12:21／12:23、13:04 回報                                         |
| [ ] K12 | 操作列切換時消失再出現或改高度       | 快速連按、短暫失焦、原生上下欄切換、直接點下一個欄位         | 15:49 明確回報；release 71 又回報不出現操作列                    |
| [ ] K13 | 操作列消失／位移導致按到底層其他按鈕 | 固定觸控位置連按，確認只前進，不命中新增組數、完成等其他控制 | 15:49 明確指出誤觸風險；未記錄已造成哪筆正式資料異動             |

## 4. 檢查矩陣與記錄格式

先測 F01–F03 的三個基本能力，再完成其他功能項；全部達成後才對下列每個流程重做 K01–K13。任一格失敗即記錄，不可宣告整體修復。

| 流程                 | 基本功能 F01–F03 | 定位／滑動 F05–F10 | 輸入／保存／完成 F04、F11 | 歷史錯誤 K01–K13 |
| -------------------- | ---------------- | ------------------ | ------------------------- | ---------------- |
| 單人原有紀錄方式     | [ ] 待分項重查   | [ ] 待驗           | [ ] 待驗                  | [ ] 待驗         |
| 單人其他現有紀錄格式 | [ ] 待分項重查   | [ ] 待驗           | [ ] 待驗                  | [ ] 待驗         |
| 三人群組「按時序」   | [ ] 待分項重查   | [ ] 待驗           | [ ] 待驗                  | [ ] 待驗         |
| 三人群組「按學生」   | [ ] 待分項重查   | [ ] 待驗           | [ ] 待驗                  | [ ] 待驗         |

- 代表位置至少含：上方、中段、末端；同列、跨列；第一次聚焦、連續快速 Next、手動滑動後再點選、完成後重進。
- 使用實際輸入與完整可點擊／可見性檢查。光有 DOM focus 不代表移到了正確下一欄，光有矩形座標不代表沒被其他元素覆蓋。
- 隔離測試資料保存／重開的結果另記，不代選使用者既有草稿衝突。
- 桌機隱藏手機操作列、教練筆記既有焦點模式、切換兩種多人檢視保留草稿，列為變動影響的同伴流程；不能修數值輸入卻破壞它們。
- 記錄範本：`項目 ID／版本 SHA／環境（真 iPhone PWA 或模擬）／起始列與欄／操作／預期／實際／證據／PASS、FAIL 或待驗`。
- **本次核對結果：F01、F02、F03 已由最新回報判為 FAIL，功能關卡尚未通過；其餘清單沒有新的實機證據，不勾選。沒有要求 Product Owner 現在再做一次全套驗收。**

## 5. 每一次鍵盤修改、測試與後續失敗

### T00：多人訓練更新後首次發現原功能退化

- 原本功能：單人手機輸入可用 Next 保持鍵盤並前進，不必關閉再選欄。
- 回報：`ScreenRecording_10-22-2026 11-06-53_1.mp4`。多人更新後，連單人都失效；操作列會蓋住欄位，Next 只結束輸入、關鍵盤。
- 同次手機驗收還指出群組選人不明顯、一人占一列、字級過大，後續 UI 修正另見第 7 節。
- 影響／失敗項：F01–F03 基本流程及 K01、K03；不能只當多人專屬 Bug。

### T01：release 66，PR #78，`4028d377fa6eb10a047f56484e505fcf73532842`

- 想修：保留觸控 blur/click 之間的目標、Next 前進及輸入框可見性；同時完成被接受的群組選人 UI。
- 當時證據：82 項相關測試、320／390px 群組表單預覽、CI #328／#329、正式部署健康檢查通過。這不是原生 iPhone 鍵盤證據。
- 後續回報：`12-21-06_1.mp4`、`12-23-12_1.mp4`（完整檔名前綴均為 `ScreenRecording_10-22-2026 `）。Next 有確實前進；但直接點欄、Next、換列都時而對準時而錯位，高度一直變。
- 結論：**前進曾改善，定位未通過**；群組新增／編輯則獲使用者通過。

### T02：release 67，PR #80，`13b492d00088ddc447044293fd6f78d98a402ff4`

- 想修：把 `visualViewport.offsetTop + height` 納入操作列位置，合併位置／可見性更新，移除可能覆蓋樣式的重複 React inset 狀態。
- 當時證據：96px 偏移的失敗算例轉通過；67 項相關測試及 CI #333／#334 通過。首輪 CI #332 曾發現過時的實作形狀斷言，修正後重跑。
- 後續回報：`ScreenRecording_10-22-2026 13-04-17_1.mp4`。仍有鍵盤遮擋、同列 Next 無故換高度、依欄位所在高度而失準；手動上下滑動時抖動，最後才對準。
- 要求調整：不再追求貼在輸入框下面，改固定鍵盤上方；只在焦點操作時調欄位，手動滑動自由。
- 結論：**操作列位置與捲動互相干擾仍未解決**。

### T03：release 68，PR #82，`c10627d39e54b8db796cfb7a77eaa6cba6df0528`

- 想修：viewport 事件只更新操作列；欄位聚焦時一次檢查、被擋才捲動；Next 使用 `preventScroll`；加入 64px 額外鍵盤工具列避讓。
- 當時證據：68 項相關測試、CI #337／#338 通過，包含可見同列不動、遮擋欄位校正、手動滑動不持續拉回的模擬案例。
- 後續回報：`ScreenRecording_10-22-2026 13-53-47_1.mp4` 與 `13-53-12_1.mp4`。使用者說「好很多」，但第一次即使已可見也應定位，否則同列 Next 才突然換高度；底部欄位仍有遮擋／對不上。
- 結論：**改善不等於通過**；新增明確要求：第一欄與後續欄位使用一致的定位規則。

### T04：release 69，PR #84，`e1dd82d5073ac855378353dbf7b7a6d3b67a2ea2`

- 想修：每次聚焦都給一致停留高度；增加手機頁尾可捲動空間，讓最低列也能移到定位點。
- 當時證據：69 項相關測試、CI #341／#342 通過；手機 `padding-bottom: 0` 及一次捲動可能碰頁尾上限是當時查到的實作問題，不足以解釋全部實機現象。
- 後續回報：`ScreenRecording_10-22-2026 14-31-19_1.mp4`。雖能看到操作列與欄位，但操作列離鍵盤過遠；Next 彆扭跳動，同列也跳，有時過頭再跳回。
- 結論：**修正遮擋時造成／保留新的間距與捲動退化**，沒有同時守住全部要求。

### T05：release 70，PR #86，`1a5de19f3cc72d25e4ee05431f6fbca1b60dacdc`

- 想修：以一段鍵盤 session 保留幾何、移除額外 64px；Next 在 focus 前揭露被遮欄；手動滑動或快速 Next 取消未完成的首次定位；保留開啟鍵盤的最小高度以避暫時值。
- 當時證據：73 項相關測試、CI #345／#346；Windows WebKit／模擬 viewport 宣稱驗過 72 個欄位與 48 次同列切換。這些是受限的歷史測試紀錄，不能據此斷言真 iOS 相同。
- 後續回報：`ScreenRecording_10-22-2026 15-49-12_1.mp4`。仍亂跳、遮輸入框、同列換高度；操作列會漂移、閃一下才出現，連按可能誤觸底層其他選項。
- 結論：**幾何與生命週期皆未可靠解決**。使用者再次要求操作列固定、焦點時定位欄位、不要閃爍跳動。

### T06：release 71，PR #88，`9447eb72c0968610a360dddfe978053cb3429630`

- 想修：鍵盤模式固定 body，由訓練區內部捲動；操作列依目前可視下緣定位；短暫 blur 保留 dock；第一次與 Next 一次定位；以 `pointerup` 同步前進並去除相容 click 重複；輸入模式頁首跟內容捲走。
- 修正中實際發現：blur-null-focus 會拆 dock；480→520 高度卻保留舊值、差 40px；Windows WebKit 攔截 pointerdown 後沒有 click；候選版黏住頁首仍蓋住座標合法的輸入框。
- 測試本身的缺陷也曾被抓到：初版觸控迴圈只檢查「有輸入框 focus」，沒檢查是否正確前進，出現假通過；加入欄位索引後才抓到未前進。加入 `elementFromPoint` 後才抓到頁首遮擋。這說明原先測試準則不完整。
- 最終當時證據：80 項相關測試、Windows WebKit 實際 touch（鍵盤／viewport 仍為模擬）的 72 個精確欄位、48 次同列不捲動、無 dock 移除、8px 間距、命中測試與完成流程；CI #349／#350 通過。桌機及教練筆記同伴檢查通過。
- 部署證據：Fly release 71 映像 SHA 一致，`/api/ready`、`/`、`/login` 200；`formcoachdesk.com` 的前端檔案包含新模式。文件 PR #89／Main CI #352 通過。以上只證明交付，不證明鍵盤功能成功。
- **最新回報：Next 直接關閉鍵盤、結束輸入，完全沒有選下一欄；點輸入框有時不顯示 Next 操作列。這是目前必須優先面對的兩個失敗，不得寫成已修復。**
- 判定：**基本功能失敗，而且 Next 關鍵盤是先前修過後又出現的退化。** 最新實機原因尚未查明；上列本機可重現原因不能直接冒充此裝置的全部根因。使用者要求停止程式修改，改為完整整理交接。

## 6. 實作／驗證中的已知陷阱：接手者不得重複

- [ ] I01：把 layout viewport、visual viewport 的高度與 offset 混用；一次修某個算例不表示開鍵盤、平移、換欄、關閉等整段過程都正確。
- [ ] I02：viewport scroll 觸發頁面校正，校正再觸發 viewport 事件，形成抖動回圈。
- [ ] I03：為避遮擋加固定 64px，造成距離鍵盤過遠；不能以「看得到」代替正確位置。
- [ ] I04：逐欄重新置中／延遲校正，造成同列移動與先過頭再回來。
- [ ] I05：只測上方列，忽略手機頁尾 padding 覆寫、捲動上限及最後幾列。
- [ ] I06：保留歷史最小 viewport 高度，雖避某種暫時值，卻使真實增高後仍使用錯誤舊值。
- [ ] I07：把 null relatedTarget／暫時 blur 當結束，移除 dock、切換底部控制與版面，造成閃爍或底層可誤觸。
- [ ] I08：把 `.click()`、DOM focus、桌面 WebKit touch 和原生 iPhone 的觸控／鍵盤生命週期視為等價。
- [ ] I09：只檢查欄位在矩形範圍內，沒檢查真正被頁首、操作列或其他元素蓋住。
- [ ] I10：只斷言 activeElement 是 input，不斷言精確下一欄索引，會出現「測了 72 欄」但其實停在原欄的假通過。
- [ ] I11：模擬 viewport 與實際瀏覽器 layout 尺寸不一致會製造測試假象；測試環境也要核對。
- [ ] I12：只做導航而未實際輸入、保存／重開、重進輸入模式，不能代表完整使用路徑。

以上包含歷史實作缺陷、候選版缺陷及測試缺陷；**不是全部已被證明為最新 iPhone 失敗的根因**。後續每個假設必須以相同使用路徑的失敗證據確認，不能再宣稱找到一個原因就解決所有問題。

## 7. 同段對話其餘學生群組問題與要求：保留已接受基線

使用者已明確通過群組新增／編輯 UI，並決定保留出席／切換重排。下列歷史接受不等於 release 71 全流程重測；未有新問題時不要擅自重新設計。

| 檢查    | 原問題／使用者要求                                          | 已接受的目標／歷史狀態                                                                                                                                   |
| ------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ ] G01 | 無群組只顯示「這個分類尚無資料」，缺乏入門用途與入口        | 空區域說明學生群組用途，直接提供「新增學生群組」                                                                                                         |
| [ ] G02 | 新引導文案仍看不懂                                          | 標題：**適合固定「一對二」或「一對三」的課程型態**；副標題「將一起上課的學生加入同一個群組，便能一起排課、紀錄、購課與扣堂。」；此處引號樣式依已接受頁面 |
| [ ] G03 | 「共同目標」卻用「設計師、晨型人、喜歡跑步」當例子          | 建立／編輯均改「例如：一起減脂、一起變壯」；個人簡介不混改                                                                                               |
| [ ] G04 | 收支「設定單價」開編輯群組，成員沒有預選，必須重選才能存    | 所有編輯入口都帶入既有成員；只改單價不應變成改成員；當時兩入口回歸與瀏覽器讀回通過                                                                       |
| [ ] G05 | 手機「今日出席」與訓練檢視切換混在灰底同區，層級不清        | 出席放白底課堂標頭；按時序／按學生放訓練清單前；使用者明確說保留                                                                                         |
| [ ] G06 | 選人區看起來只有名單，沒有可選／可新增的視覺引導            | 靠未選選項的加號等設計呈現可操作，不靠額外說明段落                                                                                                       |
| [ ] G07 | 手機每位學生占一列、名字太大，浪費空間                      | 手機已接受每列兩人、較小一致字級；桌機可三欄，保留姓名可讀性                                                                                             |
| [ ] G08 | 為引導加入「點選一起上課的學生加入群組…」文字，使用者不接受 | 移除該段說明；不得下一輪又加回                                                                                                                           |
| [ ] G09 | 最後一位不能取消選取，與必填／停用儲存重複限制              | 編輯中的選取可歸零；零人不能建立／儲存；不使用瀏覽器 alert／confirm。草稿零人不代表允許持久化空群組                                                      |
| [ ] G10 | 擅自把已選狀態的頭像＋名字＋打勾改掉                        | 恢復已選樣式；改善未選選項即可，不能破壞使用者喜歡的既有呈現                                                                                             |
| [ ] G11 | 「已選 X/3 位」占整列                                       | 放該欄右上角，與標題及選項不衝突                                                                                                                         |
| [ ] G12 | 未選加號還有外圈、不符合要求                                | 移除外圈、加號適度放大；已選頭像與打勾保留                                                                                                               |
| [ ] G13 | 新學生輸入與新增按鈕的高度／字級太大，＋與文字不齊          | 與其他選項一致緊湊，圖示與文字對齊；使用者最後說通過並授權部署，之後手機亦通過新增／編輯                                                                 |

相關原始截圖：`codex-clipboard-67d66c9b-23f8-4f2e-93b6-f02f4d9a9e87.png`（空狀態）、`68c83067-5762-44b4-a2dd-952905ed507f.png`（目標範例）、`99cc40df-0842-4595-9b88-07d5bd8633b8.png`（設定單價）、`c5380f06-8963-4200-87b3-3824e800602c.png`（出席／切換）、`IMG_0641.PNG`（手機選人）、`32f7b597-fb56-40f8-b2a0-0643f91ed436.png`、`5fc5b5a2-1002-4b66-bec5-2e881baa6730.png`（選人後續細節）；除 IMG 外後續短檔名前綴同為 `codex-clipboard-`。

## 8. 流程問題與接手限制

- [ ] E01：使用者只完成瀏覽器／手機尺寸預覽時，曾被詢問已安裝 PWA 實機驗收；當時尚未部署，使用者無法做。後續不得把預覽通過當實機通過，也不能未部署就交接實機。
- [ ] E02：最初隔離 Development 合成帳號需 Prime 才能驗群組，永久資格被自動審查擋下；使用者另明確同意「只限該合成帳號，驗完清掉帳號與 Workspace」。這是測試設定權限，不是產品 Bug，不能拿別人的帳號或 Production 變通。
- [ ] E03：每次都只集中眼前症狀，漏掉已經修過的 Next／鍵盤／定位行為，造成反覆退化。本文件要求完整功能清單＋歷史錯誤清單共同作為回歸依據。
- [ ] E04：測試通過、CI 綠燈、部署成功等技術結果屢次與實機結果不符。不得再用測試數字替代使用者要求的功能結果。
- [ ] E05：先前已提供多段影片並多次協助驗收；現在不要再把未完成的整輪排查直接交回使用者，也不要重複要求已授權的事。
- [ ] E06：目前明確停止程式修改；本次只產出接手紀錄。未查明最新原因，不承諾下一輪一定一次修好，不先做回滾或部署。

## 9. 本次文件工作的完成狀態與唯一下一步

- [x] 對齊目前完整功能要求，記錄需求演變，保留已接受群組基線。
- [x] 整理 T00–T06 每輪修改、測試邊界、後續失敗與退化，加入最新兩項失敗。
- [x] 建立功能 F、歷史錯誤 K、實作／測試陷阱 I、群組 G 與流程 E 清單；以目前證據標示 FAIL／待驗，沒有冒充已實機驗過。
- [ ] 應用基本功能尚未通過；完整歷史回歸尚未完成；本次未修改程式或執行新的實機測試。

**唯一下一步：接手 Agent 先讀本文件；收到使用者恢復工程工作的指示後，從 F01–F03 目前失敗的基本功能開始建立真實可失敗的檢查，再依第 2→3→4 節完整排查；本次不自行開始。** 接手不需要重新詢問已寫明的功能規格。使用者現在不需再操作驗收。

---

## 附錄：先前各版原始證據（歷史快照，不能作為目前通過結論）

> Owner: M11 PWA correction; integrated Main `4028d377fa6eb10a047f56484e505fcf73532842` on 2026-10-22.
> Previous release: Fly release 66 ran `GH_SHA=4028d377fa6eb10a047f56484e505fcf73532842` before the viewport follow-up.
> Follow-up release: [PR #80](https://github.com/YambossMaster/Gym-Assistent/pull/80) squash merged as Main `13b492d00088ddc447044293fd6f78d98a402ff4`; Fly release 67 runs the same `GH_SHA` with passing service check. No API or migration change.
> Keyboard stability release: [PR #82](https://github.com/YambossMaster/Gym-Assistent/pull/82) squash merged as Main `c10627d39e54b8db796cfb7a77eaa6cba6df0528`; Fly release 68 runs the same `GH_SHA` with passing service check. No API or migration change.
> Focus alignment release: [PR #84](https://github.com/YambossMaster/Gym-Assistent/pull/84) squash merged as Main `e1dd82d5073ac855378353dbf7b7a6d3b67a2ea2`; Fly release 69 runs the same `GH_SHA` with passing service check. Physical iPhone acceptance remains open.
> Input motion release: [PR #86](https://github.com/YambossMaster/Gym-Assistent/pull/86) squash merged as Main `1a5de19f3cc72d25e4ee05431f6fbca1b60dacdc`; Fly release 70 runs the same `GH_SHA` with passing service check. The release 69 device rejection and this correction are recorded below; physical iPhone acceptance remains open.

> Stable keyboard surface release: PR #88 merged as Main `9447eb72c0968610a360dddfe978053cb3429630`; Fly release 71 runs that SHA. Release 70 was rejected on the installed iPhone; release 71 device acceptance remains open.

## Outcome

The Product Owner's installed-iPhone recording showed the numeric-input action dock covering the active field; tapping「下一格」closed the keyboard without advancing in single and group training. The group-creation screenshot showed oversized, full-row member choices. The accepted correction retains the dock target across the touch blur/click sequence, moves focus to the next set field and scrolls the focused field above the dock. It changes the group picker to two columns on mobile, restores selected avatar + name + check, shows an unringed plus for unselected people, and aligns the new-student controls with the choice rows. The last selected member can be removed; create/edit Save stays disabled at zero, with an in-form submit guard.

## Evidence and remaining work

| Item                     | State                                 | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product Owner inspection | Passed                                | Accepted the final member picker on 2026-10-22 and explicitly authorized deployment.                                                                                                                                                                                                                                                                                                                                    |
| Local affected checks    | Passed                                | `npm run check:affected`: changed-file formatting, Web typecheck and 13 related test files (82/82 tests); `git diff --check`. Actual component preview at 320px and 390px showed two-column choices, selected avatars/checks, no horizontal overflow, no legend/count overlap and matching control heights. Preview used synthetic people and did not save data.                                                        |
| PR gate                  | Passed                                | [PR #78](https://github.com/YambossMaster/Gym-Assistent/pull/78) head `be98eecec056b8a7da4826b5306d39486d97cd8c`; [CI #328](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39720339419) passed verify/build, browser UI and migration dry-run no-op. Squash merged as Main `4028d377fa6eb10a047f56484e505fcf73532842`.                                                                                     |
| Main and Production gate | Passed                                | [Main CI #329](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39720697116) passed all five jobs: verify/build, browser UI, Development migration no-op, Production preview with no pending migration and Fly deploy/readiness. Fly release 66 is complete; running image label `GH_SHA` matches Main. Independent `/api/ready`, `/` and `/login` returned HTTP 200; SPA requests used `Accept: text/html`. |
| Installed iPhone PWA     | Group picker passed; training pending | Product Owner passed group create/edit. Recheck both single and group training at release 67: active field stays visible above the action dock, and「下一格」keeps the keyboard open and focuses weight → reps → RPE → next set. Check final「完成輸入」and both group views. Browser and simulated-touch tests do not establish physical iOS keyboard behavior.                                                        |

## First installed-device recheck

The Product Owner's 12:21 and 12:23 installed-iPhone recordings confirm that「下一格」now focuses the next field, but the action dock and field clearance shift as focus changes. Group create/edit acceptance passed. The previous installed-device entry therefore remains open.

## 2026-10-22 viewport follow-up inventory

| Item                               | State          | Evidence / remaining gate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Reproduce dock drift            | Passed         | Frame review of both recordings shows the keyboard edge staying broadly fixed while the dock floats progressively higher as fields change. A deterministic focused test using layout height 844px, visual height 480px and visual offset 96px failed on the released formula: dock bottom 472px versus required 568px, exactly 96px apart.                                                                                                                                                                                                                                                                                                                                                                         |
| 2. Correct geometry at its source  | Released       | Compute the fixed dock inset from the visual viewport's bottom edge (`offsetTop + height`) and move dock positioning plus input clearance into one animation-frame update. Remove the duplicate React keyboard-inset state that could overwrite direct style updates. Preserve the note editor's separate focus layout.                                                                                                                                                                                                                                                                                                                                                                                            |
| 3. Focused regression checks       | Passed locally | The previously red 96px case and additional 0/55/151px pan cases now pass; actual `TrainingWorkspace` test follows two focused fields across visual viewport scroll events. `npm run check:affected` passed changed-file formatting, Web typecheck and eight related test files (67/67). A 390×844 Chromium preview using the real dock component and inset helper measured an 8px dock-to-keyboard gap at 0, 96 and 151px pan, and「下一格」focused the next field. The preview uses a simulated keyboard, not physical iOS. Ignored screenshot: `output/diagnostics/m11-viewport-151.png`.                                                                                                                       |
| 4. Product review and release gate | Released       | Product Owner authorized direct deployment after the fix. [PR CI #333](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39724286783) passed verify/build, browser UI and migration no-op at head `a0ac69a`; the first run found and corrected an obsolete source-shape assertion. [Main CI #334](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39724604357) passed all five jobs, including Production preview with no pending migration and Fly deployment/readiness. Fly release 67 runs exact Main `13b492d` with passing service check. Independent `/api/ready`, `/` and `/login` returned HTTP 200; HTML routes used `Accept: text/html`. Physical iPhone PWA recheck remains open. |

## Third installed-device recheck

The Product Owner's third installed-iPhone recording at release 67 showed that the action dock can still overlap the iOS numeric keyboard's own toolbar. The released effect also called `window.scrollBy` on every `visualViewport.scroll`, so manual scrolling could trigger another correction and visible jitter. The Product Owner approved a simpler behavior: anchor the dock above the keyboard, check field visibility once after each focus (including「下一格」), and leave subsequent manual scrolling alone.

## 2026-10-22 keyboard stability follow-up inventory

| Item                                              | State                                             | Evidence / remaining gate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Diagnose third device recording                | Complete                                          | Dock sometimes sits under the iOS numeric keyboard's native toolbar; viewport scroll listener and page scroll correction run in a feedback loop during manual gestures.                                                                                                                                                                                                                                                                                                                                                                            |
| 2. Correct focus and dock behavior                | Implemented in `codex/m11-pwa-keyboard-stability` | Keep the dock 64px clear of the measured keyboard edge; update only its position on viewport scroll. After each input focus, wait for keyboard resize to settle and check whether the field is fully visible above the dock; scroll once only if obscured. Programmatic「下一格」focus uses `preventScroll`.                                                                                                                                                                                                                                       |
| 3. Focused checks                                 | Passed locally                                    | `npm run check:affected`: formatting, Web typecheck, 8 related files and 68/68 tests. Added cases for no scroll on a visible same-row field, one correction for a covered next field, and no correction during later manual viewport scrolling. Test runner required the approved non-sandboxed path because Windows sandbox temp-file rename returned `EPERM` before test loading. Physical iOS behavior remains unverified.                                                                                                                      |
| 4. Exact-SHA release and installed-PWA acceptance | Release passed; device acceptance pending         | [PR CI #337](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39727453914) passed required verify/build, browser UI and migration dry-run at head `e3909dd`. [Main CI #338](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39727865977) passed all five jobs, including Production preview and Fly deployment/readiness. Fly release 68's running image label matches Main `c10627d`, its service check passes, and independent `/api/ready`, `/` and `/login` returned 200. Product Owner device acceptance remains open. |

## Fourth installed-device recheck and candidate

The Product Owner's 13:53 installed-iPhone recordings show that release 68 improved dock stability, but first focus can leave a visible field at a different height from the next focused field. Near the page bottom, the dock identifies a later set while that focused row stays below the keyboard. The mobile `.session-workspace` rule overrides desktop bottom padding with zero; opening the iOS keyboard shrinks the visual viewport without adding document scroll range. A one-shot `window.scrollBy` can therefore hit the page limit before the lower row reaches the visible area.

| Item                                                             | State                                          | Evidence / remaining gate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Inspect both 13:53 recordings and scroll layout               | Complete                                       | The 13:53:47 recording shows a later set focused while the displayed rows remain above the dock; CSS confirms mobile `padding-bottom: 0` and no nested vertical training scroller.                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2. Align first and later focus and provide keyboard scroll range | Implemented in `codex/m11-pwa-focus-alignment` | Each focus gets one preferred resting position above the dock, including a first field that is already visible. Mobile document padding leaves enough scroll range for the last field to reach that position while the keyboard is open; its height is independent of iOS visual viewport panning. The dock still follows the keyboard edge and manual scrolling after alignment stays free. No API, migration or group-picker change.                                                                                                                                                |
| 3. Focused verification                                          | Passed locally                                 | `npm run check:affected -- origin/main`: formatting, whitespace, Web typecheck, 8 related test files and 69/69 tests. Focused tests cover initial alignment, same-row stability, a lower row, constant scroll range during viewport panning and no correction after manual scrolling. Windows sandbox temp rename gave `EPERM` before test loading; rerun through approved unsandboxed path passed. Physical iOS behavior remains unverified.                                                                                                                                         |
| 4. Release and device acceptance                                 | Release passed; device acceptance pending      | Product Owner explicitly authorized direct merge/deployment. [PR CI #341](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39732646641) passed required verify/build, browser UI and Development migration dry-run at head `7997a4d`. [Main CI #342](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39732993907) passed all five jobs, including Production preview and Fly deployment/readiness. Fly release 69 runs `GH_SHA=e1dd82d` with passing service check. Independent `/api/ready`, `/` and `/login` returned HTTP 200. No API or migration changed. |

## Fifth installed-device recheck — input motion correction

The Product Owner rejected release 69 using the 14:31 recording: the action dock stays visible but floats too far above the keyboard, and same-row advance can move the page twice. This reopens only numeric-input motion; group picker acceptance is retained.

| Task                                  | State                                                                                         | Evidence / next gate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Reproduce the reported motion      | Complete                                                                                      | The existing 48-test command turned red in five cases when the dock-to-keyboard gap was checked at 8px and the actual Workspace received a same-row focus with viewport pan. The released code added 64px extra clearance and made a second page scroll. A separate Workspace test replayed a WebKit height transient and observed reserved scroll space collapsing from 712px to 88px.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2. Correct ownership and focus order  | Implemented on `codex/m11-pwa-input-motion`, based on Main `fd1d6c2` / deployed app `e1dd82d` | `useSetInputViewport` owns geometry for a whole keyboard session instead of restarting it per field. CSS layout height and retained open-keyboard height avoid treating drag transients as keyboard closure. The dock uses the visual keyboard edge without the extra 64px. Before「下一格」focus, reveal a covered target once; visible targets receive focus without page movement or a delayed correction. Initial placement occurs once per keyboard session. Manual scrolling cancels pending placement.                                                                                                                                                                                                                                                                                                                      |
| 3. Verify original and adjacent paths | Passed locally                                                                                | `npm run check:affected -- origin/main` passed formatting, Web typecheck and 8 related files / 73 tests. Actual Workspace/CSS WebKit 26.6 at 390x844 passed single 18 fields and group timeline/student 27 fields each: 48 same-row transitions had zero page scroll; covered rows were revealed once before focus with no delayed correction; dock gap stayed 8px through pan and height transients; manual scroll stayed free and completion reset reserve. Fast-next pointerdown cancels pending initial alignment. Desktop 1440px kept the dock hidden and numeric geometry inactive; mobile Coach Note focus/tools retained their own surface. Screenshots and replay scripts are ignored under `output/playwright/`. Physical iPhone keyboard acceptance remains open; simulated viewport tests do not supply that evidence. |
| 4. Authorized exact-SHA release       | Released; physical acceptance pending                                                         | [PR #86](https://github.com/YambossMaster/Gym-Assistent/pull/86) head `8e38748` passed [PR CI #345](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39738750334) verify/build, browser UI and Development dry-run, and merged as Main `1a5de19f3cc72d25e4ee05431f6fbca1b60dacdc`. [Main CI #346](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39740002135) passed all five jobs, including Production preview and Fly deployment/readiness. Fly release 70 runs that exact `GH_SHA` with passing service check. Independent `/api/ready`, `/` and `/login` returned HTTP 200. No API, migration, auth or group-picker change.                                                                                                                                                                           |

Impact map: all direct consumers of `advanceTrainingSetInput` are the app dock and numeric Enter handling in the shared Training Workspace. Both single recording formats and group timeline/student views retain their input order, value selection and final blur. The desktop dock remains hidden and the new controller is inactive above 720px. The Coach Note editor retains its own focus surface. Check those adjacent boundaries with focused tests and local browser layout; the installed-device acceptance is still required for physical iOS keyboard motion.

Primary references for the replay, not proof of this device's exact OS defect: [WebKit #226689](https://bugs.webkit.org/show_bug.cgi?id=226689) records temporary `innerHeight`/visual-height changes during keyboard scrolling, and [WebKit #218465](https://bugs.webkit.org/show_bug.cgi?id=218465) records visual-viewport event timing during scrolling.

## Sixth installed-device recheck — stable keyboard surface

The Product Owner rejected release 70 using the 15:49 recording: dock displacement, brief disappearance, covered fields and same-row motion remain. The group picker remains accepted. This correction was implemented on `codex/m11-keyboard-surface`, based on Main `65efa0d`, and released through the preauthorized PR/Main/Fly gates below.

| Task                                                          | State                               | Evidence / remaining gate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Reproduce and separate the failures                        | Complete                            | Actual Workspace tests failed before correction: a native blur with null relatedTarget unmounted the dock; visual height 480 → 520 retained an inset 40px too large. WebKit touch tracing produced pointerdown/pointerup/touchend but no compatibility click after prevented pointerdown. An actual hit test also caught the candidate sticky header covering the field despite valid rectangle bounds.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2. Establish one scroll owner and persistent keyboard session | Implemented                         | While numeric editing, fix the body and let the Training Workspace scroll internally. Dock position uses the current visual viewport bottom directly, independent of document scroll range, historical minimum heights and safe-area inset arithmetic. Each focus action places its row at the same anchor; advance prepares the next row before synchronous focus. Manual scrolling cancels pending placement and is never chased. Transient blur retains the same dock DOM; keyboard closure or another explicit control ends the session. Touch release advances synchronously, with compatibility-click deduplication. The keyboard-mode header scrolls with content. No API, migration, auth or group-picker change.                                                                                                                                                                                                                                          |
| 3. Focused and actual browser verification                    | Passed locally                      | WebKit actual touch replay checks precise field indices, elementFromPoint hit targets, a constant dock-to-keyboard gap, unchanged document scroll, same-row scroll stability, lower sets, null-relatedTarget handoff, manual scroll and completion in single/timeline/student modes. Viewport/keyboard events remain simulated; Windows WebKit does not provide physical iPhone OSK/compositor evidence. Final npm run check:affected -- origin/main passed formatting, whitespace, Web typecheck and 9 related files / 80 tests. WebKit touch replay passed 72 exact field targets, including 48 same-row transitions without scroll, zero dock removals, zero document scroll moves, an 8px keyboard gap, actual input hit tests, free manual scroll and completion. Desktop 1440px kept numeric geometry inactive and the dock hidden; mobile Coach Note focus/tools passed. Disposable scripts, video contact sheet and screenshots are ignored under output/. |
| 4. Exact-SHA release and installed-PWA acceptance             | Released; device acceptance pending | [PR #88](https://github.com/YambossMaster/Gym-Assistent/pull/88) head `fd07655764242e284fab1c07c247c23199250a43` passed [PR CI #349](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39748140843) verify/build, browser UI and migration dry-run. It merged as Main `9447eb72c0968610a360dddfe978053cb3429630`; [Main CI #350](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39748630058) passed all five jobs. Production preview found no pending migration. Fly release 71 runs the exact matching `GH_SHA` with passing readiness/service check. Independent `/api/ready`, `/` and `/login` returned HTTP 200. No API, migration, auth or group-picker change.                                                                                                                                                                                                                                                                       |

This replaces release 70's field-motion approach rather than adding another page-scroll correction. The failed original dock arithmetic and window-scroll assertions are replaced by Workspace session/scroll-owner regressions. The decisive additional browser checks are real touch release without click, exact next-field identity and actual hit testing; formula-only geometry checks previously missed those failures.

Primary references consulted for the viewport boundary: [WebKit Visual Viewport support](https://webkit.org/blog/9674/new-webkit-features-in-safari-13/) and [WebKit #240860](https://bugs.webkit.org/show_bug.cgi?id=240860), which demonstrates that overflow hidden alone does not reliably stop keyboard-time root scrolling. These sources explain the API and the risk; they do not prove the Product Owner's device OS has that particular WebKit defect.

## Historical Next（已由本文件目前交接取代）
