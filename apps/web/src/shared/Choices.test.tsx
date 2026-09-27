// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { Checkbox } from './Checkbox'
import { RadioGroup } from './RadioGroup'

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

it('keeps radio selection and form submission in sync', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  function Form() {
    const [value, setValue] = useState('studio')
    return (
      <form>
        <RadioGroup
          label="場地類型"
          name="venue"
          value={value}
          onChange={setValue}
          options={[
            { value: 'studio', label: '工作室', description: '固定場地' },
            { value: 'outdoor', label: '戶外', description: '彈性地點' }
          ]}
        />
      </form>
    )
  }
  try {
    await act(async () => root.render(<Form />))
    expect(host.querySelector('.option-item-description')?.textContent).toBe('固定場地')
    await act(async () => host.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1].click())
    expect(new FormData(host.querySelector('form')!).get('venue')).toBe('outdoor')
  } finally {
    await act(async () => root.unmount())
  }
})

it('keeps a checkbox accessible and submits only while checked', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <form>
          <Checkbox label="顯示通知" description="顯示近期更新" name="notice" value="yes" />
        </form>
      )
    )
    const input = host.querySelector<HTMLInputElement>('input[type="checkbox"]')!
    expect(input.labels?.[0]?.textContent).toContain('顯示通知')
    expect(new FormData(host.querySelector('form')!).has('notice')).toBe(false)
    await act(async () => input.click())
    expect(new FormData(host.querySelector('form')!).get('notice')).toBe('yes')
  } finally {
    await act(async () => root.unmount())
  }
})
