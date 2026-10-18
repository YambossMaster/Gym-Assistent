import {
  AppWindow,
  ArrowLeft,
  ArrowRight,
  Download,
  ListChecks,
  Smartphone,
  Zap
} from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { DEFAULT_FEEDBACK_FORM_URL, getFeedbackFormUrl } from './feedback-link'

type MobilePlatform = 'ios' | 'android'

const DEFAULT_SUPPORT_EMAIL = 'support@formcoachdesk.com'

type TutorialStep = {
  title: string
  detail: string
}

const iosSteps: TutorialStep[] = [
  {
    title: '用 Safari 開啟網站',
    detail: '前往 formcoachdesk.com，並先登入你的帳號。'
  },
  {
    title: '點選「分享」',
    detail: '在 Safari 工具列找到方框向上的分享圖示。'
  },
  {
    title: '選擇「加入主畫面」',
    detail: '在分享選單中向下滑，點選「加入主畫面」。'
  },
  {
    title: '開啟「打開為網頁 App」',
    detail: '確認這個選項已開啟，再繼續下一步。'
  },
  {
    title: '點選「新增」',
    detail: '點選右上角的「新增」，完成安裝。'
  },
  {
    title: '從主畫面開啟',
    detail: '回到手機主畫面，點選 Form Coach Desk 圖示。'
  }
]

const androidSteps: TutorialStep[] = [
  {
    title: '用 Chrome 開啟網站',
    detail: '前往 formcoachdesk.com，並先登入你的帳號。'
  },
  {
    title: '打開 Chrome 選單',
    detail: '點選網址列右側的三個點。'
  },
  {
    title: '選擇安裝',
    detail: '點選「安裝應用程式」或「新增至主畫面」，再依畫面確認。'
  },
  {
    title: '從主畫面開啟',
    detail: '回到手機主畫面，點選 Form Coach Desk 圖示。'
  }
]

const gettingStartedSteps = [
  {
    title: '新增學生',
    detail: '在「學生」點選「新增學生」，先建立姓名與基本資料。',
    action: '前往學生',
    to: '/students'
  },
  {
    title: '新增學生購課',
    detail: '開啟剛建立的學生，在「購課紀錄」點選「新增購課」，填寫堂數、金額與購買日期。',
    action: '查看學生名單',
    to: '/students'
  },
  {
    title: '新增場地',
    detail: '回到「學生」並進入「場地管理」，點選「新增場地」。先建立常用場地名稱即可。',
    action: '前往場地管理',
    to: '/students/venues'
  },
  {
    title: '安排第一堂課',
    detail: '前往「行事曆」點選「安排課程」，選擇學生、場地、日期與時間。',
    action: '前往行事曆',
    to: '/calendar'
  },
  {
    title: '一切就緒，開啟您的第一堂課',
    detail: '恭喜完成前置準備！把排課與學員管理交給 Form Coach Desk，輕鬆打理您的日常訓練大小事。',
    action: '前往今日',
    to: '/today'
  }
] as const

function detectPlatform(): MobilePlatform {
  if (typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)) return 'android'
  return 'ios'
}

