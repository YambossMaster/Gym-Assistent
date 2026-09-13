import { describe, expect, it } from 'vitest'
import type { TodayProjection } from '../../api'
import { selectTodayRouteState } from './state'

const zeroSignals: TodayProjection = {
  date: '2026-09-13',
  timeZone: 'Asia/Taipei',
  summary: {
    activeStudents: 0,
    incomePeriod: { startsOn: '2026-09-01', endsOn: '2026-10-01' },
    incomeByCurrency: [],
    attentionCount: 0
  },
  attention: []
}

describe('Today route state', () => {
  it.each([
    [{ data: undefined, isLoading: true, isFetching: true, error: null }, 'loading'],
    [
      { data: undefined, isLoading: false, isFetching: false, error: new Error('offline') },
      'error'
    ],
    [{ data: zeroSignals, isLoading: false, isFetching: false, error: null }, 'ready'],
    [{ data: zeroSignals, isLoading: false, isFetching: true, error: null }, 'refreshing']
  ] as const)('selects %s as %s', (input, expected) => {
    expect(selectTodayRouteState(input)).toBe(expected)
  })
})
