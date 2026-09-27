import { Check } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'

type OptionItemProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  label: string
  description?: string
  selected?: boolean
  active?: boolean
}

export function OptionItem({
  label,
  description,
  selected = false,
  active = false,
  className = '',
  ...buttonProps
}: OptionItemProps) {
  return (
    <button
      {...buttonProps}
      type="button"
      className={`option-item${active ? ' active' : ''}${selected ? ' selected' : ''}${className ? ` ${className}` : ''}`}
    >
      <span className="option-item-copy">
        <span className="option-item-label ui-text-body-compact">{label}</span>
        {description && (
          <span className="option-item-description ui-text-secondary">{description}</span>
        )}
      </span>
      {selected && <Check aria-hidden="true" />}
    </button>
  )
}
