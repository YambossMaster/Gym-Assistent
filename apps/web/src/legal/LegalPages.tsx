import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useLayoutEffect, type ReactNode } from 'react'
import { Brand } from '../shared/primitives'

const LAST_UPDATED = '2026-10-08'

function LegalLayout({
  title,
  englishTitle,
  children
}: {
  title: string
  englishTitle: string
  children: ReactNode
}) {
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [])

  return (
    <main className="legal-page">
      <header className="legal-page-header">
        <div className="legal-brand-panel">
          <Brand />
        </div>
        <Link className="legal-back-link" to="/">
          <ArrowLeft aria-hidden="true" />
          <span>返回</span>
        </Link>
      </header>
      <article>
        <span className="eyebrow legal-eyebrow">最後更新 · Last updated · {LAST_UPDATED}</span>
        <h1>{title}</h1>
        <p className="legal-english-title" lang="en">
          {englishTitle}
        </p>
        {children}
        <footer className="legal-contact">
          <p>
            聯絡窗口 Contact：
            <a href="mailto:support@formcoachdesk.com">support@formcoachdesk.com</a>
          </p>
          <p>Form Coach Desk Studio · Taipei, Taiwan</p>
        </footer>
      </article>
    </main>
  )
}

function LanguageDivider({ label }: { label: string }) {
  return (
    <div className="legal-language-divider" aria-hidden="true">
      <span>{label}</span>
    </div>
  )
}

export function TermsPage() {
  return (
    <LegalLayout title="使用條款" englishTitle="Terms of Service">
      <section aria-labelledby="terms-zh">
        <h2 id="terms-zh">中文版</h2>

        <h3>1. 服務說明</h3>
        <p>
          Form Coach Desk 是由 Form Coach Desk Studio
          營運，協助私人教練管理學員、堂數、排課、訓練紀錄、場地與營運資料的
          Web/PWA。部分功能依方案提供，實際功能、限制與價格以服務內及結帳前顯示為準。
        </p>

        <h3>2. 帳號</h3>
        <p>
          您應提供正確的帳號資訊並妥善保管登入憑證。帳號限本人使用，不得轉售、轉讓或與他人共用。若發現帳號或公開連結遭到未經授權的使用，請儘速聯絡我們。
        </p>

        <h3>3. 教練、學員資料與公開連結</h3>
        <p>
          您應確認自己有適當依據使用輸入本服務的學員資料，並只輸入教學與營運所需資訊。請勿輸入不必要的病歷、健康檢查、密碼或完整付款資料。公開連結可能讓持有人在指定期限與範圍內查看或提交資料，請只分享給預定對象。
        </p>

        <h3>4. 方案、付款、取消與退款</h3>
        <p>
          免費或免信用卡優惠到期後不會自動開始收費。付費服務啟用後，方案、計費週期、自動續訂、稅額與最終價格會在結帳前顯示，付款則由結帳頁指定的
          Merchant of Record 處理。我們不會取得或儲存完整信用卡號。
        </p>
        <p>
          您可以隨時取消訂閱，以停止未來續訂；除非取消時另有說明，付費功能可使用至目前計費週期結束。除法律另有規定、重複或錯誤扣款，或
          Merchant of Record
          決定退款外，已開始提供的訂閱服務原則上不退款。取消訂閱或退款不會自動刪除帳號與既有資料。
        </p>

        <h3>5. 合理使用</h3>
        <p>使用本服務時，您同意不會：</p>
        <ul>
          <li>從事違法、詐欺、侵權或惡意活動。</li>
          <li>未經授權存取其他帳號、工作台、公開連結或系統。</li>
          <li>以大量自動化請求干擾服務，或規避安全與方案限制。</li>
          <li>未經同意轉售、再授權或商業性轉讓本服務。</li>
        </ul>

        <h3>6. 服務變更與可用性</h3>
        <p>
          我們可能改善、新增、修改或移除功能，也可能為安全、維護或法律要求暫停部分服務。網路服務可能發生中斷、延遲或資料錯誤；對您特別重要的紀錄，請自行保留必要副本。重大條款變更會在服務內或網站公告，並更新本頁日期；必要時也可能透過
          Email 通知。
        </p>

        <h3>7. 智慧財產與責任限制</h3>
        <p>
          您保有自己輸入內容的權利；Form Coach Desk 的程式、介面、品牌與原創內容則由 Form Coach Desk
          Studio
          所有。服務依實際可提供的狀態提供。在法律允許的範圍內，我們不對間接或衍生損失負責；本條款不排除依法不得限制的權利或責任。
        </p>
      </section>

      <LanguageDivider label="English" />

      <section lang="en" aria-labelledby="terms-en">
        <h2 id="terms-en">English Version</h2>

        <h3>1. Service</h3>
        <p>
          Form Coach Desk is operated by Form Coach Desk Studio. It is a Web/PWA that helps fitness
          coaches manage students, lesson balances, schedules, training records, venues, and
          business records. Some features depend on your plan. The current features, limits, and
          prices are those shown in the service and before checkout.
        </p>

        <h3>2. Account</h3>
        <p>
          You must provide accurate account information and keep your login credentials secure.
          Accounts are for individual use and may not be resold, transferred, or shared. Contact us
          promptly if you believe your account or a public link has been used without authorization.
        </p>

        <h3>3. Coach and Student Data</h3>
        <p>
          You are responsible for having an appropriate basis to use the Student information you
          enter and for limiting it to what is needed for coaching and business operations. Do not
          enter unnecessary medical records, health examination data, passwords, or complete payment
          details. A public link may allow its holder to view or submit limited information until it
          expires or is revoked. Share it only with the intended recipient.
        </p>

        <h3>4. Plans, Payments, Cancellation, and Refunds</h3>
        <p>
          A free or card-free promotion will not automatically become a paid subscription. When paid
          service becomes available, the plan, billing period, renewal, applicable tax, and final
          price will be shown before purchase. Payments will be handled by the Merchant of Record
          named at checkout. We do not receive or store your complete card number.
        </p>
        <p>
          You may cancel at any time to stop future renewals. Unless stated otherwise when you
          cancel, paid access continues until the end of the current billing period. Payments are
          generally non-refundable once subscription service has begun, except where required by
          law, for a duplicate or incorrect charge, or when the Merchant of Record decides to issue
          a refund. Cancellation or a refund does not automatically delete your account or existing
          records.
        </p>

        <h3>5. Acceptable Use</h3>
        <p>You agree not to:</p>
        <ul>
          <li>Use the service for unlawful, fraudulent, infringing, or malicious activity.</li>
          <li>Access another account, Workspace, public link, or system without authorization.</li>
          <li>Disrupt the service with excessive automation or bypass security or plan limits.</li>
          <li>Resell, sublicense, or commercially transfer the service without permission.</li>
        </ul>

        <h3>6. Service Changes and Availability</h3>
        <p>
          We may improve, add, change, or remove features and may suspend part of the service for
          security, maintenance, or legal reasons. Online services may experience interruptions,
          delays, or data errors. Please keep any necessary copies of records that are especially
          important to you. Material changes will be announced in the service or on the website, and
          the date on this page will be updated. We may also provide notice by email when necessary.
        </p>

        <h3>7. Intellectual Property and Liability</h3>
        <p>
          You retain your rights in the content you enter. The Form Coach Desk software, interface,
          brand, and original content belong to Form Coach Desk Studio. The service is provided as
          available. To the extent permitted by law, we are not responsible for indirect or
          consequential loss. These Terms do not limit rights or liabilities that cannot legally be
          limited.
        </p>
      </section>
    </LegalLayout>
  )
}

