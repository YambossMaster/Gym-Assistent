# M8-C Contract — 正式環境與內部 Alpha

> 2026-10-06 經產品負責人審閱並凍結內部 Alpha 範圍；同日另行授權首次正式部署，採用
> Fly 東京 `shared-cpu-1x`、512 MB、一台常駐 Machine；其他付費採購仍須獨立決定。
> `ROADMAP.md` 決定範圍與順序；`PROJECT_STATUS.md` 記錄實際進度。本 Contract 不變更已交付的 M8-A、
> M8-B、M8-B-Export、M8-B-Plan-Choice，也不提前開放真實教練（M8-D）。

## 1. 要完成的工作

以獨立的正式 Supabase 專案和一個同源 Fly Web/API 網站，讓產品負責人與隔離的合成帳號
實際走完註冊、登入、建立學生、排課、儲存訓練紀錄、公開連結及登出。先確認正式環境能
可靠地保存與讀回資料，再由 M8-D 決定何時接受真實教練。

維持 Local + Production；開發專案與正式專案的 Auth、資料庫、密鑰、回呼網址完全分離。
正式資料由 API 和 PostgreSQL 掌權，瀏覽器只取得 publishable 設定。正式站不得顯示
開發專用 Demo 匯入入口。M8-C 不接金流、不收卡、不把既有 NT$0 訂閱自動改成付費續訂。

## 2. 凍結前需要產品負責人決定的實際資訊

| 決策         | Contract 需記錄的具體值或證據                                                                                                | 目前狀態                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 對外身分     | 以個人名義經營；公開署名 `The Developer of Form Coach Desk`、所在地 `Taipei, Taiwan`；不公開本名或住址，不使用公司／行號名義 | 產品負責人已明確決定；Sol 在此界線內查核可行的發布文字                                         |
| 網域         | 產品負責人已向 Cloudflare 租用 `formcoachdesk.com`；以 `https://formcoachdesk.com` 為主網址，`www` 導向主網址                | 2026-10-06 確認租用並採納主網址；DNS、HTTPS 與 Auth 回呼留待首次部署驗證                       |
| 支援與隱私   | `support@formcoachdesk.com` 作為主要公開聯絡窗口；Cloudflare Email Routing 轉寄至產品負責人私人信箱                          | 2026-10-06 已啟用並由產品負責人實際確認成功收件；意見回饋 Google Form 保持獨立                 |
| 寄信         | 沿用既有 Brevo custom SMTP Sender；正式環境另行核對 Sender 的實際地址、網域、額度與收信結果                                  | 2026-10-06 產品負責人確認沿用既有 Sender；開發專案曾實測六位 OTP 與 recovery，正式專案尚未驗證 |
| 供應商與區域 | 沿用現有 Supabase 帳號，在其中建立與開發隔離的正式專案；使用已開設的 Fly 帳號建立一個正式 app                                | 2026-10-06 確認 Fly 帳號已開設；建置基線為 Supabase 東京 `ap-northeast-1` 和 Fly 東京 `nrt`    |
| 成本與授權   | 沿用約 USD 30／月的初期規劃與儀表板人工檢查；網域 US$10.36／年是產品負責人所見報價                                           | 無新增預算提問；實際規格／報價由 Sol 核對，購買及首次部署前呈交具體動作                        |
| Alpha 人員   | 產品負責人用自己的手機驗收；Sol 使用可隔離、可清理的合成帳號與模擬環境輔助                                                   | 方向已定；模擬器與實體裝置檢查方式由 Sol 調查                                                  |

首發對象與營運範圍為台灣；網域與支援收件已確認，但寄件網域、TLS、DNS 或正式服務仍待部署驗證。
這不等於已決定基礎設施必須位於台灣，實際資料處理區域應在
隱私聲明準確列出。付款服務商與商家／發票流程屬 M8-E 的付費 Contract；M8-C 不部署
付款整合，也不要求現在決定該服務商。

