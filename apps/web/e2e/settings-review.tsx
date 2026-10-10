// Development-only isolated rendering of product components. No real Auth or user records.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { MemoryRouter } from 'react-router-dom'
import { FinanceExportPanel, type DataPanelProps } from '../src/pages/settings/FinanceExportPanel'
import { CalendarIntegrationPanel } from '../src/pages/settings/CalendarIntegrationPanel'
import { ExportDownloads } from '../src/pages/settings/ExportDownloads'
import '../src/styles.css'
if (!import.meta.env.DEV) throw new Error('Development preview only')
const userId = '00000000-0000-4000-8000-000000000001'
const session = { user: { id: userId }, access_token: `dev:${userId}` } as Session
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
client.setQueryData(['export-venues', userId], { venues: [] })
client.setQueryDefaults(['export-venues', userId], { staleTime: Infinity })
client.setQueryData(['calendar-integration', userId], {
  includeBlocks: false,
  showNames: false,
  showLocation: true,
  version: 1,
  active: true,
  token: 'abcdefghijklmnopqrstuvwxyzABCDEFGH123456789'
})
client.setQueryDefaults(['calendar-integration', userId], { staleTime: Infinity })
function Preview() {
  const [away, setAway] = useState(false)
  const props: DataPanelProps = {
    session,
    plan: {
      tier: 'advanced',
      source: 'permanent',
      activeStudents: 0,
      activeVenues: 0,
      studentLimit: null,
      venueLimit: null,
      overCapacity: false
    } as DataPanelProps['plan'],
    timeZone: 'Asia/Taipei',
    loadingError: false,
    onRetryLoading: () => {}
  }
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ExportDownloads session={session}>
          <main
            className="page settings-page"
            style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}
          >
            <h1>設定</h1>
            <button onClick={() => setAway(!away)}>{away ? '回到設定' : '切換其他頁面'}</button>
            {away ? (
              <section className="settings-panel">
                <h2>其他操作</h2>
                <label>
                  測試輸入
                  <input aria-label="測試輸入" />
                </label>
              </section>
            ) : (
              <div className="settings-grid">
                <FinanceExportPanel {...props} />
                <CalendarIntegrationPanel {...props} />
              </div>
            )}
          </main>
        </ExportDownloads>
      </MemoryRouter>
    </QueryClientProvider>
  )
}
createRoot(document.getElementById('root')!).render(<Preview />)
