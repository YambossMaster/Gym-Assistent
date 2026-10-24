// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { CalendarSession, CapabilityLinkMetadata } from '../../api'
import { CapabilityLinkActions } from './CapabilityLinkManager'

const api = vi.hoisted(() => ({
  list: vi.fn(),
  issue: vi.fn(),
  reissue: vi.fn(),
  revoke: vi.fn(),
  training: vi.fn()
}))
vi.mock('../../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api')>()),
  listCapabilityLinks: api.list,
  issueCapabilityLink: api.issue,
  reissueCapabilityLink: api.reissue,
  revokeCapabilityLink: api.revoke,
  getSessionTraining: api.training
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

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  api.training.mockResolvedValue({ record: { privateNote: '' } })
})

it('keeps the active link copyable after closing, reopening, and reloading the page', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText }
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
    [...document.querySelectorAll<HTMLButtonElement>('button')].find((element) =>
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
    const backdrop = document.querySelector<HTMLElement>('.capability-dialog-backdrop')
    expect(backdrop?.parentElement).toBe(document.body)
    expect(host.contains(backdrop)).toBe(false)
    await vi.waitFor(() => expect(button('建立連結').disabled).toBe(false))
    expect(button('建立連結').outerHTML).toContain('primary-button')
    await act(async () => button('建立連結').click())
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)))
    expect(api.issue).toHaveBeenCalledTimes(1)
    expect(document.querySelector<HTMLInputElement>('#capability-url')?.value).toContain(
      'test-capability-token'
    )
    const urlInput = document.querySelector<HTMLInputElement>('#capability-url')!
    urlInput.setSelectionRange(4, 4)
    urlInput.focus()
    expect(urlInput.selectionStart).toBe(4)
    expect(urlInput.selectionEnd).toBe(4)
    expect(button('複製連結').className).toContain('secondary-button')
    expect(sessionStorage.length).toBe(1)
    expect(button('複製連結').getAttribute('data-copy-state')).toBe('idle')
    await act(async () => button('複製連結').click())
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(button('複製連結').getAttribute('data-copy-state')).toBe('success')
    expect(
      button('複製連結').querySelector('.capability-copy-mobile')?.getAttribute('class')
    ).toContain('lucide-check')
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="關閉"]')!.click())
    await act(async () => button('分享訓練結果').click())
    expect(document.querySelector<HTMLInputElement>('#capability-url')?.value).toContain(
      'test-capability-token'
    )
    expect(button('複製連結')).toBeTruthy()
    expect(button('複製連結').getAttribute('data-copy-state')).toBe('idle')
    expect(api.issue).toHaveBeenCalledTimes(1)
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="關閉"]')!.click())
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
      expect(document.querySelector<HTMLInputElement>('#capability-url')?.value).toContain(
        'test-capability-token'
      )
    )
    await act(async () => button('複製連結').click())
    expect(button('複製連結').getAttribute('data-copy-state')).toBe('success')
    await act(async () => button('重新建立連結').click())
    expect(document.body.textContent).toContain('新連結建立後，先前的網址會立即失效。')
    await act(async () => button('確認重新建立').click())
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)))
    expect(document.querySelector<HTMLInputElement>('#capability-url')?.value).toContain(
      'replacement-token'
    )
    expect(button('複製連結').getAttribute('data-copy-state')).toBe('idle')
    expect(sessionStorage.getItem(sessionStorage.key(0)!)).toContain('replacement-token')
    expect(document.body.textContent).not.toContain('新連結已建立，先前的連結已失效。')
    await act(async () => button('撤銷連結').click())
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)))
    expect(document.querySelector('#capability-url')).toBeNull()
    expect(sessionStorage.length).toBe(0)
  } finally {
    await act(async () => root.unmount())
    client.clear()
  }
})

it('portals the reschedule link dialog outside its action container', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  api.list.mockResolvedValue([])
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <CapabilityLinkActions
            session={session}
            item={{ ...item, status: 'scheduled' } as CalendarSession}
          />
        </QueryClientProvider>
      )
    )
    await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
    const backdrop = document.querySelector<HTMLElement>('.capability-dialog-backdrop')
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('建立改期連結')
    expect(backdrop?.parentElement).toBe(document.body)
    expect(host.contains(backdrop)).toBe(false)
  } finally {
    await act(async () => root.unmount())
    client.clear()
  }
})

it('states why note sharing is unavailable and only offers a link without notes', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  api.list.mockResolvedValue([])
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <CapabilityLinkActions session={session} item={item} />
        </QueryClientProvider>
      )
    )
    await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
    await vi.waitFor(() => expect(document.body.textContent).toContain('尚無已儲存的教練筆記'))
    expect(document.querySelector('input[type="checkbox"]')).toBeNull()
    expect(document.querySelector('.capability-note-state p')).toBeNull()
    expect(document.body.textContent).toContain('建立連結')
    expect(document.body.textContent).not.toContain('不含筆記')
  } finally {
    await act(async () => root.unmount())
    client.clear()
  }
})

