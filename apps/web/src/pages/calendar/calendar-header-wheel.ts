export type CalendarHeaderWheelStep = { kind: 'header'; hiddenPx: number } | { kind: 'planner' }

export function calendarHeaderWheelStep(
  hiddenPx: number,
  headerHeight: number,
  plannerScrollTop: number,
  deltaY: number
): CalendarHeaderWheelStep {
  if (headerHeight <= 0) return { kind: 'planner' }
  if (deltaY > 0 && hiddenPx < headerHeight) {
    return { kind: 'header', hiddenPx: Math.min(headerHeight, hiddenPx + deltaY) }
  }
  if (deltaY < 0 && plannerScrollTop <= 0 && hiddenPx > 0) {
    return { kind: 'header', hiddenPx: Math.max(0, hiddenPx + deltaY) }
  }
  return { kind: 'planner' }
}
