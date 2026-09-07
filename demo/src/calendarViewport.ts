export type CalendarHeaderWheelAction = 'collapse' | 'expand' | 'pass'

export const calendarHeaderWheelAction = (
  collapsed: boolean,
  scrollTop: number,
  deltaY: number
): CalendarHeaderWheelAction => {
  if (!collapsed && deltaY > 0) return 'collapse'
  if (collapsed && scrollTop <= 0 && deltaY < 0) return 'expand'
  return 'pass'
}
