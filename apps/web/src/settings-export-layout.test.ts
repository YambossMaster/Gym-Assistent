import { describe, expect, it } from 'vitest'
// @ts-expect-error Node types are intentionally absent from the browser build; this test reads source files only.
import { readFileSync } from 'node:fs'

const styles = readFileSync(new URL('./styles.css', import.meta.url), 'utf8')

function zIndex(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const value = styles.match(new RegExp(`${escaped}\\s*\\{[\\s\\S]*?z-index:\\s*(\\d+)`))?.[1]
  expect(value, `${selector} z-index`).toBeDefined()
  return Number(value)
}

describe('Settings export dialog layering', () => {
  it('keeps portalled select menus above the modal backdrop', () => {
    expect(zIndex('.form-select-menu')).toBeGreaterThan(zIndex('.settings-export-dialog-backdrop'))
  })

  it('starts the scroll owner directly below the dialog header and keeps its original track', () => {
    expect(styles).toMatch(
      /\.settings-export-dialog\s*>\s*\.settings-export-form\s*\{[\s\S]*?margin:\s*0;/
    )
    expect(styles).not.toMatch(
      /\[data-dialog-scroll-region\]::\-webkit-scrollbar-track\s*\{[\s\S]*?linear-gradient/
    )
  })
})
