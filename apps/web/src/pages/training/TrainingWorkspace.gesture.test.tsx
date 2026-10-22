// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import type { UseQueryResult } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionTraining } from '../../api'
import { TrainingWorkspace } from './TrainingWorkspace'
import * as startAnchorExperiment from './exercise-drag-start-anchor'
import { emptyMeasurements, recordingTypes, type RecordingType } from './recording'

const calls = vi.hoisted(() => ({ save: vi.fn() }))
const planState = vi.hoisted(() => ({ tier: 'advanced' }))
vi.mock('./queries', () => ({
  useTrainingMutations: () => ({ save: { mutateAsync: calls.save } }),
  useExerciseLibrary: () => ({ data: { definitions: [] } })
}))
vi.mock('../calendar/queries', () => ({ useSchedulingMutations: () => ({}) }))
vi.mock('../../beta-admission/usePlanAccess', () => ({
  usePlanAccess: () => ({ data: { tier: planState.tier, overCapacity: false } })
}))
vi.mock('../../local-resilience', async (original) => ({
  ...(await original<typeof import('../../local-resilience')>()),
  CoachLocalStore: class {
    async list() {
      return []
    }
    async put() {}
    async delete() {}
  }
}))

const training = {
  session: {
    id: 'gesture-session',
    studentId: 'student',
    studentName: '測試學生',
    startsAt: '2026-09-22T02:00:00Z',
    endsAt: '2026-09-22T03:00:00Z',
    location: '',
    version: 1,
    status: 'scheduled',
    isLegacy: false
  },
  record: {
    id: 'record',
    version: 1,
    privateNote: '',
    updatedAt: null,
    exercises: ['one', 'two', 'three', 'four', 'five'].map((id) => ({
      id,
      definitionId: id,
      definitionName: id,
      equipment: '徒手',
      bodyParts: [],
      movementType: '系統動作',
      performanceMetric: 'reps',
      sets: []
    }))
  },
  defaultDistanceUnit: 'km',
  defaultWeightUnit: 'kg',
  exerciseSummaries: [],
  allowedActions: { canEditTraining: true, canComplete: false, canReopen: false }
} as unknown as SessionTraining

let root: Root
let host: HTMLDivElement
let frames: Map<number, FrameRequestCallback>
let frameId: number
let frameTime: number
const order = () =>
  [...host.querySelectorAll<HTMLElement>('[data-exercise-id]')].map((el) => el.dataset.exerciseId)
const handle = (id: string) =>
  host.querySelector<HTMLElement>(`[data-exercise-id="${id}"] .exercise-drag-handle`)!
function pointer(
  target: EventTarget,
  type: string,
  y: number,
  pointerType = 'mouse',
  pointerId = 1
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: 40,
    clientY: y,
    button: 0
  })
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    pointerType: { value: pointerType }
  })
  target.dispatchEvent(event)
}
function touch(target: EventTarget, type: string, x: number, y: number) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'touches', {
    value: type === 'touchend' ? [] : [{ clientX: x, clientY: y }]
  })
  target.dispatchEvent(event)
  return event
}
async function frame() {
  await act(async () => {
    const batch = [...frames.values()]
    frames.clear()
    frameTime += 16
    batch.forEach((fn) => fn(frameTime))
  })
}
async function start(id: string, y: number, pointerType = 'mouse') {
  await act(async () => pointer(handle(id), 'pointerdown', y, pointerType))
  await act(async () => vi.advanceTimersByTimeAsync(125))
  await frame()
}

beforeEach(async () => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  vi.stubGlobal('innerHeight', 844)
  vi.stubGlobal('scrollTo', vi.fn())
  frames = new Map()
  frameId = frameTime = 0
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
    frames.set(++frameId, fn)
    return frameId
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: vi.fn()
  })
  Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
    configurable: true,
    value: () => false
  })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement
  ) {
    let top = 100,
      height = 322
    if (this.dataset.exerciseId) {
      top += order().indexOf(this.dataset.exerciseId) * 66
      height = 58
    }
    if (this.classList.contains('session-bottom')) {
      top = 760
      height = 40
    }
    if (this.classList.contains('session-topbar')) {
      top = 0
      height = 0
    }
    return {
      x: 0,
      y: top,
      top,
      bottom: top + height,
      left: 0,
      right: 390,
      width: 390,
      height,
      toJSON() {}
    }
  })
  calls.save.mockResolvedValue(training)
  localStorage.clear()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () =>
    root.render(
      <MemoryRouter>
        <TrainingWorkspace
          session={{ user: { id: 'gesture-coach' } } as Session}
          query={
            { data: training, isLoading: false, isError: false } as UseQueryResult<
              SessionTraining,
              Error
            >
          }
          onBack={() => {}}
          timeZone="Asia/Taipei"
        />
      </MemoryRouter>
    )
  )
})
afterEach(async () => {
  await act(async () => root?.unmount())
  document.body.innerHTML = ''
  localStorage.clear()
  calls.save.mockClear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  planState.tier = 'advanced'
  Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture')
  Reflect.deleteProperty(HTMLElement.prototype, 'hasPointerCapture')
  Reflect.deleteProperty(document.documentElement, 'scrollTop')
})

it('shows Free Training bests while locking only the trajectory action', async () => {
  planState.tier = 'free'
  const withSummary = {
    ...training,
    exerciseSummaries: [
      {
        occurrenceId: 'one',
        definitionId: 'one',
        metric: 'weight',
        unit: 'kg',
        current: 80,
        previous: 75,
        personal: 90,
        history: []
      }
    ]
  } as SessionTraining
  await act(async () =>
    root.render(
      <MemoryRouter>
        <TrainingWorkspace
          session={{ user: { id: 'gesture-coach' } } as Session}
          query={
            { data: withSummary, isLoading: false, isError: false } as UseQueryResult<
              SessionTraining,
              Error
            >
          }
          onBack={() => {}}
          timeZone="Asia/Taipei"
        />
      </MemoryRouter>
    )
  )
  const card = host.querySelector('[data-exercise-id="one"]')!
  expect(card.querySelector('.exercise-performance-inline')?.textContent).toContain('80 kg / 75 kg')
  expect(card.querySelector('.exercise-performance-inline')?.textContent).toContain('90 kg')
  expect(card.querySelector('[aria-label="成長軌跡，需 Pro 或 Prime 方案"]')).not.toBeNull()
})

it('uses the shared rich note editor and its toolbar as the only private note input', () => {
  const notePanel = host.querySelector('#session-note-panel')!
  expect(notePanel.querySelectorAll('[role="textbox"]')).toHaveLength(1)
  expect(notePanel.querySelector('textarea')).toBeNull()
  expect(notePanel.querySelector('[aria-label="筆記工具列"]')).not.toBeNull()
  expect(notePanel.querySelector('[aria-label="字級選擇"]')).not.toBeNull()
  expect(notePanel.querySelector('[aria-label="導入課堂資訊"]')).not.toBeNull()
})

it('leaves note focus mode immediately while saving in the background', async () => {
  let resolveSave: (value: SessionTraining) => void = () => undefined
  calls.save.mockImplementationOnce(
    () =>
      new Promise<SessionTraining>((resolve) => {
        resolveSave = resolve
      })
  )
  const editor = host.querySelector<HTMLElement>('.mobile-note-content')!
  await act(async () => editor.click())
  expect(host.querySelector('.session-workspace')?.classList.contains('is-note-focused')).toBe(true)

  const block = editor.querySelector<HTMLElement>('.mobile-note-block')!
  block.textContent = '今天動作品質穩定'
  await act(async () => editor.dispatchEvent(new InputEvent('input', { bubbles: true })))
  const range = document.createRange()
  range.selectNodeContents(block)
  range.collapse(false)
  const selection = window.getSelection()!
  selection.removeAllRanges()
  selection.addRange(range)
  await act(async () =>
    editor.dispatchEvent(
      new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertParagraph'
      })
    )
  )

  await act(async () => window.dispatchEvent(new Event('session-note-focus-exit')))

  expect(calls.save).toHaveBeenCalledWith(
    expect.objectContaining({
      sessionId: 'gesture-session',
      payload: expect.objectContaining({ privateNote: '今天動作品質穩定\n' })
    })
  )
  expect(host.querySelector('.session-workspace')?.classList.contains('is-note-focused')).toBe(
    false
  )
  expect(host.querySelector('.session-workspace')).not.toBeNull()
  await act(async () => resolveSave(training))
})

