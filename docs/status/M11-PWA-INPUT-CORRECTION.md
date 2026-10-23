# M11 PWA 輸入問題：Agent 交接

## 1. 目標、版本與唯一 Next

- **目標：** 單人、群組按時序／按學生，選取與 Next 保持整框及操作列可見可點；同列不移動、手動滑動不拉回；完成只收鍵盤與操作列，保留剛才欄位的位置與數值。
- **最新實機回報（2026-10-23 12:58–13:03）：** release78選取與操作列位置目前正常；完成輸入仍偶發滑動／偏移。三部新影片中第一、第三失敗，第二正常。不得把release78的工程綠燈視為P04通過，也不把選取的正面回報抹掉。
- **本輪正式站：** Fly79 complete，應用 `a1d614204cc72234cbba284bb91c33524bbc0503`，Main CI383五jobs全成功；同SHA machine started／service passing、三入口200、公開與origin資產一致。buildId `local-1792735460451`。部署正常不等於實機驗收。
- **工作樹：** `output/m11-student-group`，應用候選 `971676b6d8247112e4b5825951ed9a506c1c5a16`，基底 `5d46f8a080b6a253f8bfa589bcd718876e491574`，PR103合併為 `a1d614204cc72234cbba284bb91c33524bbc0503`；接手先核對Git HEAD／分支；主目錄既有修改不屬本輪。
- **六項盤點：** ①版本核對、②正常／失敗影片比較、③配對重現、④紅綠修正、⑤完整清單回歸、⑥exact-SHA CI／部署／獨立讀回全部完成。手機驗收仍開放。使用者已授權完整驗證及直接部署。
- **唯一 Next：** Product Owner多工關閉再開PWA，驗release79：同一欄位分別以app完成／原生完成收鍵盤，加入先手動滑動與完成後換第二動作；每幀及最終位置均應不變，再依第4節保護清單確認選取／Next。不要清網站資料，不要求真實刪除或扣堂。
- **範圍：** 只改數值輸入手勢、座標換算與關閉穩定條件。保留外觀、CSS、尾部空間、dismissal期限；沒有API／schema／Auth／依賴／部署設定變更。

## 2. 已重現的缺陷、正常條件與修正

這次不能只用「偶發」概括。固定欄位與操作，分開改變事件空窗和原點恢復順序，得到以下配對。這些是可重現程式缺陷，**不是手機原生trace，不能宣稱已識別影片內所有事件**。

| 原因與可推翻預測                                                                | 證據／處置                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 按下dock取消定位，放開前的native reveal被記成新位置；無reveal正常、有reveal失敗 | 同欄注入40px，原生完成正常、dock完成偏移40px；無注入兩者正常。改為pointerdown至pointerup短暫守住目前位置，前進時恢復既有定位策略。正式4案正負偏移／先手動滑動先紅再綠。                                               |
| 手動滑動已取消pending，原生blur空窗不再守位                                     | 三模式交叉矩陣中9個「手動→原生完成」仍偏移40px；正式元件亦紅。blur時恢復對最後可見位置的保護，不重新讀取可能已偏移的rect。                                                                                            |
| 把不同幀的fixed zero與offsetTop相加，製造會動的原點                             | 同步恢復正常，offset先到或原點先到均失敗；正式4案各±20px。辨識非零pan下的visual座標後，該session保留visible origin=0；未辨識時保留layout換算。兩種座標系及獨立frame／dock誤差都要回歸。                               |
| 按鈕守位誤改Next的定位目標                                                      | 本輪候選測試攔到「手動把active列滑出畫面→Next也留在畫面外」。已分開holding與placement，正式測試先紅再綠。未發布有此回歸的版本。                                                                                       |
| 解鎖太早、遲到document scroll、尾端範圍不足                                     | WebKit抓到高度／offset已回復而原點未回復，觀測提早停止，後續留下30px。新增origin讀值進度與穩定條件；不改250／1000／2500ms期限，新手勢仍即時接手、停滯仍有上限。正式2案先紅再綠，原始WebKit6案重驗通過；尾部空間不變。 |
| 舊版本／快取、input重建、保存或學生歸屬                                         | 正式服務78已讀回；未取得手機快取身分，不歸咎快取。不改資料或key；24格式／189欄、儲存重開及模式切換列為保護條件。                                                                                                      |
| 尚未觀測的原生compositor／hit時序                                               | 未取得原生事件時間線，保留實機門檻，不用桌面WebKit保證零Bug。若再失敗應捕獲原生focus／viewport／fixed zero／rect／scroll時間線，避免又只重跑同一合成模型。                                                            |

