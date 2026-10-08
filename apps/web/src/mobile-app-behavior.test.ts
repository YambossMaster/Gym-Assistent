import { describe, expect, it } from 'vitest'
// @ts-expect-error Node types are intentionally absent from the browser build; this test reads source files only.
import { readFileSync } from 'node:fs'
import indexHtml from '../index.html?raw'

const styles = readFileSync(new URL('./styles.css', import.meta.url), 'utf8')
const workspace = readFileSync(new URL('./app-shell/CoachWorkspace.tsx', import.meta.url), 'utf8')
const trainingWorkspace = readFileSync(
  new URL('./pages/training/TrainingWorkspace.tsx', import.meta.url),
  'utf8'
)

describe('mobile app shell behavior', () => {
  it('prevents page zoom in the installed mobile surface', () => {
    expect(indexHtml).toMatch(/name="viewport"[^>]+maximum-scale=1(?:\.0)?[^>]+user-scalable=no/)
    expect(styles).toMatch(/#root\s*\{[^}]*touch-action:\s*manipulation/s)
  })

  it('asks supporting mobile browsers to resize content above the software keyboard', () => {
    expect(indexHtml).toMatch(/name="viewport"[^>]+interactive-widget=resizes-content/)
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

  it('turns the focused Coach note into one internally scrolling writing surface', () => {
    expect(styles).toMatch(
      /html\.is-session-note-focused\s+\.app-shell\s*>\s*\.main-content\s*\{[^}]*position:\s*fixed;[^}]*top:\s*0;[^}]*height:\s*var\(--session-note-viewport-height,\s*100dvh\);[^}]*overflow:\s*hidden/s
    )
    expect(styles).not.toMatch(
      /html\.is-session-note-focused\s+\.app-shell\s+\.mobile-header[^}]*\{[^}]*display:\s*none/s
    )
    expect(styles).not.toMatch(
      /\.app-shell:has\(\.session-workspace\.is-note-focused\)\s*>\s*\.mobile-header/
    )
    expect(trainingWorkspace).toMatch(
      /root\.classList\.toggle\('is-session-note-focused', noteFocused\)/
    )
    expect(trainingWorkspace).toContain("window.addEventListener('session-note-focus-exit'")
    expect(trainingWorkspace).toContain('const keyboardFocused = activeSetInput !== null')
    expect(trainingWorkspace).not.toContain('session-note-focus-actions')
    expect(workspace).toContain("window.dispatchEvent(new Event('session-note-focus-exit'))")
    expect(styles).toMatch(
      /html\.is-session-note-focused\s+\.mobile-subpage-actions\s*\{[^}]*display:\s*none/s
    )
    expect(styles).toMatch(
      /html\.is-session-note-focused\s+\.app-shell\[data-mobile-chrome\]\s+\.mobile-header\s*\{[^}]*transform:\s*none;[^}]*transition:\s*none;[^}]*pointer-events:\s*auto/s
    )
    expect(styles).toMatch(
      /\.session-workspace\.is-note-focused\s+\.session-note-tools\s*\{[^}]*position:\s*absolute;[^}]*bottom:\s*0;[^}]*display:\s*flex/s
    )
    expect(styles).toMatch(
      /\.session-workspace\.is-note-focused\s+\.mobile-note-canvas\s*\{[^}]*overflow-y:\s*auto;[^}]*overscroll-behavior-y:\s*contain/s
    )
  })

  it('keeps an app-owned next-input action above mobile numeric keyboards', () => {
    expect(trainingWorkspace).toContain('<SetInputAdvanceDock target={activeSetInput} />')
    expect(styles).toMatch(
      /\.set-input-advance-dock\s*\{[^}]*position:\s*fixed;[^}]*bottom:\s*calc\(max\(var\(--session-keyboard-inset\),\s*env\(safe-area-inset-bottom\)\)\s*\+\s*8px\);[^}]*display:\s*flex/s
    )
  })
})
