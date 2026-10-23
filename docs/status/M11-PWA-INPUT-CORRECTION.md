# M11 PWA 輸入問題：Agent 交接

## 1. 目標、版本與唯一 Next

- **目標：** 單人、群組按時序／按學生，選取與 Next 都讓整框及操作列可見、可點；同列不移動、手動滑動不拉回；完成只收鍵盤與操作列，保留剛才欄位的位置與數值。
- **保留：** 已接受外觀、群組操作、尾部空間與 release 77 的關閉改善。不新增 API／schema／Auth／依賴／部署設定或產品診斷介面。
- **最新實機回報：** release 77 在 2026-10-23 11:24–11:29 四段錄影再次失敗：選取時頁面上方出現大片空白，輸入框錯位，操作列不可見；亦有鍵盤開著直接換欄的口述失敗。完成輸入有改善。綠色露出部分可能是「完成上課」，**不能只憑影片認定是「下一格」**。
- **正式站基線：** 本輪獨立讀回 Fly release 77／應用 SHA `db1a8f59bf1ff4bc65fa0fd0d6ea153382b50669`；三入口200、公開與 origin 資產相同。部署正常不等於功能驗收。
- **工作樹：** `output/m11-student-group`；分支 `codex/m11-input-coordinate-space`，基底 Main `ac2802b437fd4ef03f71b70daab4bd2be4d38c96`。主目錄既有修改不屬本輪。
- **六項盤點：** ①版本核對、②影片、③正常／失敗條件對照、④紅綠修正、⑤歷史清單與雙引擎回歸完成；⑥exact-SHA CI／部署／獨立讀回待執行。使用者已授權完整驗證及直接部署，無待決產品選項。
- **唯一 Next：** 第4節工程欄全部通過；提交本輪修正並依 PR／Main CI 發布，獨立讀回後更新本文件。不要把目前候選稱為已部署，也不要勾選手機驗收。

## 2. 本輪原因與修正

**已證實的程式缺陷：** 原先將 CSS 的 `visualViewport.offsetTop` 直接與 `getBoundingClientRect()` 比較。當鍵盤平移使固定元素的量測原點一起改變，校正器把共同位移誤當成容器自己的錯位，再補一次，製造上方空白並把 dock 推到鍵盤下。輸入定位及關閉交接也使用同樣未換算的座標。

**為何有時正常：** 固定原點沒有變時，兩組數字剛好同原點；有共同平移時則不同。固定同一輸入框／操作，只改共同原點0、80、180px：release77三模式 **3/9**，候選 **9/9**；舊版80／180px空白與同量dock下移，候選frame top0、dock bottom472、input top163／163.5且實際可點。這是可重現的程式缺陷，**不是手機失敗率或原生 trace**。

**處置：** session 建立獨立、不可見且不佔空間的 fixed zero 量測點，把 CSS top 換成 client 座標後再比對 frame、dock、input。保留真正的獨立容器誤差校正；選取、換欄、null-focus 空窗及完成交接共用換算。量測點持續至關閉交接完成，新操作／筆記／離頁會清理。沒有增加延遲或改關閉期限。

| 原因／可推翻預測                                  | 本輪判定與處置                                                                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 共同原點被重複補償；同欄位無pan正常、有pan失敗    | 已重現；正式元件80／180px先紅再綠。瀏覽器三模式3/9→9/9，新增真實遮擋與hit檢查。                                                                        |
| frame／dock真的各自移動；移除全部校正會讓前輪退化 | 保留校正但先統一原點。單測混合共同原點與獨立位移；36次新循環含兩者疊加，Chrome／WebKit皆通過。                                                         |
| 換欄／跨動作殘留anchor、舊observer或補償          | 新循環含Next、直接改選、重進、共同原點恢復；一個session只有一個量測點。兩引擎各36個新循環與既有108循環通過。                                           |
| 完成時換回document或blur空窗再次移動              | 保留release77逐幀／進度交接，只換算座標。新36循環兩引擎四段關閉皆0px；歷史一般兩引擎各108取樣及WebKit慢速關閉通過。                                    |
| 「下一格」被卸載，或「完成上課」意外露出          | fixture啟用可完成課堂，同時讀兩個DOM及computed display，另有模擬鍵盤做hit遮擋。新案例中dock存在可點、完成上課隱藏；影片中的綠色身分仍未知。            |
| viewport事件早於屬性、無事件reveal、tap jitter    | 保留每幀讀取、定位意圖與8px手勢判定；新共同原點循環不送resize。舊時序15、根因12、首中末36全部通過。                                                    |
| 捲動範圍、裁切、sticky、Shell、桌機及筆記互相影響 | 不改CSS或範圍策略；首中末／九點hit、320px、Shell、桌機與筆記全部通過。                                                                                 |
| 保存／學生歸屬或重繪重建input                     | 不改資料及key；24格式／189欄、save/reload／模式切換通過。                                                                                              |
| 部署舊檔／PWA版本                                 | 正式站77已核對；尚未讀到使用者手機快取身分，不將失敗推給快取，不要求清資料。發布後再核對映像SHA及入口資產。                                            |
| 原生數值本身失真、hit座標不一致、其他未捕獲時序   | 未取得手機原生trace，不能宣稱排除；保留實機清單。若再失敗，先比較focus、viewport、fixed zero、frame／dock／input rect與hit、scroll的成功／失敗時間線。 |

