import { describe, expect, it } from 'vitest'
// @ts-expect-error Node types are intentionally absent from the browser build; this test reads source files only.
import { readFileSync } from 'node:fs'

const workspace = readFileSync(new URL('./coach-workspace.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('./styles.css', import.meta.url), 'utf8')
const capabilityLinks = readFileSync(
  new URL('./pages/public/CapabilityLinkManager.tsx', import.meta.url),
  'utf8'
)

describe('student profile dialog layout', () => {
  it('keeps both create and edit actions outside the dedicated field scroller', () => {
    const profileScrollRegions = workspace.match(
      /className="student-detail-profile-fields" data-dialog-scroll-region/g
    )

    expect(profileScrollRegions).toHaveLength(2)
    expect(workspace).toMatch(
      /<form className="student-detail-profile-form"[\s\S]*?<div className="student-detail-profile-fields" data-dialog-scroll-region>[\s\S]*?<\/div>[\s\S]*?<footer>/
    )
  })

  it('bounds the mobile scrollbar between the dialog header and action footer', () => {
    expect(styles).toMatch(
      /\.scheduling-dialog\s+>\s+\.ui-settings-dialog-content:has\(>\s+\.student-detail-profile-form\)[\s\S]*?overflow:\s*hidden/
    )
    expect(styles).toMatch(
      /\.student-detail-profile-form\s+\.student-detail-profile-fields[\s\S]*?flex:\s*1 1 auto;[\s\S]*?overflow-y:\s*auto/
    )
    expect(styles).toMatch(
      /\.student-detail-profile-form\s+>\s+footer[\s\S]*?position:\s*static;[\s\S]*?flex:\s*0 0 auto/
    )
  })

  it('marks the capability-link field pane as the scroll owner above its fixed footer', () => {
    expect(capabilityLinks).toContain(
      '<div className="ui-settings-dialog-fields" data-dialog-scroll-region>'
    )
  })
})
