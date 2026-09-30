// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MobileNoteEditor } from './MobileNoteEditor'

describe('mobile note editor', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.removeItem('gym-assistant.note-import-selection')
  })

  it('applies visible block formatting and inserts only selected class facts', async () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    HTMLElement.prototype.scrollIntoView = vi.fn()
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    let saved = ''
    function Example() {
      const [value, setValue] = useState('觀察')
      return (
        <MobileNoteEditor
          value={value}
          onChange={(next) => {
            saved = next
            setValue(next)
          }}
          onFocusChange={() => {}}
          onLimit={() => {}}
          importItems={[
            { label: '學生', text: '學生：測試學生' },
            { label: '地點', text: '地點：測試場地' }
          ]}
        />
      )
    }
    const button = (name: string) =>
      [...host.querySelectorAll('button')].find((item) => item.textContent?.includes(name))!

    await act(async () => root.render(<Example />))
    await act(async () => host.querySelector('textarea')!.focus())
    await act(async () => button('Aa').click())
    await act(async () => button('標題 Heading').click())
    expect(saved).toBe('# 觀察')
    expect(host.querySelector('.mobile-note-block.is-heading')).not.toBeNull()

    await act(async () => button('課堂').click())
    const student = host.querySelectorAll<HTMLInputElement>('.session-note-popover input')[0]!
    const venue = host.querySelectorAll<HTMLInputElement>('.session-note-popover input')[1]!
    expect(student.checked).toBe(false)
    expect(venue.checked).toBe(false)
    await act(async () => student.click())
    expect(JSON.parse(localStorage.getItem('gym-assistant.note-import-selection') ?? '[]')).toEqual(
      ['學生']
    )
    await act(async () => button('導入選取').click())
    expect(saved).toBe('# 觀察\n學生：測試學生')
    expect(host.querySelectorAll('.mobile-note-block')).toHaveLength(2)

    await act(async () => button('項目').click())
    expect(saved).toBe('# 觀察\n- 學生：測試學生')
    await act(async () => button('編號').click())
    expect(saved).toBe('# 觀察\n1. 學生：測試學生')
    await act(async () => button('縮排').click())
    expect(saved).toBe('# 觀察\n\t1. 學生：測試學生')
    await act(async () => button('退排').click())
    expect(saved).toBe('# 觀察\n1. 學生：測試學生')
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="段落加粗"]')!.click())
    expect(saved).toBe('# 觀察\n1. **學生：測試學生**')
    expect(host.querySelector('.mobile-note-block.is-bold')).not.toBeNull()

    await act(async () => button('課堂').click())
    expect(host.querySelector<HTMLInputElement>('.session-note-popover input')!.checked).toBe(true)
    await act(async () =>
      host.querySelector<HTMLButtonElement>('.note-import-row:nth-of-type(2) button')!.click()
    )
    expect(saved).toBe('# 觀察\n1. **學生：測試學生**\n地點：測試場地')
    await act(async () => host.querySelector<HTMLElement>('.mobile-note-canvas')!.click())
    expect(document.activeElement).toBe(host.querySelectorAll('textarea')[2])
    expect(host.querySelectorAll('textarea')[2]!.selectionStart).toBe('地點：測試場地'.length)

    await act(async () => root.unmount())
    host.remove()
  })
})
