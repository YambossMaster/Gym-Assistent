import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year!, month! - 1, day!))
}

function dateValue(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function SeriesDatePicker({
  value,
  onChange,
  label = '起始日期'
}: {
  value: string
  onChange: (value: string) => void
  label?: string
}) {
  const trigger = useRef<HTMLButtonElement>(null)
  const calendar = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const selected = parseDate(value)
  const [view, setView] = useState(() => ({
    year: selected.getUTCFullYear(),
    month: selected.getUTCMonth()
  }))
  const [position, setPosition] = useState({ top: 0, left: 0, width: 288, maxHeight: 340 })

  const place = () => {
    const rect = trigger.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.min(288, window.innerWidth - 24)
    const below = window.innerHeight - rect.bottom - 12
    const above = rect.top - 12
    const upward = below < 320 && above > below
    setPosition({
      top: upward ? Math.max(12, rect.top - 326) : rect.bottom + 6,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      width,
      maxHeight: Math.max(160, Math.min(340, upward ? above - 6 : below - 6))
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    place()
    calendar.current?.querySelector<HTMLElement>('button[aria-current="date"]')?.focus()
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node
      if (!trigger.current?.contains(target) && !calendar.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  const changeMonth = (step: number) => {
    const next = new Date(Date.UTC(view.year, view.month + step, 1))
    setView({ year: next.getUTCFullYear(), month: next.getUTCMonth() })
  }
  const firstWeekday = new Date(Date.UTC(view.year, view.month, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate()

  return (
    <div className="series-date-field">
      <span>{label}</span>
      <button
        ref={trigger}
        type="button"
        className="series-date-trigger"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!open) {
            setView({ year: selected.getUTCFullYear(), month: selected.getUTCMonth() })
          }
          setOpen((current) => !current)
        }}
      >
        {value.replaceAll('-', '/')}
        <ChevronDown aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            ref={calendar}
            className="series-date-calendar"
            role="dialog"
            aria-label={`選擇${label}`}
            style={position}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                setOpen(false)
                trigger.current?.focus()
              }
            }}
          >
            <div className="series-date-calendar-heading">
              <button type="button" onClick={() => changeMonth(-1)} aria-label="上個月">
                <ChevronLeft />
              </button>
              <strong>
                {view.year} 年 {view.month + 1} 月
              </strong>
              <button type="button" onClick={() => changeMonth(1)} aria-label="下個月">
                <ChevronRight />
              </button>
            </div>
            <div className="series-date-calendar-grid">
              {weekdays.map((day) => (
                <span key={day}>{day}</span>
              ))}
              {Array.from({ length: firstWeekday }, (_, index) => (
                <span key={`empty-${index}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, index) => {
                const day = index + 1
                const next = dateValue(view.year, view.month, day)
                return (
                  <button
                    type="button"
                    key={day}
                    aria-label={`${view.year} 年 ${view.month + 1} 月 ${day} 日`}
                    aria-current={next === value ? 'date' : undefined}
                    onClick={() => {
                      onChange(next)
                      setOpen(false)
                      trigger.current?.focus()
                    }}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>,
          trigger.current?.closest('.scheduling-dialog') ?? document.body
        )}
    </div>
  )
}
