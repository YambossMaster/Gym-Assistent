import type { Session } from '@supabase/supabase-js'
import { studentEligibleVenueIds, useVenues } from './finance-api'
import { VenueNamePicker } from './VenueNamePicker'

export function VenueField({
  session,
  venueId,
  location,
  studentId,
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
  const query = useVenues(session)
  const allowedIds = studentId ? studentEligibleVenueIds(query.data, studentId) : null
  return (
    <div className="venue-field">
      <VenueNamePicker
        session={session}
        label="場地"
        value={venueId ?? null}
        allowedIds={allowedIds}
        allowCreate={allowedIds === null}
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
