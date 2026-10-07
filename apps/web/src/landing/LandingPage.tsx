import { ArrowRight, CalendarDays, ChartNoAxesCombined, ClipboardCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { isInternalAlpha } from '../config'
import './landing-page.css'

const features = [
  {
    number: '01',
    icon: CalendarDays,
    title: '排課與堂數，一起掌握',
    description: '從學員購課、剩餘堂數到每日行程，讓每一次安排都有完整脈絡。'
  },
  {
    number: '02',
    icon: ClipboardCheck,
    title: '每堂訓練，都接得起來',
    description: '保留動作、組數與完成結果，下次上課不用再翻找零散訊息。'
  },
  {
    number: '03',
    icon: ChartNoAxesCombined,
    title: '營運狀態，不再靠猜',
    description: '把場地、收支與學員成長放回同一個工作流程，少一點重複整理。'
  }
] as const

const plans = [
  {
    name: 'Free',
    number: '01',
    label: '開始使用',
    description: '把日常教練工作整理進一個清楚的起點。',
    price: '免費',
    period: '',
    annual: undefined,
    features: ['最多 5 名學員', '1 個場地', '課程、排程與訓練紀錄'],
    featured: false,
    prime: false
  },
  {
    name: 'Pro',
    number: '02',
    label: '最受歡迎',
    description: '為穩定成長的教練擴充學員與營運視野。',
    price: 'NT$199',
    period: '／月',
    annual: '或 NT$1,990／年',
    features: ['最多 15 名學員', '無限場地數量', '本月收支與成長軌跡'],
    featured: true,
    prime: false
  },
  {
    name: 'Prime',
    number: '03',
    label: '完整功能',
    description: '完整掌握規模、成長與自己的工作台資料。',
    price: 'NT$259',
    period: '／月',
    annual: '或 NT$2,590／年',
    features: ['無限學員數量', '無限場地數量', '營運與成長分析', '工作台資料匯出'],
    featured: false,
    prime: true
  }
] as const

export function LandingPage() {
  const allowSignup = !isInternalAlpha()

  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link className="landing-brand" to="/" aria-label="Form Coach Desk 首頁">
          <img src="/brand/form-horizontal-on-light.png" alt="Form Coach Desk" />
        </Link>
        <nav aria-label="首頁導覽">
          <a href="#features">功能</a>
          <a href="#pricing">方案</a>
          <Link className="landing-login" to="/login">
            登入
          </Link>
        </nav>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="landing-kicker">給私人教練的日常工作台</p>
          <h1 id="landing-title">
            專業，始於
            <span>每一堂課都有跡可循。</span>
          </h1>
          <p className="landing-lede">
            Form Coach Desk
            把學員、課程、排程與訓練紀錄放進同一個清楚的工作流程，讓你專心帶課，不再追著零散資料跑。
          </p>
          <div className="landing-hero-actions">
            {allowSignup && (
              <Link className="landing-primary-action" to="/login?mode=signup">
                建立帳號 <ArrowRight aria-hidden="true" />
              </Link>
            )}
            <Link
              className={allowSignup ? 'landing-text-action' : 'landing-primary-action'}
              to="/login"
            >
              {allowSignup ? '已有帳號？登入' : '登入工作台'}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="landing-day-card" aria-label="工作台資訊範例">
          <div className="landing-day-heading">
            <div>
              <span>今天</span>
              <strong>10 月 8 日</strong>
            </div>
            <span className="landing-live-mark">4 堂課</span>
          </div>
          <ol>
            <li>
              <time>09:00</time>
              <div>
                <strong>訓練課程</strong>
                <span>下肢訓練 · 尚餘 8 堂</span>
              </div>
              <i>完成</i>
            </li>
            <li className="is-current">
              <time>13:30</time>
              <div>
                <strong>訓練課程</strong>
                <span>上肢推拉 · 準備開始</span>
              </div>
              <i>現在</i>
            </li>
            <li>
              <time>17:00</time>
              <div>
                <strong>首次評估</strong>
                <span>工作室 A · 60 分鐘</span>
              </div>
              <i>稍後</i>
            </li>
          </ol>
          <div className="landing-day-summary">
            <span>本月完成</span>
            <strong>38</strong>
            <span>堂訓練</span>
          </div>
        </div>
      </section>

      <section className="landing-features" id="features" aria-labelledby="features-title">
        <div className="landing-section-heading">
          <p>ONE DESK. EVERY SESSION.</p>
          <h2 id="features-title">
            少一點整理，
            <br />
            多一點真正的教練工作。
          </h2>
        </div>
        <div className="landing-feature-list">
          {features.map(({ number, icon: Icon, title, description }) => (
            <article key={number}>
              <span>{number}</span>
              <Icon aria-hidden="true" />
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-pricing" id="pricing" aria-labelledby="pricing-title">
        <span className="landing-pricing-watermark" aria-hidden="true">
          PLANS
        </span>
        <div className="landing-pricing-heading">
          <div>
            <p>03 / 方案與價格</p>
            <h2 id="pricing-title">從現在的規模開始。</h2>
          </div>
          <p>所有方案都能使用核心的學員、課程、排程與訓練紀錄功能。</p>
        </div>
        <div className="landing-plan-grid">
          {plans.map((plan) => (
            <article
              className={`landing-plan${plan.featured ? ' is-featured' : ''}${plan.prime ? ' is-prime' : ''}`}
              key={plan.name}
            >
              <div className="landing-plan-heading">
                <span className="landing-plan-label">{plan.label}</span>
                <span className="landing-plan-number" aria-hidden="true">
                  {plan.number}
                </span>
              </div>
              <div className="landing-plan-name">
                <h3>{plan.name}</h3>
                {plan.featured && <span>推薦</span>}
              </div>
              <p className="landing-plan-description">{plan.description}</p>
              <p className="landing-plan-price">
                <strong>{plan.price}</strong>
                <span>{plan.period}</span>
              </p>
              {plan.annual && <p className="landing-plan-annual">{plan.annual}</p>}
              <ul aria-label={`${plan.name} 方案功能`}>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="landing-pricing-note">
          目前付費結帳尚未開放；啟用前會清楚顯示最終金額、稅額與續訂條件。
        </p>
      </section>

      <section className="landing-final-cta" aria-labelledby="cta-title">
        <p>FORM COACH DESK</p>
        <h2 id="cta-title">下一堂課，從清楚開始。</h2>
        <Link to="/login">
          開啟工作台 <ArrowRight aria-hidden="true" />
        </Link>
      </section>

      <footer className="landing-footer">
        <img src="/brand/form-horizontal.png" alt="Form Coach Desk" />
        <div>
          <a href="mailto:support@formcoachdesk.com">support@formcoachdesk.com</a>
          <Link to="/terms">服務條款 Terms</Link>
          <Link to="/privacy">隱私權政策 Privacy</Link>
        </div>
        <p>© 2026 The Developer of Form Coach Desk · Taipei, Taiwan</p>
      </footer>
    </main>
  )
}
