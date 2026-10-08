import { describe, expect, it } from 'vitest'
// @ts-expect-error Node types are intentionally absent from the browser build; this test reads CSS only.
import { readFileSync } from 'node:fs'
import { initialScheduleHorizon } from './schedule-series-form'

const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8')
const workspace = readFileSync(new URL('../../coach-workspace.tsx', import.meta.url), 'utf8')

describe('student fixed-schedule form', () => {
  it('defaults a new schedule to the coming week without overwriting saved choices', () => {
    expect(initialScheduleHorizon(null)).toBe('1_WEEK')
    expect(initialScheduleHorizon('NONE')).toBe('NONE')
    expect(initialScheduleHorizon('2_WEEKS')).toBe('2_WEEKS')
    expect(initialScheduleHorizon('MAX_WINDOW')).toBe('2_WEEKS')
    expect(workspace).toContain('initialScheduleHorizon(series?.autoScheduleHorizon)')
  })

  it('uses the student-card supporting-text type scale for the empty schedule', () => {
    expect(styles).toMatch(
      /\.student-series-empty\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;[^}]*color:\s*#646a60;[^}]*font-size:\s*13px;[^}]*line-height:\s*1\.55/s
    )
    expect(workspace).toContain('<p className="student-series-empty">尚未建立固定課表。</p>')
  })
})
