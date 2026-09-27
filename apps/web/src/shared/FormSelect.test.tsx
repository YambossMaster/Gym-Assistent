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

it('renders option descriptions as secondary text without changing the selected value', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <FormSelect
          label="場地"
          value="studio"
          options={[
            { value: 'studio', label: '工作室', description: '目前預設場地' },
            { value: 'outdoor', label: '戶外', description: '不使用室內場地' }
          ]}
        />
      )
    )
    await act(async () => host.querySelector<HTMLButtonElement>('.form-select-trigger')!.click())
    const options = document.querySelectorAll<HTMLButtonElement>('[role="option"]')
    expect(options).toHaveLength(2)
    expect(options[0].querySelector('.option-item-label')?.textContent).toBe('工作室')
    expect(options[0].querySelector('.option-item-description')?.textContent).toBe('目前預設場地')
    expect(options[0].getAttribute('aria-selected')).toBe('true')
    expect(host.querySelector('.form-select-trigger')?.textContent).not.toContain('目前預設場地')
  } finally {
    await act(async () => root.unmount())
  }
})

it('does not reopen when a wrapping label forwards the click that closes the menu', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <label>
          學生
          <FormSelect label="學生" options={[{ value: 'a', label: '學生 A' }]} />
        </label>
      )
    )
    const trigger = host.querySelector<HTMLButtonElement>('.form-select-trigger')!
    await act(async () => trigger.click())
    expect(document.querySelector('[role="listbox"]')).not.toBeNull()
    await act(async () => {
      host.querySelector('label')!.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      trigger.click()
    })
    expect(document.querySelector('[role="listbox"]')).toBeNull()
    await act(async () => trigger.click())
    expect(document.querySelector('[role="listbox"]')).not.toBeNull()
  } finally {
    await act(async () => root.unmount())
  }
})

it('closes an open menu when another choice menu opens', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <>
          <FormSelect label="器材" options={[{ value: 'bar', label: '槓鈴' }]} />
          <FormSelect label="紀錄類型" options={[{ value: 'reps', label: '次數' }]} />
        </>
      )
    )
    const triggers = host.querySelectorAll<HTMLButtonElement>('.form-select-trigger')
    await act(async () => triggers[0].click())
    expect(document.querySelector('[role="listbox"]')?.getAttribute('aria-label')).toBe('器材')
    await act(async () => triggers[1].click())
    expect(document.querySelectorAll('[role="listbox"]')).toHaveLength(1)
    expect(document.querySelector('[role="listbox"]')?.getAttribute('aria-label')).toBe('紀錄類型')
  } finally {
    await act(async () => root.unmount())
  }
})
