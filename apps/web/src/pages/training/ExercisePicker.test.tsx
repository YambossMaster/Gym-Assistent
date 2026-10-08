// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Session } from '@supabase/supabase-js'
import { afterEach, expect, it, vi } from 'vitest'
import { ExercisePicker } from './TrainingWorkspace'

const library = vi.hoisted(() => ({
  data: {
    definitions: [
      {
        id: 'squat',
        name: '槓鈴深蹲',
        equipment: '槓鈴',
        bodyParts: ['腿'],
        movementType: '系統動作',
        isSystem: true,
        favorite: false,
        version: 1
      },
      {
        id: 'curl',
        name: '啞鈴彎舉',
        equipment: '啞鈴',
        bodyParts: ['手臂'],
        movementType: '局部動作',
        isSystem: false,
        favorite: false,
        version: 1
      }
    ],
    filters: {
      equipment: ['槓鈴', '啞鈴'],
      movementTypes: ['系統動作', '局部動作'],
      bodyParts: ['腿', '手臂']
    },
    totals: { all: 2, favorite: 0, custom: 1 }
  }
}))
const calls = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('./queries', () => ({
  useExerciseLibrary: () => ({ data: library.data, isLoading: false, isError: false }),
  useTrainingMutations: () => ({
    createExercise: { mutateAsync: calls.create },
    updateExercise: { mutateAsync: vi.fn() },
    remove: { isPending: false, mutate: vi.fn() },
    favorite: { toggle: vi.fn() }
  })
}))

afterEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
  vi.unstubAllGlobals()
  calls.create.mockReset()
})

it('remembers the last picker category for the same coach', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const renderPicker = async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    await act(async () =>
      root.render(
        <ExercisePicker
          session={{ user: { id: 'coach' } } as Session}
          onPick={vi.fn()}
          onClose={vi.fn()}
        />
      )
    )
    return { host, root }
  }

  const first = await renderPicker()
  await act(async () =>
    [...first.host.querySelectorAll<HTMLButtonElement>('.picker-tabs button')]
      .find((button) => button.textContent?.includes('常用'))!
      .click()
  )
  expect(localStorage.getItem('gym-assistant.exercise-picker-view:coach')).toBe('favorite')
  await act(async () => first.root.unmount())
  first.host.remove()

  const second = await renderPicker()
  expect(
    [...second.host.querySelectorAll<HTMLButtonElement>('.picker-tabs button')]
      .find((button) => button.textContent?.includes('常用'))
      ?.getAttribute('aria-pressed')
  ).toBe('true')
  await act(async () => second.root.unmount())
})

it('collapses mobile picker filters after a choice, result scroll, or outside pointer action', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <ExercisePicker
          session={{ user: { id: 'coach' } } as Session}
          onPick={vi.fn()}
          onClose={vi.fn()}
        />
      )
    )
    const shelf = host.querySelector<HTMLElement>('#exercise-picker-filter-shelf')!
    const toggle = host.querySelector<HTMLButtonElement>('.picker-mobile-filter-toggle')!
    expect(shelf.dataset.mobileOpen).toBe('true')

    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="部位"] button')!.click()
    )
    expect(shelf.dataset.mobileOpen).toBe('false')

    await act(async () => toggle.click())
    expect(shelf.dataset.mobileOpen).toBe('true')
    await act(async () =>
      host.querySelector<HTMLElement>('.picker-results')!.dispatchEvent(new Event('scroll'))
    )
    expect(shelf.dataset.mobileOpen).toBe('false')

    await act(async () => toggle.click())
    expect(shelf.dataset.mobileOpen).toBe('true')
    await act(async () =>
      host
        .querySelector<HTMLElement>('.picker-results')!
        .dispatchEvent(new Event('pointerdown', { bubbles: true }))
    )
    expect(shelf.dataset.mobileOpen).toBe('false')

    await act(async () => toggle.click())
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('.picker-tabs button')]
        .find((button) => button.textContent?.includes('自訂'))!
        .click()
    )
    expect(shelf.dataset.mobileOpen).toBe('false')
  } finally {
    await act(async () => root.unmount())
  }
})

it('provides library filters and creation from the training picker', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <ExercisePicker
          session={{ user: { id: 'coach' } } as Session}
          onPick={vi.fn()}
          onClose={vi.fn()}
        />
      )
    )
    expect(host.querySelector('[aria-label="器材"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="動作類型"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="篩選動作"]')).not.toBeNull()
    expect(host.querySelector('.picker-toolbar .picker-create')?.textContent).toContain('自訂動作')
    expect(host.querySelector('.picker-toolbar .picker-tabs')).not.toBeNull()
    expect(host.querySelectorAll('.picker-item')).toHaveLength(2)
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="部位"] button')!.click()
    )
    expect(host.querySelectorAll('.picker-item')).toHaveLength(1)
    expect(host.querySelector('.picker-item')?.textContent).toContain('槓鈴深蹲')
    await act(async () =>
      host.querySelector<HTMLButtonElement>('.picker-tabs button:last-child')!.click()
    )
    expect(host.querySelector('.picker-results .empty-state .secondary-button')?.textContent).toBe(
      '清除篩選'
    )
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.includes('自訂動作'))!
        .click()
    )
    expect(host.querySelector('.definition-editor')).not.toBeNull()
    expect(host.querySelector('.exercise-picker')?.getAttribute('aria-hidden')).toBe('true')
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
    expect(host.querySelector('.definition-editor')).toBeNull()
    expect(host.querySelector('.exercise-picker')?.getAttribute('aria-hidden')).toBe('false')
  } finally {
    await act(async () => root.unmount())
  }
})

it('adds a newly created definition to the current training record', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const created = { ...library.data.definitions[0], id: 'new', name: '測試新動作', version: 1 }
  calls.create.mockResolvedValue(created)
  const onPick = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <ExercisePicker
          session={{ user: { id: 'coach' } } as Session}
          onPick={onPick}
          onClose={vi.fn()}
        />
      )
    )
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.includes('自訂動作'))!
        .click()
    )
    const name = host.querySelector<HTMLInputElement>('input[name="name"]')!
    const equipment = host.querySelector<HTMLInputElement>('#editor-equipment')!
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      set.call(name, '測試新動作')
      name.dispatchEvent(new Event('input', { bubbles: true }))
      set.call(equipment, '槓鈴')
      equipment.dispatchEvent(new Event('input', { bubbles: true }))
      host.querySelector<HTMLButtonElement>('.definition-editor .body-part-filters button')!.click()
    })
    await act(async () =>
      host.querySelector<HTMLFormElement>('.definition-editor form')!.requestSubmit()
    )
    expect(calls.create).toHaveBeenCalledTimes(1)
    expect(onPick).toHaveBeenCalledWith(created)
  } finally {
    await act(async () => root.unmount())
  }
})