[WebKit257375](https://bugs.webkit.org/show_bug.cgi?id=257375)提供Safari DOMRect與fixed CSS座標差異的原始重現；[WebKit254861](https://bugs.webkit.org/show_bug.cgi?id=254861)記錄installed web app的鍵盤恢復及事件／屬性不同步。來源支持檢查方向，不證明本手機的具體成因。

## 3. 重現入口與驗證邊界

- 新影片位於 `C:/Users/User/Downloads/`，前綴 `ScreenRecording_10-23-2026`：`13-03-52_1.mp4`、`13-00-23_1.mp4`、`12-58-47_1.mp4`。第一、第三走到app完成，第二在中途收鍵盤；第三約8.4–8.8s可見關閉途中位移。抽幀在忽略的 `output/pwa-input-audit/r79/`。
- `apps/web/output/pwa-input-review.html`，Vite5180，`mode=solo|timeline|student&scenario=complete`。使用真實TrainingWorkspace／CSS，API全攔截，沒有正式資料寫入。
- `output/playwright/m11-r79-dismiss-trigger.js`：4案配對；原始3/4，修正4/4。
- `m11-r79-closing-origins.js`：同步／offset晚／origin晚×兩種完成；舊2/6，最終Chromium慢速6/6、WebKit一般6/6。保留root transform至原點歸零，刻意檢驗高度已恢復但原點未恢復的交接。此模型也會建立fixed containing block，不能把其中scrollY數字當iOS實測。
- `m11-r79-dismissal-matrix.js`：三模式×三種恢復順序×兩種完成×是否先手動滑動，共36案；同時在手勢／blur空窗注入正負40px。第一候選27/36揭露原生手動邊界；最終結果見第5節。
- `m11-r79-batch.ps1`對所有新舊腳本加入pageerror阻擋並寫r79 JSON；缺touch資料的舊r77 race不用，改用r78完整事件版。熱更新中斷的結果不計通過。
- 正式碼：`TrainingWorkspace.tsx`、`useSetInputViewport.ts`、`set-input-geometry.ts`、`set-input-dismissal.ts`。回歸在 `TrainingWorkspace.gesture.test.tsx`，新增10案；dismissal另新增2案，既有geometry／dock測試保留。
- 舊歷史檢查入口與release74–78詳細原因／證據留Git：`git show 5d46f8a:docs/status/M11-PWA-INPUT-CORRECTION.md`。綠色碎片可能是完成上課，未定性為Next；fixture分別驗兩個DOM。

## 4. 唯一檢查清單

手機欄只記使用者實機證據；工程通過不得自動變成手機通過。

| 項目                | 必須保留的結果                                           | 手機回報／本輪工程                                                                |
| ------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| P01 操作列          | 存在、位置正確、整框可點；不是完成上課露出               | release78目前正面回報；候選手機待驗。兩引擎9原點／36循環／108壓力通過。           |
| F01–F03 基本輸入    | Next精確一欄、鍵盤不關，最後才完成                       | 24格式／189欄、正式回歸全部通過。                                                 |
| P02／P05／P06 選取  | 首中末／任意位置／直接改選，無空白、整框可見可點         | release78目前正面回報；候選手機待驗。共同／獨立原點、直接改選及36起點通過。       |
| P03 前進／滑動      | 同列不動、跨列定位、手動不拉回、離屏後Next重新可見       | 新離屏Next紅綠、雙引擎循環、temporal15／Next27通過。                              |
| P04 完成／重進      | 每幀及最終保留原欄位置；兩種完成、手動後完成、跨動作重進 | **release78實機失敗，未驗收。** 兩引擎新36案皆0px；一般／慢速關閉、各36競態通過。 |
| F04／F12 保存／模式 | 不丟值、不改錯學生；保存重開／切換一致                   | 189欄保存重開／模式切換、2案真IndexedDB草稿恢復通過；非新DB證據。                 |
| P07 站內確認        | 取消保留、接受一次、無原生阻擋對話框                     | 未改；6案站內確認、2案IndexedDB恢復通過。                                         |
| 同伴流程            | 桌機Enter／320px／教練筆記正常；離頁清理鎖定及probe      | 正式清理與4組瀏覽器同伴通過；穩定0次style重寫、關閉後0觀測frame。                 |

## 5. 工程與發布證據

- 新正式紅燈已分別執行：完成手勢4案、非同步原點4案、手動後原生blur1案；修正後通過。另加1案攔下本輪離屏Next候選回歸並修正。原始瀏覽器配對也重跑。
- 最終 `npm run check:affected -- 5d46f8a`：格式、whitespace、Web typecheck、8檔138測試exit0。首次並行負載下11案超過既有5000ms；關閉已完成的瀏覽器後，同碼、同時限重跑全過，未放寬斷言。新增正式12案均有先紅再綠。
- 最終Chrome／WebKit各36新完成矩陣（最大取樣位移0px）、9原點、36直接改選／重進、108歷史壓力、36競態及生命週期通過；一般關閉各6案／108取樣，WebKit慢速6案、Chrome原點慢速6案通過。Chrome另通過36起點、12根因、temporal15、Next27、Shell6、確認6、草稿2、同伴4及24格式／189欄。每批加入pageerror阻擋；所有最終批次0未處理例外。
- 診斷期間的熱更新曾重載頁面／中斷module，已剔除；13:38最後修改後固定runtime，重新完成上述全批次。源碼hash與提交一致，證據凍結 `output/pwa-input-audit/r79/971676b/manifest.json`。隔離瀏覽器及Vite已停止。
- [PR103](https://github.com/YambossMaster/Gym-Assistent/pull/103) head `971676b6d8247112e4b5825951ed9a506c1c5a16`／[PR CI382](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39907902340)完整成功，合併為Main `a1d614204cc72234cbba284bb91c33524bbc0503`；與已測候選Web diff空。[Main CI383](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39908866519)五jobs全成功，含完整check/build、browser、dry-run、Production preview與部署/readiness；沒有新migration。
- 獨立讀回：Fly79 complete，同SHA machine started／service passing；`/api/ready`、`/`、`/login`200，公開與origin buildId／assets／入口JS一致。buildId `local-1792735460451`，入口 `/assets/index-CTL9HJg9.js`，JS SHA256 `caa42daff2d07879bc287779c07d2cfe681fcac36cd22d31527b4ee0e50c3bf7`；映像 `sha256:9bfcfea2829298e38c613c5cc1b1c8cb54c5bf6d8c69129b804fe41b1fe0b232`。證據 `output/github/m11-r79-production-readback.json`。
- 所有發布前回歸完成後才合併；本輪沒有以取消Main workflow當作暫停部署，也沒有部署後補驗取代發布門檻。原生iPhone事件時間線與最終實機驗收仍未取得。
