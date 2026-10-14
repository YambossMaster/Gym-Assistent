// Development-only isolated rendering of the Help guides. No real Auth or user records.
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { HelpPanel } from '../src/pages/settings/HelpPanel'
import '../src/styles.css'

if (!import.meta.env.DEV) throw new Error('Development preview only')

function Preview() {
  return (
    <MemoryRouter initialEntries={['/settings?category=feedback']}>
      <main className="page settings-page help-review-page">
        <div className="settings-detail">
          <header className="settings-detail-heading">
            <span className="eyebrow dark">SETTINGS</span>
            <h2>協助與回饋</h2>
            <p>查看使用教學、回報問題或聯絡我們。</p>
          </header>
          <HelpPanel />
        </div>
      </main>
    </MemoryRouter>
  )
}

createRoot(document.getElementById('root')!).render(<Preview />)
