// @vitest-environment jsdom
import { StrictMode, act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import type { ExerciseDefinition } from '../../api'
import { DefinitionEditor } from './ExercisesPage'

const definition: ExerciseDefinition = {
  id: 'squat',
  catalogKey: 'squat',
  name: '槓鈴深蹲',
  equipment: '槓鈴',
  bodyParts: ['腿'],
  movementType: '系統動作',
  performanceMetric: 'weight',
  isSystem: true,
  favorite: false,
  version: 1
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

it('dismisses equipment choices on outside pointer action without opening them on focus', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <DefinitionEditor
          definition={definition}
          filters={{ equipment: ['槓鈴', '啞鈴'], bodyParts: ['腿'] }}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      )
    )
    const name = host.querySelector<HTMLInputElement>('input[name="name"]')!
    const equipment = host.querySelector<HTMLInputElement>('#editor-equipment')!
    expect(document.activeElement).not.toBe(name)
    await act(async () => equipment.focus())
    expect(host.querySelector('[role="listbox"]')).toBeNull()
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="選擇器材"]')!.click())
    expect(host.querySelector('[role="listbox"]')).not.toBeNull()
    await act(async () => document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })))
    expect(host.querySelector('[role="listbox"]')).toBeNull()
  } finally {
    await act(async () => root.unmount())
  }
})

it('blurs a field on Enter, then submits on Enter and cancels on Escape or backdrop', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const onClose = vi.fn()
  const onSave = vi.fn()
  try {
    await act(async () =>
      root.render(
        <DefinitionEditor
          definition={definition}
          filters={{ equipment: ['槓鈴'], bodyParts: ['腿'] }}
          onClose={onClose}
          onSave={onSave}
        />
      )
    )
    const name = host.querySelector<HTMLInputElement>('input[name="name"]')!
    name.focus()
    await act(async () =>
      name.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      )
    )
    expect(document.activeElement).not.toBe(name)
    expect(onSave).not.toHaveBeenCalled()
    await act(async () =>
      host
        .querySelector('[role="dialog"]')!
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
        )
    )
    expect(onSave).toHaveBeenCalledTimes(1)
    await act(async () =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      )
    )
    expect(onClose).toHaveBeenCalledTimes(1)
    await act(async () =>
      host
        .querySelector('.dialog-backdrop')!
        .dispatchEvent(new Event('pointerdown', { bubbles: true }))
    )
    expect(onClose).toHaveBeenCalledTimes(2)
  } finally {
    await act(async () => root.unmount())
  }
})

it('keeps focus inside the editor in Strict Mode and saves when a choice button has focus', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const onSave = vi.fn()
  try {
    await act(async () =>
      root.render(
        <StrictMode>
          <DefinitionEditor
            definition={definition}
            filters={{ equipment: ['槓鈴'], bodyParts: ['腿'] }}
            onClose={vi.fn()}
            onSave={onSave}
          />
        </StrictMode>
      )
    )
    await new Promise((resolve) => requestAnimationFrame(resolve))
    const dialog = host.querySelector<HTMLElement>('[role="dialog"]')!
    expect(document.activeElement).toBe(dialog)
    const choice = [...host.querySelectorAll<HTMLButtonElement>('.editor-segmented button')].find(
      (button) => button.textContent === '局部動作'
    )!
    choice.focus()
    await act(async () =>
      choice.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      )
    )
    expect(onSave).toHaveBeenCalledTimes(1)
  } finally {
    await act(async () => root.unmount())
  }
})

it('shows saving progress until the edit request completes', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  let finishSave!: () => void
  const onSave = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finishSave = resolve
      })
  )
  try {
    await act(async () =>
      root.render(
        <DefinitionEditor
          definition={definition}
          filters={{ equipment: ['槓鈴'], bodyParts: ['腿'] }}
          onClose={vi.fn()}
          onSave={onSave}
        />
      )
    )
    await act(async () =>
      host.querySelector<HTMLButtonElement>('.editor-actions .primary-button')!.click()
    )
    const save = host.querySelector<HTMLButtonElement>('.editor-actions .primary-button')!
    expect(save.textContent).toBe('儲存中…')
    expect(save.disabled).toBe(true)
    await act(async () => finishSave())
    expect(save.textContent).toBe('儲存修改')
  } finally {
    await act(async () => root.unmount())
  }
})
