import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Brand } from '../shared/primitives'

const VERSION = '2026-10-07-alpha'

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="legal-page">
      <header className="legal-page-header">
        <Brand />
        <Link to="/">返回登入</Link>
      </header>
      <article>
        <span className="eyebrow">Alpha · 版本 {VERSION}</span>
        <h1>{title}</h1>
        {children}
        <p>
          聯絡窗口：<a href="mailto:support@formcoachdesk.com">support@formcoachdesk.com</a>
        </p>
      </article>
    </main>
  )
}

export function TermsPage() {
  return (
    <LegalLayout title="使用條款">
      <h2>服務範圍</h2>
      <p>
        Form Coach Desk 是私人教練管理學員、課堂、訓練紀錄與營運資料的 Web/PWA。目前為 Alpha
        測試版本，可使用自己的 Email 或 Google
        帳號註冊。工作台測試請使用合成學員資料，勿輸入真實學員或其他人的個人資料。
      </p>
      <h2>測試資料與公開連結</h2>
      <p>
        測試者應只建立可辨識、可清理的合成資料，並妥善保管公開能力連結。持有有效連結的人可以在指定範圍與期限內查看資料或完成指定操作。
      </p>
      <h2>資料風險</h2>
      <p>
        目前沒有定期資料庫備份。測試資料若損毀或遺失，可能無法還原。為維護安全或修復錯誤，服務可能暫停寫入或提前結束測試；不會把自助註冊帳號視為可任意清除的合成資料。
      </p>
      <h2>費用與變更</h2>
      <p>
        Alpha
        不收費、不要求付款資料，也不會自動開始付費續訂。條款如有重大變更，系統會要求測試者閱讀並重新接受新版後再繼續寫入。
      </p>
      <h2>營運者</h2>
      <p>The Developer of Form Coach Desk，Taipei, Taiwan。</p>
    </LegalLayout>
  )
}

export function PrivacyPage() {
  return (
    <LegalLayout title="隱私聲明">
      <h2>目前可使用的資料</h2>
      <p>
        Alpha 的工作台測試使用合成學員資料。服務會處理註冊帳號的
        Email、登入識別、接受紀錄、工作台設定、合成業務資料，以及維持安全與排錯所需的服務紀錄。
      </p>
      <h2>處理目的與服務商</h2>
      <p>
        資料用於驗證帳號、提供工作台、保存測試結果、維護安全與處理支援。正式 Alpha 使用
        Cloudflare、Fly.io、Supabase 與 Brevo 提供網域、託管、資料庫、身分驗證及驗證信服務。
      </p>
      <h2>保存、刪除與保護</h2>
      <p>
        測試資料保存至驗收、排錯與必要紀錄完成為止，之後依精確帳號及資料識別清理。目前沒有定期資料庫備份。服務使用身分驗證、租戶隔離、權限控管與傳輸保護，但不保證資料一定可還原。
      </p>
      <h2>權利與聯絡</h2>
      <p>
        可要求查詢、複製、更正、停止處理或刪除可識別資料。提出請求時，可能需要提供足以確認帳號與資料範圍的資訊。意見回饋與個資請求使用下方聯絡窗口。
      </p>
      <h2>營運者</h2>
      <p>The Developer of Form Coach Desk，Taipei, Taiwan。</p>
    </LegalLayout>
  )
}