it('waits for the latest note save before opening sharing and blocks a failed save', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  api.list.mockResolvedValue([])
  let finishSave!: () => void
  const save = new Promise<void>((resolve) => {
    finishSave = resolve
  })
  const beforeShare = vi
    .fn<() => Promise<void>>()
    .mockReturnValueOnce(save)
    .mockRejectedValueOnce(new Error('save failed'))
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <CapabilityLinkActions session={session} item={item} onBeforeOpen={beforeShare} />
        </QueryClientProvider>
      )
    )
    await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
    expect(host.textContent).toContain('正在儲存')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(api.list).not.toHaveBeenCalled()
    expect(api.issue).not.toHaveBeenCalled()
    await act(async () => finishSave())
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).not.toBeNull())
    expect(api.list).toHaveBeenCalledTimes(1)
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="關閉"]')!.click())
    await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(host.textContent).toContain('訓練紀錄尚未儲存')
    expect(api.issue).not.toHaveBeenCalled()
    expect(beforeShare).toHaveBeenCalledTimes(2)
  } finally {
    await act(async () => root.unmount())
    client.clear()
  }
})

it('keeps link creation waiting while checking notes, then exposes an active checkbox', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  api.list.mockResolvedValue([])
  let finishCheck!: (value: { record: { privateNote: string } }) => void
  api.training.mockReturnValueOnce(
    new Promise((resolve) => {
      finishCheck = resolve
    })
  )
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <CapabilityLinkActions session={session} item={item} />
        </QueryClientProvider>
      )
    )
    await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
    expect(document.body.textContent).toContain('正在確認筆記')
    expect(document.querySelector('input[type="checkbox"]')).toBeNull()
    await vi.waitFor(() =>
      expect(
        [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
          button.textContent?.includes('建立連結')
        )?.disabled
      ).toBe(true)
    )
    await act(async () => finishCheck({ record: { privateNote: '今天蹲舉穩定' } }))
    await vi.waitFor(() => expect(document.querySelector('input[type="checkbox"]')).not.toBeNull())
    const checkbox = document.querySelector<HTMLInputElement>('input[type="checkbox"]')!
    expect(checkbox.disabled).toBe(false)
    await act(async () => checkbox.click())
    expect(checkbox.checked).toBe(true)
    expect(document.body.textContent).toContain('一併分享教練筆記')
    expect(document.body.textContent).not.toContain('只有這個連結會顯示')
  } finally {
    await act(async () => root.unmount())
    client.clear()
  }
})

it('explains a note check failure and lets the coach retry', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  api.list.mockResolvedValue([])
  api.training
    .mockRejectedValueOnce(new Error('temporary read error'))
    .mockResolvedValueOnce({ record: { privateNote: '已儲存的筆記' } })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <CapabilityLinkActions session={session} item={item} />
        </QueryClientProvider>
      )
    )
    await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
    await vi.waitFor(() => expect(document.body.textContent).toContain('無法確認筆記'))
    expect(document.querySelector('input[type="checkbox"]')).toBeNull()
    expect(document.body.textContent).toContain('建立連結')
    expect(document.body.textContent).not.toContain('不含筆記')
    await act(async () =>
      [...document.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.includes('重新確認筆記'))!
        .click()
    )
    await vi.waitFor(() => expect(document.querySelector('input[type="checkbox"]')).not.toBeNull())
    expect(api.training).toHaveBeenCalledTimes(2)
  } finally {
    await act(async () => root.unmount())
    client.clear()
  }
})

it('reissues an old note-enabled link without notes when its saved note is now empty', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  let finishLinks!: (links: CapabilityLinkMetadata[]) => void
  api.list.mockReturnValueOnce(
    new Promise((resolve) => {
      finishLinks = resolve
    })
  )
  api.reissue.mockResolvedValue({ link: { ...link, id: 'replacement' }, token: 'new-token' })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <CapabilityLinkActions session={session} item={item} />
        </QueryClientProvider>
      )
    )
    await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
    await vi.waitFor(() => expect(document.body.textContent).toContain('尚無已儲存的教練筆記'))
    await act(async () => finishLinks([{ ...link, includeTrainingNote: true }]))
    await vi.waitFor(() => expect(document.body.textContent).toContain('重新建立連結'))
    await act(async () =>
      [...document.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.includes('重新建立連結'))!
        .click()
    )
    expect(document.querySelector('input[type="checkbox"]')).toBeNull()
    const confirm = [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.includes('確認重新建立')
    )!
    expect(confirm.disabled).toBe(false)
    await act(async () => confirm.click())
    await vi.waitFor(() =>
      expect(api.reissue).toHaveBeenCalledWith('test-access-token', 'link-1', {
        version: 1,
        includeTrainingNote: false
      })
    )
  } finally {
    await act(async () => root.unmount())
    client.clear()
  }
})

afterEach(() => {
  document.body.innerHTML = ''
  sessionStorage.clear()
  Reflect.deleteProperty(navigator, 'clipboard')
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})
