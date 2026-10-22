# M11 PWA 輸入問題：Agent 交接

## 1. 目標與目前狀態

- **目標：** 單人、群組「按時序／按學生」都能穩定選取、輸入、Next、完成及重進；整個輸入框可見、不跳動、不丟值。
- **規則：** 直接選取時定位；Next 同列不動、跨列才調整；手動滑動不拉回；完成只收鍵盤與操作列，保留剛才欄位的位置。禁止產品使用原生 alert／confirm／prompt／離頁提示。
- **保留：** 已接受的操作列、群組新增／編輯與外觀。使用者已取消底部留白優化，勿順便修改。
- **最新回報：** 2026-10-23 Product Owner 驗收 release 76 再退回；01:16:42 影片第一動作正常，完成後點第二動作，整個輸入區及 dock 向上偏移；01:15:21 影片完成後先跳到下方再返回。P01 操作列重新開啟驗收，不能保留為無條件通過。影片沒有原生事件 trace，不能把受控案例冒稱裝置根因已證實。
- **發布基線（已被實機退回）：** [PR #97](https://github.com/YambossMaster/Gym-Assistent/pull/97) 候選 `ff89089` 合併為應用 Main **`c501ee5f0d7d43802303230168f5c526ee06c1c4`**，完整 CI 後部署 **release 76**。只改數值輸入 viewport controller 與回歸測試，保留既有 UI、資料與尾部留白。Product Owner 已明示授權完整驗證後直接部署；其手機驗收已收到上列失敗回報。
- **本輪六項工作盤點：** ①版本／交接、②影片、③原因矩陣、④紅綠修正完成；⑤完整清單回歸完成，⑥exact-SHA CI／部署／讀回待完成。分支 `codex/m11-input-reentry-geometry`，base `fd92478`、應用基線 `c501ee5`。使用者已授權修正、完整驗證及部署，無待決產品選項。
- **唯一 Next：** 本機工程 E01–E07 已完成，接續 E08 exact-SHA PR／Main CI，通過後部署；目前正式站仍 release 76／buildId `local-1792687925378`，不是新候選。不得以最終座標回正代替關閉動畫每一幀穩定。

## 2. 下一個 Agent 先做什麼

1. 在 `output/m11-student-group` 核對分支、HEAD、未提交變更及本文件對應程式；保留主目錄既有修改。
2. 最新回報是本文件第 3 節最前的兩段 01:15／01:16 影片；先讀本輪原因矩陣與紅綠證據，不再只重跑舊的事件同步模型。
3. 若仍失敗，建立**舊碼會失敗的最小重現**。沿「觸控／focus → viewport → 捲動 → 關閉收尾」比對事件次序、焦點欄位、輸入框／操作列矩形、`visualViewport.height/offsetTop`、`window.scrollY`、訓練區 `scrollTop`；不要再只疊 padding 或延遲校正。
4. 修一個已證實原因，讓同一重現轉綠，再重查第 4 節。使用者已授權此修正**完整驗證後部署**；發布後核對版本，再更新實機結果。不要把整輪排查丟回使用者。

## 3. 錯誤、原因判定與防退化

### 2026-10-23 01:15／01:16 實機退回與工程清單

逐幀素材 `output/pwa-input-audit/r77/{reentry,closing}.jpg`。最小重現命令：`playwright-cli -s=m11-r77 --raw run-code --filename output/playwright/m11-r77-repro.js`；release 76 **3/9**，三模式關閉中途偏移 **168–250px** 後回到原位；固定座標原點偏移的故障注入中 dock top **34px**／bottom **92px**，輸入框 rect 雖在163px但實際 hit false。普通跨動作重進 **3/3**。候選首次重播 **9/9**，關閉五個中途取樣及最終位移 **0px**，dock bottom **472px**、input hit true。這證明兩個程式防護缺口，故障注入不是 iPhone 遙測。

| 排查預測與影響                                                                            | 判定／最小處置                                                                                                                                  | 工程驗證                                                                       |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 完成在鍵盤還縮小時立即切回 document；原生無事件 pan 先畫出位移，再被舊事件恢復            | 已重現。保持內部 scroller 到 viewport 恢復，再一次性交回；關閉交接也逐 frame 讀取，新操作立即取消；幾何無進度2.5s才退出，正常交接須完全恢復高度 | 最小重現轉綠；正式 helper 的無事件250px案例先紅；正式 helper 8案與元件93案通過 |
| 固定容器／dock 的實際原點與寫入的 CSS／viewport 不一致；只校正 input scroll 無法移回 dock | 受控重現。分別核對實際 workspace top 與 dock bottom，只補量測誤差；原點恢復時撤回補償，不寫穩定值                                               | 三模式受控貼頂轉綠；獨立原點／恢復／不累積單測；原生因果仍待裝置驗收           |
| 跨動作遺留 row anchor、舊關閉 observer 或 gesture 取消新控制器                            | 普通跨動作重進對照通過；需延伸連續多輪、不同等待時間、不同學生／動作及動畫中再點                                                                | Chrome／WebKit 各108/108                                                       |
| 關閉保護與手動滑動／筆記／離頁清理互相搶控制                                              | stop 要完成待交回的鎖定，但交回後不得再 scroll；保留卸載及新gesture清理                                                                         | 36競態、15時序及同伴通過；關閉後0新增frame，穩定0重寫style                     |

**本輪影響範圍：** `useSetInputViewport`、`set-input-dismissal`、新 `set-input-geometry` 與數值輸入專用 CSS；直接消費者為單人、群組按時序／按學生的所有八格式。保留精確 Next、同列不動、手動滑動、選值、值保存／學生歸屬、已接受外觀及尾部留白。相鄰檢查涵蓋桌機、320px、Shell頁首／底欄、教練筆記與站內確認。沒有 API／schema／Auth／部署設定修改。

追加排查結果（屬原第③／⑤項，P1）：原生 Done 的 null-focus 空窗仍在舊 session，未進入完成按鈕的 cleanup；逐幀重播三模式 **170px FAIL**，新增正式元件測試先紅，保留最後可見位置後仍攔下一幀 **30px**，定位到 `close.current()` 先發而幾何未先更新；修正順序後兩種關閉 **6/6、108 個動畫取樣位移0px**。WebKit 又攔下慢速動畫在固定截止前尚未真正關閉：舊 helper 以120px門檻及從開始計2.5s退出，正式進度測試先紅。改為恢復到2px內才完成正常交接，實際height／offset進度更新截止；連續無進度2.5s仍退出，並保留新gesture／unmount取消。沒有靠一次重跑變綠忽略失敗。

**工程勾選（與下方實機勾選分開）：**

- [x] E01 新兩種失敗：三模式、關閉每幀／最終、整框及dock hit；獨立原點正負偏移、恢復及不同offset。
- [x] E02 連續跨動作／跨學生輸入→完成→重進；短間隔及動畫中重進，至少100個循環。
- [x] E03 release76五項紅綠：晚到height／offset、無事件reveal、tap jitter、擴大先於blur、blur先捲動。
- [x] E04 24格式／189欄：精確Next、同列不移、首中末及上中下起點、九點命中、改值保存reload／群組切換。
- [x] E05 15時序、36關閉／重進競態、延後Next與Shell首末6案；檢查中途穩定，不只終點。
- [x] E06 桌機Enter、320px、教練筆記、站內確認取消／接受與草稿恢復。
- [x] E07 手動滑動不追、同欄重點、關閉／新gesture／unmount停止觀測、穩定不重寫style；卸載不遺留鎖定。
- [ ] E08 affected格式／型別／unit、exact-SHA PR／Main CI、部署與獨立版本／三入口讀回。

本輪沒有新增產品功能；補中途畫面與連續跨動作是第③／⑤項原定排查所需，不能把每個故障注入計成已排除一種裝置原因。WebKit [207049](https://bugs.webkit.org/show_bug.cgi?id=207049) 與 [311821](https://bugs.webkit.org/show_bug.cgi?id=311821) 支持檢查固定定位原點；[254861](https://bugs.webkit.org/show_bug.cgi?id=254861) 記錄可見位置與觸控不同步，故保留hit斷言；均不是此手機的根因證明。

### 為何有時正常、有時失敗：同條件配對對照

Product Owner追加要求後，暫緩發布，在獨立本機埠載入release76的原hook／dismissal／CSS，和候選共用相同TrainingWorkspace、隔離資料與瀏覽器；固定同一欄位，只改下列條件。Chrome及WebKit各30案／版本，兩引擎結果完全一致：舊版18/30，新版30/30。這是刻意選定條件的對照，**不是實機失敗率**。屬原第③／⑤項的因果驗證加深，沒有新產品範圍。

| 固定操作下改變的條件     | 舊版正常條件                                  | 舊版觸發失敗的條件                                | 新版與可下的結論                                                                               |
| ------------------------ | --------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 完成後同樣250px原生pan   | 無pan，或pan後同幀送出scroll／resize，0px偏移 | pan已發生但事件延後5幀：三模式168–250px，再回原位 | 全部0px；失敗取決於畫面／事件交錯，終點回正會掩蓋錯誤                                          |
| 同樣170px內部捲動        | input仍focus，或已到全高關閉交接，0px         | 已blur但viewport仍620px的null-focus空窗，170px    | 全部0px；焦點／鍵盤進度的組合是必要區別，不是欄位高低                                          |
| 第一動作／完成後第二動作 | 原點一致時兩者皆正常                          | 人為移動workspace -380px、dock -190px，兩者皆失敗 | 兩者皆修復，無累積；第二動作本身不是必要條件。**原生為何產生原點偏移仍待證，注入不能回答此點** |
| 關閉動畫進度             | 幾何在舊期限前全高，正常結束                  | 2.4s仍更新780px／offset10，舊helper在2.5s提前結束 | 正式紅綠＋慢速瀏覽器重播通過；正常與失敗差在實際進度，不是任意延長等待                         |

資料：`output/pwa-input-audit/r77/paired-triggers-{chrome,webkit}.json`；重現 `output/playwright/m11-r77-paired-triggers.js`。其餘216循環涵蓋短間隔、動畫中再點、不同動作／學生、正負獨立原點及無事件更新。這些條件共同解釋程式缺陷的偶發性；影片缺原生時間線，仍不能斷言每次手機故障都符合此模型。後續若再退回，必須比較成功／失敗的原生focus、viewport、rect、hit及scroll時間線，不能只另加單一猜測。

### 前輪 release 76：五段影片及原因矩陣

影片依使用者提供順序：`23-16-13` 正常對照；`23-15-44` 完成後向上位移；`23-36-14` 按學生、`23-31-19` 按學生末段、`23-16-48` 按時序末段，選取後活動列被操作列／鍵盤遮住，Next 有前進，關閉後才重新出現。來源皆為 Downloads 的 `ScreenRecording_10-22-2026 <時間>_1.mp4`；抽幀在忽略的 `output/pwa-input-audit/`。影片能證明症狀，不能提供 JavaScript 事件／座標的原生 trace。

| 原因／可推翻預測                                                       | 排查結果與處置                                                                                                                                                                                                   |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. resize／scroll 事件早於 viewport 屬性提交；若不再發事件便沿用舊座標 | **已重現、已修正。** 事件讀 740px 後靜默變 400px，舊版 input top 509–544px、在鍵盤下。延後函式只 align 舊快照，並未 update。改為只在數值 session 存在時於 animation frame 讀新值；CSS 值沒變就不寫。三模式轉綠。 |
| B. 原生 focus reveal 晚於唯一 100ms recheck，或沒有新 scroll 事件      | **已重現、已修正。** 500ms 後改捲動位置、不發事件，舊版活動欄下移 300px。現在 session frame 會恢復；真正手動滑動取消定位意圖，仍持續更新操作列幾何。                                                             |
| C. 任意 touchmove 都取消定位，微小 tap jitter 被當成手動滑動           | **已重現、已修正。** 2px 晃動後原生捲動令舊版下移 300px；改為自 touchstart 座標判定超過 8px 才交給手動操作。無 touch 座標的既有控制事件仍可取消。                                                                |
| D. 鍵盤關閉動畫先擴大 viewport、稍後才 blur，觸發再次置中              | **已重現、已修正。** 480→650→blur→844，舊版向下位移約 29px；單列定位 anchor 在可視區擴大時不再下移，縮小仍能重新安置。三模式完成位移 0px。                                                                       |
| E. blur 原生捲動先發生，React cleanup 才擷取「保留位置」               | **已重現、已修正。** blur 內原生捲動 250px，舊版把錯誤位置保存，活動欄 163→-87px。改成保留仍在編輯時最後確認的欄位位置。三模式完成位移 0px。這與第二段影片向上跳的方向一致，但沒有冒稱原生事件已被擷取。         |
| F. 兩個捲動 owner、捲動空間不足、尾部 clamp、sticky／容器裁切          | 保留單一 session scroller、關閉交回 document 及既有差額留白；以首中末欄、上中下起點、九點命中、Shell 首末欄和三模式八格式重查。不以多補 padding 作本輪修正。                                                     |
| G. Next 事件重複／漏發、focus 轉移、React 重繪／保存重建節點           | 既有 gesture suite 加新紅綠、精確欄序、改值保存 reload／模式切換重查；資料、key、Next 元件本輪未改。不將此當作新的根因。                                                                                         |
| H. Shell route reset、筆記鎖頁、其他 scrollIntoView、桌機／窄手機      | 程式審計：route reset 只依 pathname；history scrollIntoView 只依 exercise/session；筆記與數值各自清理。補受影響 Shell、1440px Enter、320px 與數值→筆記流程。                                                     |
| I. 部署／Service Worker／舊資產、依賴不一致                            | 排查起點讀回 release 75；現 release 76 的 Main／CI／Fly SHA、公開及 origin 版本與入口資產一致。Web TypeScript 7.0.2、root 5.9.3。尚未讀取使用者手機快取，不將問題推給快取，也不要求清資料。                      |
| J. 裝置特有的錯誤 DOMRect、OSK 高度回報錯誤、原生關閉仍保留 DOM focus  | **沒有原生 trace，未宣稱排除。** Windows WebKit 只驗引擎／合成 viewport；完全失真的 OS 資料、長時間全高但仍聚焦，不能與真實鍵盤狀態等同。保留手機驗收；不以延長 timer 或 UA 特判猜修。                           |

本輪正式回歸先紅：`TrainingWorkspace.gesture.test.tsx` 的五個新增案例。瀏覽器 `output/playwright/m11-viewport-root-repro.js`：最初三類時序 × 三模式 **0/9**；補 blur reveal 在第一候選仍 **9/12**，再修成 Chrome／WebKit **12/12**。完整 JSON：`output/pwa-input-audit/{root-red,blur-reveal-red,root-green,root-webkit}.json`。這些是受控重播，並非手機遙測。

外部原始資料：[WebKit 237851](https://bugs.webkit.org/show_bug.cgi?id=237851) 記錄 PWA resize 事件與 offsetTop 提交先後問題；[218465](https://bugs.webkit.org/show_bug.cgi?id=218465) 記錄 viewport scroll 事件延後；[311821](https://bugs.webkit.org/show_bug.cgi?id=311821) 記錄鎖頁仍可能被原生 pan。它們用於建立可推翻測試，不作本機根因證明。

### release 75 之前已處理的缺陷

下表是程式或受控重播已確認的缺陷與修正，**不代表已證明涵蓋 iPhone 的全部隨機事件**。

| 錯誤                                       | 已確認原因及修正                                                                                                                                           | 已有保護／驗證                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Next 不前進、跳兩欄或關鍵盤；操作列消失    | 缺少相容 click、pointerup／click 重複、mousedown 搶焦點、null blur／row click 誤判結束。改在有效觸控釋放時同步前進、去重並核對實際焦點。                   | 觸控次序重播、精確下一欄索引、操作列及 session 持續存在。          |
| 操作列漂移、間距過大；同列跳動、滑動被拉回 | 混用 viewport 高度／offset、歷史最小值與捲動來源；固定多加 64px、重複定位也造成退化。改為一個捲動 owner，依當前可視區定位；手動滑動取消定位意圖。          | 同列不動、跨列可見、分段高度／pan、手動滑動與重點選。              |
| 直接選取失準、再點同欄無效                 | 聚焦仍在卻因全高暫態清掉模式，或首次定位後太早清除意圖，漏接晚到 scroll。保留有效 session／開鍵盤高度，處理 window／viewport 事件，同欄再點也能定位。      | 正式測試先失敗後通過；上中下／末欄選取、全高暫態重播。             |
| 完成後回原高度／頁頂；快速重進互相干擾     | 捲動鎖釋放及晚到 document scroll 破壞最後欄位位置。先記錄螢幕相對位置，短暫交接恢復；本輪改為幾何無進度 2.5s 才退出，新 gesture／focus／unmount 立即取消。 | 相同重現由位移 1820px → 0px；36 個關閉／重進競態及取消／到期測試。 |
| 座標正確卻遮擋；input 上緣裁切             | 黏住的頁首及 52px input minimum 超出 38px 容器。調整該頁頁首與 input minimum，保留外框。                                                                   | 整框九點實際命中、容器範圍；完成前後及 Shell 首末欄。              |
| 瀏覽器 Cancel／OK 或離頁提示               | 五處 Training confirm 及 Training／ExportDownloads beforeunload。改既有站內 Confirmation，移除原生離頁提示，保留草稿恢復及匯出取消。                       | 全站 AST policy；6 組取消／接受；2 組真 IndexedDB 未同步重載恢復。 |

**尚未證實或不能宣稱排除：**

- 「全部只是頁面不夠高」不成立：部分末列確需補足捲動範圍，但晚到事件與容器裁切也能獨立重現。目前保留按差額補高，不回收留白。
- 已重現原因已有修正與回歸保護，但**尚不能保證原生偶發問題已徹底根治**：release 75 已收到再次失敗回報，release 76 也已實機退回；目前仍缺失敗當下原生事件 trace。WebKit 問題紀錄只能幫助提出假設，不能當成本機根因證明。
- 若新候選仍失敗，先核對載入版本，依第 2 節時間線判斷是已覆蓋案例仍失敗，或新事件模型；保留的**待證假設**包括關閉保護窗外／被新 gesture 取消的原生捲動，以及原生關閉仍保留 DOM focus 或錯誤 viewport／DOMRect。勿直接延長 timer。
- 前輪找到舊驗證的具體盲點：測試先改 viewport 屬性再同步發事件，未涵蓋屬性晚於事件提交、無後續事件、tap jitter、擴大早於 blur，以及 blur 捲動早於 cleanup。舊版在新案例確實失敗，修後通過；工程重播與原生驗收仍分開。

## 4. 唯一檢查清單

工程欄包括 release 76 重查結果，見第 3／6 節；**方框只代表實機驗收**。`[ ]` 是未可靠證明通過，保留 release 74／75 失敗，不因工程綠燈自動勾選。目前待驗版本為已部署 release 76。

| 實機項目                   | 通過條件                                                                                     | 工程結果／實機狀態                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [ ] P01 操作列             | 高度及可點位置穩定，不閃爍、不誤觸底層；跨動作連續重進亦成立。                               | release76 第二動作實機 FAIL；重新開啟驗收。                             |
| [ ] 基本輸入（F01–F03）    | 每次選取都有操作列；Next 精確進一欄、鍵盤保持開啟；最後欄才完成。                            | 工程通過；release 76 待實機。                                           |
| [ ] P02／P05／P06 可見性   | 首、中、末列及任意起始高度直接點選；整個 input 不被操作列、頁首或自身容器裁切。              | 九點／容器檢查通過；74 選取曾 FAIL，release 76 待實機。                 |
| [ ] P03 前進／滑動         | 同列不動、跨列一次到位；手動滑動不追，下一次選取再定位；連按不漏進或跳兩欄。                 | 工程通過；release 76 待實機。                                           |
| [ ] P04 完成／重進         | 完成或原生關閉後仍見剛才欄位、不回頂；涵蓋動畫、晚到事件、兩種 blur／resize 次序及立即重進。 | 時序完成位移 0px；74 曾 FAIL，release 76 待實機。                       |
| [ ] 保存／模式（F04、F12） | 逐欄輸入不同值、保存重開、切群組檢視，不丟值、不改錯學生；三模式八格式皆適用。               | 24 組／189 欄 fixture 保存通過；非新的正式 DB 證據。                    |
| [ ] P07 站內確認           | 移除、完成群組、改缺席、衝突重載用站內視窗；取消保留、接受一次；無原生離頁提示。             | policy／6 組流程／2 組草稿恢復通過；release 76 待手機確認，可只按取消。 |
| [ ] 同伴流程               | 桌機 Enter 正常且無手機 dock／鎖頁；320px 不遮擋；教練筆記切換、工具列與保存正常。           | 工程通過；手機同伴待驗。                                                |

若再改碼，先驗基本輸入，再驗全部受影響歷史情境；不可只交出新測試數量或一張穩定後截圖。

## 5. 程式與重現入口

未標完整路徑的檔案位於 `apps/web/src/pages/training/`：

| 檔案                                                                                       | 用途                                            |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `TrainingWorkspace.tsx`、`SetInputAdvanceDock.tsx`                                         | focus／blur／模式切換、觸控前進、站內確認。     |
| `useSetInputViewport.ts`、`set-input-dismissal.ts`、`set-input-geometry.ts`                | 捲動 owner、定位意圖、viewport 暫態及關閉交接。 |
| `TrainingWorkspace.gesture.test.tsx`、`set-input-dismissal.test.ts`                        | 已確認時序缺陷與 helper 生命週期回歸。          |
| `apps/web/src/styles.css`                                                                  | 操作列、頁首、input 外框及捲動範圍。            |
| `apps/web/src/pages/settings/ExportDownloads.tsx`、`scripts/native-dialog-policy.test.mjs` | 第二個離頁提示來源、全站禁止原生訊息檢查。      |

- **環境陷阱：** Web TypeScript 鎖定 **7.0.2**、root 工具 **5.9.3**。曾因預載版本不同，使本機過、CI #364 失敗；policy 因此放 root，不可搬回 Web 使用其不提供的 compiler API。需要 `npm ci` 時先停本工作樹 Vite，避免 Windows 鎖檔。
- **聚焦回歸：** 在 `apps/web` 執行 `npx vitest run src/pages/training/TrainingWorkspace.gesture.test.tsx src/pages/training/set-input-dismissal.test.ts --maxWorkers=1`；root 執行 `node --test scripts/native-dialog-policy.test.mjs`。
- **本機隔離頁：** `apps/web/output/pwa-input-review.html`，Vite 原使用 5180；最小關閉重現 `output/playwright/m11-close-race-repro.js`。完整腳本同目錄的 `m11-run-matrix.ps1`、`m11-run-temporal.ps1`、`m11-session-race-template.js`、`m11-inapp-dialogs.js`、`m11-draft-reload.js`。
- `output/` 是忽略檔，其他機器可能沒有；缺檔時重建同等隔離測試，保留精確欄序、全框命中及事件時間序列。模擬 viewport／攔截 API 不等於 iPhone 鍵盤或正式 DB 驗證。

## 6. 證據與維護規則

- **CI攔截及處置：** PR CI #373在舊CSS文字斷言失敗，要求dock top只能使用原公式，未允許本輪的實測原點補償；更新斷言保留fixed／viewport公式／translateY／flex並明確要求補償項，9項mobile shell測試及affected131通過。應用程式未因此修改，所有瀏覽器證據仍對應同一runtime。保留失敗紀錄，等待新head完整CI。
- **本輪最終本機驗證：** `npm run check:affected -- c501ee5` exit 0，格式／whitespace／Web typecheck、9檔131測試通過。三模式新重現 Chrome／WebKit **9/9**；兩種關閉 **6/6、108動畫取樣位移0px**，另覆蓋刻意放慢且超過舊固定期限的關閉。Chrome／WebKit 連續重進各 **108/108**。24格式／189欄、Chrome首中末36、WebKit舊時序12、temporal15、race36、延後Next27、Shell6、同伴4、站內確認6、真IndexedDB草稿恢復2通過。生命週期：活動30frames、穩定0次style寫入、完成後0新增frame。這是實際瀏覽器＋合成鍵盤幾何／隔離API，不是原生手機或新的正式DB驗收。
- **release 76 歷史發布前驗證：** `npm run check:affected -- ea853e8` exit 0，changed formatting／whitespace／Web typecheck、6 檔 110 項測試通過。Chrome 新時序首中末欄 **36/36**、WebKit 新時序 **12/12** 及按學生 temporal **5/5**；三模式八格式 **24/24、189 欄**精確 Next／保存重開／模式切換／手動滑動通過，既有 temporal **15/15**、session race **36/36**、Shell **6/6**、桌機／320px／筆記 **4 組**通過。Frame 生命週期實測：穩定時 500ms **0 次 style 寫入**，完成後 **0 個新增觀測 frame**。結果凍結在 `output/pwa-input-audit/ff89089/`，含 SHA256 manifest；不宣稱手機 OSK 通過。
- **release 76 歷史 exact-SHA CI：** PR #97 head `ff890895267c1c122cdb7ab4391ccb69fefb71b5` 的 [PR CI #369](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39815531198) 通過後合併。應用 Main `c501ee5f0d7d43802303230168f5c526ee06c1c4` 與候選 Web diff 為空；[Main CI #370](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39816970871) 五 jobs 全 success（root 41／API 402／Web 504、完整 check/build、browser、migration dry-run、Production preview、部署與 readiness）。無新 migration。GitHub 當時 Actions／PR 狀態傳播延遲，等待保護檢查成功後才合併，未跳過 gate。
- **release 76 基線讀回：** Fly **release 76 complete**，machine started、`GH_SHA=c501ee5f0d7d43802303230168f5c526ee06c1c4`、service passing；獨立 `/api/ready`、`/`、`/login` **200**。公開網域與 origin 的 buildId／資產一致，首頁引用新入口；入口 JS SHA256 **`9167c18d29556878c42b7bbd2fcd6dc44573b5d72256b7f8b68e0b4af85c781e`**。證據 `output/github/m11-viewport-production-readback.json`。buildId 不是 Git SHA；映像 label 和 exact-SHA CI 為版本身分證據。
- **前輪工程基線：** release 75／`ea853e8`、PR #95／Main CI #366；`output/playwright/2441d38/` 與 `output/github/m11-session-race-production-readback.json`。五段新影片已退回其選取／完成表現，不以舊工程通過覆蓋回報。
- **前輪失敗素材：** `C:/Users/User/Downloads/` 的 `ScreenRecording_10-22-2026 21-46-06_1.mp4`、`21-45-29_1.mp4`（同前綴）、`IMG_0655.PNG`，均為 release 74。歷史曾反覆工程通過卻實機退回，release 73 又發生取消部署太晚；必須先驗再發布，部署成功不等於功能通過。
- **完整歷史：** `git show bb3672e:docs/status/M11-PWA-INPUT-CORRECTION.md`；整合紀錄見 `docs/status/log/2026-10.md`。

後續只更新目前結論、原因判定、必要證據及待驗項；逐輪過程進工程日誌，不再追加多份「目前狀態／唯一 Next」。本輪程式修改與證據見第 3 節；舊文件整理階段已結束。
