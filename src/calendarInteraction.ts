export interface PointerPosition {
  x: number
  y: number
}

export const DRAG_INTENT_PX = 6

export const classifyPointerGesture = (
  origin: PointerPosition,
  current: PointerPosition
): 'click' | 'drag' =>
  Math.hypot(current.x - origin.x, current.y - origin.y) >= DRAG_INTENT_PX ? 'drag' : 'click'

export const draggedStartMinute = (
  pointerMinute: number,
  grabOffsetMinutes: number,
  maximumMinute: number
) => Math.max(0, Math.min(maximumMinute, pointerMinute - grabOffsetMinutes))
