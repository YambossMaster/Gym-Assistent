// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SchedulingDialog } from './SchedulingDialog'
import { Confirmation } from '../../shared/primitives'

describe('SchedulingDialog focus', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  it('restores page scrolling after nested confirmation and editor close together', async () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    function Screen() {
      const [state, setState] = useState<'editor' | 'confirm' | 'closed'>('editor')
      if (state === 'closed') return <p>已關閉</p>
      return (
        <>
          <SchedulingDialog title="變更課堂" onClose={() => setState('closed')}>
            <button onClick={() => setState('confirm')}>刪除課堂</button>
          </SchedulingDialog>
          {state === 'confirm' ? (
            <Confirmation
              title="是否確認刪除此課堂？"
              text="刪除後無法復原。"
              onCancel={() => setState('editor')}
              onConfirm={() => setState('closed')}
              disabled={false}
            />
          ) : null}
        </>
      )
    }
    try {
      await act(async () => root.render(<Screen />))
      await act(async () =>
        [...host.querySelectorAll<HTMLButtonElement>('.scheduling-dialog button')]
          .find((button) => button.textContent?.includes('刪除課堂'))!
          .click()
      )
      expect(document.body.style.overflow).toBe('hidden')
      await act(async () =>
        [...host.querySelectorAll<HTMLButtonElement>('button')]
          .find((button) => button.textContent?.includes('永久刪除'))!
          .click()
      )
      expect(document.body.style.overflow).toBe('')
    } finally {
      await act(async () => root.unmount())
      document.body.style.overflow = ''
    }
  })

  it('keeps focus in the edited text field when a controlled draft changes', async () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    function Editor() {
      const [location, setLocation] = useState('')
      return (
        <SchedulingDialog title="安排課程" onClose={() => {}}>
          <label>
            地點
            <input value={location} onChange={(event) => setLocation(event.target.value)} />
          </label>
        </SchedulingDialog>
      )
    }
    try {
      await act(async () => root.render(<Editor />))
      const input = host.querySelector('input')!
      input.focus()
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
        setter.call(input, 'F')
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
      expect(input.value).toBe('F')
      expect(document.activeElement).toBe(input)
    } finally {
      await act(async () => root.unmount())
    }
  })

  it('keeps focus through note, date, selection, and option changes', async () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    function Editor() {
      const [draft, setDraft] = useState({
        note: '',
        date: '2026-09-16',
        scope: 'single',
        repeat: false
      })
      return (
        <SchedulingDialog title="建立封鎖時段" onClose={() => {}}>
          <textarea
            aria-label="備註"
            value={draft.note}
            onChange={(event) => setDraft({ ...draft, note: event.target.value })}
          />
          <input
            aria-label="日期"
            type="date"
            value={draft.date}
            onChange={(event) => setDraft({ ...draft, date: event.target.value })}
          />
          <select
            aria-label="範圍"
            value={draft.scope}
            onChange={(event) => setDraft({ ...draft, scope: event.target.value })}
          >
            <option value="single">一次</option>
            <option value="all">全部</option>
          </select>
          <input
            aria-label="重複"
            type="checkbox"
            checked={draft.repeat}
            onChange={(event) => setDraft({ ...draft, repeat: event.target.checked })}
          />
        </SchedulingDialog>
      )
    }
    try {
      await act(async () => root.render(<Editor />))
      const note = host.querySelector('textarea')!
      const date = host.querySelector<HTMLInputElement>('input[type="date"]')!
      const scope = host.querySelector('select')!
      const repeat = host.querySelector<HTMLInputElement>('input[type="checkbox"]')!
      for (const [field, value, eventName] of [
        [note, '備註文字', 'input'],
        [date, '2026-09-17', 'input'],
        [scope, 'all', 'change']
      ] as const) {
        field.focus()
        await act(async () => {
          const setter = Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(field),
            'value'
          )!.set!
          setter.call(field, value)
          field.dispatchEvent(new Event(eventName, { bubbles: true }))
        })
        expect(document.activeElement).toBe(field)
      }
      repeat.focus()
      await act(async () => repeat.click())
      expect(document.activeElement).toBe(repeat)
    } finally {
      await act(async () => root.unmount())
    }
  })

  it('restores focus without scrolling the calendar when the dialog closes', async () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    function Screen() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>開啟</button>
          {open ? (
            <SchedulingDialog title="安排課程" onClose={() => setOpen(false)}>
              內容
            </SchedulingDialog>
          ) : null}
        </>
      )
    }
    try {
      await act(async () => root.render(<Screen />))
      const opener = host.querySelector('button')!
      const focus = vi.spyOn(opener, 'focus')
      opener.focus()
      await act(async () => opener.click())
      await act(async () =>
        host.querySelector<HTMLButtonElement>('.scheduling-dialog .icon-button')!.click()
      )
      expect(focus).toHaveBeenLastCalledWith({ preventScroll: true })
    } finally {
      await act(async () => root.unmount())
    }
  })
})
