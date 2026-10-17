import type { Session } from '@supabase/supabase-js'
import { VenueNamePicker } from './VenueNamePicker'

export function VenueField({
  session,
  date,
  venueId,
  location,
  onChange
}: {
  session: Session
  date?: string
  studentId?: string
  venueId?: string | null
  location: string
  customerSource?: 'coach' | 'venue' | null
  onChange: (value: {
    venueId: string | null
    location: string
    customerSource: 'coach' | 'venue' | null
  }) => void
}) {
  return (
    <div className="venue-field">
      <VenueNamePicker
        session={session}
        date={date}
        label="場地"
        value={venueId ?? null}
        allowCreate
        onSelect={(venue) =>
          onChange({
            venueId: venue?.id ?? null,
            location: venue?.name ?? '',
            customerSource: null
          })
        }
      />
      {!venueId && location && (
        <p className="finance-context">原紀錄：{location}。請選擇場地後儲存。</p>
      )}
      <input type="hidden" name="venueId" value={venueId ?? ''} />
    </div>
  )
}
