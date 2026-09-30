import {
  ChevronDown,
  IndentDecrease,
  IndentIncrease,
  ListOrdered,
  NotebookTabs
} from 'lucide-react'
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { parseNote, serializeNote, type NoteBlock } from './note-format'

export type NoteImportItem = { label: string; text: string }
const importSelectionKey = 'gym-assistant.note-import-selection'

function storedImportSelection(): string[] {
  try {
    const selection = JSON.parse(localStorage.getItem(importSelectionKey) ?? '[]')
    return Array.isArray(selection)
      ? selection.filter((value): value is string => typeof value === 'string')
      : []
  } catch {
    return []
  }
}

export function MobileNoteEditor({
  value,
  onChange,
  onFocusChange,
  onLimit,
  importItems
}: {
  value: string
  onChange: (value: string) => void
  onFocusChange: (focused: boolean) => void
  onLimit: () => void
  importItems: NoteImportItem[]
}) {
  const blocks = parseNote(value)
  const fields = useRef<(HTMLTextAreaElement | null)[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [menu, setMenu] = useState<'style' | 'import' | null>(null)
  const [selectedItems, setSelectedItems] = useState<string[]>(storedImportSelection)
  const active = Math.min(activeIndex, blocks.length - 1)

  useLayoutEffect(() => {
    fields.current.forEach((field) => {
      if (!field) return
      field.style.height = 'auto'
      field.style.height = `${Math.max(32, field.scrollHeight)}px`
    })
  }, [value])

  const commit = (next: NoteBlock[], focusIndex = active, caret?: number) => {
    const text = serializeNote(next)
    if (text.length > 5000) {
      onLimit()
      return
    }
    onChange(text)
    setActiveIndex(focusIndex)
    requestAnimationFrame(() => {
      const field = fields.current[focusIndex]
      field?.focus()
      if (caret !== undefined) field?.setSelectionRange(caret, caret)
      field?.scrollIntoView({ block: 'nearest' })
    })
  }

  const changeKind = (kind: NoteBlock['kind']) => {
    const next = [...blocks]
    next[active] = { ...next[active]!, kind, marker: undefined }
    const caret = fields.current[active]?.selectionStart
    commit(next, active, caret)
    setMenu(null)
  }

  const changeIndent = (step: number) => {
    const next = [...blocks]
    next[active] = {
      ...next[active]!,
      indent: Math.max(0, Math.min(2, next[active]!.indent + step))
    }
    commit(next, active, fields.current[active]?.selectionStart)
  }

  const toggleBold = () => {
    const next = [...blocks]
    next[active] = { ...next[active]!, bold: !next[active]!.bold }
    commit(next, active, fields.current[active]?.selectionStart)
  }

  const setImportSelection = (selection: string[]) => {
    setSelectedItems(selection)
    try {
      localStorage.setItem(importSelectionKey, JSON.stringify(selection))
    } catch {
      // A blocked storage preference must never interrupt note editing.
    }
  }

  const insertLines = (lines: string[]) => {
    if (!lines.length) return
    const next = [...blocks]
    const additions: NoteBlock[] = lines.map((text) => ({ kind: 'body', indent: 0, text }))
    if (next.length === 1 && next[0]?.kind === 'body' && !next[0].text) {
      next.splice(0, 1, ...additions)
      commit(next, additions.length - 1, additions.at(-1)?.text.length)
    } else {
      next.splice(active + 1, 0, ...additions)
      commit(next, active + additions.length, additions.at(-1)?.text.length)
    }
    setMenu(null)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    if (event.nativeEvent.isComposing) return
    const field = event.currentTarget
    if (event.key === 'Tab') {
      event.preventDefault()
      const next = [...blocks]
      next[index] = {
        ...next[index]!,
        indent: Math.max(0, Math.min(2, next[index]!.indent + (event.shiftKey ? -1 : 1)))
      }
      commit(next, index, field.selectionStart)
      return
    }
    if (event.key === 'ArrowUp' && field.selectionStart === 0 && index > 0) {
      event.preventDefault()
      const previous = fields.current[index - 1]
      previous?.focus()
      previous?.setSelectionRange(previous.value.length, previous.value.length)
      return
    }
    if (
      event.key === 'ArrowDown' &&
      field.selectionStart === field.value.length &&
      index < blocks.length - 1
    ) {
      event.preventDefault()
      fields.current[index + 1]?.focus()
      fields.current[index + 1]?.setSelectionRange(0, 0)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const current = blocks[index]!
      if (!current.text && (current.kind === 'bullet' || current.kind === 'number')) {
        const next = [...blocks]
        next[index] = { ...current, kind: 'body', marker: undefined }
        commit(next, index, 0)
        return
      }
      const before = current.text.slice(0, field.selectionStart)
      const after = current.text.slice(field.selectionEnd)
      const next = [...blocks]
      next[index] = { ...current, text: before }
      next.splice(index + 1, 0, {
        kind: current.kind === 'heading' ? 'body' : current.kind,
        indent: current.kind === 'heading' ? 0 : current.indent,
        text: after,
        marker: undefined
      })
      commit(next, index + 1, 0)
      return
    }
    if (event.key === 'Backspace' && field.selectionStart === 0 && field.selectionEnd === 0) {
      if (index === 0) {
        if (blocks[0]?.kind !== 'body' || blocks[0]?.indent) {
          event.preventDefault()
          const next = [...blocks]
          next[0] = { ...next[0]!, kind: 'body', indent: 0, marker: undefined }
          commit(next, 0, 0)
        }
        return
      }
      event.preventDefault()
      const next = [...blocks]
      const previous = next[index - 1]!
      const caret = previous.text.length
      next[index - 1] = { ...previous, text: previous.text + next[index]!.text }
      next.splice(index, 1)
      commit(next, index - 1, caret)
      return
    }
    if (
      event.key === 'Delete' &&
      field.selectionStart === field.value.length &&
      field.selectionEnd === field.selectionStart &&
      index < blocks.length - 1
    ) {
      event.preventDefault()
      const next = [...blocks]
      const caret = next[index]!.text.length
      next[index] = { ...next[index]!, text: next[index]!.text + next[index + 1]!.text }
      next.splice(index + 1, 1)
      commit(next, index, caret)
    }
  }

  const importSelected = () =>
    insertLines(
      importItems.filter((item) => selectedItems.includes(item.label)).map((item) => item.text)
    )

  return (
    <>
      <div
        className="mobile-note-canvas"
        aria-label="課堂筆記編輯器"
        onClick={(event) => {
          if (event.target !== event.currentTarget) return
          const last = fields.current[blocks.length - 1]
          last?.focus()
          last?.setSelectionRange(last.value.length, last.value.length)
        }}
      >
        {blocks.map((block, index) => (
          <div
            className={`mobile-note-block is-${block.kind}${block.bold ? ' is-bold' : ''}`}
            data-indent={block.indent}
            key={index}
            onClick={(event) => {
              if (event.target !== event.currentTarget) return
              const field = fields.current[index]
              field?.focus()
              field?.setSelectionRange(field.value.length, field.value.length)
            }}
          >
            {block.kind === 'bullet' && <span aria-hidden="true">•</span>}
            {block.kind === 'number' && (
              <span aria-hidden="true">
                {block.marker?.trim() ??
                  `${blocks.slice(0, index + 1).filter((item) => item.kind === 'number').length}.`}
              </span>
            )}
            <textarea
              ref={(element) => {
                fields.current[index] = element
              }}
              rows={1}
              value={block.text}
              aria-label={`筆記第 ${index + 1} 段`}
              placeholder={index === 0 && !value ? '開始記錄…' : undefined}
              onFocus={() => {
                setActiveIndex(index)
                onFocusChange(true)
              }}
              onBlur={(event) => {
                if (!event.relatedTarget?.closest('.mobile-note-canvas, .session-note-tools')) {
                  onFocusChange(false)
                  setMenu(null)
                }
              }}
              onChange={(event) => {
                const next = [...blocks]
                next[index] = { ...block, text: event.target.value.replace(/[\r\n]/g, '') }
                const text = serializeNote(next)
                if (text.length > 5000) onLimit()
                else onChange(text)
              }}
              onKeyDown={(event) => handleKeyDown(event, index)}
              onPaste={(event) => {
                const pasted = event.clipboardData.getData('text/plain')
                if (!pasted.includes('\n')) return
                event.preventDefault()
                const field = event.currentTarget
                const current = blocks[index]!
                const pieces = pasted.replace(/\r\n/g, '\n').split('\n')
                const next = [...blocks]
                next[index] = {
                  ...current,
                  text: current.text.slice(0, field.selectionStart) + pieces[0]
                }
                next.splice(
                  index + 1,
                  0,
                  ...pieces.slice(1).map((text) => ({ kind: 'body' as const, indent: 0, text }))
                )
                next[index + pieces.length - 1] = {
                  ...next[index + pieces.length - 1]!,
                  text:
                    next[index + pieces.length - 1]!.text + current.text.slice(field.selectionEnd)
                }
                commit(next, index + pieces.length - 1, pieces.at(-1)?.length)
              }}
            />
          </div>
        ))}
      </div>
      <div className="session-note-tools" aria-label="筆記工具列">
        <button
          type="button"
          aria-label="字級選擇"
          aria-expanded={menu === 'style'}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => setMenu(menu === 'style' ? null : 'style')}
        >
          Aa <ChevronDown aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="段落加粗"
          aria-pressed={Boolean(blocks[active]?.bold)}
          onPointerDown={(event) => event.preventDefault()}
          onClick={toggleBold}
        >
          <strong className="note-tool-bold" aria-hidden="true">
            B
          </strong>
        </button>
        <button
          type="button"
          aria-label="項目清單"
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => changeKind(blocks[active]?.kind === 'bullet' ? 'body' : 'bullet')}
        >
          <span className="note-tool-bullet" aria-hidden="true">
            •
          </span>{' '}
          <span>項目</span>
        </button>
        <button
          type="button"
          aria-label="編號清單"
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => changeKind(blocks[active]?.kind === 'number' ? 'body' : 'number')}
        >
          <ListOrdered aria-hidden="true" /> <span>編號</span>
        </button>
        <button
          type="button"
          aria-label="增加縮排"
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => changeIndent(1)}
        >
          <IndentIncrease aria-hidden="true" /> <span>縮排</span>
        </button>
        <button
          type="button"
          aria-label="減少縮排"
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => changeIndent(-1)}
        >
          <IndentDecrease aria-hidden="true" /> <span>退排</span>
        </button>
        <button
          type="button"
          aria-label="導入課堂資訊"
          aria-expanded={menu === 'import'}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => setMenu(menu === 'import' ? null : 'import')}
        >
          <NotebookTabs aria-hidden="true" /> <span>課堂</span>
        </button>
        {menu === 'style' && (
          <div className="session-note-popover is-style" role="group" aria-label="段落樣式">
            <button type="button" onClick={() => changeKind('heading')}>
              標題 Heading
            </button>
            <button type="button" onClick={() => changeKind('body')}>
              內文 Body
            </button>
          </div>
        )}
        {menu === 'import' && (
          <div className="session-note-popover is-import" role="group" aria-label="導入課堂資訊">
            <strong>導入課堂資訊</strong>
            {importItems.map((item) => (
              <div className="note-import-row" key={item.label}>
                <input
                  type="checkbox"
                  aria-label={`批次導入${item.label}`}
                  checked={selectedItems.includes(item.label)}
                  onChange={(event) =>
                    setImportSelection(
                      event.target.checked
                        ? [...selectedItems, item.label]
                        : selectedItems.filter((label) => label !== item.label)
                    )
                  }
                />
                <button type="button" onClick={() => insertLines([item.text])}>
                  <span>{item.label}</span>
                  <small>{item.text}</small>
                </button>
              </div>
            ))}
            <div className="note-import-actions">
              <button
                type="button"
                onClick={() => insertLines(importItems.map((item) => item.text))}
              >
                導入全部
              </button>
              <button type="button" disabled={!selectedItems.length} onClick={importSelected}>
                導入選取
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
