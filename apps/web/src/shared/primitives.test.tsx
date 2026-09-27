// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { Confirmation } from './primitives'

afterEach(() => {
  document.body.innerHTML = ''
})

it('locks page scrolling without turning the desktop sticky sidebar into a scrolling element', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const priorBodyOverflow = document.body.style.overflow
  const priorRootOverflow = document.documentElement.style.overflow
  document.body.style.overflow = 'auto'
  document.documentElement.style.overflow = 'scroll'
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <Confirmation
          title="永久刪除資料？"
          text="這項操作無法復原。"
          confirmation=""
          onConfirmationChange={vi.fn()}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          disabled={false}
        />
      )
    )
    expect(document.body.style.overflow).toBe('clip')
    expect(document.documentElement.style.overflow).toBe('clip')
  } finally {
    await act(async () => root.unmount())
    expect(document.body.style.overflow).toBe('auto')
    expect(document.documentElement.style.overflow).toBe('scroll')
    document.body.style.overflow = priorBodyOverflow
    document.documentElement.style.overflow = priorRootOverflow
  }
})

it('offers ESC and Delete shortcuts for a simple session deletion confirmation', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const onCancel = vi.fn()
  const onConfirm = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <Confirmation
          title="是否確認刪除此課堂？"
          text="此課堂的所有內容變更將不被保存。"
          onCancel={onCancel}
          onConfirm={onConfirm}
          disabled={false}
          confirmLabel="刪除"
          confirmOnDelete
        />
      )
    )
    expect(host.textContent).not.toMatch(/ESC|DELETE/)
    expect(host.querySelector('.danger-confirm-button')?.textContent).toBe('刪除')

    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' })))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
    expect(onCancel).toHaveBeenCalledTimes(1)
  } finally {
    await act(async () => root.unmount())
  }
})

it('requires the confirmation word before Delete can confirm, without Enter as a shortcut', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const onConfirm = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const render = (confirmation: string) =>
    root.render(
      <Confirmation
        title="永久刪除資料？"
        text="這項操作無法復原。"
        confirmation={confirmation}
        onConfirmationChange={vi.fn()}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        disabled={false}
      />
    )
  try {
    await act(async () => render('DELET'))
    const input = host.querySelector<HTMLInputElement>('.danger-confirmation-card input')!
    const button = host.querySelector<HTMLButtonElement>('.danger-confirm-button')!
    expect(button.disabled).toBe(true)
    await act(async () =>
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    )
    expect(onConfirm).not.toHaveBeenCalled()
    await act(async () =>
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    )
    expect(onConfirm).not.toHaveBeenCalled()

    await act(async () => render('DELETE'))
    expect(button.disabled).toBe(false)
    expect(button.getAttribute('aria-keyshortcuts')).toBe('Delete')
    await act(async () =>
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    )
    expect(onConfirm).not.toHaveBeenCalled()
    await act(async () =>
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    )
    expect(onConfirm).toHaveBeenCalledTimes(1)
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' })))
    expect(onConfirm).toHaveBeenCalledTimes(2)
  } finally {
    await act(async () => root.unmount())
  }
})
