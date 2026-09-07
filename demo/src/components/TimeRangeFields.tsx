import { format, isSameDay } from 'date-fns'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import {
  formatTimeValue,
  parseTimeInput,
  scrollableEndTimeOptions,
  scrollableTimeOptions
} from '../calendarTime'

export type TimeRange = { start: Date; end: Date }

type TimeSuggestion = { value: string; label: string }

function SmartTimeInput({
  label,
  name,
  value,
  suggestions,
  onChange
}: {
  label: string
  name: string
  value: string
  suggestions: TimeSuggestion[]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const lastValidValue = useRef(value)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (parseTimeInput(value) !== null) lastValidValue.current = value
  }, [value])

  useEffect(() => {
    if (open) menuRef.current?.children[activeIndex]?.scrollIntoView({ block: 'center' })
  }, [activeIndex, open])

  const commit = (next: string) => {
    const parsed = parseTimeInput(next)
    const fallback = parseTimeInput(lastValidValue.current)
    const committed =
      parsed !== null
        ? formatTimeValue(parsed)
        : fallback !== null
          ? formatTimeValue(fallback)
          : value
    if (committed !== value) onChange(committed)
    setOpen(false)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setOpen(true)
      setActiveIndex((current) =>
        Math.max(0, Math.min(suggestions.length - 1, current + direction))
      )
    }
    if (event.key === 'Enter' && open && suggestions[activeIndex]) {
      event.preventDefault()
      event.stopPropagation()
      commit(suggestions[activeIndex].value)
    }
  }

  return (
    <label className="smart-time-field">
      {label}
      <div className="smart-time-control">
        <input
          name={name}
          value={value}
          required
          autoComplete="off"
          inputMode="numeric"
          aria-expanded={open}
          aria-haspopup="listbox"
          onFocus={() => {
            setActiveIndex(
              Math.max(
                0,
                suggestions.findIndex((item) => item.value === value)
              )
            )
            setOpen(true)
          }}
          onChange={(event) => {
            onChange(event.target.value)
            setOpen(true)
          }}
          onBlur={(event) => {
            const next = event.currentTarget.value
            window.setTimeout(() => commit(next), 100)
          }}
          onKeyDown={onKeyDown}
        />
        {open && (
          <div ref={menuRef} className="smart-time-menu" role="listbox">
            {suggestions.map((suggestion, index) => (
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={index === activeIndex ? 'active' : ''}
                key={suggestion.value}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => commit(suggestion.value)}
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </label>
  )
}

export function TimeRangeFields({
  range,
  startHour,
  endHour
}: {
  range: TimeRange
  startHour: number
  endHour: number
}) {
  const timeValue = (date: Date) => format(date, 'HH:mm')
  const endValue =
    range.end.getHours() === 0 && !isSameDay(range.start, range.end)
      ? '24:00'
      : timeValue(range.end)
  const [start, setStart] = useState(timeValue(range.start))
  const [end, setEnd] = useState(endValue)

  useEffect(() => {
    setStart(timeValue(range.start))
    setEnd(
      range.end.getHours() === 0 && !isSameDay(range.start, range.end)
        ? '24:00'
        : timeValue(range.end)
    )
  }, [range])

  const startSuggestions = scrollableTimeOptions(startHour, endHour).map((value) => ({
    value,
    label: value
  }))
  const durationLabel = (minutes: number) => {
    if (minutes < 60) return `${minutes} 分鐘`
    const hours = Math.floor(minutes / 60)
    const remainder = minutes % 60
    return remainder ? `${hours} 小時 ${remainder} 分鐘` : `${hours} 小時`
  }
  const commonEndSuggestions = scrollableEndTimeOptions(start, endHour).map((suggestion) => ({
    value: suggestion.value,
    label: `${suggestion.value}（${durationLabel(suggestion.durationMinutes)}）`
  }))
  const changeStart = (next: string) => {
    const previousStart = parseTimeInput(start)
    const previousEnd = parseTimeInput(end)
    const nextStart = parseTimeInput(next)
    setStart(next)
    if (previousStart !== null && previousEnd !== null && nextStart !== null) {
      const duration = previousEnd - previousStart
      if (duration > 0 && nextStart + duration <= endHour * 60)
        setEnd(formatTimeValue(nextStart + duration))
    }
  }

  return (
    <div className="calendar-time-fields">
      <label>
        日期
        <input type="date" name="date" required defaultValue={format(range.start, 'yyyy-MM-dd')} />
      </label>
      <SmartTimeInput
        label="開始"
        name="startTime"
        value={start}
        suggestions={startSuggestions}
        onChange={changeStart}
      />
      <span className="time-arrow">→</span>
      <SmartTimeInput
        label="結束"
        name="endTime"
        value={end}
        suggestions={commonEndSuggestions}
        onChange={setEnd}
      />
    </div>
  )
}
