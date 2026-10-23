// CSS fixed offsets and DOMRect coordinates need not have the same origin while
// the keyboard pans the viewport. Measure a separate fixed zero, unaffected by
// either box's correction. Never infer the common origin from a box we move.
export function createSetInputCoordinates() {
  const origin = document.createElement('div')
  origin.dataset.setInputOrigin = ''
  origin.setAttribute('aria-hidden', 'true')
  origin.style.cssText =
    'all:initial;position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;'
  document.body.append(origin)
  let visualCoordinates = false
  return {
    originTop: () => origin.getBoundingClientRect().top,
    clientTop: (layoutTop: number) => {
      const fixedTop = origin.getBoundingClientRect().top
      // A nonzero pan whose fixed zero is its negative identifies DOMRects
      // relative to the visual viewport. Its visible origin is then zero for
      // this session, including dismissal. Do not keep adding two asynchronous
      // animation samples: offsetTop and fixedTop can settle on different
      // frames, manufacturing a moving origin even though the screen is still.
      if (layoutTop > 2 && fixedTop < -2 && Math.abs(layoutTop + fixedTop) <= 2)
        visualCoordinates = true
      return visualCoordinates ? 0 : layoutTop + fixedTop
    },
    dispose: () => origin.remove()
  }
}

// top is in the same client-coordinate space as DOMRect, not a raw CSS offset.
// Independent frame/dock displacement can then be corrected without counting
// the common viewport pan a second time.
export function reconcileSetInputGeometry(workspace: HTMLElement, top: number, height: number) {
  if (!Number.isFinite(top) || !Number.isFinite(height) || height <= 0) return
  if (getComputedStyle(workspace).position !== 'fixed') return
  const correct = (property: string, error: number) => {
    if (!Number.isFinite(error) || Math.abs(error) <= 0.5) return
    const previous = parseFloat(workspace.style.getPropertyValue(property)) || 0
    workspace.style.setProperty(property, `${previous + error}px`)
  }
  correct('--session-input-shift', top - workspace.getBoundingClientRect().top)
  const dock = workspace.querySelector<HTMLElement>('.set-input-advance-dock')
  if (dock && getComputedStyle(dock).position === 'fixed')
    correct('--session-dock-shift', top + height - 8 - dock.getBoundingClientRect().bottom)
}
