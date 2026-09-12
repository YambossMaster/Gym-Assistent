# M2 Auth configuration and acceptance

這份文件只處理 Gym Assistant M2 的 Supabase Auth 與 Google OAuth 外部設定。它不包含資料庫密碼、
Supabase secret key、Google client secret 或任何可登入的帳號資料；這些值只能存在各平台的 secret store。

## Scope and invariants

- Coach 可公開以 Email 與至少 12 字元的自訂密碼建立帳號。
- Email 必須以六位 OTP 驗證後才能使用。
- Google OAuth 是同等登入方式；同一個已驗證 Email 的 identity 必須連結到同一個 `auth.users` subject。
- 若 Coach 只有 Google identity，應先 Google 登入，再在帳號安全頁設定第一組密碼；既有 Email/password
  identity 修改密碼前必須先驗證目前密碼。公開註冊會先檢查既有 Email，並明示「此帳號已經註冊過。」。
  這是使用者接受的 account-enumeration risk 例外。
- 重新寄送註冊 OTP 只在尚未驗證的註冊流程中提供；已登入的 Coach 代表 Email 已驗證，帳號安全頁不提供
  重複驗證入口。
- Browser 僅持有 Supabase URL 和 publishable key，絕不持有 service-role、database 或 OAuth client secret。
- Workspace 只在 Fastify 中從 verified subject 推導；Auth 設定不改變這條授權邊界。

## Supabase Auth: Email and OTP

由 project owner 在 Supabase Dashboard 的 Auth 設定完成：

1. 開啟 **Allow new users to sign up** 與 **Confirm Email**。
2. 在 URL configuration 將正式 Web origin 加入 redirect allowlist；開發環境只加入明確的 localhost origin，
   不使用萬用字元。
3. 在 confirmation email template 使用 OTP，而不是把 token 放進 URL。模板必須包含 `{{ .Token }}`；Web 會以
   `verifyOtp({ email, token, type: 'email' })` 完成驗證。產品固定使用六位數 token；hosted project 的 Auth 設定必須
   與 `supabase/config.toml` 的 `auth.email.otp_length = 6` 一致，UI 不得自行變更長度。
4. 為外部 Coach 設定 custom SMTP。Supabase 的內建寄信服務只適合作為受限開發用途，不可當正式註冊通道。
5. 依實際 launch 流量設定 rate limit 與 CAPTCHA；未完成前只允許 development project 的受控測試，不宣告
   對外 Beta。

### Current development-project verification — 2026-09-10

- Allow new users to sign up、Confirm Email、Email provider、Google provider 與 custom SMTP 已啟用；SMTP
  的 per-user interval 是 60 秒。Supabase password／identity 等 security-notification emails 均為關閉。
- Confirm sign up 範本已改為顯示 `{{ .Token }}`，不再使用 `{{ .ConfirmationURL }}`；已儲存 FORM Coach Desk
  品牌化的驗證碼信主旨與 HTML。這與 Web 的六位 OTP 畫面一致。
- Site URL 已改為 `http://localhost:5173`，Redirect URLs 已加入 localhost／127.0.0.1 的 5173、5174 開發
  origins。正式環境仍須在 deployment 時加入實際 HTTPS origin。
- project email/hour rate-limit 已由 project owner 儲存為 **20 emails/h**（Dashboard 截圖，2026-09-10）。
  這在 SMTP 每日 300 封限制內；仍須保留 CAPTCHA 作為公開註冊濫用防線。
- 2026-09-10 re-test：project owner 修正 Sender／authorized IP 後，Auth 的 recovery request 取得 200；Brevo 的 signup
  信件記錄為 sent、delivered、opened。Dashboard 的 Email provider 現已讀回 Email OTP length 為 **6 digits**，與產品和
  `supabase/config.toml` 一致；新的隔離帳號已完成 signup、OTP、Workspace bootstrap、Email/password re-login、recovery
  delivery 與 global logout 的 live acceptance。密碼重設只保留在
  登入畫面的「忘記密碼」流程；已登入帳號安全頁對 Google-only identity 提供首次設定密碼，對既有
  Email/password identity 先驗證目前密碼後才變更。帳號安全頁只提供目前帳號的登出，不提供額外的
  裝置工作階段控制。

## Account lifecycle email budget

