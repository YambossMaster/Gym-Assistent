// Optional Stage 1 experiment. Set only this flag to false to withdraw initial
// neighbour anchoring; drop restoration and viewport/scroll bounds stay enabled.
export const ENABLE_DRAG_START_ANCHOR = true

export function startAnchorSpace(remainingCorrection: number, enabled = ENABLE_DRAG_START_ANCHOR) {
  return {
    leading: enabled ? Math.max(0, -remainingCorrection) : 0,
    trailing: enabled ? Math.max(0, remainingCorrection) : 0
  }
}

export function consumeStartAnchor(
  space: { leading: number; trailing: number },
  listTop: number,
  listBottom: number,
  viewportTop: number,
  viewportBottom: number
) {
  // Each temporary edge is retired once the real list reaches it. Removing the
  // leading spacer must subtract the same amount from scrollTop to avoid a jump.
  return {
    leading: listTop <= viewportTop + 0.5 ? 0 : space.leading,
    trailing: listBottom >= viewportBottom - 0.5 ? 0 : space.trailing
  }
}
