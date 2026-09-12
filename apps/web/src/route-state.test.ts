import { describe, expect, it } from 'vitest'
import { ApiError } from './api'
import { selectCollectionRouteState, selectDetailRouteState } from './route-state'

describe('route state selection', () => {
  it('keeps a readable collection during cached refresh', () => {
    expect(
      selectCollectionRouteState({
        data: [{ id: 'student-1' }],
        isLoading: false,
        isFetching: true,
        isError: false
      })
    ).toBe('refreshing')
  })

  it.each([
    [{ data: undefined, isLoading: true, isFetching: true, isError: false }, 'loading'],
    [{ data: undefined, isLoading: false, isFetching: false, isError: true }, 'error'],
    [{ data: [], isLoading: false, isFetching: false, isError: false }, 'empty'],
    [{ data: [{ id: 'student-1' }], isLoading: false, isFetching: false, isError: false }, 'ready']
  ] as const)('selects collection %s', (query, expected) => {
    expect(selectCollectionRouteState(query)).toBe(expected)
  })

  it.each([
    [{ data: undefined, isLoading: true, isFetching: true, error: null }, 'loading'],
    [
      { data: undefined, isLoading: false, isFetching: false, error: new ApiError(404, 'missing') },
      'not-found'
    ],
    [
      { data: undefined, isLoading: false, isFetching: false, error: new Error('offline') },
      'error'
    ],
    [{ data: { id: 'student-1' }, isLoading: false, isFetching: true, error: null }, 'refreshing'],
    [{ data: { id: 'student-1' }, isLoading: false, isFetching: false, error: null }, 'ready']
  ] as const)('selects detail %s', (query, expected) => {
    expect(selectDetailRouteState(query)).toBe(expected)
  })
})
