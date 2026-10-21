import {
  ArrowRight,
  ArrowUp,
  CalendarCheck2,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardCheck,
  Download,
  Dumbbell,
  Monitor,
  Smartphone,
  UserRoundPlus
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { isInternalAlpha } from '../config'
import './landing-page.css'

const features = [
  {
    number: '01',
    icon: CalendarDays,
    eyebrow: '學員與排課',
    title: '直覺排課，學員狀況一目了然',
    description:
      '從學員檔案安排課程，對照上課時間、場地與購課紀錄。課前需要的資訊，不必在不同工具之間來回尋找。',
    tags: ['學員檔案', '課程安排', '時間與場地'],
    preview: 'schedule'
  },
  {
    number: '02',
    icon: ClipboardCheck,
    eyebrow: '訓練與表現',
    title: '延續每一次的訓練紀錄',
    description:
      '記錄動作、組數與重量，並參考先前的訓練內容。Pro 與 Prime 提供運動表現圖表，協助追蹤學員的成長軌跡。',
    tags: ['訓練紀錄', '運動表現', '成長軌跡 · Pro / Prime'],
    preview: 'training'
  },
  {
    number: '03',
    icon: ChartNoAxesCombined,
    eyebrow: '日常營運',
    title: '統整場地與收支，月底對帳更清楚',
    description:
      '排課時選擇常用場地，也能記錄相關費用。Pro 與 Prime 可查看本月收支；Prime 可下載指定期間的收支明細。',
    tags: ['場地管理', '本月收支 · Pro / Prime', '明細匯出 · Prime'],
    preview: 'operations'
  }
] as const

const situations = [
  {
    title: '課前找資料手忙腳亂',
    description: '學員資料與上次的訓練進度，散落在 LINE 對話和各種筆記裡。'
  },
  {
    title: '排課來回確認很耗時',
    description: '和學員確認好時間，還得另外核對場地是否可用。'
  },
  {
    title: '月底對帳總要重新整理',
    description: '課程收入與場地費用分開記，回頭核對每月收支又得花時間。'
  }
] as const

const gettingStarted = [
  {
    number: '01',
    icon: UserRoundPlus,
    title: '新增學員',
    description: '先建立學員檔案，之後的課程和訓練紀錄都能接在這裡。'
  },
  {
    number: '02',
    icon: CalendarCheck2,
    title: '安排課程',
    description: '選擇學員、時間和場地，將課程排進行事曆。'
  },
  {
    number: '03',
    icon: Dumbbell,
    title: '記錄訓練',
    description: '課後記下動作、組數和完成情況。'
  }
] as const

const plans = [
  {
    name: 'Free',
    label: '入門',
    description: '管理最多 5 名學員、1 個場地，安排課程並記錄訓練。',
    price: '免費',
    period: '',
    annual: undefined,
    features: ['最多 5 名學員', '1 個場地', '課程、排程與訓練紀錄'],
    featured: false,
    prime: false
  },
  {
    name: 'Pro',
    label: '進階',
    description: '學員上限提高到 15 名，並開放學生群組、本月收支與成長軌跡。',
    price: 'NT$115',
    period: '／月',
    annual: '或 NT$1,150／年',
    features: ['最多 15 名學員', '無限場地數量', '學生群組與多人共課', '本月收支與成長軌跡'],
    featured: true,
    prime: false
  },
  {
    name: 'Prime',
    label: '完整功能',
    description: '學員與場地不限數量，並提供收支報表、日曆整合與收支明細匯出。',
    price: 'NT$145',
    period: '／月',
    annual: '或 NT$1,450／年',
    features: [
      '無限學員數量',
      '無限場地數量',
      '學生群組與多人共課',
      '本月收支與成長軌跡',
      '收支報表、明細匯出與日曆整合'
    ],
    featured: false,
    prime: true
  }
] as const

function LandingFeaturePreview({ kind }: { kind: (typeof features)[number]['preview'] }) {
  if (kind === 'schedule') {
    return (
      <figure className="landing-product-preview landing-product-preview-schedule">
        <div className="landing-preview-window">
          <div className="landing-preview-bar">
            <span>今日</span>
            <span>10 月 8 日</span>
          </div>
          <div className="landing-preview-body">
            <strong>今日課表</strong>
            <div className="landing-preview-row">
              <time>09:00</time>
              <span>下肢訓練</span>
              <em>已完成</em>
            </div>
            <div className="landing-preview-row">
              <time>13:30</time>
              <span>上肢推拉</span>
              <em>待上課</em>
            </div>
          </div>
        </div>
        <div className="landing-preview-window landing-preview-inset">
          <div className="landing-preview-bar">
            <span>學員檔案</span>
            <span>示範學員</span>
          </div>
          <div className="landing-preview-body">
            <span className="landing-preview-muted">下一堂課</span>
            <strong>10 月 10 日 · 13:30</strong>
            <span className="landing-preview-muted">上肢訓練 · 工作室 A</span>
          </div>
        </div>
        <figcaption>課表與學員檔案介面示意 · 示範資料</figcaption>
      </figure>
    )
  }

  if (kind === 'training') {
    return (
      <figure className="landing-product-preview landing-product-preview-training">
        <div className="landing-preview-window">
          <div className="landing-preview-bar">
            <span>訓練紀錄</span>
            <span>示範學員</span>
          </div>
          <div className="landing-preview-body">
            <span className="landing-preview-muted">10 月 8 日 · 下肢訓練</span>
            <strong>本次訓練</strong>
            <div className="landing-training-head">
              <span>動作</span>
              <span>組數</span>
              <span>結果</span>
            </div>
            <div className="landing-training-row">
              <span>深蹲</span>
              <span>3 組</span>
              <span>完成</span>
            </div>
            <div className="landing-training-row">
              <span>羅馬尼亞硬舉</span>
              <span>3 組</span>
              <span>完成</span>
            </div>
            <div className="landing-training-row">
              <span>弓步蹲</span>
              <span>2 組</span>
              <span>完成</span>
            </div>
          </div>
        </div>
        <figcaption>訓練紀錄介面示意 · 示範資料</figcaption>
      </figure>
    )
  }

  return (
    <figure className="landing-product-preview landing-product-preview-operations">
      <div className="landing-preview-window">
        <div className="landing-preview-bar">
          <span>場地</span>
          <span>場地管理</span>
        </div>
        <div className="landing-preview-body">
          <strong>常用場地</strong>
          <div className="landing-preview-row">
            <span>工作室 A</span>
            <em>使用中</em>
          </div>
          <div className="landing-preview-row">
            <span>工作室 B</span>
            <em>使用中</em>
          </div>
        </div>
      </div>
      <div className="landing-preview-window landing-preview-inset">
        <div className="landing-preview-bar">
          <span>收支</span>
          <span>10 月</span>
        </div>
        <div className="landing-preview-body">
          <strong>本月收支明細</strong>
          <div className="landing-preview-row">
            <span>課程收入</span>
            <em>已記錄</em>
          </div>
          <div className="landing-preview-row">
            <span>場地費用</span>
            <em>已記錄</em>
          </div>
        </div>
      </div>
      <figcaption>場地與收支介面示意 · 示範資料；本月收支需 Pro 或 Prime</figcaption>
    </figure>
  )
}

export function LandingPage() {
  const allowSignup = !isInternalAlpha()
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    const update = () => setShowBackToTop(window.scrollY > 120)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

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
          <p className="landing-kicker">給自由接案的私人教練</p>
          <h1 id="landing-title">
            自由教練的
            <span>一站式管理工具</span>
          </h1>
          <p className="landing-lede">
            從學員排課、訓練紀錄到場地與帳務管理，把分散的工作集中在 Form Coach Desk。
            在電腦上規劃課程，帶課時用手機查看資料並記錄訓練。
          </p>
          <div className="landing-hero-actions">
            {allowSignup && (
              <Link className="landing-primary-action" to="/login?mode=signup">
                免費開始使用 <ArrowRight aria-hidden="true" />
              </Link>
            )}
            {allowSignup ? (
              <a className="landing-text-action" href="#features">
                查看功能 <ArrowRight aria-hidden="true" />
              </a>
            ) : (
              <Link className="landing-primary-action" to="/login">
                登入工作台 <ArrowRight aria-hidden="true" />
              </Link>
            )}
          </div>
          {allowSignup && (
            <p className="landing-free-note">Free 方案可管理最多 5 名學員與 1 個場地</p>
          )}
        </div>

        <div className="landing-day-card" aria-label="工作台資訊範例">
          <div className="landing-day-heading">
            <div>
              <span>今天</span>
              <strong>10 月 8 日</strong>
            </div>
            <span className="landing-live-mark">3 堂課</span>
          </div>
          <ol>
            <li>
              <time>09:00</time>
              <div>
                <strong>訓練課程</strong>
                <span>下肢訓練 · 工作室 A</span>
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
          <p className="landing-preview-note">工作台介面示意 · 示範資料</p>
        </div>
      </section>

      <section className="landing-situations" aria-labelledby="situations-title">
        <div className="landing-section-heading">
          <p>教練的日常</p>
          <h2 id="situations-title">教課已經夠忙了，別再讓行政瑣事占用時間</h2>
        </div>
        <ul>
          {situations.map((situation, index) => (
            <li key={situation.title}>
              <span>0{index + 1}</span>
              <div>
                <strong>{situation.title}</strong>
                <p>{situation.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="landing-features" id="features" aria-labelledby="features-title">
        <div className="landing-section-heading">
          <p>功能介紹</p>
          <h2 id="features-title">從排課、訓練到營運管理</h2>
        </div>
        <div className="landing-feature-list">
          {features.map(({ number, icon: Icon, eyebrow, title, description, tags, preview }) => (
            <article className="landing-feature-story" key={number}>
              <div className="landing-feature-copy">
                <div className="landing-feature-index">
                  <span>{number}</span>
                  <Icon aria-hidden="true" />
                </div>
                <p className="landing-feature-eyebrow">{eyebrow}</p>
                <h3>{title}</h3>
                <p>{description}</p>
                <ul aria-label={`${eyebrow}功能`}>
                  {tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              </div>
              <LandingFeaturePreview kind={preview} />
            </article>
          ))}
        </div>
        <p className="landing-feature-plan-note">各方案可用功能與數量限制，請見下方方案說明。</p>
      </section>

      <section className="landing-access" aria-labelledby="access-title">
        <div className="landing-section-heading">
          <p>使用方式</p>
          <h2 id="access-title">
            <span>跨裝置同步，</span>
            <span>課前課中都能用</span>
          </h2>
        </div>
        <div className="landing-access-grid">
          <article>
            <div className="landing-access-card-top">
              <span>01 / 網頁與手機</span>
              <div className="landing-access-icons" aria-hidden="true">
                <Monitor />
                <Smartphone />
              </div>
            </div>
            <h3>
              <span>用大螢幕規劃，</span>
              <span>用小螢幕帶課</span>
            </h3>
            <p>電腦上排課與整理資料；手機上查看課表、記錄訓練。</p>
          </article>
          <article>
            <div className="landing-access-card-top">
              <span>02 / Prime 功能</span>
              <div className="landing-access-icons" aria-hidden="true">
                <CalendarDays />
                <Download />
              </div>
            </div>
            <h3>
              <span>整合慣用日曆，</span>
              <span>匯出收支明細</span>
            </h3>
            <p>訂閱課程日曆，在慣用日曆查看行程；報帳或對帳時，下載指定期間的收支明細。</p>
          </article>
        </div>
      </section>

      <section className="landing-getting-started" aria-labelledby="getting-started-title">
        <div className="landing-section-heading">
          <p>開始使用</p>
          <h2 id="getting-started-title">建立你的第一位學員</h2>
          <p className="landing-start-lede">接著安排課程、記錄訓練；其他學員資料可以之後再補。</p>
        </div>
        <ol>
          {gettingStarted.map(({ number, icon: Icon, title, description }) => (
            <li key={number}>
              <div className="landing-start-card-top">
                <span>{number}</span>
                <Icon aria-hidden="true" />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </li>
          ))}
        </ol>
        {allowSignup && (
          <Link className="landing-primary-action" to="/login?mode=signup">
            免費開始使用 <ArrowRight aria-hidden="true" />
          </Link>
        )}
      </section>

      <section className="landing-pricing" id="pricing" aria-labelledby="pricing-title">
        <span className="landing-pricing-watermark" aria-hidden="true">
          PLANS
        </span>
        <div className="landing-pricing-heading">
          <div>
            <p>03 / 方案與價格</p>
            <h2 id="pricing-title">
              <span>選擇適合</span>
              <span>你的方案</span>
            </h2>
          </div>
          <p>從日常帶課到營運管理，對照各方案的學員數量與功能。</p>
        </div>
        <div className="landing-plan-grid">
          {plans.map((plan) => (
            <article
              className={`landing-plan${plan.featured ? ' is-featured' : ''}${plan.prime ? ' is-prime' : ''}`}
              key={plan.name}
            >
              <div className="landing-plan-heading">
                <span className="landing-plan-label">{plan.label}</span>
              </div>
              <div className="landing-plan-name">
                <h3>{plan.name}</h3>
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
              {plan.name === 'Free' && allowSignup ? (
                <Link className="landing-plan-action" to="/login?mode=signup">
                  免費開始使用 <ArrowRight aria-hidden="true" />
                </Link>
              ) : null}
            </article>
          ))}
        </div>
        <p className="landing-pricing-note">
          所有方案都包含學員、課程、排程與訓練紀錄。學生群組、成長軌跡和本月收支需 Pro 或
          Prime；日曆整合與收支明細匯出需 Prime。
        </p>
      </section>

      <section className="landing-faq" aria-labelledby="faq-title">
        <div className="landing-section-heading">
          <p>使用前</p>
          <h2 id="faq-title">FAQ</h2>
          <p className="landing-faq-intro">關於教練使用方式與方案功能，先回答幾個常見疑問。</p>
        </div>
        <div>
          <details>
            <summary>這套工具適合哪些教練？</summary>
            <p>適合自己帶學員、安排課程，需要記錄訓練，並管理場地與收支的私人教練。</p>
          </details>
          <details>
            <summary>除了排課，還能做什麼？</summary>
            <p>
              可以管理學員與場地、記錄每堂訓練；依方案查看本月收支與運動表現。Prime
              另有日曆整合與收支明細匯出。
            </p>
          </details>
          <details>
            <summary>Free 方案有什麼限制？</summary>
            <p>Free 方案最多可管理 5 名學員與 1 個場地，並使用核心的課程、排程與訓練紀錄功能。</p>
          </details>
          <details>
            <summary>進階方案多了哪些功能？</summary>
            <p>
              學生群組、本月收支與成長軌跡需 Pro 或 Prime；日曆整合與收支明細匯出需
              Prime。各方案的學員與場地數量限制請參考上方說明。
            </p>
          </details>
        </div>
      </section>

      <section className="landing-final-cta" aria-labelledby="cta-title">
        <p>FORM COACH DESK</p>
        <h2 id="cta-title">從學員和課程開始管理</h2>
        <span className="landing-final-description">
          建立帳號後，就可以加入學員、安排課程和記錄訓練。
        </span>
        <Link to={allowSignup ? '/login?mode=signup' : '/login'}>
          {allowSignup ? '免費開始使用' : '登入工作台'} <ArrowRight aria-hidden="true" />
        </Link>
        {allowSignup && (
          <span className="landing-final-note">Free 方案可管理最多 5 名學員與 1 個場地</span>
        )}
      </section>

      <footer className="landing-footer">
        <img src="/brand/form-horizontal.png" alt="Form Coach Desk" />
        <div>
          <a href="mailto:support@formcoachdesk.com">support@formcoachdesk.com</a>
          <Link to="/terms">服務條款 Terms</Link>
          <Link to="/privacy">隱私權政策 Privacy</Link>
        </div>
        <p>© 2026 Form Coach Desk Studio · Taipei, Taiwan</p>
      </footer>
      {showBackToTop && (
        <button
          className="landing-back-to-top"
          type="button"
          aria-label="回到頂部"
          title="回到頂部"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 'instant'
                : 'smooth'
            })
          }
        >
          <ArrowUp aria-hidden="true" />
        </button>
      )}
    </main>
  )
}
