import { useState } from 'react'
import type { Student } from '../../api'
import { moneyFactor } from './finance-api'

export function StudentSingleLessonPriceField({
  initial,
  defaultCurrency
}: {
  initial?: Student['singleLessonPrice']
  defaultCurrency: string
}) {
  const currency = initial?.currency ?? defaultCurrency
  const [amount, setAmount] = useState(
    initial ? String(initial.amountMinor / moneyFactor(initial.currency)) : ''
  )
  const factor = moneyFactor(currency)
  const decimals = Math.round(Math.log10(factor))
  const valid =
    amount !== '' &&
    (decimals ? new RegExp(`^\\d+(?:\\.\\d{1,${decimals}})?$`) : /^\d+$/).test(amount)
  const minor = valid ? Math.round(Number(amount) * factor) : null
  return (
    <>
      <label>
        學生課堂單價
        <input
          aria-label="學生課堂單價"
          type="text"
          inputMode="decimal"
          pattern={decimals ? `[0-9]+(?:[.][0-9]{1,${decimals}})?` : '[0-9]+'}
          value={amount}
          placeholder="未設定"
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>
      <input type="hidden" name="singleLessonAmountMinor" value={minor ?? ''} />
      <input type="hidden" name="singleLessonCurrency" value={currency} />
    </>
  )
}

export function readSingleLessonPrice(values: FormData) {
  const raw = String(values.get('singleLessonAmountMinor') ?? '')
  if (!raw) return null
  return {
    amountMinor: Number(raw),
    currency: String(values.get('singleLessonCurrency'))
  }
}
