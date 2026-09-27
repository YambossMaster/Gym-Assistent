import { useId } from 'react'

export function Checkbox({
  label,
  description,
  name,
  value,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  required = false,
  className = ''
}: {
  label: string
  description?: string
  name?: string
  value?: string
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  required?: boolean
  className?: string
}) {
  const id = useId()

  return (
    <label className={`choice-item${className ? ` ${className}` : ''}`} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={(event) => onChange?.(event.target.checked)}
        disabled={disabled}
        required={required}
      />
      <span className="option-item-copy">
        <span className="option-item-label ui-text-body-compact">{label}</span>
        {description && (
          <span className="option-item-description ui-text-secondary">{description}</span>
        )}
      </span>
    </label>
  )
}
