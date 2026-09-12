import { describe, expect, it } from 'vitest'
import { selectSettingsPanelState } from './state'

describe('Settings panel state selection', () => {
  it.each([
    [{ data: undefined, isLoading: true, isFetching: true, isError: false }, 'loading'],
    [{ data: undefined, isLoading: false, isFetching: false, isError: true }, 'error'],
    [
      { data: { id: 'settings' }, isLoading: false, isFetching: true, isError: false },
      'refreshing'
    ],
    [{ data: { id: 'settings' }, isLoading: false, isFetching: false, isError: false }, 'ready'],
    [{ data: { id: 'settings' }, isLoading: false, isFetching: false, isError: true }, 'ready']
  ] as const)('selects %s', (query, expected) => {
    expect(selectSettingsPanelState(query)).toBe(expected)
  })
})
