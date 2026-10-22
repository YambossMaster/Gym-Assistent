// Keyboard dismissal can deliver its document scroll after the viewport resize.
// Keep only this short handoff recoverable. A new gesture always takes ownership.
export function settleSetInputDismissal(
  viewport: VisualViewport | null,
  restingHeight: number,
  restore: () => boolean
) {
  const started = Date.now()
  let idle: ReturnType<typeof setTimeout> | undefined
  let limit: ReturnType<typeof setTimeout> | undefined
  let stopped = false
  const stop = () => {
    if (stopped) return
    stopped = true
    clearTimeout(idle)
    clearTimeout(limit)
    window.removeEventListener('scroll', update)
    window.removeEventListener('resize', update)
    viewport?.removeEventListener('resize', update)
    viewport?.removeEventListener('scroll', update)
    for (const event of ['pointerdown', 'touchstart', 'wheel'])
      window.removeEventListener(event, stop, true)
  }
  const scheduleStop = () => {
    clearTimeout(idle)
    if (restingHeight - (viewport?.height ?? window.innerHeight) <= 120)
      idle = setTimeout(stop, Math.max(250, 1000 - (Date.now() - started)))
  }
  const update = () => {
    if (stopped) return
    if (!restore()) stop()
    else scheduleStop()
  }
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update)
  viewport?.addEventListener('resize', update)
  viewport?.addEventListener('scroll', update)
  for (const event of ['pointerdown', 'touchstart', 'wheel'])
    window.addEventListener(event, stop, { capture: true, passive: true })
  limit = setTimeout(stop, 2500)
  scheduleStop()
  return stop
}