it('keeps mobile note focus mode active through iOS blur until the Coach confirms', async () => {
  const editor = host.querySelector<HTMLElement>('.mobile-note-content')!
  await act(async () => editor.click())

  expect(document.documentElement.classList.contains('is-session-note-focused')).toBe(true)
  await act(async () => editor.blur())

  expect(host.querySelector('.session-workspace')?.classList.contains('is-note-focused')).toBe(true)
  expect(document.documentElement.classList.contains('is-session-note-focused')).toBe(true)
  expect(document.querySelector('.session-note-focus-actions')).toBeNull()
})

it('waits for a completed tap, then commits focus geometry and focuses the editor in that gesture', async () => {
  const editor = host.querySelector<HTMLElement>('.mobile-note-content')!
  const focus = vi.spyOn(editor, 'focus').mockImplementation(() => {
    expect(editor.getAttribute('contenteditable')).toBe('true')
    expect(host.querySelector('.session-workspace')?.classList.contains('is-note-focused')).toBe(
      true
    )
    expect(document.documentElement.classList.contains('is-session-note-focused')).toBe(true)
    expect(document.documentElement.style.getPropertyValue('--session-note-viewport-height')).toBe(
      `${window.innerHeight}px`
    )
  })
  expect(document.activeElement).not.toBe(editor)
  expect(document.documentElement.classList.contains('is-session-note-focused')).toBe(false)
  await act(async () => pointer(editor, 'pointerdown', 300, 'touch'))
  expect(document.activeElement).not.toBe(editor)
  expect(document.documentElement.classList.contains('is-session-note-focused')).toBe(false)
  await act(async () => {
    pointer(editor, 'pointerup', 300, 'touch')
    editor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }))
  })
  expect(focus).toHaveBeenCalledWith({ preventScroll: true })
})

it.each(['swipe', 'long press', 'cancel', 'move back'])(
  'keeps note reading mode after a %s even if the browser sends a click',
  async (gesture) => {
    const editor = host.querySelector<HTMLElement>('.mobile-note-content')!
    await act(async () => pointer(editor, 'pointerdown', 300, 'touch'))
    if (gesture === 'long press') await act(async () => vi.advanceTimersByTimeAsync(600))
    if (gesture === 'swipe' || gesture === 'move back') {
      await act(async () => pointer(editor, 'pointermove', 220, 'touch'))
    }
    await act(async () => {
      pointer(editor, gesture === 'cancel' ? 'pointercancel' : 'pointerup', 300, 'touch')
      editor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }))
    })
    expect(document.documentElement.classList.contains('is-session-note-focused')).toBe(false)
    expect(editor.getAttribute('contenteditable')).toBe('false')
  }
)

it('anchors both viewport edges after a lower caret pans iOS without changing keyboard height', async () => {
  const viewport = Object.assign(new EventTarget(), { height: 480, offsetTop: 0 })
  vi.stubGlobal('visualViewport', viewport)
  const editor = host.querySelector<HTMLElement>('.mobile-note-content')!
  await act(async () => editor.click())
  viewport.offsetTop = 196
  viewport.dispatchEvent(new Event('scroll'))
  const style = document.documentElement.style
  expect(style.getPropertyValue('--session-note-viewport-top')).toBe('196px')
  expect(style.getPropertyValue('--session-note-viewport-height')).toBe('480px')
  viewport.height = 430
  viewport.offsetTop = 96
  viewport.dispatchEvent(new Event('resize'))
  expect(style.getPropertyValue('--session-note-viewport-top')).toBe('96px')
  expect(style.getPropertyValue('--session-note-viewport-height')).toBe('430px')
  await act(async () => window.dispatchEvent(new Event('session-note-focus-exit')))
  expect(style.getPropertyValue('--session-note-viewport-top')).toBe('')
})

it('keeps the same dock mounted across a native blur-null-focus handoff', async () => {
  vi.stubGlobal('visualViewport', Object.assign(new EventTarget(), { height: 480, offsetTop: 0 }))
  await act(async () => host.querySelector<HTMLButtonElement>('.set-add')!.click())
  const inputs = host.querySelectorAll<HTMLInputElement>('.training-set-card input')
  await act(async () => inputs[0]!.focus())
  const dock = host.querySelector('.set-input-advance-dock')
  await act(async () => inputs[0]!.blur())
  await frame()
  expect(host.querySelector('.set-input-advance-dock')).toBe(dock)
  await act(async () => inputs[1]!.focus())
  expect(host.querySelector('.set-input-advance-dock')).toBe(dock)
})

it('uses the current keyboard edge when the visual viewport grows again', async () => {
  const viewport = Object.assign(new EventTarget(), { height: 480, offsetTop: 0 })
  vi.stubGlobal('visualViewport', viewport)
  vi.stubGlobal('innerHeight', 844)
  await act(async () => host.querySelector<HTMLButtonElement>('.set-add')!.click())
  await act(async () => host.querySelector<HTMLInputElement>('.training-set-card input')!.focus())
  await frame()
  viewport.height = 520
  viewport.dispatchEvent(new Event('resize'))
  await frame()
  const workspace = host.querySelector<HTMLElement>('.session-workspace')!
  expect(workspace.style.getPropertyValue('--session-input-height')).toBe('520px')
})

async function setEditingGeometry() {
  const viewport = Object.assign(new EventTarget(), { height: 480, offsetTop: 0 })
  vi.stubGlobal('visualViewport', viewport)
  vi.stubGlobal('innerHeight', 844)
  vi.stubGlobal('scrollBy', vi.fn())
  vi.stubGlobal('scrollTo', vi.fn())
  await act(async () => host.querySelector<HTMLButtonElement>('.set-add')!.click())
  await act(async () => host.querySelector<HTMLButtonElement>('.set-add')!.click())
  const inputs = Array.from(host.querySelectorAll<HTMLInputElement>('.training-set-card input'))
  const workspace = host.querySelector<HTMLElement>('.session-workspace')!
  vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockImplementation(function (
    this: HTMLElement
  ) {
    const index = inputs.indexOf(this as HTMLInputElement)
    const top =
      this === workspace
        ? viewport.offsetTop
        : index >= 0
          ? viewport.offsetTop + 280 + Math.floor(index / 2) * 180 - workspace.scrollTop
          : 0
    return {
      x: 0,
      y: top,
      top,
      bottom: top + 40,
      left: 0,
      right: 390,
      width: 390,
      height: 40,
      toJSON() {}
    }
  })
  return { viewport, workspace, inputs }
}

