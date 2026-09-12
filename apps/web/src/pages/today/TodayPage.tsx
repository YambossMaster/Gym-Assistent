import { ArrowRight, LayoutGrid } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Page } from '../../shared/primitives'

export function TodayPage({ timeZone }: { timeZone: string }) {
  return (
    <Page
      title="今日"
      eyebrow={new Intl.DateTimeFormat('zh-TW', { dateStyle: 'full', timeZone }).format(new Date())}
    >
      <section className="empty-state">
        <LayoutGrid />
        <h2>從容開始今天的課程</h2>
        <p>今天的安排會在這裡依時間呈現。</p>
        <NavLink className="text-button" to="/calendar">
          前往行事曆 <ArrowRight />
        </NavLink>
      </section>
    </Page>
  )
}