舊測試的盲點是只改個別元素位移，沒有同時改變所有DOMRect的共同原點。外部原始資料 [WebKit 257375](https://bugs.webkit.org/show_bug.cgi?id=257375) 記錄DOMRect與fixed定位於鍵盤出現時的座標差異；[Visual Viewport原始說明](https://github.com/WICG/visual-viewport)說明layout與visual viewport區分。它們支持測試方向，不證明這四段手機影片的內部事件。

## 3. 影片與可重現入口

影片位於 `C:/Users/User/Downloads/`，同前綴 `ScreenRecording_10-23-2026`：

- `11-29-41_1.mp4`：首次正常，約5s重選出現空白，約12s關閉恢復。
- `11-28-38_1.mp4`：約4s選取就錯位，約7s關閉恢復，再選仍失敗。
- `11-25-08_1.mp4`：第一動作／Next正常，完成後約6–7s第二動作失敗。
- `11-24-29_1.mp4`：約6s第一次選取失敗，約12s關閉恢復。

抽幀及JSON在忽略的 `output/pwa-input-audit/r78/`。綠色碎片身分未知；不能由顏色推斷是哪個按鈕。直接換欄失敗只有使用者口述，工程矩陣仍納入。

- 本機隔離頁：`apps/web/output/pwa-input-review.html`，Vite5180；`scenario=complete`使完成上課存在，API全攔截，未寫正式資料。
- 新最小重現：`output/playwright/m11-r78-native-pan.js`，三模式×共同原點0／80／180；先紅JSON `native-pan-red.json`，再綠 `native-pan-green.json`。
- 新36循環：`m11-r78-coordinate-cycles.js`，選取→同列Next→直接改選→手動滑動→末欄→兩種完成→跨動作重進；同時檢查frame、dock、input、Finish及量測點清理。
- 模型邊界：用root transform製造共同座標移動，鍵盤關閉必須移除此transform。初版在關閉後留下`translateY(0)`，額外製造fixed containing block／document feedback，並非產品CSS；修正模型後再驗，沒有為此改應用程式或放寬位移斷言。
- 歷史重播仍用`m11-r77-*`、`m11-root-positions`、`m11-viewport-root-repro`、`m11-temporal-*`、`m11-next-temporal`、`m11-shell-boundary`、`m11-inapp-dialogs`、`m11-draft-reload`。新批次 `m11-r78-batch.ps1` 將結果保存在r78，舊檔名不代表測舊runtime。
- 正式碼：`apps/web/src/pages/training/useSetInputViewport.ts`、`set-input-geometry.ts`；正式回歸為同目錄 `TrainingWorkspace.gesture.test.tsx`、`set-input-geometry.test.ts`，歷史dismissal helper保持不變。
- `output/`不入Git，其他機器缺檔時重建同等隔離流程。WebKit desktop及合成鍵盤不是原生iPhone OSK。

## 4. 唯一檢查清單

方框只代表手機實機驗收；**目前所有手機項目未通過本輪驗收**。release74–77的退回紀錄保留，工程通過不能自動勾選。

| 手機項目                 | 通過條件                                                         | 本輪工程結果                                       |
| ------------------------ | ---------------------------------------------------------------- | -------------------------------------------------- |
| [ ] P01 操作列           | 不失蹤、不被鍵盤遮住、整框可點；確認不是完成上課露出。           | 兩引擎各9案、36新循環與108歷史循環通過。           |
| [ ] 基本輸入F01–F03      | 每次選取都有dock；Next精確一欄、鍵盤不關，最後欄才完成。         | 正式相關測試與24格式／189欄通過。                  |
| [ ] P02／P05／P06 可見性 | 首中末及高低任意起點、直接改選都沒有上方空白，整框可見可點。     | 兩引擎新共同原點／直接換欄及歷史36起點通過。       |
| [ ] P03 前進／滑動       | 同列不動、跨列定位、手動滑動不追、重點選恢復定位。               | 兩引擎新36循環、舊時序15／延後Next27通過。         |
| [ ] P04 完成／重進       | 收鍵盤每幀及最終都保留原欄位置，兩種關閉與快速跨動作重進均成立。 | 兩引擎新36循環／一般108取樣0px，慢速與36競態通過。 |
| [ ] 保存／模式F04、F12   | 不丟值、不改錯學生；三模式八格式保存重開與切換一致。             | 24格式／189欄通過，隔離API不代表新DB證據。         |
| [ ] P07 站內確認         | 取消保留、接受一次；沒有原生alert／confirm／prompt／離頁提示。   | 本輪未改；6站內確認與2真IndexedDB草稿恢復通過。    |
| [ ] 同伴流程             | 桌機Enter／320px／教練筆記正常；離頁不留鎖定或量測點。           | 筆記／離頁清理測試及4組瀏覽器同伴通過。            |

## 5. 工程與發布證據

- 本輪affected：`npm run check:affected -- ac2802b`，最終格式／whitespace／Web typecheck及7檔118測試exit0，含離頁與筆記清理。
- 新正式紅燈：共同原點80／180px，舊碼workspace top預期0卻分別80／180；換算後通過。幾何helper另驗共同原點與獨立位移疊加／撤回。
- 預設fork worker首次啟動逾時，改threads成功；之後affected使用預設pool亦成功。這是工具啟動錯誤，不當成功能紅燈或忽略測試。
- 本輪候選尚未提交／發布。必須核對exact-head PR CI→Main CI→Fly映像SHA→三入口／公開origin資產，再更新此節。
- 上輪歷史：PR99／應用Main `db1a8f59`／Main CI375／Fly77；完整舊原因表及證據在 `git show ac2802b:docs/status/M11-PWA-INPUT-CORRECTION.md` 及 `docs/status/log/2026-10.md`，不要再將舊逐輪日誌追加成本文件的「最新結論」。