it('moves the internal scroll owner once per row and never scrolls the document during advance', async () => {
  const { workspace, inputs } = await setEditingGeometry()
  await act(async () => inputs[0]!.focus())
  expect(document.body.style.position).toBe('fixed')
  expect(document.documentElement.classList.contains('is-session-set-editing')).toBe(true)
  const anchor = inputs[0]!.getBoundingClientRect().top
  const initialScroll = workspace.scrollTop
  const dock = host.querySelector('.set-input-advance-dock')
  const next = () =>
    host.querySelector<HTMLButtonElement>('.set-input-advance-dock button')!.click()
  await act(async () => next())
  expect(workspace.scrollTop).toBe(initialScroll)
  expect(inputs[1]!.getBoundingClientRect().top).toBe(anchor)
  await act(async () => next())
  expect(workspace.scrollTop).toBeGreaterThan(initialScroll)
  expect(inputs[2]!.getBoundingClientRect().top).toBe(anchor)
  expect(host.querySelector('.set-input-advance-dock')).toBe(dock)
  await act(async () => vi.advanceTimersByTimeAsync(500))
  await frame()
  expect(inputs[2]!.getBoundingClientRect().top).toBe(anchor)
  expect(window.scrollBy).not.toHaveBeenCalled()
  expect(window.scrollTo).not.toHaveBeenCalled()
})

it('allows free manual scrolling until another focus action, with no correction on viewport events', async () => {
  const { workspace, inputs, viewport } = await setEditingGeometry()
  await act(async () => inputs[0]!.focus())
  const anchor = inputs[0]!.getBoundingClientRect().top
  workspace.dispatchEvent(new Event('touchmove', { bubbles: true }))
  workspace.scrollTop += 95
  const manualScroll = workspace.scrollTop
  viewport.offsetTop = 96
  viewport.dispatchEvent(new Event('scroll'))
  viewport.dispatchEvent(new Event('resize'))
  await act(async () => vi.advanceTimersByTimeAsync(500))
  await frame()
  expect(workspace.scrollTop).toBe(manualScroll)
  expect(workspace.style.getPropertyValue('--session-input-top')).toBe('96px')
  await act(async () => inputs[1]!.focus())
  expect(inputs[1]!.getBoundingClientRect().top - viewport.offsetTop).toBe(anchor)
})

it('rechecks a focused field after delayed native scrolling instead of accepting a covered field', async () => {
  const { workspace, inputs } = await setEditingGeometry()
  await act(async () => inputs[0]!.focus())
  const anchor = inputs[0]!.getBoundingClientRect().top
  await act(async () => vi.advanceTimersByTimeAsync(400))
  workspace.scrollTop -= 220
  expect(inputs[0]!.getBoundingClientRect().top).toBeGreaterThan(anchor)
  workspace.dispatchEvent(new Event('scroll'))
  await act(async () => vi.advanceTimersByTimeAsync(150))
  expect(inputs[0]!.getBoundingClientRect().top).toBe(anchor)
})

it('aligns the next field again after the keyboard finishes resizing', async () => {
  const { workspace, inputs, viewport } = await setEditingGeometry()
  await act(async () => inputs[0]!.focus())
  await act(async () =>
    host.querySelector<HTMLButtonElement>('.set-input-advance-dock button')!.click()
  )
  viewport.height = 400
  viewport.offsetTop = 75
  workspace.scrollTop -= 180
  viewport.dispatchEvent(new Event('resize'))
  await act(async () => vi.advanceTimersByTimeAsync(150))
  const rect = inputs[1]!.getBoundingClientRect()
  expect(document.activeElement).toBe(inputs[1])
  expect(rect.top - viewport.offsetTop).toBe(132)
  expect(rect.bottom).toBeLessThan(viewport.offsetTop + viewport.height - 88)
})

it('reads keyboard geometry that commits after resize without a second event', async () => {
  const { workspace, inputs, viewport } = await setEditingGeometry()
  viewport.height = 740
  await act(async () => inputs[0]!.focus())
  viewport.dispatchEvent(new Event('resize'))
  viewport.height = 400
  viewport.offsetTop = 75
  await frame()
  await act(async () => vi.advanceTimersByTimeAsync(150))
  expect(workspace.style.getPropertyValue('--session-input-height')).toBe('400px')
  expect(workspace.style.getPropertyValue('--session-input-top')).toBe('75px')
  expect(inputs[0]!.getBoundingClientRect().bottom).toBeLessThan(75 + 400 - 88)
})

it('does not move an already placed row down during keyboard expansion before blur', async () => {
  const { inputs, viewport } = await setEditingGeometry()
  await act(async () => inputs[0]!.focus())
  const before = inputs[0]!.getBoundingClientRect().top
  viewport.height = 650
  viewport.dispatchEvent(new Event('resize'))
  await frame()
  expect(inputs[0]!.getBoundingClientRect().top).toBe(before)
})

it('repairs a late native reveal even if no scroll event follows the visual change', async () => {
  const { workspace, inputs } = await setEditingGeometry()
  await act(async () => inputs[0]!.focus())
  await act(async () => vi.advanceTimersByTimeAsync(500))
  const before = inputs[0]!.getBoundingClientRect().top
  workspace.scrollTop -= 300
  await frame()
  expect(inputs[0]!.getBoundingClientRect().top).toBe(before)
})

it('does not cancel placement for tap jitter before the keyboard settles', async () => {
  const { workspace, inputs, viewport } = await setEditingGeometry()
  touch(workspace, 'touchstart', 100, 300)
  await act(async () => inputs[0]!.focus())
  touch(workspace, 'touchmove', 100, 302)
  const before = inputs[0]!.getBoundingClientRect().top
  workspace.scrollTop -= 300
  viewport.dispatchEvent(new Event('resize'))
  await frame()
  expect(inputs[0]!.getBoundingClientRect().top).toBe(before)
})

it('preserves the last editing position when native blur scrolls before React cleanup', async () => {
  const { workspace, inputs, viewport } = await setEditingGeometry()
  const input = inputs[0]!
  await act(async () => input.focus())
  await frame()
  const before = input.getBoundingClientRect().top
  input.addEventListener('blur', () => (workspace.scrollTop += 250), { once: true })
  await act(async () => input.blur())
  viewport.height = 844
  await act(async () => viewport.dispatchEvent(new Event('resize')))
  expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 280 - before, behavior: 'instant' })
})

it('rechecks placement when native panning reports a window scroll rather than an inner scroll', async () => {
  const { workspace, inputs } = await setEditingGeometry()
  await act(async () => inputs[0]!.focus())
  const anchor = inputs[0]!.getBoundingClientRect().top
  await act(async () => vi.advanceTimersByTimeAsync(400))
  workspace.scrollTop -= 200
  window.dispatchEvent(new Event('scroll'))
  await act(async () => vi.advanceTimersByTimeAsync(150))
  expect(inputs[0]!.getBoundingClientRect().top).toBe(anchor)
})

it('keeps the last open-keyboard geometry through a full-height focused transient', async () => {
  const { workspace, inputs, viewport } = await setEditingGeometry()
  await act(async () => inputs[0]!.focus())
  viewport.height = 844
  viewport.offsetTop = 0
  await act(async () => viewport.dispatchEvent(new Event('resize')))
  expect(workspace.style.getPropertyValue('--session-input-height')).toBe('480px')
})

it('corrects a late native document reset after completion and cancels recovery on manual touch', async () => {
  const { inputs, viewport } = await setEditingGeometry()
  await act(async () => inputs.at(-1)!.focus())
  await act(async () =>
    host.querySelector<HTMLButtonElement>('.set-input-advance-dock button')!.click()
  )
  vi.mocked(window.scrollTo).mockClear()
  viewport.height = 650
  viewport.dispatchEvent(new Event('resize'))
  window.dispatchEvent(new Event('scroll'))
  expect(document.body.style.position).toBe('fixed')
  expect(window.scrollTo).not.toHaveBeenCalled()
  viewport.height = 844
  viewport.dispatchEvent(new Event('resize'))
  expect(window.scrollTo).toHaveBeenCalled()
  vi.mocked(window.scrollTo).mockClear()
  window.dispatchEvent(new Event('touchstart'))
  window.dispatchEvent(new Event('scroll'))
  expect(window.scrollTo).not.toHaveBeenCalled()
})

