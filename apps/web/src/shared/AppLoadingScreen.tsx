import { Brand } from './primitives'

export function AppLoadingScreen() {
  return (
    <main className="app-loading" role="status" aria-live="polite">
      <div className="app-loading-content">
        <span className="app-loading-accent" aria-hidden="true" />
        <Brand />
        <span className="app-loading-progress" aria-hidden="true" />
        <span className="app-loading-caption">正在開啟工作台…</span>
      </div>
    </main>
  )
}
