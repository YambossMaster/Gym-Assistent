// Keyboard dismissal can deliver its document scroll after the viewport resize.
// Keep this handoff recoverable while keyboard geometry is still progressing.
// A new gesture always takes ownership; stalled geometry has a bounded fallback.
export function settleSetInputDismissal(
  viewport: VisualViewport | null,
  restingHeight: number,
  restore: () => boolean,
  onStop?: () => void,
  readOrigin: () => number = () => 0
) {
  const started = Date.now()
  let idle: ReturnType<typeof setTimeout> | undefined
  let limit: ReturnType<typeof setTimeout> | undefined
  let stopped = false
  let frame = 0
  let previousHeight = viewport?.height ?? window.innerHeight
  let previousTop = viewport?.offsetTop ?? 0
  let previousOrigin = readOrigin()
  const stop = () => {
    if (stopped) return
    stopped = true
    clearTimeout(idle)
    clearTimeout(limit)
    cancelAnimationFrame(frame)
    window.removeEventListener('scroll', update)
    window.removeEventListener('resize', update)
    viewport?.removeEventListener('resize', update)
    viewport?.removeEventListener('scroll', update)
    for (const event of ['pointerdown', 'touchstart', 'wheel'])
      window.removeEventListener(event, stop, true)
    onStop?.()
  }
  const scheduleStop = () => {
    clearTimeout(idle)
    if (
      restingHeight - (viewport?.height ?? window.innerHeight) <= 2 &&
      Math.abs(viewport?.offsetTop ?? 0) <= 2 &&
      Math.abs(readOrigin()) <= 2
    )
      idle = setTimeout(stop, Math.max(250, 1000 - (Date.now() - started)))
  }
  const trackProgress = () => {
    const height = viewport?.height ?? window.innerHeight
    const top = viewport?.offsetTop ?? 0
    const origin = readOrigin()
    if (height === previousHeight && top === previousTop && origin === previousOrigin) return
    previousHeight = height
    previousTop = top
    previousOrigin = origin
    clearTimeout(limit)
    limit = setTimeout(stop, 2500)
    scheduleStop()
  }
  const update = () => {
    if (stopped) return
    if (!restore()) stop()
    else {
      trackProgress()
      scheduleStop()
    }
  }
  const observe = () => {
    if (stopped) return
    if (!restore()) {
      stop()
      return
    }
    trackProgress()
    frame = requestAnimationFrame(observe)
  }
  frame = requestAnimationFrame(observe)
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