下列是唯一允許寄送的應用郵件；重新寄送註冊 OTP 仍計為第一類，且必須遵守 provider interval 與 project
rate limit。

1. 註冊 Email OTP。
2. 密碼重設。
   帳號刪除倒數、取消、立即刪除與 365 天閒置刪除一律不寄信；閒置門檻屆滿時直接永久移除帳號與
   Workspace-owned data。Supabase security-notification emails 維持關閉，避免免費 SMTP 額度被
   password／identity 通知消耗。

365 天閒置刪除由每日 02:10 Asia/Taipei 的 Supabase `pg_cron` 執行，經 `pg_net` 呼叫受專用高熵 token
驗證的 Edge Function。token 只存在 Edge Function secret store 與 Vault，不可改用或重用 general-purpose
Supabase secret API key。

可參考 Supabase 的 [password authentication](https://supabase.com/docs/guides/auth/passwords)、
[email templates](https://supabase.com/docs/guides/auth/auth-email-templates) 與
[OTP verification reference](https://supabase.com/docs/reference/javascript/auth-verifyotp)。

## Google OAuth

由 Google Cloud project owner 依 [Supabase Google Auth guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
完成：

1. 建立 OAuth consent screen 與 Web application OAuth client。
2. 將 Supabase project 顯示的 callback URL 設為 Google authorized redirect URI；Web 的實際 origin 則設為
   authorized JavaScript origin。
3. 將 Google client ID 與 client secret 只填入 Supabase 的 Google provider 設定，然後啟用 provider。
4. 使用 Google 測試使用者完成 consent；正式上線前依 Google 規則完成 app branding／verification。

同一個已驗證 Email 的 password 和 Google identities 由 Supabase 自動連結；不要以 user metadata、前端 Email
比較或自行建立第二個 Workspace 實作此規則。詳見 [identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking)。

## Required live acceptance matrix

所有情境都在 development project 先完成，輸出不得包含 password、OTP、access token 或 secret。

| Scenario                                    | Expected result                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------- |
| New Email/password sign-up                  | 未註冊 Email 取得六位 OTP；驗證後可登入並 bootstrap 一個 Workspace。                  |
| Unverified account password login           | 被拒絕；resend OTP 不洩漏身份存在與否。                                               |
| Existing Email/password + same-email Google | Google 登入回到既有 `auth.users`／Workspace，不建立第二個 Workspace。                 |
| Google-only + direct Email sign-up          | 明示「此帳號已經註冊過。」；這是已核准的 enumeration-risk 例外。                      |
| Google-only + set password                  | Google 登入後從帳號安全設定第一組密碼；登出後同 Email/password 可登入同一 Workspace。 |
| Existing Email/password + change password   | 必須先驗證目前密碼；驗證成功才可設定新密碼。                                          |
| Password recovery                           | Email 收到 recovery entry，設定新密碼後目前裝置登出，使用新密碼可登入。               |
| Global logout                               | 所有裝置 session 失效；重新登入後才可呼叫 API。                                       |
| Workspace settings stale write              | 第二裝置先儲存後，第一裝置收到 409 並自行重新讀取／決定。                             |

已實測：既有 Email identity 以同 Email Google OAuth 登入後仍為一個 Auth user／一個 Workspace；未建立第二個
Workspace。SMTP transport 已通過 Auth 與 provider dispatch；新的隔離帳號完成六位 OTP 的全新 Email/password signup、
Workspace bootstrap 與同一帳號 Email/password 再登入；recovery request/delivery、recovery 頁設定新密碼、被登出後以
新密碼重新登入亦已完成。不得在測試輸出保留信件內容、重設連結或 token。

若日後建立自動化的 live E2E，需使用不放進 repository 的受控收件匣與 Google test user，並只從 ignored env
讀取其測試設定；不得在聊天、程式碼、測試輸出或 CI secrets 以外傳遞 password、OTP、access token 或 OAuth client
secret。

## Completion boundary

帳號刪除已定案：三條刪除路徑均永久移除 Auth user 與
全部 Workspace-owned data；無保留、匯出或復原副本。活動僅為成功完成的 authenticated product API operation，
不含 token refresh、背景心跳或 deletion-status read。不得以未經 server-only Auth deletion 的 database cascade
取代這項政策。
