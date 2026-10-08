// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'

const entry = vi.hoisted(() => ({ alpha: false }))
vi.mock('../config', () => ({ isInternalAlpha: () => entry.alpha }))

import { LandingPage } from './LandingPage'

afterEach(() => {
  entry.alpha = false
  document.body.innerHTML = ''
})

it('shows product purpose, public prices, support and legal links without authentication', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      )
    )
    expect(host.textContent).toContain('給私人教練的日常工作台')
    expect(host.textContent).toContain('NT$199')
    expect(host.textContent).toContain('NT$259')
    expect(host.textContent).toContain('Beta 期間先開放 Free 方案')
    expect(host.querySelector('a[href="mailto:support@formcoachdesk.com"]')).not.toBeNull()
    expect(host.querySelector('a[href="/terms"]')).not.toBeNull()
    expect(host.querySelector('a[href="/privacy"]')).not.toBeNull()
    expect(host.querySelector('a[href="/login?mode=signup"]')).not.toBeNull()
  } finally {
    await act(async () => root.unmount())
  }
})

it('keeps internal Alpha honest by offering sign-in without public registration', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  entry.alpha = true
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      )
    )
    expect(host.textContent).toContain('登入工作台')
    expect(host.querySelector('a[href="/login?mode=signup"]')).toBeNull()
  } finally {
    await act(async () => root.unmount())
  }
})
