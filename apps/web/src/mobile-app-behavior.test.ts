import { describe, expect, it } from 'vitest'
// @ts-expect-error Node types are intentionally absent from the browser build; this test reads source files only.
import { readFileSync } from 'node:fs'
import indexHtml from '../index.html?raw'

const styles = readFileSync(new URL('./styles.css', import.meta.url), 'utf8')
const workspace = readFileSync(new URL('./app-shell/CoachWorkspace.tsx', import.meta.url), 'utf8')

describe('mobile app shell behavior', () => {
  it('prevents page zoom in the installed mobile surface', () => {
    expect(indexHtml).toMatch(/name="viewport"[^>]+maximum-scale=1(?:\.0)?[^>]+user-scalable=no/)
    expect(styles).toMatch(/#root\s*\{[^}]*touch-action:\s*manipulation/s)
  })

  it('disables static text selection while preserving editable controls', () => {
    expect(styles).toMatch(/body\s*\{[^}]*-webkit-user-select:\s*none/s)
    expect(styles).toMatch(
      /body\s+:is\(input,\s*textarea,\s*\[contenteditable='true'\]\)\s*\{[^}]*-webkit-user-select:\s*text/s
    )
  })

  it('hides only the Today document scrollbar on mobile', () => {
    expect(styles).toMatch(
      /html:has\(\.app-shell\[data-route='\/today'\]\)[^{]*\{[^}]*scrollbar-width:\s*none/s
    )
    expect(styles).toMatch(
      /html:has\(\.app-shell\[data-route='\/today'\]\)::-webkit-scrollbar\s*\{[^}]*display:\s*none/s
    )
  })

  it('does not focus the whole document after a mobile route change', () => {
    expect(workspace).toMatch(
      /if \(!window\.matchMedia\('\(max-width: 720px\)'\)\.matches\)\s*mainRef\.current\?\.focus/s
    )
    expect(workspace).toMatch(
      /tabIndex=\{window\.matchMedia\('\(max-width: 720px\)'\)\.matches \? undefined : -1\}/
    )
    expect(styles).not.toMatch(/\.main-content:focus\s*\{[^}]*outline:\s*none/s)
  })

  it('sizes the mobile calendar from the real header and navigation boxes', () => {
    expect(styles).toMatch(
      /\.app-shell\[data-route='\/calendar'\]\s*>\s*\.main-content\s*\{[^}]*height:\s*calc\(100dvh\s*-\s*var\(--mobile-bottom-nav-height\)\)[^}]*display:\s*flex/s
    )
    expect(styles).toMatch(/\.compact-calendar-page\s*\{[^}]*flex:\s*1 1 auto;[^}]*height:\s*auto/s)
  })
})
