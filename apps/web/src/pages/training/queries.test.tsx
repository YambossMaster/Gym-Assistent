// @vitest-environment jsdom
import type { Session } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import type { ExerciseDefinition, ExerciseLibrary } from '../../api'
import { queryKeys } from '../../query-keys'
import { useTrainingMutations } from './queries'

const requests = vi.hoisted(() => ({
  favorite: vi.fn(),
  getLibrary: vi.fn(),
  remove: vi.fn(),
  create: vi.fn(),
  update: vi.fn()
}))
vi.mock('../../api', async (original) => ({
  ...(await original<typeof import('../../api')>()),
  getExerciseLibrary: requests.getLibrary,
  setExerciseFavorite: requests.favorite,
  removeExercise: requests.remove,
  createExercise: requests.create,
  updateExercise: requests.update
}))

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
const session = { user: { id: 'coach' }, access_token: 'local-test' } as Session

afterEach(() => {
  document.body.innerHTML = ''
  requests.favorite.mockReset()
  requests.getLibrary.mockReset()
  requests.remove.mockReset()
  requests.create.mockReset()
  requests.update.mockReset()
  vi.unstubAllGlobals()
})

it('shows a new definition immediately and replaces it with the authoritative response', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const key = queryKeys.exerciseLibrary('coach')
  client.setQueryData<ExerciseLibrary>(key, {
    definitions: [definition],
    filters: { equipment: ['槓鈴'], bodyParts: ['腿'], movementTypes: ['系統動作', '局部動作'] },
    totals: { all: 1, favorite: 0, custom: 0 }
  })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  let mutations!: ReturnType<typeof useTrainingMutations>
  function Harness() {
    mutations = useTrainingMutations(session)
    return null
  }
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Harness />
        </QueryClientProvider>
      )
    )
    let resolveCreate!: (value: ExerciseDefinition) => void
    requests.create.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve
      })
    )
    await act(async () => {
      mutations.createExercise.mutate({
        name: '新動作',
        equipment: '壺鈴',
        bodyParts: ['核心'],
        movementType: '局部動作',
        performanceMetric: 'reps',
        operationId: 'create-1'
      })
      await Promise.resolve()
    })
    expect(client.getQueryData<ExerciseLibrary>(key)?.definitions[0]).toMatchObject({
      id: 'pending:create-1',
      name: '新動作',
      version: 0
    })
    expect(client.getQueryData<ExerciseLibrary>(key)?.totals).toEqual({
      all: 2,
      favorite: 0,
      custom: 1
    })
    await act(async () =>
      resolveCreate({
        ...definition,
        id: 'new-id',
        catalogKey: null,
        name: '新動作',
        equipment: '壺鈴',
        bodyParts: ['核心'],
        movementType: '局部動作',
        performanceMetric: 'reps',
        isSystem: false
      })
    )
    expect(client.getQueryData<ExerciseLibrary>(key)?.definitions[0].id).toBe('new-id')

    let rejectUpdate!: (error: Error) => void
    requests.update.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectUpdate = reject
      })
    )
    await act(async () => {
      mutations.updateExercise.mutate({
        id: 'squat',
        input: {
          name: '修改後',
          equipment: '槓鈴',
          bodyParts: ['腿'],
          movementType: '系統動作',
          performanceMetric: 'weight',
          version: 1,
          operationId: 'update-1'
        }
      })
      await Promise.resolve()
    })
    expect(client.getQueryData<ExerciseLibrary>(key)?.definitions[1].name).toBe('修改後')
    await act(async () => rejectUpdate(new Error('offline')))
    expect(client.getQueryData<ExerciseLibrary>(key)?.definitions[1].name).toBe('槓鈴深蹲')
  } finally {
    await act(async () => root.unmount())
    client.clear()
  }
})