it('cancels the previous dismissal recovery when the user reenters an input', async () => {
  const { inputs, viewport } = await setEditingGeometry()
  await act(async () => inputs.at(-1)!.focus())
  await act(async () =>
    host.querySelector<HTMLButtonElement>('.set-input-advance-dock button')!.click()
  )
  await act(async () => inputs[0]!.focus())
  vi.mocked(window.scrollTo).mockClear()
  viewport.dispatchEvent(new Event('resize'))
  window.dispatchEvent(new Event('scroll'))
  await act(async () => vi.advanceTimersByTimeAsync(300))
  expect(window.scrollTo).not.toHaveBeenCalled()
  expect(document.activeElement).toBe(inputs[0])
  expect(document.body.style.position).toBe('fixed')
})

it('confirms populated exercise removal in-app and preserves the draft on cancel', async () => {
  const nativeConfirm = vi.fn(() => true)
  vi.stubGlobal('confirm', nativeConfirm)
  await act(async () => host.querySelector<HTMLButtonElement>('.set-add')!.click())
  const remove = host.querySelector<HTMLButtonElement>('.training-exercise-card .icon-button')!
  await act(async () => remove.click())
  expect(host.querySelector('[role="alertdialog"]')?.textContent).toContain('移除動作')
  expect(host.querySelectorAll('.training-exercise-card')).toHaveLength(5)
  const cancel = host.querySelector<HTMLButtonElement>('[role="alertdialog"] .ui-action-cancel')!
  await act(async () => cancel.click())
  expect(host.querySelectorAll('.training-exercise-card')).toHaveLength(5)
  await act(async () => remove.click())
  const confirm = host.querySelector<HTMLButtonElement>('[role="alertdialog"] .ui-action-delete')!
  await act(async () => confirm.click())
  expect(host.querySelectorAll('.training-exercise-card')).toHaveLength(4)
  expect(nativeConfirm).not.toHaveBeenCalled()
})

it('does not trigger a native leave dialog while a Training save is pending', async () => {
  calls.save.mockImplementation(() => new Promise(() => {}))
  await act(async () => host.querySelector<HTMLButtonElement>('.set-add')!.click())
  await act(async () => vi.advanceTimersByTimeAsync(1000))
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(false)
})

async function confirmationGroup(status: 'scheduled' | 'completed' = 'scheduled') {
  const people = ['a', 'b', 'c'].map((studentId) => ({
    studentId,
    name: `測試${studentId}`,
    status: 'present' as const
  }))
  const value = {
    ...training,
    session: { ...training.session, studentKind: 'group', status },
    participants: people,
    record: {
      ...training.record,
      attendance: people,
      exercises: [
        {
          ...training.record.exercises[0]!,
          recording: { type: 'weight_reps', metrics: ['weight', 'reps'] },
          sets: people.map((person, i) => ({
            id: `group-${i}`,
            studentId: person.studentId,
            measurements: emptyMeasurements(training, 'weight_reps'),
            plannedWeight: null,
            plannedReps: null,
            actualReps: null,
            rpe: null,
            result: null,
            unit: 'kg'
          }))
        }
      ]
    },
    allowedActions: { canEditTraining: true, canComplete: status === 'scheduled', canReopen: false }
  } as SessionTraining
  calls.save.mockClear()
  calls.save.mockResolvedValue(value)
  await act(async () =>
    root.render(
      <MemoryRouter key="confirmation-group">
        <TrainingWorkspace
          session={{ user: { id: 'gesture-coach' } } as Session}
          query={
            { data: value, isLoading: false, isError: false } as UseQueryResult<
              SessionTraining,
              Error
            >
          }
          onBack={() => {}}
          timeZone="Asia/Taipei"
        />
      </MemoryRouter>
    )
  )
}

it('requires in-app acceptance before completing and charging one group lesson', async () => {
  await confirmationGroup()
  const complete = host.querySelector<HTMLButtonElement>('.session-bottom button')!
  await act(async () => complete.click())
  expect(host.querySelector('[role="alertdialog"]')?.textContent).toContain('扣一堂')
  await act(async () => host.querySelector<HTMLButtonElement>('.ui-action-cancel')!.click())
  expect(calls.save).not.toHaveBeenCalled()
  await act(async () => complete.click())
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[role="alertdialog"] .primary-button')!.click()
  )
  expect(calls.save).toHaveBeenCalledTimes(1)
  expect(calls.save.mock.calls[0]![0].complete).toBe(true)
})

it('confirms completed-group attendance changes without losing results on cancel', async () => {
  await confirmationGroup('completed')
  const attendance = host.querySelector<HTMLButtonElement>('.group-training-attendance button')!
  await act(async () => attendance.click())
  expect(host.querySelector('[role="alertdialog"]')?.textContent).toContain('舊成果連結也會失效')
  await act(async () => host.querySelector<HTMLButtonElement>('.ui-action-cancel')!.click())
  expect(attendance.getAttribute('aria-pressed')).toBe('true')
  expect(calls.save).not.toHaveBeenCalled()
  await act(async () => attendance.click())
  await act(async () => host.querySelector<HTMLButtonElement>('.ui-action-delete')!.click())
  expect(attendance.getAttribute('aria-pressed')).toBe('false')
  await act(async () => vi.advanceTimersByTimeAsync(2500))
  expect(calls.save).toHaveBeenCalledTimes(1)
  expect(calls.save.mock.calls[0]![0].payload.attendance[0].status).toBe('absent')
})

it('preserves the last row through closing before handing back the document scroll range', async () => {
  const { workspace, inputs, viewport } = await setEditingGeometry()
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    get: () => 844 + (parseFloat(workspace.style.marginBottom) || 0)
  })
  try {
    await act(async () => inputs.at(-1)!.focus())
    const before = inputs.at(-1)!.getBoundingClientRect().top
    await act(async () =>
      host.querySelector<HTMLButtonElement>('.set-input-advance-dock button')!.click()
    )
    expect(document.body.style.position).toBe('fixed')
    expect(inputs.at(-1)!.getBoundingClientRect().top).toBe(before)
    expect(window.scrollTo).not.toHaveBeenCalled()
    viewport.height = 844
    await act(async () => viewport.dispatchEvent(new Event('resize')))
    const destination = inputs.at(-1)!.getBoundingClientRect().top - before
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: destination, behavior: 'instant' })
    expect(parseFloat(workspace.style.marginBottom)).toBe(destination)
    expect(workspace.dataset.setInputResting).toBe('true')
    expect(document.body.style.position).toBe('')
    await act(async () => inputs.at(-1)!.focus())
    await act(async () =>
      host.querySelector<HTMLButtonElement>('.set-input-advance-dock button')!.click()
    )
    expect(parseFloat(workspace.style.marginBottom)).toBe(destination)
  } finally {
    Reflect.deleteProperty(document.documentElement, 'scrollHeight')
  }
})

it('keeps keyboard geometry through innerHeight transients without recreating the session', async () => {
  const { workspace, inputs, viewport } = await setEditingGeometry()
  await act(async () => inputs[0]!.focus())
  vi.stubGlobal('innerHeight', 480)
  viewport.dispatchEvent(new Event('resize'))
  expect(workspace.style.getPropertyValue('--session-input-height')).toBe('480px')
  expect(document.body.style.position).toBe('fixed')
})

it('retains the dock through a blurred touch gesture longer than the former timeout', async () => {
  const { inputs } = await setEditingGeometry()
  await act(async () => inputs[0]!.focus())
  const button = host.querySelector<HTMLButtonElement>('.set-input-advance-dock button')!
  await act(async () => {
    pointer(button, 'pointerdown', 440, 'touch')
    inputs[0]!.blur()
    pointer(button, 'pointerup', 440, 'touch')
    await vi.advanceTimersByTimeAsync(600)
  })
  expect(host.querySelector('.set-input-advance-dock button')).toBe(button)
  await act(async () => button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })))
  expect(document.activeElement).toBe(inputs[1])
})

