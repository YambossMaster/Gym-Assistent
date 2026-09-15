export type LocalDateTime = { date: string; time: string }

export function localDateTimeToIso(value: LocalDateTime, timeZone: string): string {
  const [year, month, day] = value.date.split('-').map(Number)
  const [hour, minute] = value.time.split(':').map(Number)
  const desired = Date.UTC(year!, month! - 1, day!, hour!, minute!, 0, 0)
  let guess = desired

  for (let index = 0; index < 3; index += 1) {
    const actual = partsFor(new Date(guess), timeZone)
    const represented = Date.UTC(
      Number(actual.year),
      Number(actual.month) - 1,
      Number(actual.day),
      Number(actual.hour),
      Number(actual.minute)
    )
    guess -= represented - desired
  }

  const resolved = new Date(guess)
  const check = partsFor(resolved, timeZone)
  if (
    check.year !== String(year) ||
    check.month !== String(month).padStart(2, '0') ||
    check.day !== String(day).padStart(2, '0') ||
    check.hour !== String(hour).padStart(2, '0') ||
    check.minute !== String(minute).padStart(2, '0')
  ) {
    throw new Error('這個時間在目前時區不存在，請選擇其他時間。')
  }
  return resolved.toISOString()
}

export function isoToLocalDateTime(value: string, timeZone: string): LocalDateTime {
  const parts = partsFor(new Date(value), timeZone)
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`
  }
}

export function addLocalMinutes(value: LocalDateTime, minutes: number): LocalDateTime {
  const instant = new Date(`${value.date}T${value.time}:00.000Z`)
  instant.setUTCMinutes(instant.getUTCMinutes() + minutes)
  return { date: instant.toISOString().slice(0, 10), time: instant.toISOString().slice(11, 16) }
}

function partsFor(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(value)
  return Object.fromEntries(parts.map((part) => [part.type, part.value])) as Record<
    'year' | 'month' | 'day' | 'hour' | 'minute',
    string
  >
}
