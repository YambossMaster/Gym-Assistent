// Fixed boxes can acquire a different origin during native keyboard panning.
// Verify the rendered frame and dock separately instead of assuming that writing
// the VisualViewport offset also places both boxes at that offset.
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
