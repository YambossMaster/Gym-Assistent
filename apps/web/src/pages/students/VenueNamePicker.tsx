import type { Session } from '@supabase/supabase-js'
import { Check, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api'
import { FormSelect } from '../../shared/FormSelect'
import { RequiredFieldMark } from '../../shared/FormFieldLabel'
import { useFinanceMutation, useVenues, type Venue } from './finance-api'

export function VenueNamePicker({
  session,
  label,
  value,
  optional = false,
  allowedIds,
  allowCreate = true,
  validationMessage,
  onSelect
}: {
  session: Session
  label: string
  value: string | null
  optional?: boolean
  allowedIds?: string[] | null
  allowCreate?: boolean
  validationMessage?: string
  onSelect: (venue: Pick<Venue, 'id' | 'name' | 'active'> | null) => void
}) {
  const venues = useVenues(session)
  const mutation = useFinanceMutation(session)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const visibleVenues = venues.data?.venues.filter((venue, _index, all) => {
    if (allowedIds && !allowedIds.includes(venue.id) && venue.id !== value) return false
    if (!venue.active && venue.id !== value) return false
    const matches = all.filter(
      (other) => other.name.trim().toLocaleLowerCase() === venue.name.trim().toLocaleLowerCase()
    )
    return (
      venue.id ===
      (
        matches.find((other) => other.id === value) ??
        matches.find((other) => other.active) ??
        matches[0]
      ).id
    )
  })
  const finish = (venue: Pick<Venue, 'id' | 'name' | 'active'>) => {
    if (!venue.active) {
      setError('該場地已存在且已封存，請先到場地管理恢復。')
      return
    }
    onSelect(venue)
    setAdding(false)
    setName('')
    setError('')
  }
  const create = (event: FormEvent) => {
    event.preventDefault()
    const normalized = name.trim()
    if (!normalized || mutation.isPending) return
    const existing = venues.data?.venues.find(
      (venue) => venue.name.trim().toLocaleLowerCase() === normalized.toLocaleLowerCase()
    )
    if (existing) return finish(existing)
    mutation.mutate(
      { path: '/venues', body: { name: normalized } },
      {
        onSuccess: (result) => finish({ ...result.entity, active: true }),
        onError: (cause) => {
          if (cause instanceof ApiError && cause.status === 409) {
            const current = cause.details.current as
              | Pick<Venue, 'id' | 'name' | 'active'>
              | undefined
            if (current) return finish(current)
          }
          setError(cause instanceof Error ? cause.message : '暫時無法新增場地。')
        }
      }
    )
  }
  return (
    <div className="venue-choice">
      <span className="venue-choice-label">
        {label}
        {!optional ? <RequiredFieldMark /> : null}
        {validationMessage && (
          <span className="venue-choice-validation" role="alert">
            {' '}
            {validationMessage}
          </span>
        )}
      </span>
      {adding ? (
        <div className="venue-name-entry">
          <input
            autoFocus
            aria-label="新場地名稱"
            placeholder="輸入場地名稱"
            value={name}
            autoComplete="off"
            maxLength={160}
            disabled={mutation.isPending}
            onChange={(event) => {
              setName(event.target.value)
              setError('')
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') create(event)
              if (event.key === 'Escape') {
                event.preventDefault()
                setAdding(false)
                setError('')
              }
            }}
          />
          <button
            type="button"
            aria-label="建立場地"
            title="建立場地"
            disabled={!name.trim() || mutation.isPending}
            onClick={create}
          >
            <Check aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="取消新增場地"
            title="取消"
            onClick={() => {
              setAdding(false)
              setError('')
            }}
          >
            <X aria-hidden="true" />
          </button>
        </div>
      ) : (
        <FormSelect
          label={label}
          value={value ?? ''}
          required={!optional}
          options={[
            { value: '', label: optional ? '無固定場地' : '選擇場地' },
            ...(visibleVenues?.map((venue) => ({ value: venue.id, label: venue.name })) ?? []),
            ...(allowCreate ? [{ value: '__add', label: '＋ 新增場地' }] : [])
          ]}
          onChange={(next) => {
            if (next === '__add') {
              setName('')
              setError('')
              setAdding(true)
              return
            }
            onSelect(venues.data?.venues.find((venue) => venue.id === next) ?? null)
          }}
        />
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {venues.isError && (
        <p className="form-error" role="alert">
          暫時無法讀取場地。
          <button type="button" onClick={() => void venues.refetch()}>
            重試
          </button>
        </p>
      )}
    </div>
  )
}
