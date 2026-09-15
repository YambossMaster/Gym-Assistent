import { describe, expect, it, vi } from 'vitest'
import { AutosaveCoordinator, DRAFT_TTL_MS, draftKey } from './drafts'

describe('Training autosave coordinator', () => {
  it('waits 650 ms before saving', async () => {
    vi.useFakeTimers()
    const send = vi.fn(async () => {})
    const autosave = new AutosaveCoordinator(send)
    autosave.change('a', 1)
    await vi.advanceTimersByTimeAsync(649)
    expect(send).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(send).toHaveBeenCalledWith('a', 1)
    vi.useRealTimers()
  })
  it('coalesces a newer edit while one save is in flight', async () => {
    let release!: () => void
    const first = new Promise<void>((resolve) => {
      release = resolve
    })
    const send = vi.fn((_value: string, revision: number) =>
      revision === 1 ? first : Promise.resolve()
    )
    const autosave = new AutosaveCoordinator(send, 0)
    autosave.change('a', 1)
    const flushing = autosave.flush()
    autosave.change('b', 2)
    release()
    await flushing
    await vi.waitFor(() => expect(send).toHaveBeenCalledWith('b', 2))
    expect(send).toHaveBeenCalledTimes(2)
  })
  it('keeps failed revisions pending for exact replay', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('lost')).mockResolvedValueOnce(undefined)
    const autosave = new AutosaveCoordinator<string>(send, 0)
    autosave.change('a', 1)
    await expect(autosave.flush()).rejects.toThrow('lost')
    expect(autosave.pending).toBe(true)
    await autosave.flush()
    expect(send).toHaveBeenCalledTimes(2)
    expect(autosave.pending).toBe(false)
  })
  it('scopes keys by environment, subject, Session and tab', () => {
    expect(draftKey('dev', 'coach-a', 'session-a', 'tab-a')).not.toBe(
      draftKey('dev', 'coach-b', 'session-a', 'tab-a')
    )
    expect(DRAFT_TTL_MS).toBe(604800000)
  })
})