function FeedbackRows() {
  const formUrl =
    getFeedbackFormUrl(import.meta.env.VITE_FEEDBACK_FORM_URL) ?? DEFAULT_FEEDBACK_FORM_URL
  const configuredAddress = (import.meta.env.VITE_SUPPORT_EMAIL ?? '').trim()
  const address = configuredAddress || DEFAULT_SUPPORT_EMAIL
  const available = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)

  return (
    <div className="help-contact-rows">
      <div className="settings-row">
        <div className="settings-row-copy">
          <strong>意見回饋</strong>
          <span>
            每一則回饋都是我們改進產品的線索。遇到不順手的地方、發現問題，或想到更好的做法，都歡迎告訴我們。
          </span>
          <span>可匿名填寫；表單內可切換 English。請勿填寫密碼、分享連結或非必要的學員資料。</span>
        </div>
        <a className="settings-row-action" href={formUrl} target="_blank" rel="noopener noreferrer">
          填寫意見回饋 <ArrowRight aria-hidden="true" />
        </a>
      </div>
      <div className="settings-row">
        <div className="settings-row-copy">
          <strong>聯絡我們</strong>
          <span>
            帳號、隱私或資料相關問題，請寄至 <b>{address}</b>。
          </span>
        </div>
        {available ? (
          <a
            className="settings-row-action"
            href={`mailto:${address}?subject=${encodeURIComponent('FORM 協助')}`}
          >
            寄送 Email <ArrowRight aria-hidden="true" />
          </a>
        ) : (
          <span className="settings-account-value">聯絡方式準備中</span>
        )}
      </div>
    </div>
  )
}

function PwaGuide({ onBack }: { onBack: () => void }) {
  const [platform, setPlatform] = useState<MobilePlatform>(detectPlatform)
  const steps = platform === 'ios' ? iosSteps : androidSteps

  return (
    <article className="pwa-guide">
      <button type="button" className="help-guide-back" onClick={onBack}>
        <ArrowLeft aria-hidden="true" />
        返回使用教學
      </button>

      <section className="pwa-guide-hero" aria-labelledby="pwa-guide-title">
        <div className="pwa-guide-kicker">
          <Download aria-hidden="true" />
          手機安裝教學
        </div>
        <h3 id="pwa-guide-title">把 Form Coach Desk 加入手機主畫面</h3>
        <p>
          Form Coach Desk 是可以安裝到手機主畫面的網頁應用程式，這類應用程式稱為 PWA。安裝後會像 App
          一樣從獨立視窗開啟，使用的仍是同一個帳號與資料。
        </p>
      </section>

      <section className="pwa-guide-benefits" aria-labelledby="pwa-benefits-title">
        <div className="help-section-heading">
          <span>WHY INSTALL</span>
          <h4 id="pwa-benefits-title">為什麼使用 PWA？</h4>
        </div>
        <div className="pwa-benefit-grid">
          <div>
            <Zap aria-hidden="true" />
            <strong>更快開始工作</strong>
            <span>從手機主畫面一點就能開啟。</span>
          </div>
          <div>
            <AppWindow aria-hidden="true" />
            <strong>畫面更專注</strong>
            <span>以獨立視窗使用，減少瀏覽器工具列干擾。</span>
          </div>
          <div>
            <Download aria-hidden="true" />
            <strong>不用前往商店</strong>
            <span>直接從網站安裝，不必另外搜尋下載。</span>
          </div>
        </div>
      </section>

      <section className="pwa-install-guide" aria-labelledby="pwa-install-title">
        <div className="pwa-install-heading">
          <div className="help-section-heading">
            <span>INSTALL</span>
            <h4 id="pwa-install-title">選擇你的手機</h4>
          </div>
          <div className="pwa-platform-tabs" role="tablist" aria-label="手機平台">
            <button
              type="button"
              role="tab"
              aria-selected={platform === 'ios'}
              onClick={() => setPlatform('ios')}
            >
              iPhone／iPad
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={platform === 'android'}
              onClick={() => setPlatform('android')}
            >
              Android
            </button>
          </div>
        </div>

        <ol className="pwa-step-grid" data-platform={platform}>
          {steps.map((step, index) => (
            <li key={step.title}>
              <div className="pwa-step-art" aria-hidden="true">
                <img
                  src={`/help/pwa-${platform}-step-${index + 1}.png`}
                  width={platform === 'ios' ? 656 : 735}
                  height={platform === 'ios' ? (index >= 4 ? 399 : 400) : 535}
                  alt=""
                />
              </div>
              <div className="pwa-step-copy">
                <span className="pwa-step-number">{String(index + 1).padStart(2, '0')}</span>
                <p>
                  <strong>{step.title}</strong>
                  <span>{step.detail}</span>
                </p>
              </div>
            </li>
          ))}
        </ol>

        {platform === 'ios' ? (
          <p className="pwa-install-help">
            找不到「加入主畫面」？點選分享選單中的「顯示更多」（View More），再選擇「加入主畫面」。
          </p>
        ) : (
          <p className="pwa-install-help">
            不同版本的 Chrome 可能顯示「安裝應用程式」或「新增至主畫面」，兩者都從右上角選單進入。
          </p>
        )}
      </section>
    </article>
  )
}

