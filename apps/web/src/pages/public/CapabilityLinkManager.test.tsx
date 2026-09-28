// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { afterEach, expect, it, vi } from 'vitest'
import type { CalendarSession, CapabilityLinkMetadata } from '../../api'
import { CapabilityLinkActions } from './CapabilityLinkManager'

const api = vi.hoisted(() => ({
  list: vi.fn(),
  issue: vi.fn(),
  reissue: vi.fn(),
  revoke: vi.fn()
}))
vi.mock('../../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api')>()),
  listCapabilityLinks: api.list,
  issueCapabilityLink: api.issue,
  reissueCapabilityLink: api.reissue,
  revokeCapabilityLink: api.revoke
}))

const link: CapabilityLinkMetadata = {
  id: 'link-1',
  purpose: 'training_result',
  status: 'active',
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  includeTrainingNote: false,
  createdAt: '2026-09-28T08:00:00.000Z',
  version: 1,
  allowedActions: { canReissue: true, canRevoke: true }
}
const item = {
  id: 'session-1',
  status: 'completed'
} as CalendarSession
const session = {
  user: { id: 'coach-1' },
  access_token: 'test-access-token'
} as Session

it('keeps the active link copyable after closing, reopening, and reloading the page', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  let currentLink: CapabilityLinkMetadata | null = null
  api.list.mockImplementation(async () => (currentLink ? [currentLink] : []))
  api.issue.mockImplementation(async () => {
    currentLink = link
    return { link, token: 'test-capability-token' }
  })
  api.reissue.mockImplementation(async () => {
    currentLink = { ...link, id: 'link-2' }
    return { link: currentLink, token: 'replacement-token' }
  })
  api.revoke.mockImplementation(async () => {
    currentLink = {
      ...link,
      id: 'link-2',
      status: 'revoked',
      allowedActions: { canReissue: true, canRevoke: false }
    }
    return currentLink
  })
  const host = document.createElement('div')
  document.body.append(host)
  let root = createRoot(host)
  let client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const button = (label: string) =>
    [...host.querySelectorAll<HTMLButtonElement>('button')].find((element) =>
      element.textContent?.includes(label)
    )!
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <CapabilityLinkActions session={session} item={item} />
        </QueryClientProvider>
      )
    )
    await act(async () => button('分享訓練結果').click())
    await vi.waitFor(() => expect(button('建立連結').disabled).toBe(false))
    expect(button('建立連結').outerHTML).toContain('primary-button')
    await act(async () => button('建立連結').click())
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)))
    expect(api.issue).toHaveBeenCalledTimes(1)
    expect(host.querySelector<HTMLInputElement>('#capability-url')?.value).toContain(
      'test-capability-token'
    )
    const urlInput = host.querySelector<HTMLInputElement>('#capability-url')!
    urlInput.setSelectionRange(4, 4)
    urlInput.focus()
    expect(urlInput.selectionStart).toBe(4)
    expect(urlInput.selectionEnd).toBe(4)
    expect(button('複製連結').className).toContain('secondary-button')
    expect(sessionStorage.length).toBe(1)
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="關閉"]')!.click())
    await act(async () => button('分享訓練結果').click())
    expect(host.querySelector<HTMLInputElement>('#capability-url')?.value).toContain(
      'test-capability-token'
    )
    expect(button('複製連結')).toBeTruthy()
    expect(api.issue).toHaveBeenCalledTimes(1)
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="關閉"]')!.click())
    await act(async () => root.unmount())
    client.clear()
    root = createRoot(host)
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <CapabilityLinkActions session={session} item={item} />
        </QueryClientProvider>
      )
    )
    await act(async () => button('分享訓練結果').click())
    await vi.waitFor(() =>
      expect(host.querySelector<HTMLInputElement>('#capability-url')?.value).toContain(
        'test-capability-token'
      )
    )
    await act(async () => button('重新建立連結').click())
    expect(host.textContent).toContain('新連結建立後，先前的網址會立即失效。')
    await act(async () => button('確認重新建立').click())
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)))
    expect(host.querySelector<HTMLInputElement>('#capability-url')?.value).toContain(
      'replacement-token'
    )
    expect(sessionStorage.getItem(sessionStorage.key(0)!)).toContain('replacement-token')
    expect(host.textContent).not.toContain('新連結已建立，先前的連結已失效。')
    await act(async () => button('撤銷連結').click())
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)))
    expect(host.querySelector('#capability-url')).toBeNull()
    expect(sessionStorage.length).toBe(0)
  } finally {
    await act(async () => root.unmount())
    client.clear()
  }
})

afterEach(() => {
  document.body.innerHTML = ''
  sessionStorage.clear()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})
