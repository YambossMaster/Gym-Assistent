import { ChevronDown } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'

function format(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}
function minutes(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN
  const [hour, minute] = value.split(':').map(Number)
  return hour! * 60 + minute!
}
function duration(value: number) {
  const hours = Math.floor(value / 60)
  const mins = value % 60
  return `${hours ? `${hours} 小時` : ''}${mins ? `${hours ? ' ' : ''}${mins} 分鐘` : ''}`
}

export function SchedulingTimeInput({
  label,
  value,
  start,
  onChange
}: {
  label: string
  value: string
  start?: string
  onChange: (value: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 250 })
  const startMinutes = start === undefined ? NaN : minutes(start)
  const options =
    start === undefined
      ? Array.from({ length: 69 }, (_, index) => ({
          value: format(6 * 60 + index * 15),
          label: format(6 * 60 + index * 15)
        }))
      : Array.from({ length: 23 }, (_, index) => startMinutes + (index + 2) * 15)
          .filter((item) => item < 1440)
          .map((item) => ({
            value: format(item),
            label: `${format(item)}（${duration(item - startMinutes)}）`
          }))
  if (value && !options.some((item) => item.value === value)) options.push({ value, label: value })
  options.sort((a, b) => a.value.localeCompare(b.value))

  const place = () => {
    const rect = input.current?.getBoundingClientRect()
    if (!rect) return
    const below = window.innerHeight - rect.bottom - 12
    const above = rect.top - 12
    const upward = below < 240 && above > below
    const maxHeight = Math.max(70, Math.min(250, upward ? above : below))
    const width = Math.min(Math.max(rect.width, 235), window.innerWidth - 24)
    setPosition({
      top: upward ? rect.top - maxHeight - 6 : rect.bottom + 6,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      width,
      maxHeight
    })
  }
  useLayoutEffect(() => {
    if (!open) return
    place()
    const outside = (event: PointerEvent) => {
      if (
        !input.current?.contains(event.target as Node) &&
        !menu.current?.contains(event.target as Node)
      )
        setOpen(false)
    }
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    document.addEventListener('pointerdown', outside)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      document.removeEventListener('pointerdown', outside)
    }
  }, [open, options.length])
  useLayoutEffect(() => {
    if (open)
      menu.current
        ?.querySelector<HTMLElement>('[aria-selected="true"]')
        ?.scrollIntoView?.({ block: 'center' })
  }, [open])
  const choose = (next: string) => {
    onChange(next)
    setOpen(false)
    input.current?.focus()
  }
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActive((index) =>
        Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))
      )
    } else if (event.key === 'Enter' && open && options[active]) {
      event.preventDefault()
      event.stopPropagation()
      choose(options[active].value)
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    }
  }
  return (
    <label className="scheduling-time-field">
      {label}
      <span className="scheduling-time-control">
        <input
          ref={input}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required
          value={value}
          aria-expanded={open}
          aria-haspopup="listbox"
          onFocus={() => {
            setActive(
              Math.max(
                0,
                options.findIndex((item) => item.value === value)
              )
            )
            setOpen(true)
          }}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => {
            if (!Number.isNaN(minutes(event.target.value)))
              onChange(format(minutes(event.target.value)))
          }}
          onKeyDown={keyDown}
        />
        <ChevronDown
          aria-hidden="true"
          onClick={() => {
            input.current?.focus()
            setOpen(!open)
          }}
        />
      </span>
      {open &&
        createPortal(
          <div
            ref={menu}
            className="scheduling-time-menu"
            role="listbox"
            aria-label={label}
            style={position}
          >
            {options.map((option, index) => (
              <button
                type="button"
                role="option"
                key={option.value}
                aria-selected={option.value === value}
                className={index === active ? 'active' : ''}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </label>
  )
}