function GettingStartedGuide({ onBack }: { onBack: () => void }) {
  return (
    <article className="pwa-guide getting-started-guide">
      <button type="button" className="help-guide-back" onClick={onBack}>
        <ArrowLeft aria-hidden="true" />
        返回使用教學
      </button>

      <section className="pwa-guide-hero" aria-labelledby="getting-started-title">
        <div className="pwa-guide-kicker">
          <ListChecks aria-hidden="true" />
          新手起步
        </div>
        <h3 id="getting-started-title">如何開始使用 Form Coach Desk？</h3>
        <p>依序完成學生、購課、場地與排課，就能安排第一堂課。</p>
      </section>

      <ol className="getting-started-steps" aria-label="新手起步步驟">
        {gettingStartedSteps.map((step, index) => (
          <li
            key={step.title}
            data-complete={index === gettingStartedSteps.length - 1 || undefined}
          >
            <span className="getting-started-number">{String(index + 1).padStart(2, '0')}</span>
            <div className="getting-started-copy">
              <h4>{step.title}</h4>
              <p>{step.detail}</p>
            </div>
            <Link className="secondary-button getting-started-action" to={step.to}>
              {step.action} <ArrowRight aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>
    </article>
  )
}

export function HelpPanel() {
  const location = useLocation()
  const navigate = useNavigate()
  const guide = new URLSearchParams(location.search).get('guide')

  const setGuide = (nextGuide?: 'pwa' | 'getting-started') => {
    const search = new URLSearchParams(location.search)
    search.set('category', 'feedback')
    if (nextGuide) search.set('guide', nextGuide)
    else search.delete('guide')
    navigate({ pathname: location.pathname, search: `?${search.toString()}` })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  if (guide === 'pwa') return <PwaGuide onBack={() => setGuide()} />
  if (guide === 'getting-started') return <GettingStartedGuide onBack={() => setGuide()} />

  return (
    <section className="settings-panel help-panel">
      <div className="help-tutorials">
        <div className="help-section-heading">
          <span>GUIDES</span>
          <h3>使用教學</h3>
        </div>
        <button
          type="button"
          className="help-tutorial-card"
          onClick={() => setGuide('getting-started')}
        >
          <span className="help-tutorial-icon" aria-hidden="true">
            <ListChecks />
          </span>
          <span className="help-tutorial-copy">
            <small>新手起步 · 5 個步驟</small>
            <strong>如何開始使用 Form Coach Desk？</strong>
          </span>
          <span className="help-tutorial-action">
            查看教學 <ArrowRight aria-hidden="true" />
          </span>
        </button>
        <button type="button" className="help-tutorial-card" onClick={() => setGuide('pwa')}>
          <span className="help-tutorial-icon" aria-hidden="true">
            <Smartphone />
          </span>
          <span className="help-tutorial-copy">
            <small>PWA · iOS／Android</small>
            <strong>把 Form Coach Desk 安裝到手機</strong>
          </span>
          <span className="help-tutorial-action">
            查看教學 <ArrowRight aria-hidden="true" />
          </span>
        </button>
      </div>

      <div className="help-contact-section">
        <div className="help-section-heading">
          <span>SUPPORT</span>
          <h3>需要協助？</h3>
        </div>
        <FeedbackRows />
      </div>
    </section>
  )
}