it('advances on each touch release without click and ignores compatibility clicks', async () => {
  const { inputs } = await setEditingGeometry()
  await act(async () => inputs[0]!.focus())
  const button = host.querySelector<HTMLButtonElement>('.set-input-advance-dock button')!
  for (let index = 1; index < inputs.length; index++) {
    await act(async () => {
      pointer(button, 'pointerdown', 440, 'touch')
      pointer(button, 'pointerup', 440, 'touch')
    })
    expect(document.activeElement).toBe(inputs[index])
    await act(async () =>
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    )
    expect(document.activeElement).toBe(inputs[index])
    expect(host.querySelector('.set-input-advance-dock button')).toBe(button)
  }
})

it('does not end editing when a free scroll starts on the space between rows', async () => {
  const { workspace, inputs } = await setEditingGeometry()
  await act(async () => inputs[0]!.focus())
  await act(async () => {
    pointer(workspace, 'pointerdown', 320, 'touch')
    touch(workspace, 'touchstart', 50, 320)
    touch(workspace, 'touchmove', 50, 220)
    pointer(workspace, 'pointercancel', 220, 'touch')
  })
  expect(document.documentElement.classList.contains('is-session-set-editing')).toBe(true)
  expect(host.querySelector('.set-input-advance-dock')).not.toBeNull()
})

it('keeps the row still through a native blur gap before a new focus or keyboard closure', async () => {
  const { workspace, inputs, viewport } = await setEditingGeometry()
  await act(async () => inputs[0]!.focus())
  await frame()
  const before = inputs[0]!.getBoundingClientRect().top
  await act(async () => inputs[0]!.blur())
  viewport.height = 620
  viewport.offsetTop = 90
  workspace.scrollTop += 170
  await frame()
  expect(inputs[0]!.getBoundingClientRect().top - viewport.offsetTop).toBe(before)
  expect(document.body.style.position).toBe('fixed')
  // A delayed native Next still owns the same session, without a dock remount.
  const dock = host.querySelector('.set-input-advance-dock')
  await act(async () => inputs[1]!.focus())
  await frame()
  expect(host.querySelector('.set-input-advance-dock')).toBe(dock)
  expect(document.activeElement).toBe(inputs[1])
})

it('releases the scroll owner only after the keyboard closes and restores document scrolling', async () => {
  const { workspace, inputs, viewport } = await setEditingGeometry()
  await act(async () => inputs[0]!.focus())
  await act(async () => inputs[0]!.blur())
  expect(document.body.style.position).toBe('fixed')
  viewport.height = 844
  await act(async () => viewport.dispatchEvent(new Event('resize')))
  expect(host.querySelector('.set-input-advance-dock')).toBeNull()
  expect(document.body.style.position).toBe('')
  expect(document.documentElement.classList.contains('is-session-set-editing')).toBe(false)
  expect(workspace.style.getPropertyValue('--session-input-height')).toBe('')
  expect(window.scrollTo).toHaveBeenCalledOnce()
})

it('applies the final closing geometry before React commits the keyboard-close state', async () => {
  const { workspace, inputs, viewport } = await setEditingGeometry()
  await act(async () => inputs[0]!.focus())
  await frame()
  const before = inputs[0]!.getBoundingClientRect().top
  await act(async () => inputs[0]!.blur())
  workspace.scrollTop += 170
  viewport.height = 780
  viewport.offsetTop = 10
  await act(async () => {
    viewport.dispatchEvent(new Event('resize'))
    expect(inputs[0]!.getBoundingClientRect().top - viewport.offsetTop).toBe(before)
  })
  expect(document.body.style.position).toBe('fixed')
  viewport.height = 844
  viewport.offsetTop = 0
  await act(async () => viewport.dispatchEvent(new Event('resize')))
  expect(document.body.style.position).toBe('')
})

it('keeps the exact next field and dock when viewport height expands during a focus handoff', async () => {
  const { inputs, viewport } = await setEditingGeometry()
  await act(async () => inputs[0]!.focus())
  const button = host.querySelector<HTMLButtonElement>('.set-input-advance-dock button')!
  await act(async () => {
    pointer(button, 'pointerdown', 440, 'touch')
    pointer(button, 'pointerup', 440, 'touch')
  })
  expect(document.activeElement).toBe(inputs[1])
  // A viewport resize is geometry, not proof that the user finished editing.
  viewport.height = 844
  await act(async () => viewport.dispatchEvent(new Event('resize')))
  expect(document.activeElement).toBe(inputs[1])
  expect(host.querySelector('.set-input-advance-dock button')).toBe(button)
  viewport.height = 480
  await act(async () => viewport.dispatchEvent(new Event('resize')))
  await act(async () => {
    pointer(button, 'pointerdown', 440, 'touch')
    pointer(button, 'pointerup', 440, 'touch')
  })
  expect(document.activeElement).toBe(inputs[2])
})

it('can reenter the same still-focused field after a viewport expansion', async () => {
  const { inputs, viewport } = await setEditingGeometry()
  await act(async () => inputs[0]!.focus())
  viewport.height = 844
  await act(async () => viewport.dispatchEvent(new Event('resize')))
  viewport.height = 480
  await act(async () => {
    inputs[0]!.click()
    viewport.dispatchEvent(new Event('resize'))
  })
  expect(document.activeElement).toBe(inputs[0])
  expect(host.querySelector('.set-input-advance-dock')).not.toBeNull()
})

it('keeps editing when a focus-time layout change retargets the release click to the row', async () => {
  const { inputs } = await setEditingGeometry()
  await act(async () => inputs[0]!.focus())
  const dock = host.querySelector('.set-input-advance-dock')
  await act(async () => inputs[2]!.focus())
  const row = inputs[2]!.closest<HTMLElement>('.training-set-card')!
  await act(async () => row.click())
  expect(document.activeElement).toBe(inputs[2])
  expect(host.querySelector('.set-input-advance-dock')).toBe(dock)
})

it('ends numeric editing when explicitly switching to the Coach Note tab', async () => {
  const { inputs } = await setEditingGeometry()
  await act(async () => inputs[0]!.focus())
  const tab = host.querySelector<HTMLButtonElement>('[aria-controls="session-note-panel"]')!
  await act(async () => tab.click())
  expect(tab.getAttribute('aria-selected')).toBe('true')
  expect(host.querySelector('.set-input-advance-dock')).toBeNull()
  expect(document.body.style.position).toBe('')
  expect(document.activeElement).not.toBe(inputs[0])
})

it('finishes a native dismissal when viewport expansion arrives before blur', async () => {
  const { inputs, viewport } = await setEditingGeometry()
  await act(async () => inputs[0]!.focus())
  viewport.height = 844
  await act(async () => viewport.dispatchEvent(new Event('resize')))
  await act(async () => {
    inputs[0]!.blur()
    await vi.advanceTimersByTimeAsync(0)
  })
  expect(host.querySelector('.set-input-advance-dock')).toBeNull()
  expect(document.body.style.position).toBe('')
})

