import type { Session } from '@supabase/supabase-js'
import { VenueNamePicker } from './VenueNamePicker'

export function DefaultVenueField({
  session,
  value,
  onChange
}: {
  session: Session
  value: string | null
  onChange: (value: string | null) => void
}) {
  return (
    <div className="venue-field">
      <VenueNamePicker
        session={session}
        label="固定場地"
        value={value}
        optional
        onSelect={(venue) => onChange(venue?.id ?? null)}
      />
      <input type="hidden" name="defaultVenueId" value={value ?? ''} />
    </div>
  )
}
