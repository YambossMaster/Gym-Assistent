// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { PerformanceTrend, trendDomain, trendNumber, type TrendPoint } from './PerformanceTrend'

const point = (value: number, index: number): TrendPoint => ({
  sessionId: String(index),
  startsAt: new Date(Date.UTC(2024, 0, index + 1)).toISOString(),
  value,
  unit: 'kg'
})
afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})
it('gives small changes meaningful vertical space and keeps exact node values', () => {
  const domain = trendDomain([91.25, 91.5, 91.75].map(point))
  expect(domain.min).toBeGreaterThan(90)
  expect((91.75 - 91.25) / (domain.max - domain.min)).toBeGreaterThan(0.6)
  expect(trendNumber(91.25)).toBe('91.25')
  for (const value of [0, 15, 91.25]) {
    const flat = trendDomain([point(value, 0)])
    expect(flat.max).toBeGreaterThan(flat.min)
    expect(flat.min).toBeLessThanOrEqual(value)
    expect(flat.max).toBeGreaterThan(value)
  }
})
it.each([false, true])(
  'draws the whole desktop/mobile range (mobile=%s) and updates accepted points',
  async (mobile) => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      }
    )
    vi.stubGlobal('matchMedia', () => ({
      matches: mobile,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }))
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    const close = vi.fn()
    const points = Array.from({ length: 125 }, (_, i) => point(91.25 + i / 4, i)).reverse()
    try {
      await act(async () =>
        root.render(
          <PerformanceTrend
            studentName="學生甲"
            name="槓鈴肩推"
            metric="weight"
            points={points}
            onClose={close}
          />
        )
      )
      expect(host.querySelector('h2')?.textContent).toContain('學生甲 — 槓鈴肩推')
      expect(host.querySelectorAll('.trajectory-history li')).toHaveLength(mobile ? 5 : 10)
      expect(host.querySelector('time')?.getAttribute('dateTime')).toBe(points[0].startsAt)
      const click = async (selector: string) =>
        act(async () => (document.querySelector(selector) as HTMLElement).click())
      await click('[aria-label="紀錄範圍"]')
      await act(async () =>
        Array.from(document.querySelectorAll('[role="option"]'))
          .find((el) => el.textContent?.includes(mobile ? '最近 10 次' : '最近 20 次'))!
          .dispatchEvent(new MouseEvent('click', { bubbles: true }))
      )
      expect(host.querySelectorAll('.trajectory-history li')).toHaveLength(mobile ? 10 : 20)
      expect(host.querySelectorAll('.trajectory-dot')).toHaveLength(mobile ? 10 : 20)
      expect(host.querySelectorAll('.trajectory-date')).toHaveLength(mobile ? 10 : 20)
      expect(host.textContent).not.toContain('較早')
      await act(async () =>
        root.render(
          <PerformanceTrend
            studentName="學生甲"
            name="槓鈴肩推"
            metric="weight"
            points={[point(125, 126)]}
            onClose={close}
          />
        )
      )
      expect(host.querySelectorAll('.trajectory-dot')).toHaveLength(1)
      expect(host.querySelector('.trajectory-value')?.textContent).toBe('125')
      await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
      expect(close).toHaveBeenCalledOnce()
      await act(async () =>
        root.render(
          <PerformanceTrend
            studentName="學生甲"
            name="槓鈴肩推"
            metric="weight"
            points={[]}
            error
            onClose={close}
          />
        )
      )
      expect(host.textContent).toContain('無法載入成長軌跡')
      expect(host.textContent).not.toContain('不曾有')
      await act(async () =>
        root.render(
          <PerformanceTrend
            studentName="學生甲"
            name="槓鈴肩推"
            metric="weight"
            points={[]}
            onClose={close}
          />
        )
      )
      expect(host.textContent).toContain('這名學生不曾有此項動作的運動表現紀錄。')
    } finally {
      await act(async () => root.unmount())
    }
  }
)
