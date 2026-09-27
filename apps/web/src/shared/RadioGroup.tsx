import { useId } from 'react'

export type RadioOption = {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  disabled = false,
  required = false,
  className = ''
}: {
  label: string
  name: string
  options: RadioOption[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  className?: string
}) {
  const id = useId()

  return (
    <fieldset className={`choice-group${className ? ` ${className}` : ''}`} disabled={disabled}>
      <legend className="choice-group-label">{label}</legend>
      <div className="choice-group-options">
        {options.map((option, index) => (
          <label className="choice-item" htmlFor={`${id}-${index}`} key={option.value}>
            <input
              id={`${id}-${index}`}
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              disabled={option.disabled}
              required={required}
            />
            <span className="option-item-copy">
              <span className="option-item-label ui-text-body-compact">{option.label}</span>
              {option.description && (
                <span className="option-item-description ui-text-secondary">
                  {option.description}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