export function PrivacyPage() {
  return (
    <LegalLayout title="隱私權政策" englishTitle="Privacy Policy">
      <section aria-labelledby="privacy-zh">
        <h2 id="privacy-zh">中文版</h2>

        <h3>1. 我們蒐集的資料</h3>
        <p>依您使用的功能，我們可能處理：</p>
        <ul>
          <li>帳號資料：Email、登入識別、驗證狀態、工作台名稱與設定。</li>
          <li>教練與學員資料：姓名、電話、年齡區間、備註、購課、排程、訓練、場地與收支紀錄。</li>
          <li>公開連結資料：連結用途、期限、使用、撤銷與指定操作紀錄。</li>
          <li>技術資料：IP、裝置、瀏覽器、請求、錯誤、登入與安全紀錄。</li>
          <li>付款資料：付費服務啟用後的方案、訂單、訂閱與付款狀態；我們不儲存完整信用卡號。</li>
        </ul>

        <h3>2. 資料用途</h3>
        <p>
          資料用於建立與保護帳號、提供工作台及公開連結、保存紀錄、套用方案權限、處理付款狀態、提供客服、排除錯誤、防止濫用及履行必要法律義務。我們不會向廣告商出售、出租或交易個人資料。
        </p>

        <h3>3. 第三方服務</h3>
        <p>Form Coach Desk 目前使用：</p>
        <ul>
          <li>Cloudflare：網域與網路服務。</li>
          <li>Fly.io：網站與 API 託管。</li>
          <li>Supabase：資料庫與身分驗證。</li>
          <li>Brevo：寄送驗證及服務信件。</li>
        </ul>
        <p>
          付費服務啟用後，付款與訂閱資料會由結帳頁指定的 Merchant of Record
          處理，我們也會在本政策中列出該供應商。上述服務商可能在其營運地區處理提供服務所必要的資料。
        </p>

        <h3>4. Cookie 與本機儲存</h3>
        <p>
          我們使用瀏覽器儲存或類似技術維持登入狀態、記住介面偏好、保存可復原草稿及提供 PWA
          功能。目前不使用第三方廣告或追蹤型 Cookie。
        </p>

        <h3>5. 保存與刪除</h3>
        <p>
          帳號與工作台資料會在提供服務所需期間保存。帳號設定提供十四天後刪除（期間可取消）與立即刪除；刪除完成後，資料會從活躍系統移除。安全、客服或帳務紀錄可能在防詐、爭議處理或法律要求所需期間內保留。
        </p>
        <p>
          為維護服務與系統資源，我們可能刪除連續十二個月未登入的免費帳號及其相關資料。刪除前，我們可能透過帳號登記的
          Email 發出提醒，但不保證另行通知；請定期登入並自行備份重要資料。
        </p>

        <h3>6. 資料安全</h3>
        <p>
          我們使用
          HTTPS、身分驗證、租戶隔離、權限控管與受限的伺服器憑證保護資料，但任何網路服務都無法保證絕對安全。
        </p>

        <h3>7. 您的權利</h3>
        <p>
          您可以要求查詢、複製、更正、停止處理或刪除可識別資料。我們可能要求足以核實身分與資料範圍的資訊；涉及學員資料時，也會避免向無權限的人揭露其他人的資料。
        </p>

        <h3>8. 政策變更</h3>
        <p>
          本政策如有重大變更，我們會在服務內或網站公告，並更新頁面日期；必要時也可能透過 Email
          通知。
        </p>
      </section>

      <LanguageDivider label="English" />

      <section lang="en" aria-labelledby="privacy-en">
        <h2 id="privacy-en">English Version</h2>

        <h3>1. Information We Collect</h3>
        <p>Depending on the features you use, we may process:</p>
        <ul>
          <li>
            Account data: email, login identifier, verification status, Workspace name, and
            settings.
          </li>
          <li>
            Coach and Student data: names, phone numbers, age ranges, notes, purchases, schedules,
            training, venues, income, and expense records.
          </li>
          <li>Public-link data: purpose, expiration, use, revocation, and permitted actions.</li>
          <li>
            Technical data: IP address, device, browser, request, error, login, and security
            records.
          </li>
          <li>
            Payment data: plan, order, subscription, and payment status after paid service is
            enabled. We do not store complete card numbers.
          </li>
        </ul>

        <h3>2. How We Use Information</h3>
        <p>
          We use information to create and protect accounts, provide the Workspace and public links,
          save records, apply plan access, process payment status, provide support, diagnose errors,
          prevent abuse, and meet necessary legal obligations. We do not sell, rent, or trade
          personal information to advertisers.
        </p>

        <h3>3. Third-Party Services</h3>
        <p>Form Coach Desk currently uses:</p>
        <ul>
          <li>Cloudflare for domain and network services.</li>
          <li>Fly.io for website and API hosting.</li>
          <li>Supabase for database and authentication.</li>
          <li>Brevo for verification and service email.</li>
        </ul>
        <p>
          When paid service becomes available, payments and subscriptions will be processed by the
          Merchant of Record named at checkout, and we will add that provider to this Policy. These
          providers may process necessary information in the regions where they operate.
        </p>

        <h3>4. Cookies and Local Storage</h3>
        <p>
          We use browser storage or similar technologies to maintain your session, remember
          interface preferences, preserve recoverable drafts, and provide PWA functionality. We
          currently do not use third-party advertising or tracking cookies.
        </p>

        <h3>5. Retention and Deletion</h3>
        <p>
          Account and Workspace data are retained while needed to provide the service. Account
          settings support deletion after a fourteen-day cancellation period or immediate deletion.
          After deletion is completed, the data will be removed from active systems. Security,
          support, or billing records may be retained as needed for fraud prevention, disputes, or
          legal requirements.
        </p>
        <p>
          To maintain the service and system resources, we may delete free accounts and their
          associated data after twelve consecutive months without a login. If we decide to carry out
          such deletion, we may send a reminder to the account's registered email, but we do not
          guarantee separate notice. Please sign in periodically and maintain your own backup of
          important data.
        </p>

        <h3>6. Security</h3>
        <p>
          We use HTTPS, authentication, tenant separation, access controls, and restricted server
          credentials to protect information. No online service can guarantee absolute security.
        </p>

        <h3>7. Your Rights</h3>
        <p>
          You may request access, a copy, correction, restriction, or deletion of identifiable
          information. We may ask for information needed to verify your identity and the requested
          data. For Student information, we will also avoid disclosing another person's information
          to someone without authority.
        </p>

        <h3>8. Changes</h3>
        <p>
          If this Policy changes materially, we will post an announcement in the service or on the
          website and update the date shown on this page. We may also provide notice by email when
          necessary.
        </p>
      </section>
    </LegalLayout>
  )
}
