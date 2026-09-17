// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { FormSelect } from './FormSelect'

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

it('renders a styled option menu and keeps submitted values in sync', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  function Form() {
    const [value, setValue] = useState('kg')
    return (
      <form>
        <FormSelect
          label="重量單位"
          name="unit"
          value={value}
          onChange={setValue}
          options={[
            { value: 'kg', label: '公斤' },
            { value: 'lb', label: '磅' }
          ]}
        />
      </form>
    )
  }
  try {
    await act(async () => root.render(<Form />))
    const trigger = host.querySelector<HTMLButtonElement>('.form-select-trigger')!
    await act(async () => trigger.click())
    expect(document.querySelector('[role="listbox"]')).not.toBeNull()
    await act(async () =>
      document.querySelectorAll<HTMLButtonElement>('[role="option"]')[1].click()
    )
    expect(trigger.textContent).toContain('磅')
    expect(new FormData(host.querySelector('form')!).get('unit')).toBe('lb')
    expect(document.querySelector('[role="listbox"]')).toBeNull()
  } finally {
    await act(async () => root.unmount())
  }
})

it('keeps a short upward-opening menu adjacent to the trigger', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <FormSelect
          label="動作類型"
          options={[
            { value: 'system', label: '系統動作' },
            { value: 'local', label: '局部動作' }
          ]}
        />
      )
    )
    const trigger = host.querySelector<HTMLButtonElement>('.form-select-trigger')!
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      top: 700,
      bottom: 748,
      left: 20,
      width: 300,
      height: 48
    } as DOMRect)
    await act(async () => trigger.click())
    const menu = document.querySelector<HTMLElement>('.form-select-menu')!
    expect(Number.parseFloat(menu.style.top) + Number.parseFloat(menu.style.maxHeight)).toBe(694)
  } finally {
    await act(async () => root.unmount())
  }
})
