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
  return {
    clientTop: (layoutTop: number) => layoutTop + origin.getBoundingClientRect().top,
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
