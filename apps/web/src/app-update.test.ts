// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { canAutoUpdate, hasActiveWork, preparedVersion } from './app-update'

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('app update', () => {
  it('prepares changed assets before allowing an automatic reload', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          buildId: 'next',
          assets: ['/assets/index-abc.js', '/assets/index-abc.css']
        })
      })
      .mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetch)

    expect(await preparedVersion('current')).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(fetch.mock.calls[0][0]).toMatch(/^\/app-version\.json\?check=/)
    expect(fetch.mock.calls[0][1]).toEqual({ cache: 'no-store' })
    expect(fetch.mock.calls[1]).toEqual(['/assets/index-abc.js', { cache: 'force-cache' }])
  })

  it('keeps the current app when the build matches or an asset is unavailable', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ buildId: 'current', assets: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ buildId: 'next', assets: ['/assets/index-abc.js'] })
      })
      .mockResolvedValueOnce({ ok: false })
    vi.stubGlobal('fetch', fetch)

    expect(await preparedVersion('current')).toBe(false)
    expect(await preparedVersion('current')).toBe(false)
  })

  it('waits for a safe primary route without local input changes', () => {
    expect(canAutoUpdate('/today', false)).toBe(true)
    expect(canAutoUpdate('/settings', true)).toBe(false)
    expect(canAutoUpdate('/sessions/123', false)).toBe(false)
  })

  it('does not switch while an editor or dialog is active', () => {
    document.body.innerHTML = '<input><div role="dialog"></div>'
    expect(hasActiveWork()).toBe(true)
    document.querySelector('[role="dialog"]')?.remove()
    ;(document.querySelector('input') as HTMLInputElement).focus()
    expect(hasActiveWork()).toBe(true)
    document.activeElement?.remove()
    expect(hasActiveWork()).toBe(false)
    document.body.innerHTML = '<div class="resilience-status"></div>'
    expect(hasActiveWork()).toBe(true)
  })
})