it.each(
  (['solo', 'timeline', 'student'] as const).flatMap((mode) =>
    (Object.keys(recordingTypes) as RecordingType[]).map((type) => ({ mode, type }))
  )
)(
  'preserves exact navigation, values and save/reopen for $mode / $type',
  async ({ mode, type }) => {
    const people = ['a', 'b', 'c'].map((id) => ({
      studentId: id,
      name: `測試${id}`,
      status: 'present' as const
    }))
    const current = {
      ...training,
      session: {
        ...training.session,
        id: `input-${mode}-${type}`,
        studentKind: mode === 'solo' ? 'person' : 'group'
      },
      participants: mode === 'solo' ? undefined : people,
      record: {
        ...training.record,
        attendance: mode === 'solo' ? undefined : people,
        exercises: [
          {
            ...training.record.exercises[0]!,
            recording: { type, metrics: recordingTypes[type].metrics },
            sets: Array.from({ length: 3 }, (_, index) => ({
              id: `set-${index}`,
              studentId: mode === 'solo' ? undefined : people[index % 3]!.studentId,
              measurements: emptyMeasurements(training, type),
              plannedWeight: null,
              plannedReps: null,
              actualReps: null,
              rpe: null,
              result: null,
              unit: 'kg'
            }))
          }
        ]
      }
    } as SessionTraining
    localStorage.setItem('group-training-view:gesture-coach', mode)
    const render = (value: SessionTraining, key: string) =>
      root.render(
        <MemoryRouter key={key}>
          <TrainingWorkspace
            session={{ user: { id: 'gesture-coach' } } as Session}
            query={
              { data: value, isLoading: false, isError: false } as UseQueryResult<
                SessionTraining,
                Error
              >
            }
            onBack={() => {}}
            timeZone="Asia/Taipei"
          />
        </MemoryRouter>
      )
    const accept = (payload: import('../../api').TrainingDraftPayload): SessionTraining => ({
      ...current,
      record: {
        ...current.record,
        ...payload,
        version: 2,
        exercises: payload.exercises.map((exercise) => ({
          ...current.record.exercises.find((item) => item.id === exercise.id)!,
          ...exercise
        }))
      }
    })
    calls.save.mockImplementation(async ({ payload }) => accept(payload))
    const viewport = Object.assign(new EventTarget(), { height: 480, offsetTop: 0 })
    vi.stubGlobal('visualViewport', viewport)
    await act(async () => render(current, 'entry'))
    const inputs = [...host.querySelectorAll<HTMLInputElement>('.training-set-card input')]
    expect(inputs).toHaveLength(3 * (recordingTypes[type].dimensions.length + 1))
    await act(async () => inputs[0]!.focus())
    const dock = host.querySelector('.set-input-advance-dock')
    for (let index = 0; index < inputs.length; index++) {
      expect(document.activeElement).toBe(inputs[index])
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
          inputs[index],
          '7'
        )
        inputs[index]!.dispatchEvent(new Event('input', { bubbles: true }))
      })
      expect(host.querySelector('.set-input-advance-dock')).toBe(dock)
      const button = host.querySelector<HTMLButtonElement>('.set-input-advance-dock button')!
      expect(button.textContent).toContain(index === inputs.length - 1 ? '完成輸入' : '下一格')
      await act(async () => {
        pointer(button, 'pointerdown', 440, 'touch')
        pointer(button, 'pointerup', 440, 'touch')
      })
      if (index < inputs.length - 1) {
        await act(async () =>
          button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }))
        )
        expect(document.activeElement).toBe(inputs[index + 1])
      }
    }
    expect(host.querySelector('.set-input-advance-dock')).toBeNull()
    expect(document.body.style.position).toBe('fixed')
    viewport.height = 844
    await act(async () => viewport.dispatchEvent(new Event('resize')))
    expect(document.body.style.position).toBe('')
    await act(async () => vi.advanceTimersByTimeAsync(2500))
    expect(calls.save).toHaveBeenCalled()
    const payload = calls.save.mock.calls.at(-1)![0].payload
    for (const set of payload.exercises[0].sets) {
      expect(set.rpe).toBe(7)
      for (const dimension of recordingTypes[type].dimensions)
        expect(set.measurements[dimension]).toBe(7)
      expect(set.studentId).toBe(
        current.record.exercises[0]!.sets.find((item) => item.id === set.id)!.studentId
      )
    }
    const accepted = accept(payload)
    await act(async () => render(accepted, 'reopened'))
    const reopened = [...host.querySelectorAll<HTMLInputElement>('.training-set-card input')]
    expect(reopened.map((input) => input.value)).toEqual(inputs.map(() => '7'))
    await act(async () => reopened.at(-1)!.focus())
    expect(host.querySelector('.set-input-advance-dock button')?.textContent).toContain('完成輸入')
  }
)

it('starts editing an empty canvas immediately and leaves it read-only again on return', async () => {
  const editor = host.querySelector<HTMLElement>('.mobile-note-content')!
  await act(async () => host.querySelector<HTMLElement>('.mobile-note-canvas')!.click())
  expect(document.activeElement).toBe(editor)
  expect(editor.getAttribute('contenteditable')).toBe('true')
  await act(async () => window.dispatchEvent(new Event('session-note-focus-exit')))
  expect(editor.getAttribute('contenteditable')).toBe('false')
  expect(document.activeElement).not.toBe(editor)
})

it('accepts a fresh short tap after a cancelled scroll without waiting for a ghost click', async () => {
  const editor = host.querySelector<HTMLElement>('.mobile-note-content')!
  await act(async () => {
    pointer(editor, 'pointerdown', 320, 'touch')
    pointer(editor, 'pointercancel', 300, 'touch')
    pointer(editor, 'pointerdown', 320, 'touch')
    pointer(editor, 'pointerup', 320, 'touch')
    editor.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
  })
  expect(document.activeElement).toBe(editor)
})

