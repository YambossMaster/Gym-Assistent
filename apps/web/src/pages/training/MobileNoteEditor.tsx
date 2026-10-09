import { IndentDecrease, IndentIncrease, ListOrdered, NotebookTabs } from 'lucide-react'
import {
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent
} from 'react'
import { parseNote, serializeNote, type NoteBlock } from './note-format'

export type NoteImportItem = { label: string; text: string }
const importSelectionKey = 'gym-assistant.note-import-selection'

function storedImportSelection(): string[] {
  try {
    const selection = JSON.parse(localStorage.getItem(importSelectionKey) ?? '[]')
    return Array.isArray(selection)
      ? selection.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

function noteNodes(editor: HTMLElement): HTMLDivElement[] {
  return Array.from(editor.children).filter(
    (child): child is HTMLDivElement =>
      child instanceof HTMLDivElement && 'noteBlock' in child.dataset
  )
}

function readBlocks(editor: HTMLElement): NoteBlock[] {
  const nodes = noteNodes(editor)
  if (!nodes.length) return [{ kind: 'body', indent: 0, text: '' }]
  return nodes.map((node) => ({
    kind: (node.dataset.kind as NoteBlock['kind']) ?? 'body',
    indent: Number(node.dataset.indent ?? 0),
    bold: node.dataset.bold === 'true',
    text: node.textContent ?? '',
    ...(node.dataset.sourceMarker ? { marker: node.dataset.sourceMarker } : {})
  }))
}

function blockAt(editor: HTMLElement, node: Node | null): HTMLDivElement | null {
  const element = node instanceof Element ? node : node?.parentElement
  const block = element?.closest<HTMLDivElement>('[data-note-block]')
  return block && editor.contains(block) ? block : null
}

function caretOffset(block: HTMLElement): number {
  const selection = window.getSelection()
  if (!selection?.rangeCount) return block.textContent?.length ?? 0
  const range = selection.getRangeAt(0)
  if (!block.contains(range.startContainer)) return block.textContent?.length ?? 0
  const before = range.cloneRange()
  before.selectNodeContents(block)
  before.setEnd(range.startContainer, range.startOffset)
  return before.toString().length
}

function focusAt(editor: HTMLElement, index: number, offset: number) {
  const block = noteNodes(editor)[index]
  if (!block) return
  editor.focus({ preventScroll: true })
  const range = document.createRange()
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  let text = walker.nextNode()
  let remaining = offset
  while (text && remaining > (text.textContent?.length ?? 0)) {
    remaining -= text.textContent?.length ?? 0
    text = walker.nextNode()
  }
  if (text) range.setStart(text, Math.min(remaining, text.textContent?.length ?? 0))
  else range.selectNodeContents(block)
  range.collapse(true)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
  const canvas = editor.closest<HTMLElement>('.mobile-note-canvas')
  if (canvas) keepNoteBlockVisible(canvas, block)
}

export function keepNoteBlockVisible(canvas: HTMLElement, block: HTMLElement) {
  const canvasRect = canvas.getBoundingClientRect()
  const blockRect = block.getBoundingClientRect()
  const safeTop = canvasRect.top + 12
  const safeBottom = canvasRect.bottom - 20
  if (blockRect.top < safeTop) canvas.scrollTop -= safeTop - blockRect.top
  else if (blockRect.bottom > safeBottom) canvas.scrollTop += blockRect.bottom - safeBottom
}

export function shouldContainNoteTouch({
  clientHeight,
  scrollHeight,
  scrollTop,
  deltaX,
  deltaY
}: {
  clientHeight: number
  scrollHeight: number
  scrollTop: number
  deltaX: number
  deltaY: number
}) {
  if (Math.abs(deltaX) > Math.abs(deltaY)) return true
  const maxScrollTop = Math.max(0, scrollHeight - clientHeight)
  if (maxScrollTop <= 1) return true
  if (deltaY > 0 && scrollTop <= 0) return true
  if (deltaY < 0 && scrollTop >= maxScrollTop - 1) return true
  return false
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
  const editorRef = useRef<HTMLDivElement | null>(null)
  const renderedValue = useRef<string | null>(null)
  const acceptedValue = useRef(value)
  const [activeIndex, setActiveIndex] = useState(0)
  const [activeBold, setActiveBold] = useState(false)
  const [menu, setMenu] = useState<'style' | 'import' | null>(null)
  const [selectedItems, setSelectedItems] = useState<string[]>(storedImportSelection)

  const renderBlocks = (blocks: NoteBlock[], focusIndex?: number, offset = 0) => {
    const editor = editorRef.current
    if (!editor) return
    let number = 0
    editor.replaceChildren(
      ...blocks.map((block, index) => {
        number = block.kind === 'number' ? number + 1 : 0
        const node = document.createElement('div')
        node.className = `mobile-note-block is-${block.kind}${block.bold ? ' is-bold' : ''}`
        node.dataset.noteBlock = ''
        node.dataset.kind = block.kind
        node.dataset.indent = String(block.indent)
        node.dataset.bold = block.bold ? 'true' : 'false'
        if (block.marker) node.dataset.sourceMarker = block.marker
        if (block.kind === 'bullet') node.dataset.marker = '•'
        if (block.kind === 'number') node.dataset.marker = block.marker?.trim() ?? `${number}.`
        if (index === 0 && !block.text) node.dataset.placeholder = '開始記錄…'
        node.textContent = block.text
        return node
      })
    )
    if (focusIndex !== undefined) {
      setActiveIndex(focusIndex)
      setActiveBold(Boolean(blocks[focusIndex]?.bold))
      requestAnimationFrame(() => focusAt(editor, focusIndex, offset))
    }
  }

  useLayoutEffect(() => {
    if (renderedValue.current === value) return
    renderedValue.current = value
    acceptedValue.current = value
    renderBlocks(parseNote(value))
  }, [value])

  const saveBlocks = (blocks: NoteBlock[]) => {
    const next = serializeNote(blocks)
    if (next.length > 5000) {
      onLimit()
      renderBlocks(parseNote(acceptedValue.current), activeIndex)
      return false
    }
    renderedValue.current = next
    acceptedValue.current = next
    onChange(next)
    return true
  }

  const commit = (blocks: NoteBlock[], index: number, offset: number) => {
    if (saveBlocks(blocks)) renderBlocks(blocks, index, offset)
  }

  const updateActive = () => {
    const editor = editorRef.current
    if (!editor) return
    const block = blockAt(editor, window.getSelection()?.anchorNode ?? null)
    if (!block) return
    setActiveIndex(noteNodes(editor).indexOf(block))
    setActiveBold(block.dataset.bold === 'true')
    requestAnimationFrame(() => {
      const canvas = editor.closest<HTMLElement>('.mobile-note-canvas')
      if (canvas) keepNoteBlockVisible(canvas, block)
    })
  }

  const editActive = (change: (block: NoteBlock) => NoteBlock) => {
    const editor = editorRef.current
    if (!editor) return
    const blocks = readBlocks(editor)
    const index = Math.min(activeIndex, blocks.length - 1)
    const offset = caretOffset(noteNodes(editor)[index]!)
    blocks[index] = change(blocks[index]!)
    commit(blocks, index, offset)
    setMenu(null)
  }

  const insertLines = (lines: string[]) => {
    if (!lines.length || !editorRef.current) return
    const blocks = readBlocks(editorRef.current)
    const additions: NoteBlock[] = lines.map((text) => ({ kind: 'body', indent: 0, text }))
    let index = Math.min(activeIndex, blocks.length - 1)
    if (blocks.length === 1 && blocks[0]?.kind === 'body' && !blocks[0].text) {
      blocks.splice(0, 1, ...additions)
      index = additions.length - 1
    } else {
      blocks.splice(index + 1, 0, ...additions)
      index += additions.length
    }
    commit(blocks, index, additions.at(-1)?.text.length ?? 0)
    setMenu(null)
  }

  const splitBlock = () => {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection?.rangeCount) return
    if (!selection.isCollapsed) selection.getRangeAt(0).deleteContents()
    const nodes = noteNodes(editor)
    const selected = blockAt(editor, selection.anchorNode)
    const index = selected ? nodes.indexOf(selected) : Math.min(activeIndex, nodes.length - 1)
    const blocks = readBlocks(editor)
    const current = blocks[index]!
    const offset = caretOffset(nodes[index]!)
    if (!current.text && (current.kind === 'bullet' || current.kind === 'number')) {
      blocks[index] = current.indent
        ? { ...current, indent: current.indent - 1 }
        : { ...current, kind: 'body', marker: undefined }
      commit(blocks, index, 0)
      return
    }
    blocks[index] = { ...current, text: current.text.slice(0, offset) }
    blocks.splice(index + 1, 0, {
      kind: current.kind === 'heading' ? 'body' : current.kind,
      indent: current.kind === 'heading' ? 0 : current.indent,
      text: current.text.slice(offset)
    })
    commit(blocks, index + 1, 0)
  }

  const handleInput = () => {
    const editor = editorRef.current
    if (!editor) return
    const blocks = readBlocks(editor)
    const node = blockAt(editor, window.getSelection()?.anchorNode ?? null)
    const index = node ? noteNodes(editor).indexOf(node) : -1
    const current = blocks[index]
    if (current?.kind === 'body' && node && caretOffset(node) === current.text.length) {
      const shortcut = current.text.match(/^(?:([-*+]) |(\d+)\. |(#) )$/)
      if (shortcut) {
        blocks[index] = {
          ...current,
          kind: shortcut[1] ? 'bullet' : shortcut[2] ? 'number' : 'heading',
          marker: shortcut[2] ? `${shortcut[2]}. ` : undefined,
          text: ''
        }
        commit(blocks, index, 0)
        return
      }
    }
    saveBlocks(blocks)
    updateActive()
  }

  const backspaceAtStart = () => {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection?.isCollapsed) return false
    const node = blockAt(editor, selection.anchorNode)
    if (!node || caretOffset(node) !== 0) return false
    const nodes = noteNodes(editor)
    const index = nodes.indexOf(node)
    const blocks = readBlocks(editor)
    const current = blocks[index]!
    if (current.indent > 0) {
      blocks[index] = { ...current, indent: current.indent - 1 }
      commit(blocks, index, 0)
    } else if (current.kind !== 'body') {
      blocks[index] = { ...current, kind: 'body', marker: undefined }
      commit(blocks, index, 0)
    } else if (index > 0) {
      const previous = blocks[index - 1]!
      const offset = previous.text.length
      blocks[index - 1] = { ...previous, text: previous.text + current.text }
      blocks.splice(index, 1)
      commit(blocks, index - 1, offset)
    } else return false
    return true
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing || !editorRef.current) return
    const editor = editorRef.current
    const selection = window.getSelection()
    const node = blockAt(editor, selection?.anchorNode ?? null)
    const index = node ? noteNodes(editor).indexOf(node) : activeIndex
    const blocks = readBlocks(editor)
    if (event.key === 'Backspace' && backspaceAtStart()) {
      event.preventDefault()
      return
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      const current = blocks[index]!
      blocks[index] = {
        ...current,
        indent: Math.max(0, Math.min(2, current.indent + (event.shiftKey ? -1 : 1)))
      }
      commit(blocks, index, node ? caretOffset(node) : 0)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      splitBlock()
      return
    }
    if (!selection?.isCollapsed || !node) return
    const offset = caretOffset(node)
    if (
      event.key === 'Delete' &&
      offset === blocks[index]!.text.length &&
      index < blocks.length - 1
    ) {
      event.preventDefault()
      const caret = blocks[index]!.text.length
      blocks[index] = { ...blocks[index]!, text: blocks[index]!.text + blocks[index + 1]!.text }
      blocks.splice(index + 1, 1)
      commit(blocks, index, caret)
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault()
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection?.rangeCount) return
    if (!selection.isCollapsed) selection.getRangeAt(0).deleteContents()
    const node = blockAt(editor, selection.anchorNode)
    const index = node ? noteNodes(editor).indexOf(node) : activeIndex
    const blocks = readBlocks(editor)
    const offset = node ? caretOffset(node) : blocks[index]!.text.length
    const pieces = event.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n').split('\n')
    const current = blocks[index]!
    const before = current.text.slice(0, offset)
    const after = current.text.slice(offset)
    if (pieces.length === 1) {
      blocks[index] = { ...current, text: before + pieces[0] + after }
      commit(blocks, index, before.length + pieces[0]!.length)
    } else {
      blocks[index] = { ...current, text: before + pieces[0] }
      const additions: NoteBlock[] = pieces
        .slice(1)
        .map((text) => ({ kind: 'body', indent: 0, text }))
      additions[additions.length - 1]!.text += after
      blocks.splice(index + 1, 0, ...additions)
      commit(blocks, index + additions.length, pieces.at(-1)!.length)
    }
  }

  const setImportSelection = (selection: string[]) => {
    setSelectedItems(selection)
    try {
      localStorage.setItem(importSelectionKey, JSON.stringify(selection))
    } catch {
      // A blocked preference store must not interrupt writing.
    }
  }

  return (
    <>
      <div
        className="mobile-note-canvas"
        aria-label="教練筆記編輯器"
        onPointerDown={() => onFocusChange(true)}
        onClick={(event) => {
          if (
            event.target !== event.currentTarget ||
            !editorRef.current ||
            window.getSelection()?.isCollapsed === false
          )
            return
          const nodes = noteNodes(editorRef.current)
          focusAt(editorRef.current, nodes.length - 1, nodes.at(-1)?.textContent?.length ?? 0)
        }}
      >
        <div
          ref={editorRef}
          className="mobile-note-content"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="教練筆記內文"
          aria-multiline="true"
          onClick={(event) => {
            if (
              event.target === event.currentTarget &&
              window.getSelection()?.isCollapsed !== false
            ) {
              const nodes = noteNodes(event.currentTarget)
              focusAt(event.currentTarget, nodes.length - 1, nodes.at(-1)?.textContent?.length ?? 0)
            } else updateActive()
          }}
          onKeyUp={updateActive}
          onMouseUp={updateActive}
          onFocus={() => onFocusChange(true)}
          onBlur={(event) => {
            if (!event.relatedTarget?.closest('.mobile-note-canvas, .session-note-tools')) {
              // iOS can blur a contenteditable while the keyboard or Visual Viewport is
              // settling. Mobile focus mode is explicit: only its confirm action exits.
              if (!window.matchMedia('(max-width: 720px)').matches) onFocusChange(false)
              setMenu(null)
            }
          }}
          onInput={handleInput}
          onBeforeInput={(event: FormEvent<HTMLDivElement>) => {
            const input = event.nativeEvent as InputEvent
            if (
              !input.isComposing &&
              input.inputType === 'deleteContentBackward' &&
              backspaceAtStart()
            ) {
              event.preventDefault()
              return
            }
            if (
              !input.isComposing &&
              (input.inputType === 'insertParagraph' || input.inputType === 'insertLineBreak')
            ) {
              event.preventDefault()
              splitBlock()
            }
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />
      </div>
      <div className="session-note-tools" aria-label="筆記工具列">
        <button
          type="button"
          aria-label="字級選擇"
          aria-expanded={menu === 'style'}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => setMenu(menu === 'style' ? null : 'style')}
        >
          <span className="note-tool-icon note-tool-size" aria-hidden="true">
            Aa
          </span>
          <span className="note-tool-caption">字級</span>
        </button>
        <button
          type="button"
          aria-label="段落加粗"
          aria-pressed={activeBold}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => editActive((block) => ({ ...block, bold: !block.bold }))}
        >
          <strong className="note-tool-icon note-tool-bold" aria-hidden="true">
            B
          </strong>
          <span className="note-tool-caption">加粗</span>
        </button>
        <button
          type="button"
          aria-label="項目清單"
          onPointerDown={(event) => event.preventDefault()}
          onClick={() =>
            editActive((block) => ({
              ...block,
              kind: block.kind === 'bullet' ? 'body' : 'bullet',
              marker: undefined
            }))
          }
        >
          <span className="note-tool-icon note-tool-bullet" aria-hidden="true">
            •
          </span>
          <span className="note-tool-caption">項目</span>
        </button>
        <button
          type="button"
          aria-label="編號清單"
          onPointerDown={(event) => event.preventDefault()}
          onClick={() =>
            editActive((block) => ({
              ...block,
              kind: block.kind === 'number' ? 'body' : 'number',
              marker: undefined
            }))
          }
        >
          <span className="note-tool-icon">
            <ListOrdered aria-hidden="true" />
          </span>
          <span className="note-tool-caption">編號</span>
        </button>
        <button
          type="button"
          aria-label="增加縮排"
          onPointerDown={(event) => event.preventDefault()}
          onClick={() =>
            editActive((block) => ({ ...block, indent: Math.min(2, block.indent + 1) }))
          }
        >
          <span className="note-tool-icon">
            <IndentIncrease aria-hidden="true" />
          </span>
          <span className="note-tool-caption">縮排</span>
        </button>
        <button
          type="button"
          aria-label="減少縮排"
          onPointerDown={(event) => event.preventDefault()}
          onClick={() =>
            editActive((block) => ({ ...block, indent: Math.max(0, block.indent - 1) }))
          }
        >
          <span className="note-tool-icon">
            <IndentDecrease aria-hidden="true" />
          </span>
          <span className="note-tool-caption">退排</span>
        </button>
        <button
          type="button"
          aria-label="導入課堂資訊"
          aria-expanded={menu === 'import'}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => setMenu(menu === 'import' ? null : 'import')}
        >
          <span className="note-tool-icon">
            <NotebookTabs aria-hidden="true" />
          </span>
          <span className="note-tool-caption">課堂</span>
        </button>
        {menu === 'style' && (
          <div className="session-note-popover is-style" role="group" aria-label="段落樣式">
            <button
              type="button"
              onPointerDown={(event) => event.preventDefault()}
              onClick={() =>
                editActive((block) => ({ ...block, kind: 'heading', marker: undefined }))
              }
            >
              標題 Heading
            </button>
            <button
              type="button"
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => editActive((block) => ({ ...block, kind: 'body', marker: undefined }))}
            >
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
                <button
                  type="button"
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => insertLines([item.text])}
                >
                  <span>{item.label}</span>
                  <small>{item.text}</small>
                </button>
              </div>
            ))}
            <div className="note-import-actions">
              <button
                type="button"
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => insertLines(importItems.map((item) => item.text))}
              >
                導入全部
              </button>
              <button
                type="button"
                disabled={!selectedItems.length}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() =>
                  insertLines(
                    importItems
                      .filter((item) => selectedItems.includes(item.label))
                      .map((item) => item.text)
                  )
                }
              >
                導入選取
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
