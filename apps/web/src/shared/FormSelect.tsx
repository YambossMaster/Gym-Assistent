import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { OptionItem } from './OptionItem'

export type FormSelectOption = {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export function FormSelect({
  label,
  displayValue,
  triggerLabel,
  options,
  value,
  defaultValue,
  onChange,
  name,
  disabled = false,
  required = false,
  className = ''
}: {
  label: string
  displayValue?: string
  triggerLabel?: string
  options: FormSelectOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  name?: string
  disabled?: boolean
  required?: boolean
  className?: string
}) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const menuToken = useRef(Symbol('form-select'))
  const suppressTriggerClickUntil = useRef(0)
  const [internal, setInternal] = useState(defaultValue ?? options[0]?.value ?? '')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 248 })
  const selected = value ?? internal
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === selected)
  )

  useEffect(() => {
    const closeOtherMenu = (event: Event) => {
      if ((event as CustomEvent).detail !== menuToken.current) setOpen(false)
    }
    document.addEventListener('ui-choice-menu-open', closeOtherMenu)
    return () => document.removeEventListener('ui-choice-menu-open', closeOtherMenu)
  }, [])

  const placeMenu = () => {
    const rect = trigger.current?.getBoundingClientRect()
    if (!rect) return
    const naturalHeight = Math.min(
      248,
      (menu.current?.scrollHeight ||
        options.reduce((height, option) => height + (option.description ? 64 : 40), 8)) + 2
    )
    const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - 12)
    const spaceAbove = Math.max(0, rect.top - 12)
    const above = spaceBelow < naturalHeight && spaceAbove > spaceBelow
    const maxHeight = Math.min(naturalHeight, above ? spaceAbove : spaceBelow)
    const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 24)
    setPosition({
      top: above ? rect.top - maxHeight - 6 : rect.bottom + 6,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      width,
      maxHeight
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    placeMenu()
    const outside = (event: PointerEvent) => {
      const target = event.target as Node
      if (!root.current?.contains(target) && !menu.current?.contains(target)) {
        // A wrapping label can forward its click to this button after pointerdown closes the menu.
        // Consume that forwarded click so one click on the label cannot close and reopen it.
        if (trigger.current?.closest('label')?.contains(target))
          suppressTriggerClickUntil.current = event.timeStamp + 250
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', placeMenu)
    window.addEventListener('scroll', placeMenu, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', placeMenu)
      window.removeEventListener('scroll', placeMenu, true)
    }
  }, [open, options.length])

  useEffect(() => {
    const list = menu.current
    const option = list?.querySelector<HTMLElement>(`[data-option-index="${active}"]`)
    if (!open || !list || !option) return
    const listRect = list.getBoundingClientRect()
    const optionRect = option.getBoundingClientRect()
    if (optionRect.top < listRect.top + 4) list.scrollTop -= listRect.top + 4 - optionRect.top
    else if (optionRect.bottom > listRect.bottom - 4)
      list.scrollTop += optionRect.bottom - (listRect.bottom - 4)
  }, [active, open])

  const firstEnabled = (from: number, direction: 1 | -1, fallback = selectedIndex) => {
    for (let index = from; index >= 0 && index < options.length; index += direction)
      if (!options[index].disabled) return index
    return fallback
  }
  const choose = (next: string) => {
    if (value === undefined) setInternal(next)
    onChange?.(next)
    setOpen(false)
    trigger.current?.focus()
  }
  const expand = () => {
    if (disabled) return
    document.dispatchEvent(new CustomEvent('ui-choice-menu-open', { detail: menuToken.current }))
    setActive(firstEnabled(selectedIndex, 1))
    placeMenu()
    setOpen(true)
  }
  const keyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    } else if (event.key === 'Tab') setOpen(false)
    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      if (!open) expand()
      else setActive((index) => firstEnabled(index + direction, direction, index))
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      expand()
      setActive(
        firstEnabled(event.key === 'Home' ? 0 : options.length - 1, event.key === 'Home' ? 1 : -1)
      )
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!open) expand()
      else if (options[active] && !options[active].disabled) choose(options[active].value)
    }
  }

  return (
    <div className={`form-select ${open ? 'is-open' : ''} ${className}`} ref={root}>
      {name && <input type="hidden" name={name} value={selected} disabled={disabled} />}
      <button
        ref={trigger}
        type="button"
        className="form-select-trigger ui-text-body-compact"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={(event) => {
          if (event.timeStamp <= suppressTriggerClickUntil.current) {
            suppressTriggerClickUntil.current = 0
            return
          }
          if (open) setOpen(false)
          else expand()
        }}
        onKeyDown={keyDown}
      >
        <span className="form-select-option-label">
          {triggerLabel ?? options.find((option) => option.value === selected)?.label ?? '請選擇'}
        </span>
        {displayValue && <span className="form-select-display-label">{displayValue}</span>}
        <ChevronDown aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            id={id}
            ref={menu}
            className="form-select-menu"
            role="listbox"
            aria-label={label}
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight
            }}
          >
            {options.map((option, index) => (
              <OptionItem
                id={`${id}-${index}`}
                data-option-index={index}
                key={option.value}
                role="option"
                aria-selected={selected === option.value}
                tabIndex={-1}
                label={option.label}
                description={option.description}
                selected={selected === option.value}
                active={index === active}
                disabled={option.disabled}
                onPointerMove={() => !option.disabled && setActive(index)}
                onClick={() => choose(option.value)}
              />
            ))}
          </div>,
          document.body
        )}
    </div>
  )
}
