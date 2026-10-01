// @vitest-environment jsdom
import type { Session } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { SessionEditor, SessionPage } from './SessionPage'
import { SessionLifecycleButton } from '../training/TrainingWorkspace'

const requests = vi.hoisted(() => ({
  getSession: vi.fn(),
  getSessionTraining: vi.fn()
}))

vi.mock('../../api', async (original) => ({
  ...(await original<typeof import('../../api')>()),
  getSession: requests.getSession,
  getSessionTraining: requests.getSessionTraining
}))

const session = { user: { id: 'coach' }, access_token: 'test-token' } as Session

afterEach(() => {
  document.body.innerHTML = ''
  requests.getSession.mockReset()
  requests.getSessionTraining.mockReset()
  vi.unstubAllGlobals()
})

it('starts session detail and training reads together on the first route render', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  requests.getSession.mockReturnValue(new Promise(() => undefined))
  requests.getSessionTraining.mockReturnValue(new Promise(() => undefined))
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/sessions/session-1']}>
            <Routes>
              <Route
                path="/sessions/:sessionId"
                element={<SessionPage session={session} timeZone="Asia/Taipei" />}
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    expect(requests.getSession).toHaveBeenCalledTimes(1)
    expect(requests.getSessionTraining).toHaveBeenCalledTimes(1)
  } finally {
    await act(async () => root.unmount())
    client.clear()
  }
})

it('uses the compact Session editor structure with a separated action footer', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <SessionEditor
          item={{
            studentId: 'student-1',
            studentName: '學生甲',
            startsAt: '2026-09-15T01:00:00.000Z',
            endsAt: '2026-09-15T02:00:00.000Z',
            location: 'FORM A',
            status: 'scheduled'
          }}
          students={[{ id: 'student-1', name: '學生甲', active: true }]}
          timeZone="Asia/Taipei"
          pending={false}
          onClose={vi.fn()}
          onSave={vi.fn()}
          onRequestDelete={vi.fn()}
        />
      )
    )
    expect(host.querySelector('.scheduling-dialog.session-edit')).not.toBeNull()
    expect(host.querySelector('.session-editor-form-body')).not.toBeNull()
    expect(host.querySelector('.session-editor-form-body > .scheduling-time-fields')).not.toBeNull()
    expect(host.querySelectorAll('.session-editor-form-body .scheduling-time-arrow')).toHaveLength(
      1
    )
    expect(host.querySelector('.session-editor-form-footer')).not.toBeNull()
    expect(
      [...host.querySelectorAll<HTMLButtonElement>('.session-editor-form-footer button')].map(
        (button) =>
          button.querySelector('.desktop-action-label')?.textContent ?? button.textContent?.trim()
      )
    ).toEqual(['刪除課堂', '取消', '儲存變更'])
    expect(
      [...host.querySelectorAll('.session-editor-form-footer .mobile-action-label')].map(
        (label) => label.textContent
      )
    ).toEqual(['刪除', '儲存'])
  } finally {
    await act(async () => root.unmount())
  }
})

it('explains why a completed session cannot be changed', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <SessionEditor
          item={{
            studentId: 'student-1',
            studentName: '學生甲',
            startsAt: '2026-09-15T01:00:00.000Z',
            endsAt: '2026-09-15T02:00:00.000Z',
            location: 'FORM A',
            status: 'completed'
          }}
          students={[{ id: 'student-1', name: '學生甲', active: true }]}
          timeZone="Asia/Taipei"
          pending={false}
          onClose={vi.fn()}
          onSave={vi.fn()}
          onRequestDelete={vi.fn()}
        />
      )
    )
    expect(host.querySelector('.scheduling-dialog > header')?.textContent).toContain(
      '課堂已完成，無法變更安排。'
    )
    expect(host.querySelector<HTMLButtonElement>('.series-date-trigger')?.disabled).toBe(true)
  } finally {
    await act(async () => root.unmount())
  }
})

it('clears a corrected time error when the Session editor submits again', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const onSave = vi.fn()
  try {
    await act(async () =>
      root.render(
        <SessionEditor
          item={{
            venueId: 'venue-1',
            studentId: 'student-1',
            studentName: '學生甲',
            startsAt: '2026-09-15T01:00:00.000Z',
            endsAt: '2026-09-15T01:00:00.000Z',
            location: 'FORM A',
            status: 'scheduled'
          }}
          students={[{ id: 'student-1', name: '學生甲', active: true }]}
          timeZone="Asia/Taipei"
          pending={false}
          onClose={vi.fn()}
          onSave={onSave}
          onRequestDelete={vi.fn()}
        />
      )
    )
    const submit = () =>
      host.querySelector<HTMLButtonElement>('.session-editor-form-footer .ui-action-save')!
    await act(async () => submit().click())
    expect(host.querySelector('.notice.error')?.textContent).toBe('結束時間必須晚於開始時間。')
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="結束"]')!.click()
    )
    const endOption = [
      ...document.querySelectorAll<HTMLElement>(
        '[role="listbox"][aria-label="結束"] [role="option"]'
      )
    ].find((option) => option.textContent?.trim() === '10:00')!
    await act(async () => endOption.click())
    await act(async () => submit().click())
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(host.querySelector('.notice.error')).toBeNull()
  } finally {
    await act(async () => root.unmount())
  }
})

it('shows the same processing affordance for completion and reopening', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    for (const action of ['complete', 'reopen'] as const) {
      await act(async () =>
        root.render(
          <SessionLifecycleButton action={action} pending offline={false} onClick={vi.fn()} />
        )
      )
      const button = host.querySelector<HTMLButtonElement>('button')!
      expect(button.disabled).toBe(true)
      expect(button.getAttribute('aria-busy')).toBe('true')
      expect(button.textContent).toContain('處理中…')
      expect(button.querySelector('.button-spinner')).not.toBeNull()
    }
  } finally {
    await act(async () => root.unmount())
  }
})
