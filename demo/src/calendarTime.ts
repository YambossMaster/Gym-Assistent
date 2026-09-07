const TIME_PATTERN = /^(\d{1,2})(?::?(\d{2}))?$/

export const timeRangeFromForm = (values: FormData) => {
  const date = String(values.get('date'))
  return {
    start: new Date(`${date}T${String(values.get('startTime'))}:00`),
    end: new Date(`${date}T${String(values.get('endTime'))}:00`)
  }
}

export const parseTimeInput = (input: string) => {
  const match = input.trim().match(TIME_PATTERN)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2] ?? 0)
  if (hour === 24) return minute === 0 ? 24 * 60 : null
  if (hour > 23 || minute > 59) return null
  return hour * 60 + minute
}

export const formatTimeValue = (totalMinutes: number) => {
  const bounded = Math.max(0, Math.min(24 * 60, totalMinutes))
  const hour = Math.floor(bounded / 60)
  const minute = bounded % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export const nearbyTimeSuggestions = (value: string, startHour: number, endHour: number) => {
  const parsed = parseTimeInput(value) ?? startHour * 60
  const center = Math.round(parsed / 15) * 15
  const minimum = startHour * 60
  const maximum = endHour * 60 - 15
  let first = Math.max(minimum, center - 30)
  first = Math.min(first, Math.max(minimum, maximum - 60))
  return Array.from({ length: 5 }, (_, index) => first + index * 15)
    .filter((minute) => minute <= maximum)
    .map(formatTimeValue)
}

export const endTimeSuggestions = (startValue: string, endHour: number) => {
  const start = parseTimeInput(startValue)
  if (start === null) return []
  return [30, 45, 60, 90, 120]
    .filter((durationMinutes) => start + durationMinutes <= endHour * 60)
    .map((durationMinutes) => ({
      value: formatTimeValue(start + durationMinutes),
      durationMinutes
    }))
}

export const scrollableTimeOptions = (startHour: number, endHour: number) =>
  Array.from({ length: Math.max(0, (endHour - startHour) * 4) }, (_, index) =>
    formatTimeValue(startHour * 60 + index * 15)
  )

export const scrollableEndTimeOptions = (startValue: string, endHour: number) => {
  const start = parseTimeInput(startValue)
  if (start === null) return []
  const count = Math.max(0, Math.floor((endHour * 60 - start) / 15))
  return Array.from({ length: count }, (_, index) => {
    const durationMinutes = (index + 1) * 15
    return {
      value: formatTimeValue(start + durationMinutes),
      durationMinutes
    }
  })
}