主網址已由產品負責人採納，但仍是待實作驗證的發布設定。網站連結、Supabase Auth 的
Site URL／回到 Web 的允許網址及公開能力連結應使用同一主網址；Google OAuth 的供應商
回呼仍按獨立正式 Supabase 專案的設定核對。`www` 僅作導向，部署後同時實測兩個入口。
不以目前尚未設定的 DNS 結果推定已可使用。

既有 [`AUTH_CONFIGURATION.md`](AUTH_CONFIGURATION.md) 記錄開發 Supabase 的 Brevo custom
SMTP、六位 OTP 與 recovery 實測。M8-C 以這個已驗證流程作基線；正式專案仍須獨立設定，
並以隔離帳號實測寄送與收件。Cloudflare `support@` 收件轉寄與 Brevo Auth 寄信各自核對
DNS、Sender、SPF／DKIM／DMARC；不因已有開發設定而宣稱正式環境已配置完成。

2026-10-06 連接器只列出一個現有 `Gym Assistant` Supabase 專案，位於 `ap-northeast-2`，
與 Status 的開發用途一致；未見獨立正式專案。此項是現況查核，不要求產品負責人重答
已持有的帳號，也不把開發專案當作 M8-C 的正式環境。
Supabase 帳號可含多個專案；目前文件列出每個帳號兩個啟用中的 Free 專案額度，但新專案
實際可建立性須在帳號中確認。若未來正式專案升級，計費以組織為單位，屆時再決定組織
分隔方式，不因共用登入帳號而共用資料庫或 Auth。
東京作為初始建置基線，是因兩個供應商皆列出東京區域，API 與資料庫可同區；尚未宣稱
台灣使用者的實測延遲或供應商當下有可建立容量。若建立時無法選用東京，先確認替代
區域的成本、資料處理告知與 API／資料庫延遲，再調整 Contract。

## 3. 條款、隱私與接受流程

發布用文字應由現有 [`M8-TERMS-PRIVACY-DRAFT.md`](M8-TERMS-PRIVACY-DRAFT.md) 修訂，
不可直接發布目前草案：其中「邀請碼註冊、三個月免費」已與 Roadmap 的開放 Free 註冊、
可選 60 天 Prime 優惠碼及正式 NT$0 方案選擇不符。逐項核對實際營運者、聯絡管道、
資料類別、用途、處理區域與供應商、保存及刪除、外部 Google Form/Sheet、公開能力連結、
優惠和零元訂閱、帳號刪除與服務停止方式。

正式站提供可公開閱讀、可互相抵達的條款與隱私聲明，標明版本／生效日。新教練在首次
建立工作台資料前，能開啟兩份全文並以明確動作接受當前版本；API 儲存驗證過的 Coach、
條款版本、接受時間與來源，拒絕時不建立可使用工作台或允許正式資料寫入。既有帳號遇到
須重新接受的重大修訂時，保留登入與閱讀／帳號求助能力，暫停其他寫入直到接受。接受
失敗保留選擇與重試入口；不可僅靠瀏覽器記憶或預勾選框證明接受。公開能力連結的學生
不被要求以 Coach 身分接受條款。

公開署名依產品負責人指定使用 `The Developer of Form Coach Desk` 與 `Taipei, Taiwan`；
不公開本名、私人住址，也不以公司或行號名義呈現。Sol 查核此方式與實際個資告知義務的
相容性，並在這些限制內提出可行的公開文字；未查明前不宣稱署名已通過法規查核。
2026-10-06 查得個資法第 8 條列有蒐集者「名稱」告知項目，尚未查得官方資料明確確認
上述英文描述可代替以個人身分經營者的名稱；發布用文字須先解決此不確定性。
若無法找到有根據的做法，先維持只有合成資料的內部 Alpha，不以未驗證的法律文字
開放真實教練；這不要求產品負責人改變不公開身分的決定。

