import { FormSelect, type FormSelectOption } from './FormSelect'

function formatTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function parseTime(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN
  const [hours, minutes] = value.split(':').map(Number)
  return hours! * 60 + minutes!
}

function duration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return `${hours ? `${hours} 小時` : ''}${remainder ? `${hours ? ' ' : ''}${remainder} 分鐘` : ''}`
}

export function TimeSelect({
  label,
  value,
  defaultValue,
  onChange,
  name,
  disabled,
  minMinutes = 0,
  maxMinutes = 1439,
  describeFrom
}: {
  label: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  name?: string
  disabled?: boolean
  minMinutes?: number
  maxMinutes?: number
  describeFrom?: number
}) {
  const options: FormSelectOption[] = []
  for (let minute = Math.ceil(minMinutes / 15) * 15; minute <= maxMinutes; minute += 15) {
    const time = formatTime(minute)
    options.push({
      value: time,
      label: describeFrom === undefined ? time : `${time}（${duration(minute - describeFrom)}）`
    })
  }
  const current = value ?? defaultValue
  if (current && !options.some((option) => option.value === current))
    options.unshift({ value: current, label: current, disabled: true })

  return (
    <FormSelect
      label={label}
      triggerLabel={describeFrom === undefined ? undefined : (current ?? options[0]?.value)}
      options={options}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      name={name}
      disabled={disabled}
      required
      className="time-select"
    />
  )
}

export { parseTime }
