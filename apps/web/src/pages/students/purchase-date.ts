import { isoToLocalDateTime, localDateTimeToIso } from '../calendar/calendar-time'

export function purchaseDateInstant(date: string, timeZone: string, original?: string) {
  // An amount-only correction must not reorder purchases by changing their recorded instant.
  if (original && isoToLocalDateTime(original, timeZone).date === date) return original
  return localDateTimeToIso({ date, time: '00:00' }, timeZone)
}