註冊／首次使用處以簡短、醒目的文字告知：現階段沒有定期資料庫備份，資料損毀或遺失
可能無法還原；提供全文入口及可用的聯絡方式。文字不得宣稱資料風險已被同意免除法律
義務。正式版法律文字須先與實際部署和有效法規核對；此 Draft 本身不是法律意見。

## 4. 正式環境建置與發布順序

1. 在實際帳號及採購授權確定後，建立獨立 Supabase Free 專案、正式 Auth／寄信設定和
   一個 Fly app；檢查網域 HTTPS、回呼、公開連結與同源 `/api`。
   在 M8-D 開放前，正式環境只允許已列名的合成 Alpha 帳號進入可寫工作台；即使網站
   URL 可被發現，也不讓一般訪客完成正式資料寫入。Alpha 帳號由受控管理流程建立；
   自助註冊與一般 Coach admission 留到 M8-D 開啟並驗收。
2. 在寫入前比對正式資料庫、Auth issuer、Web publishable 值與允許的主機；阻止明顯的
   開發／正式專案混接。密鑰只進正式服務秘密設定，不進 Git、瀏覽器或驗收輸出。
3. 序列化套用已審查 migration，保存版本及結果。失敗即停止發布與新寫入，釐清原因後
   修正前進；不可把開發資料複製到正式環境作為 Alpha fixture。
4. 部署指定 commit 的 build，確認 `/api/ready` 的資料庫就緒回應、SPA 深連結、公開
   `/t/:token` 與 `/r/:token`、未知 API JSON 404、快取及私有回應邊界。
5. 在 Fly/Supabase 儀表板確認當前用量、資料庫大小、帳單／用量與暫停提醒實際可見；
   記錄人工檢視頻率和負責人。提醒不是支出上限；Free 超過 500 MB 資料庫大小可變唯讀，
   低活動專案可能暫停。升級仍需獨立購買決定。

若 M8-C 的正式 Alpha 環境發生不可逆資料損毀，先停止寫入與帳號進入，保留最少必要的
錯誤、migration 版本及操作證據以找出並修正原因。確認環境從未接收真實教練／學生資料，
且全部帳號與資料均為可重建的合成測試資料後，不投入個別測試紀錄的救援；重建該環境的
資料庫／Auth 狀態，從已審查的 migration 重新建立結構、寫入隔離的基礎合成資料，再重跑
受影響的 Alpha 驗收。若資料來源或影響範圍不能確認，停止重置並先查清，不套用此原則。

## 5. 內部 Alpha 驗收

| 情境       | 通過條件                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| 身分與法律 | 合成教練完成 Email 驗證／登入、閱讀並接受目前版本；拒絕、失敗及重試清楚；支援信箱可收信              |
| Alpha 入口 | 非列名帳號無法建立或寫入正式工作台；列名帳號可完成核心流程；M8-D 前未開放一般自助註冊                |
| 核心資料   | 建立學生與課堂、儲存訓練紀錄，重新整理及重新登入後正確讀回；零元方案和權益顯示符合已交付規則         |
| 授權       | 第二個合成教練無法讀寫第一個工作台；公開連結只顯示核准欄位，期限／撤銷有效                           |
| 載入與回復 | 網路或 API 失敗可辨認、草稿在既有契約允許處可恢復；重試不重複寫入                                    |
| 裝置       | 桌機及 390×844 瀏覽器走核心路徑；可用的實體手機安裝 PWA 並檢查儲存、觸控、鍵盤和安全區；未測平台明列 |
| 營運       | `/api/ready`、遷移版本、正式錯誤／用量視圖、提醒、資料庫大小及公開聯絡／風險告知均已實際檢查         |

僅使用可辨識的合成測試資料；建立時記錄 Auth 帳號、Workspace、學生、課堂、訓練紀錄、
方案與能力連結等 fixture 的精確 ID、所屬關係及預期清理範圍。若遷移或資料錯誤使使用
不安全，停止新寫入／新帳號；應用程式缺陷修正後重新部署並重跑受影響情境。
不以自動回滾或資料遺失演習作為此包門檻。