it('resolves the lower paragraph caret before moving the canvas, and sets it before keyboard focus', async () => {
  const editor = host.querySelector<HTMLElement>('.mobile-note-content')!
  const blocks = ['第一段', '第二段點此輸入', '最後一段'].map((text) => {
    const block = document.createElement('div')
    block.dataset.noteBlock = ''
    block.className = 'mobile-note-block'
    block.textContent = text
    return block
  })
  editor.replaceChildren(...blocks)
  const range = document.createRange()
  range.setStart(blocks[1]!.firstChild!, 3)
  range.collapse(true)
  Object.defineProperty(document, 'caretRangeFromPoint', {
    configurable: true,
    value: vi.fn(() => {
      expect(document.documentElement.classList.contains('is-session-note-focused')).toBe(false)
      return range
    })
  })
  const focus = vi.spyOn(editor, 'focus').mockImplementation(() => {
    expect(window.getSelection()?.anchorNode).toBe(blocks[1]!.firstChild)
    expect(window.getSelection()?.anchorOffset).toBe(3)
    expect(editor.getAttribute('contenteditable')).toBe('true')
  })
  try {
    await act(async () => {
      pointer(blocks[1]!, 'pointerdown', 320, 'touch')
      pointer(blocks[1]!, 'pointerup', 320, 'touch')
      blocks[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    })
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  } finally {
    Reflect.deleteProperty(document, 'caretRangeFromPoint')
  }
})

it('contains drags that start on every non-scrollable part of note focus mode', async () => {
  const editor = host.querySelector<HTMLElement>('.mobile-note-content')!
  await act(async () => editor.click())
  const toolbar = host.querySelector<HTMLElement>('.session-note-tools')!
  const header = document.createElement('header')
  header.className = 'mobile-header'
  document.body.prepend(header)

  for (const surface of [toolbar, header]) {
    touch(surface, 'touchstart', 180, 640)
    const move = touch(surface, 'touchmove', 180, 500)
    expect(move.defaultPrevented).toBe(true)
  }
})

it('allows only real in-canvas note scrolling and contains its boundaries', async () => {
  const editor = host.querySelector<HTMLElement>('.mobile-note-content')!
  await act(async () => editor.click())
  const canvas = host.querySelector<HTMLElement>('.mobile-note-canvas')!
  Object.defineProperties(canvas, {
    clientHeight: { configurable: true, value: 500 },
    scrollHeight: { configurable: true, value: 900 }
  })

  canvas.scrollTop = 180
  touch(canvas, 'touchstart', 180, 500)
  expect(touch(canvas, 'touchmove', 180, 420).defaultPrevented).toBe(false)

  canvas.scrollTop = 0
  touch(canvas, 'touchstart', 180, 500)
  expect(touch(canvas, 'touchmove', 180, 580).defaultPrevented).toBe(true)
})

it('shows the existing background-sync status if saving fails after focus mode closes', async () => {
  calls.save.mockRejectedValueOnce(new Error('network'))
  const editor = host.querySelector<HTMLElement>('.mobile-note-content')!
  await act(async () => editor.click())
  const block = editor.querySelector<HTMLElement>('.mobile-note-block')!
  block.textContent = '尚未同步的內容'
  await act(async () => editor.dispatchEvent(new InputEvent('input', { bubbles: true })))

  await act(async () => {
    window.dispatchEvent(new Event('session-note-focus-exit'))
    await Promise.resolve()
    await Promise.resolve()
  })

  expect(host.querySelector('.session-workspace')?.classList.contains('is-note-focused')).toBe(
    false
  )
  expect(host.querySelector('.session-save-status')?.textContent).toContain('背景重試')
})

it('shows only the destination Session draft when navigating between Training records', async () => {
  const destination = {
    ...training,
    session: { ...training.session, id: 'destination-session' },
    record: {
      ...training.record,
      id: 'destination-record',
      exercises: [
        {
          ...training.record.exercises[0],
          id: 'destination-exercise',
          definitionName: '目的課堂動作'
        }
      ]
    }
  } as SessionTraining
  await act(async () =>
    root.render(
      <MemoryRouter>
        <TrainingWorkspace
          session={{ user: { id: 'gesture-coach' } } as Session}
          query={
            { data: destination, isLoading: false, isError: false } as UseQueryResult<
              SessionTraining,
              Error
            >
          }
          onBack={() => {}}
          timeZone="Asia/Taipei"
        />
      </MemoryRouter>
    )
  )
  expect(host.querySelector('[data-exercise-id="destination-exercise"]')).not.toBeNull()
  expect(host.querySelector('[data-exercise-id="one"]')).toBeNull()
  expect(calls.save).not.toHaveBeenCalled()
})

it('keeps a pending edit bound to its source Session during navigation', async () => {
  const addSetButton = [
    ...host.querySelectorAll<HTMLButtonElement>('[data-exercise-id="one"] button')
  ].find((button) => button.textContent?.includes('新增一組'))!
  await act(async () => addSetButton.click())
  const destination = {
    ...training,
    session: { ...training.session, id: 'destination-session' },
    record: {
      ...training.record,
      id: 'destination-record',
      exercises: [
        {
          ...training.record.exercises[0],
          id: 'destination-exercise',
          definitionName: '目的課堂動作'
        }
      ]
    }
  } as SessionTraining
  await act(async () =>
    root.render(
      <MemoryRouter>
        <TrainingWorkspace
          session={{ user: { id: 'gesture-coach' } } as Session}
          query={
            { data: destination, isLoading: false, isError: false } as UseQueryResult<
              SessionTraining,
              Error
            >
          }
          onBack={() => {}}
          timeZone="Asia/Taipei"
        />
      </MemoryRouter>
    )
  )
  await act(async () => Promise.resolve())
  expect(calls.save).toHaveBeenCalled()
  expect(calls.save.mock.calls.every(([request]) => request.sessionId === 'gesture-session')).toBe(
    true
  )
  expect(host.querySelector('[data-exercise-id="destination-exercise"]')).not.toBeNull()
})

describe('Training editor pointer lifecycle', () => {
  function scrollGeometry(documentTop = 200, clampOnShrink = false) {
    let scroll = 0
    let lastPadding = 0
    Object.defineProperty(document.documentElement, 'scrollTop', {
      configurable: true,
      get: () => {
        const padding = parseFloat(
          host.querySelector<HTMLElement>('.exercise-stack-shell')?.style.paddingTop || '0'
        )
        if (clampOnShrink && padding < lastPadding)
          scroll = Math.max(0, scroll - lastPadding + padding)
        lastPadding = padding
        return scroll
      },
      set: (value: number) => {
        scroll = Math.max(0, value)
        lastPadding = parseFloat(
          host.querySelector<HTMLElement>('.exercise-stack-shell')?.style.paddingTop || '0'
        )
      }
    })
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockImplementation(function (
      this: HTMLElement
    ) {
      const shell = host.querySelector<HTMLElement>('.exercise-stack-shell')
      const compact = shell?.classList.contains('is-reordering')
      const padding = parseFloat(shell?.style.paddingTop || '0')
      let top = documentTop - scroll,
        height = compact ? 322 : 1300
      if (this.classList.contains('exercise-stack')) top += padding
      if (this.classList.contains('training-heading')) {
        top -= 100
        height = 78
      }
      if (this.dataset.exerciseId) {
        top += padding + order().indexOf(this.dataset.exerciseId) * (compact ? 66 : 260)
        height = compact ? 58 : 244
      }
      if (this.classList.contains('session-topbar')) {
        top = 0
        height = 120
      }
      if (this.classList.contains('session-bottom')) {
        top = clampOnShrink ? 400 : 700
        height = 68
      }
      return {
        top,
        bottom: top + height,
        x: 0,
        y: top,
        left: 0,
        right: 390,
        width: 390,
        height,
        toJSON() {}
      }
    })
    return {
      get scroll() {
        return scroll
      },
      set scroll(value: number) {
        scroll = value
      }
    }
  }

  it.each([true, false])(
    'keeps the dropped expanded card visible with start anchoring %s',
    async (enabled) => {
      const plan = startAnchorExperiment.startAnchorSpace
      vi.spyOn(startAnchorExperiment, 'startAnchorSpace').mockImplementation((remaining) =>
        plan(remaining, enabled)
      )
      scrollGeometry()
      await start('two', 480)
      await act(async () => pointer(document.body, 'pointermove', 650))
      await frame()
      await act(async () => pointer(window, 'pointerup', 650))
      const card = handle('two').closest<HTMLElement>('[data-exercise-id]')!
      expect(order()[4]).toBe('two')
      expect(card.getBoundingClientRect().top).toBeGreaterThanOrEqual(120)
      expect(card.getBoundingClientRect().top).toBeLessThanOrEqual(642)
      expect(card.getBoundingClientRect().bottom).toBeLessThanOrEqual(700)
      Reflect.deleteProperty(document.documentElement, 'scrollTop')
    }
  )

  it('starts upward scrolling below the sticky header instead of at the screen edge', async () => {
    const geometry = scrollGeometry()
    await start('one', 220)
    geometry.scroll = 150
    await act(async () => pointer(document.body, 'pointermove', 160))
    await frame()
    expect(geometry.scroll).toBeLessThan(150)
    Reflect.deleteProperty(document.documentElement, 'scrollTop')
  })

  it('stops downward scrolling at the last row even if the page has footer padding', async () => {
    const geometry = scrollGeometry(500)
    await start('one', 520)
    geometry.scroll = 122 // last compact row bottom is exactly at the footer's top
    await act(async () => pointer(document.body, 'pointermove', 695))
    await frame()
    expect(geometry.scroll).toBe(122)
    Reflect.deleteProperty(document.documentElement, 'scrollTop')
  })

  it('initially keeps the held second row between its original neighbours', async () => {
    scrollGeometry()
    await start('two', 480)
    const card = handle('two').closest<HTMLElement>('[data-exercise-id]')!
    expect(card.getBoundingClientRect().top).toBe(460)
    expect(order()).toEqual(['one', 'two', 'three', 'four', 'five'])
    Reflect.deleteProperty(document.documentElement, 'scrollTop')
  })

  it('retires leading space without a reverse jump when shrinking clamps native scroll', async () => {
    const geometry = scrollGeometry(200, true)
    await start('two', 480)
    const shell = host.querySelector<HTMLElement>('.exercise-stack-shell')!
    const leading = parseFloat(shell.style.paddingTop)
    expect(leading).toBeGreaterThan(0)
    geometry.scroll = 200 + leading - 121
    await act(async () => pointer(document.body, 'pointermove', 695))
    await frame()
    expect(parseFloat(shell.style.paddingTop)).toBe(0)
    const firstTop = shell.getBoundingClientRect().top
    expect(firstTop).toBeLessThanOrEqual(121)
    expect(firstTop).toBeGreaterThanOrEqual(121 - 480 * 0.016)
  })

  it('leaves eight pixels between the first row and the sticky header at the upper bound', async () => {
    const geometry = scrollGeometry()
    await start('one', 220)
    geometry.scroll = 84
    await act(async () => pointer(document.body, 'pointermove', 160))
    for (let i = 0; i < 30; i++) await frame()
    expect(
      host.querySelector<HTMLElement>('.exercise-stack-shell')!.getBoundingClientRect().top
    ).toBe(128)
  })

  it.each(['pointerup', 'pointercancel'])(
    'keeps the heading out after it leaves the viewport, until %s',
    async (endEvent) => {
      const geometry = scrollGeometry()
      await start('two', 480)
      const heading = host.querySelector<HTMLElement>('.training-heading')!
      expect(getComputedStyle(heading).visibility).toBe('visible')
      geometry.scroll = 100 // heading bottom is now above the sticky header
      await act(async () => pointer(document.body, 'pointermove', 400))
      await frame()
      expect(getComputedStyle(heading).visibility).toBe('hidden')
      geometry.scroll = 0 // removing initial space compensates scrollTop
      await act(async () => pointer(document.body, 'pointermove', 410))
      await frame()
      expect(getComputedStyle(heading).visibility).toBe('hidden')
      await act(async () => pointer(window, endEvent, 410))
      expect(getComputedStyle(heading).visibility).toBe('visible')
    }
  )

  it.each(['mouse', 'touch'])(
    'keeps following %s movement outside the moved handle',
    async (pointerType) => {
      await start('three', 252, pointerType)
      await act(async () => pointer(handle('three'), 'pointermove', 200, pointerType))
      await frame()
      expect(order()).toEqual(['one', 'three', 'two', 'four', 'five'])
      // A DOM move can release capture. The next event is then hit-tested outside the handle.
      await frame()
      await act(async () => pointer(document.body, 'pointermove', 135, pointerType))
      await frame()
      expect(order()).toEqual(['three', 'one', 'two', 'four', 'five'])
      expect(calls.save).not.toHaveBeenCalled()
      await act(async () => pointer(window, 'pointerup', 135, pointerType))
      await act(async () => vi.advanceTimersByTimeAsync(2100))
      expect(calls.save).toHaveBeenCalledTimes(1)
      expect(
        calls.save.mock.calls[0]![0].payload.exercises.map((e: { id: string }) => e.id)
      ).toEqual(order())
      expect(host.querySelector('.exercise-drag-overlay')).toBeNull()
    }
  )

  it('catches up when one pointer event crosses several rows, then rests without a frame loop', async () => {
    await start('one', 120)
    await act(async () => pointer(handle('one'), 'pointermove', 380))
    for (let i = 0; i < 10; i++) await frame()
    expect(order()).toEqual(['two', 'three', 'four', 'five', 'one'])
    expect(frames.size).toBe(0)
  })

  it('coalesces 100 pointer events into one geometry read and one batched exchange animation', async () => {
    await start('one', 120)
    const geometry = vi.mocked(HTMLElement.prototype.getBoundingClientRect)
    geometry.mockClear()
    await act(async () => {
      for (let i = 1; i <= 100; i++) pointer(document.body, 'pointermove', 120 + i * 2.6)
    })
    expect(frames.size).toBe(1)
    expect(geometry).not.toHaveBeenCalled()
    await frame()
    expect(order()).toEqual(['two', 'three', 'four', 'five', 'one'])
    expect(frames.size).toBe(1)
    await frame()
    expect(geometry).toHaveBeenCalledTimes(1)
    expect(frames.size).toBe(0)
    expect(calls.save).not.toHaveBeenCalled()
  })

  it('cancels rather than saving a partly rearranged gesture on pointercancel', async () => {
    await start('one', 120)
    await act(async () => pointer(handle('one'), 'pointermove', 185))
    await frame()
    expect(order()[0]).toBe('two')
    await act(async () => pointer(window, 'pointercancel', 185))
    expect(order()).toEqual(['one', 'two', 'three', 'four', 'five'])
    await act(async () => vi.advanceTimersByTimeAsync(2100))
    expect(calls.save).not.toHaveBeenCalled()
  })

  it('includes the final release position even before the pending frame runs', async () => {
    await start('one', 120)
    await act(async () => pointer(document.body, 'pointermove', 185))
    await act(async () => pointer(window, 'pointerup', 380))
    expect(order()).toEqual(['two', 'three', 'four', 'five', 'one'])
    await act(async () => vi.advanceTimersByTimeAsync(2100))
    expect(calls.save).toHaveBeenCalledTimes(1)
    await frame()
    expect(host.querySelector('.exercise-drag-overlay')).toBeNull()
    expect(frames.size).toBe(0)
  })

  it('reverses within the same gesture and makes no save when back at the original order', async () => {
    await start('one', 120)
    await act(async () => pointer(document.body, 'pointermove', 380))
    await frame()
    expect(order()[4]).toBe('one')
    await act(async () => pointer(document.body, 'pointermove', 120))
    await frame()
    expect(order()[0]).toBe('one')
    await act(async () => pointer(window, 'pointerup', 120))
    await act(async () => vi.advanceTimersByTimeAsync(2100))
    expect(calls.save).not.toHaveBeenCalled()
  })

  it.each(['blur', 'Escape'])('restores the draft and stops work after %s', async (reason) => {
    await start('one', 120)
    await act(async () => pointer(document.body, 'pointermove', 185))
    await frame()
    await act(async () =>
      window.dispatchEvent(
        reason === 'blur' ? new Event('blur') : new KeyboardEvent('keydown', { key: 'Escape' })
      )
    )
    expect(order()).toEqual(['one', 'two', 'three', 'four', 'five'])
    await act(async () => pointer(window, 'pointerup', 380))
    await frame()
    await act(async () => vi.advanceTimersByTimeAsync(2100))
    expect(calls.save).not.toHaveBeenCalled()
    expect(frames.size).toBe(0)
    expect(document.body.classList.contains('is-reordering-exercise')).toBe(false)
  })

  it('ignores a second pointer and cleans up when released before activation', async () => {
    await act(async () => pointer(handle('one'), 'pointerdown', 120))
    await act(async () => pointer(handle('three'), 'pointerdown', 252, 'touch', 2))
    await act(async () => pointer(window, 'pointerup', 120))
    await act(async () => vi.advanceTimersByTimeAsync(250))
    expect(host.querySelector('.exercise-drag-overlay')).toBeNull()
    expect(frames.size).toBe(0)
    await start('one', 120)
    await act(async () => pointer(document.body, 'pointermove', 380, 'touch', 2))
    await frame()
    expect(order()[0]).toBe('one')
    await act(async () => pointer(window, 'pointerup', 380, 'touch', 2))
    expect(host.querySelector('.exercise-drag-overlay')).not.toBeNull()
    await act(async () => pointer(window, 'pointerup', 120))
    expect(host.querySelector('.exercise-drag-overlay')).toBeNull()
  })
})
