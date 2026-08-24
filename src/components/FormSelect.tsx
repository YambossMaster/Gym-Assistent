import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

export type FormSelectOption = {
  value: string | number
  label: string
  disabled?: boolean
}

type FormSelectProps = {
  label: string
  name?: string
  options: FormSelectOption[]
  defaultValue?: string | number
  value?: string | number
  onChange?: (value: string) => void
  required?: boolean
  disabled?: boolean
  className?: string
}

const asString = (value: string | number | undefined) => (value === undefined ? '' : String(value))

export function FormSelect({
  label,
  name,
  options,
  defaultValue,
  value,
  onChange,
  required = false,
  disabled = false,
  className = ''
}: FormSelectProps) {
  const listboxId = useId()
  const labelId = `${listboxId}-label`
  const valueId = `${listboxId}-value`
  const rootRef = useRef<HTMLDivElement | null>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const controlled = value !== undefined
  const initialValue = asString(defaultValue ?? options.find((option) => !option.disabled)?.value)
  const [internalValue, setInternalValue] = useState(initialValue)
  const [open, setOpen] = useState(false)
  const selectedValue = controlled ? asString(value) : internalValue
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => asString(option.value) === selectedValue)
  )
  const [activeIndex, setActiveIndex] = useState(selectedIndex)
  const selectedOption = options.find((option) => asString(option.value) === selectedValue)

  useEffect(() => {
    if (!open) return
    const handleOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [open])

  useEffect(() => {
    if (!open) return
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  const nextEnabled = (from: number, direction: 1 | -1) => {
    let index = from
    do {
      index = Math.max(0, Math.min(options.length - 1, index + direction))
      if (!options[index]?.disabled) return index
    } while (index > 0 && index < options.length - 1)
    return from
  }

  const choose = (nextValue: string) => {
    if (!controlled) setInternalValue(nextValue)
    onChange?.(nextValue)
    setOpen(false)
  }

  const openMenu = () => {
    if (disabled) return
    setActiveIndex(selectedIndex)
    setOpen(true)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      if (!open) openMenu()
      else setActiveIndex((current) => nextEnabled(current, direction))
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      openMenu()
      const edge = event.key === 'Home' ? 0 : options.length - 1
      const direction = event.key === 'Home' ? 1 : -1
      setActiveIndex(options[edge]?.disabled ? nextEnabled(edge, direction) : edge)
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!open) openMenu()
      else if (options[activeIndex] && !options[activeIndex].disabled)
        choose(asString(options[activeIndex].value))
      return
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      return
    }
    if (event.key === 'Tab') setOpen(false)
  }

  return (
    <div className={`form-select-field ${open ? 'is-open' : ''} ${className}`} ref={rootRef}>
      <span className="form-select-label" id={labelId}>
        {label}
      </span>
      {name && (
        <select
          className="form-select-native"
          name={name}
          value={selectedValue}
          required={required}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          onChange={() => undefined}
        >
          {options.map((option) => (
            <option
              key={asString(option.value)}
              value={asString(option.value)}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        className="form-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby={`${labelId} ${valueId}`}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span id={valueId}>{selectedOption?.label ?? '請選擇'}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div className="form-select-menu" id={listboxId} role="listbox" aria-label={label}>
          {options.map((option, index) => {
            const optionValue = asString(option.value)
            const selected = optionValue === selectedValue
            return (
              <button
                type="button"
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                className={`${index === activeIndex ? 'active' : ''} ${selected ? 'selected' : ''}`}
                key={optionValue}
                ref={(element) => {
                  optionRefs.current[index] = element
                }}
                onPointerMove={() => !option.disabled && setActiveIndex(index)}
                onClick={() => choose(optionValue)}
              >
                <span>{option.label}</span>
                {selected && <Check aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
