// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { TimeSelect } from './TimeSelect'

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

it('offers only quarter-hour choices and does not render an editable field', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(<TimeSelect label="開始時間" value="10:30" onChange={() => undefined} />)
    )
    expect(host.querySelector('input[type="text"], input[type="time"]')).toBeNull()
    await act(async () => host.querySelector<HTMLButtonElement>('.form-select-trigger')!.click())
    const options = [...document.querySelectorAll('[role="option"]')].map(
      (item) => item.querySelector('.option-item-label')?.textContent
    )
    expect(options).toHaveLength(96)
    expect(options).toContain('10:30')
    expect(options).not.toContain('10:31')
  } finally {
    await act(async () => root.unmount())
  }
})

it('shows only the selected end time in the field while retaining duration in menu choices', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <TimeSelect label="結束" value="08:30" describeFrom={450} onChange={() => undefined} />
      )
    )
    expect(host.querySelector('.form-select-option-label')?.textContent).toBe('08:30')
    await act(async () => host.querySelector<HTMLButtonElement>('.form-select-trigger')!.click())
    expect(
      [...document.querySelectorAll('[role="option"]')].some((option) =>
        option.textContent?.includes('08:30（1 小時）')
      )
    ).toBe(true)
  } finally {
    await act(async () => root.unmount())
  }
})
