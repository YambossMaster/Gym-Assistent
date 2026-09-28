import { useState } from 'react'
import { numericInputKeyDown } from '../../shared/numeric-input'
import { financeMoney, moneyFactor } from './finance-api'

export function PurchaseMoneyFields({
  count,
  amount,
  currency = 'TWD',
  includeCount = true,
  showSummary = true,
  totalLabel = '總金額'
}: {
  count?: number
  amount?: number
  currency?: string
  includeCount?: boolean
  showSummary?: boolean
  totalLabel?: string
}) {
  const [lessons, setLessons] = useState(count === undefined ? '' : String(count)),
    [totalDraft, setTotalDraft] = useState(
      amount === undefined ? '' : String(amount / moneyFactor(currency))
    ),
    [unitDraft, setUnitDraft] = useState(''),
    [editedField, setEditedField] = useState<'total' | 'unit'>('total')
  const code = currency
  const factor = moneyFactor(code),
    n = Number(lessons)
  const total =
    editedField === 'unit'
      ? unitDraft !== '' && /^\d+(?:\.\d*)?$/.test(unitDraft) && n > 0
        ? String(Math.round(Number(unitDraft) * factor * n) / factor)
        : ''
      : totalDraft
  const validTotal = /^\d+(?:\.\d+)?$/.test(total)
  const minor = validTotal ? Math.round(Number(total) * factor) : null
  const unit =
    editedField === 'unit'
      ? unitDraft
      : n > 0 && minor !== null
        ? String(Number((minor / n / factor).toFixed(2)))
        : ''
  const approximateUnit = n > 0 && minor !== null && !Number.isInteger(minor / n)
  const currencyDecimals = Math.round(Math.log10(factor))
  const unitSummary =
    unit !== ''
      ? new Intl.NumberFormat('zh-TW', {
          style: 'currency',
          currency: code,
          minimumFractionDigits: 0,
          maximumFractionDigits: Math.max(2, currencyDecimals)
        }).format(Number(unit))
      : null
  return (
    <div className="finance-money-fields">
      {includeCount && (
        <label>
          堂數
          <input
            name="lessonCount"
            type="number"
            onKeyDown={numericInputKeyDown}
            min="1"
            max="10000"
            step="1"
            required
            value={lessons}
            onChange={(e) => setLessons(e.target.value)}
          />
        </label>
      )}
      <label>
        {totalLabel}
        <input
          aria-label={totalLabel}
          type="text"
          inputMode="decimal"
          pattern={currencyDecimals ? `[0-9]+(?:[.][0-9]{1,${currencyDecimals}})?` : '[0-9]+'}
          required
          value={total}
          placeholder="0"
          onChange={(e) => {
            setTotalDraft(e.target.value)
            setEditedField('total')
          }}
        />
      </label>
      <label>
        每堂參考價{approximateUnit ? '（約）' : ''}
        <input
          aria-label="每堂參考價"
          type="text"
          inputMode="decimal"
          pattern="[0-9]+(?:[.][0-9]{1,4})?"
          value={unit}
          placeholder="0"
          onChange={(e) => {
            setUnitDraft(e.target.value)
            setEditedField('unit')
          }}
        />
      </label>
      <input type="hidden" name="amountMinor" value={minor ?? ''} />
      <input type="hidden" name="currency" value={code} />
      {showSummary && n > 0 && minor !== null && unitSummary && (
        <span className="finance-money-equation">
          {`${n} 堂 · 合計 ${financeMoney(minor, code)} · ${unitSummary} / 堂`}
        </span>
      )}
    </div>
  )
}
