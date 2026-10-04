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

  it('offers one continuous editable surface for cross-paragraph selection', async () => {
    HTMLElement.prototype.scrollIntoView = vi.fn()
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    await act(async () =>
      root.render(
        <MobileNoteEditor
          value={'第一段\n第二段'}
          onChange={() => {}}
          onFocusChange={() => {}}
          onLimit={() => {}}
          importItems={[]}
        />
      )
    )
    expect(host.querySelectorAll('[contenteditable="true"]')).toHaveLength(1)
    expect(host.querySelectorAll('.mobile-note-block')).toHaveLength(2)
    expect(host.querySelector('textarea')).toBeNull()
    const blocks = host.querySelectorAll('.mobile-note-block')
    const range = document.createRange()
    range.setStart(blocks[0]!.firstChild!, 1)
    range.setEnd(blocks[1]!.firstChild!, 2)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
    expect(selection.toString()).toContain('第二')
    await act(async () =>
      host
        .querySelector('.mobile-note-content')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    )
    expect(selection.toString()).toContain('第二')
    await act(async () =>
      host
        .querySelector('.mobile-note-canvas')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    )
    expect(selection.toString()).toContain('第二')
    await act(async () => root.unmount())
    host.remove()
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
    await act(async () => host.querySelector<HTMLElement>('.mobile-note-content')!.focus())
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
    expect(document.activeElement).toBe(host.querySelector('.mobile-note-content'))
    expect(window.getSelection()?.anchorNode?.parentElement).toBe(
      host.querySelectorAll('.mobile-note-block')[2]
    )

    await act(async () => root.unmount())
    host.remove()
  })

  it('continues lists, cancels their marker with Backspace, and indents list items', async () => {
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
      const [value, setValue] = useState('- 第一項\n1. 編號項')
      return (
        <MobileNoteEditor
          value={value}
          onChange={(next) => {
            saved = next
            setValue(next)
          }}
          onFocusChange={() => {}}
          onLimit={() => {}}
          importItems={[]}
        />
      )
    }
    const editor = () => host.querySelector<HTMLElement>('.mobile-note-content')!
    const blocks = () => host.querySelectorAll<HTMLElement>('.mobile-note-block')
    const focusBlock = (index: number, offset: number) => {
      const range = document.createRange()
      const block = blocks()[index]!
      if (block.firstChild) range.setStart(block.firstChild, offset)
      else range.selectNodeContents(block)
      range.collapse(true)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
      editor().focus()
    }
    const key = async (name: string, shiftKey = false) => {
      await act(async () =>
        editor().dispatchEvent(
          new KeyboardEvent('keydown', {
            key: name,
            shiftKey,
            bubbles: true,
            cancelable: true
          })
        )
      )
    }

    await act(async () => root.render(<Example />))
    focusBlock(0, 3)
    await key('Enter')
    expect(saved).toBe('- 第一項\n- \n1. 編號項')
    expect(blocks()[1]!.dataset.kind).toBe('bullet')
    await key('Backspace')
    expect(saved).toBe('- 第一項\n\n1. 編號項')
    expect(blocks()[1]!.dataset.kind).toBe('body')

    focusBlock(2, 0)
    await key('Tab')
    expect(blocks()[2]!.dataset.indent).toBe('1')
    expect(saved).toContain('\t1. 編號項')
    await key('Tab', true)
    expect(blocks()[2]!.dataset.indent).toBe('0')
    focusBlock(2, 0)
    await key('Backspace')
    expect(saved).toBe('- 第一項\n\n編號項')
    expect(blocks()[2]!.dataset.kind).toBe('body')
    await key('Backspace')
    expect(saved).toBe('- 第一項\n編號項')

    await act(async () => root.unmount())
    host.remove()
  })

  it('turns typed Markdown prefixes into visible lists and unwinds an empty nested item', async () => {
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
      const [value, setValue] = useState('')
      return (
        <MobileNoteEditor
          value={value}
          onChange={(next) => {
            saved = next
            setValue(next)
          }}
          onFocusChange={() => {}}
          onLimit={() => {}}
          importItems={[]}
        />
      )
    }
    const block = () => host.querySelector<HTMLElement>('.mobile-note-block')!
    const editor = () => host.querySelector<HTMLElement>('.mobile-note-content')!
    const selectEnd = () => {
      const range = document.createRange()
      range.selectNodeContents(block())
      range.collapse(false)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
    }
    await act(async () => root.render(<Example />))
    block().textContent = '- '
    selectEnd()
    await act(async () => editor().dispatchEvent(new Event('input', { bubbles: true })))
    expect(saved).toBe('- ')
    expect(block().dataset.kind).toBe('bullet')
    await act(async () =>
      editor().dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Tab',
          bubbles: true,
          cancelable: true
        })
      )
    )
    expect(block().dataset.indent).toBe('1')
    await act(async () =>
      editor().dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true
        })
      )
    )
    expect(block().dataset.indent).toBe('0')
    expect(block().dataset.kind).toBe('bullet')
    await act(async () =>
      editor().dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true
        })
      )
    )
    expect(block().dataset.kind).toBe('body')
    expect(saved).toBe('')

    block().textContent = '1. '
    selectEnd()
    await act(async () => editor().dispatchEvent(new Event('input', { bubbles: true })))
    expect(saved).toBe('1. ')
    expect(block().dataset.kind).toBe('number')
    await act(async () =>
      editor().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true })
      )
    )
    expect(block().dataset.kind).toBe('body')
    expect(saved).toBe('')

    block().textContent = '# '
    selectEnd()
    await act(async () => editor().dispatchEvent(new Event('input', { bubbles: true })))
    expect(block().dataset.kind).toBe('heading')
    expect(saved).toBe('# ')
    await act(async () => root.unmount())
    host.remove()
  })
})