it('updates favorite and delete immediately, then restores each failed operation', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const key = queryKeys.exerciseLibrary('coach')
  client.setQueryData<ExerciseLibrary>(key, {
    definitions: [definition],
    filters: { equipment: ['槓鈴'], bodyParts: ['腿'], movementTypes: ['系統動作', '局部動作'] },
    totals: { all: 1, favorite: 0, custom: 0 }
  })
  const current = () => client.getQueryData<ExerciseLibrary>(key)!
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  let mutations!: ReturnType<typeof useTrainingMutations>
  function Harness() {
    mutations = useTrainingMutations(session)
    return null
  }
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Harness />
        </QueryClientProvider>
      )
    )
    let rejectFavorite!: (error: Error) => void
    requests.favorite.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectFavorite = reject
      })
    )
    await act(async () => {
      mutations.favorite.toggle('squat')
      await Promise.resolve()
    })
    expect(requests.favorite).toHaveBeenCalledTimes(1)
    expect(current().definitions[0].favorite).toBe(true)
    expect(current().totals.favorite).toBe(1)
    await act(async () => rejectFavorite(new Error('offline')))
    expect(current().definitions[0].favorite).toBe(false)
    expect(current().totals.favorite).toBe(0)

    let rejectRemove!: (error: Error) => void
    requests.remove.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectRemove = reject
      })
    )
    await act(async () => {
      mutations.remove.mutate({ id: 'squat', version: 1 })
      await Promise.resolve()
    })
    expect(requests.remove).toHaveBeenCalledTimes(1)
    expect(current().definitions).toHaveLength(0)
    expect(current().totals.all).toBe(0)
    await act(async () => rejectRemove(new Error('offline')))
    expect(current().definitions.map((item) => item.id)).toEqual(['squat'])
    expect(current().totals.all).toBe(1)
  } finally {
    await act(async () => root.unmount())
    client.clear()
  }
})

it('accepts rapid favorite changes and sends the final choice with the accepted version', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const key = queryKeys.exerciseLibrary('coach')
  client.setQueryData<ExerciseLibrary>(key, {
    definitions: [definition],
    filters: { equipment: ['槓鈴'], bodyParts: ['腿'], movementTypes: ['系統動作', '局部動作'] },
    totals: { all: 1, favorite: 0, custom: 0 }
  })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  let mutations!: ReturnType<typeof useTrainingMutations>
  function Harness() {
    mutations = useTrainingMutations(session)
    return null
  }
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Harness />
        </QueryClientProvider>
      )
    )
    const responses: Array<(value: ExerciseDefinition) => void> = []
    requests.favorite.mockImplementation(
      () =>
        new Promise((resolve) => {
          responses.push(resolve)
        })
    )
    await act(async () => {
      mutations.favorite.toggle('squat')
      mutations.favorite.toggle('squat')
      await Promise.resolve()
    })
    expect(client.getQueryData<ExerciseLibrary>(key)?.definitions[0].favorite).toBe(false)
    expect(requests.favorite).toHaveBeenCalledTimes(1)
    await act(async () => responses[0]({ ...definition, favorite: true, version: 2 }))
    expect(requests.favorite).toHaveBeenCalledTimes(2)
    expect(requests.favorite.mock.calls[1][2]).toMatchObject({ favorite: false, version: 2 })
    expect(client.getQueryData<ExerciseLibrary>(key)?.definitions[0].favorite).toBe(false)
    await act(async () => responses[1]({ ...definition, favorite: false, version: 3 }))
    expect(client.getQueryData<ExerciseLibrary>(key)?.definitions[0]).toMatchObject({
      favorite: false,
      version: 3
    })
  } finally {
    await act(async () => root.unmount())
    client.clear()
  }
})

it('refreshes an outdated favorite version and retries the latest choice', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const key = queryKeys.exerciseLibrary('coach')
  client.setQueryData<ExerciseLibrary>(key, {
    definitions: [definition],
    filters: { equipment: ['槓鈴'], bodyParts: ['腿'], movementTypes: ['系統動作', '局部動作'] },
    totals: { all: 1, favorite: 0, custom: 0 }
  })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  let mutations!: ReturnType<typeof useTrainingMutations>
  function Harness() {
    mutations = useTrainingMutations(session)
    return null
  }
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Harness />
        </QueryClientProvider>
      )
    )
    const conflict = Object.assign(new Error('conflict'), { status: 409 })
    requests.favorite
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce({ ...definition, favorite: true, version: 3 })
    requests.getLibrary.mockResolvedValue({
      definitions: [{ ...definition, version: 2 }],
      filters: { equipment: ['槓鈴'], bodyParts: ['腿'], movementTypes: ['系統動作', '局部動作'] },
      totals: { all: 1, favorite: 0, custom: 0 }
    })
    await act(async () => {
      mutations.favorite.toggle('squat')
      await Promise.resolve()
    })
    expect(requests.favorite).toHaveBeenCalledTimes(2)
    expect(requests.favorite.mock.calls[1][2]).toMatchObject({ favorite: true, version: 2 })
    expect(client.getQueryData<ExerciseLibrary>(key)?.definitions[0]).toMatchObject({
      favorite: true,
      version: 3
    })
  } finally {
    await act(async () => root.unmount())
    client.clear()
  }
})
