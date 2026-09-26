export function workspaceWallTime(instant: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date(instant))
  const part = (name: string) => parts.find((item) => item.type === name)?.value ?? '00'
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
}
export function workspaceInstant(wallTime: string, timeZone: string) {
  const guess = Date.parse(`${wallTime}:00Z`)
  const displayed = workspaceWallTime(new Date(guess).toISOString(), timeZone)
  const offset = Date.parse(`${displayed}:00Z`) - guess
  return new Date(guess - offset).toISOString()
}
