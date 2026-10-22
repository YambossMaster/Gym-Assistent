// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { reconcileSetInputGeometry } from './set-input-geometry'

afterEach(() => vi.restoreAllMocks())

it('recovers independent frame and dock origins without accumulating a steady correction', () => {
  const workspace = document.createElement('section')
  workspace.style.position = 'fixed'
  const dock = document.createElement('div')
  dock.className = 'set-input-advance-dock'
  dock.style.position = 'fixed'
  workspace.append(dock)
  let pan = -380
  let viewportTop = 0
  vi.spyOn(workspace, 'getBoundingClientRect').mockImplementation(
    () =>
      ({
        top:
          viewportTop +
          pan +
          (parseFloat(workspace.style.getPropertyValue('--session-input-shift')) || 0)
      }) as DOMRect
  )
  vi.spyOn(dock, 'getBoundingClientRect').mockImplementation(
    () =>
      ({
        bottom:
          viewportTop +
          472 +
          pan / 2 +
          (parseFloat(workspace.style.getPropertyValue('--session-dock-shift')) || 0)
      }) as DOMRect
  )
  const write = vi.spyOn(workspace.style, 'setProperty')
  reconcileSetInputGeometry(workspace, viewportTop, 480)
  expect(workspace.getBoundingClientRect().top).toBe(0)
  expect(dock.getBoundingClientRect().bottom).toBe(472)
  write.mockClear()
  reconcileSetInputGeometry(workspace, viewportTop, 480)
  expect(write).not.toHaveBeenCalled()
  pan = 0
  viewportTop = 80
  reconcileSetInputGeometry(workspace, viewportTop, 480)
  expect(workspace.getBoundingClientRect().top).toBe(80)
  expect(dock.getBoundingClientRect().bottom).toBe(552)
})

it('does not reposition a normal flow workspace or accept invalid geometry', () => {
  const workspace = document.createElement('section')
  const write = vi.spyOn(workspace.style, 'setProperty')
  reconcileSetInputGeometry(workspace, 10, 480)
  workspace.style.position = 'fixed'
  reconcileSetInputGeometry(workspace, NaN, 480)
  reconcileSetInputGeometry(workspace, 0, 0)
  expect(write).not.toHaveBeenCalled()
})
