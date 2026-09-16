import { describe, expect, it } from 'vitest'
import type { TodayProjection } from '../../api'
import { ApiError } from '../../api'
import { selectTodayRouteState, todayErrorMessage } from './state'

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

  it('explains a missing local API without mislabeling auth or production errors', () => {
    const proxyError = new ApiError(502, 'Bad Gateway')
    expect(todayErrorMessage(proxyError, true)).toContain('本機資料服務未連線')
    expect(todayErrorMessage(new ApiError(401, 'Unauthorized'), true)).toBe(
      '暫時無法整理目前的工作台訊號。'
    )
    expect(todayErrorMessage(proxyError, false)).toBe('暫時無法整理目前的工作台訊號。')
  })
})
