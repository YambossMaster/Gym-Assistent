// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { afterEach, expect, it, vi } from 'vitest'
import { ExportDownloads, useExportDownloads } from './ExportDownloads'
vi.mock('../../supabase', () => ({ supabase: { auth: {} } }))
const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
  vi.unstubAllGlobals()
})
function Controls() {
  const downloads = useExportDownloads()
  const [away, setAway] = useState(false)
  return (
    <>
      <button onClick={() => setAway(!away)}>切換頁面</button>
      {!away && (
        <button
          disabled={downloads.pending}
          onClick={() => {
            const job = {
              label: '收支明細',
              path: '/api/v1/finance-export',
              input: { format: 'xlsx' }
            }
            downloads.start(job)
            downloads.start(job)
          }}
        >
          開始匯出
        </button>
      )}
    </>
  )
}
async function setup() {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  let complete!: (response: Response) => void
  let signal!: AbortSignal
  const fetcher = vi.fn(
    (_url: string, options: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        complete = resolve
        signal = options.signal as AbortSignal
        signal.addEventListener('abort', () => reject(new DOMException('cancel', 'AbortError')), {
          once: true
        })
      })
  )
  vi.stubGlobal('fetch', fetcher)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const render = async (id = 'one') => {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <ExportDownloads
            key={id}
            session={{ user: { id }, access_token: 'synthetic' } as Session}
          >
            <Controls />
          </ExportDownloads>
        </QueryClientProvider>
      )
    )
  }
  await render()
  cleanups.push(async () => {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
  })
  return {
    fetcher,
    render,
    getSignal: () => signal,
    complete: () =>
      complete(
        new Response('file', {
          headers: { 'content-disposition': "attachment; filename*=UTF-8''report.xlsx" }
        })
      )
  }
}
async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
}
async function click(text: string) {
  await act(async () => {
    const b = [...document.querySelectorAll('button')].find((b) => b.textContent === text)
    expect(b).toBeDefined()
    b!.click()
  })
  await flush()
}
it('guards same-tick duplicates and survives switching away with an announced ready file', async () => {
  const state = await setup()
  await click('開始匯出')
  expect(state.fetcher).toHaveBeenCalledTimes(1)
  expect(document.body.textContent).toContain('正在準備檔案')
  await click('切換頁面')
  expect(state.getSignal().aborted).toBe(false)
  await act(async () => state.complete())
  await flush()
  expect(document.body.textContent).toContain('檔案已就緒')
  expect(document.body.textContent).toContain('儲存檔案')
  expect(document.body.textContent).not.toContain('下載完成')
})
it('cancels explicitly, clears late callbacks and allows a fresh attempt', async () => {
  const state = await setup()
  await click('開始匯出')
  await click('取消匯出')
  expect(state.getSignal().aborted).toBe(true)
  expect(document.querySelector('.export-download-notice')).toBeNull()
  await click('開始匯出')
  expect(state.fetcher).toHaveBeenCalledTimes(2)
})
it('aborts and clears private state on Coach identity change', async () => {
  const state = await setup()
  await click('開始匯出')
  const oldSignal = state.getSignal()
  await state.render('two')
  await flush()
  expect(oldSignal.aborted).toBe(true)
  expect(document.querySelector('.export-download-notice')).toBeNull()
})
