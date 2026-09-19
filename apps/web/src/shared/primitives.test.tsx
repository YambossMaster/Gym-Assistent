// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { Confirmation } from './primitives'

afterEach(() => {
  document.body.innerHTML = ''
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
          shortcutHint="ESC 取消 · DELETE 刪除"
        />
      )
    )
    expect(host.textContent).toContain('ESC 取消 · DELETE 刪除')
    expect(host.querySelector('.danger-confirm-button')?.textContent).toBe('刪除')

    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' })))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
    expect(onCancel).toHaveBeenCalledTimes(1)
  } finally {
    await act(async () => root.unmount())
  }
})