## 6. Gate 與移交

- **Contract 凍結：** 2026-10-06 已訂明沿用 Brevo 的正式設定、法律接受流程、僅合成資料的 Alpha
  入口與驗收清單，並經產品負責人審閱。真實教練加入前另須證實公開法律文字與實際服務
  相符；此事不妨礙內部 Alpha 的獨立工作。同日產品負責人明確授權上述一台 512 MB Fly
  Machine 的首次公開部署與完整 M8-C 驗證，並要求暫不推送 Git。
- **Sol：** 完成正式環境、法律接受流程、設定隔離與 Alpha 可檢查版本；先做變更範圍的
  focused checks，供產品負責人看 UI 與行為並修正。
- **CI：** 產品負責人確認版本可做完整驗證後，執行 root check/build、正式 migration
  證據、Auth／核心儲存／公開連結／登出與實體裝置檢查，確認交付 commit 的 GitHub Actions。
  遠端 push、首次部署或合併前，各自按實際動作取得授權。
- **M8-D 移交前的資料清理：** 關閉 Alpha 測試寫入，核對環境、帳號清單與資料來源。
  優先依精確 ID 清除全部 Alpha 合成帳號及其 Workspace、學生、排課、訓練、方案、能力
  連結與相關資料；若需要整庫重置，僅在確認整個目標環境從未含真實或來源不明資料後
  執行，並重套已審查的 migration。清理後核對 Auth 與資料庫無殘留 Alpha fixture，
  記錄刪除範圍、前後數量、驗證結果及正式服務仍可用。任何資料來源或刪除影響不明時
  暫停清理與 M8-D 開放，先釐清；不能以「Alpha 已結束」推定可整庫刪除。

M8-C 完成只代表內部 Alpha 通過。真實教練加入、優惠碼散發與付費結帳分別留在 M8-D、
M8-E 的獨立 Gate。

## 查核依據

- [M8-A release contract](M8-A-CONTRACT.md)、[Roadmap](ROADMAP.md)、[Project Status](PROJECT_STATUS.md)
- [台灣個資法官方查詢](https://law.pdpc.gov.tw/LawContent.aspx?id=FL010627)：發布前重查施行狀態與實際告知內容。
- [Cloudflare Email Routing](https://developers.cloudflare.com/email-service/configuration/email-routing-addresses/) 與 [Supabase 正式 Auth SMTP](https://supabase.com/docs/guides/auth/auth-smtp)：收件轉寄與驗證／重設信寄送是兩項設定。
- [Supabase Auth URL 設定](https://supabase.com/docs/guides/auth/redirect-urls)、[Google 登入設定](https://supabase.com/docs/guides/auth/social-login/auth-google)：正式站使用主網址作 Site URL 與精確允許網址；Google 供應商回呼指向正式 Supabase 專案。
- [Supabase 組織與 Free 專案額度](https://supabase.com/docs/guides/platform/billing-on-supabase)：同一登入帳號可建立分離專案；計費方案由組織持有。
- [Supabase 區域](https://supabase.com/docs/guides/platform/regions)、[Fly 區域公告](https://fly.io/blog/the-region-consolidation-project/)：兩者列出東京區域；實際建立時再確認可用性。
- [既有 Auth 設定與 Brevo 實測](AUTH_CONFIGURATION.md)、[Brevo SMTP 官方說明](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP)：正式環境沿用已驗證的寄信路徑並重新測試。
- [Supabase Free 備份說明](https://supabase.com/docs/guides/platform/backups)、[資料庫大小](https://supabase.com/docs/guides/platform/database-size)、[專案暫停](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Fly 資源計價](https://fly.io/docs/about/pricing/)：規格、區域與帳單要以建立時所選設定重算。
