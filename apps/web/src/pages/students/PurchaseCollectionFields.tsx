import type { Session } from '@supabase/supabase-js'
import { useState } from 'react'
import { VenueNamePicker } from './VenueNamePicker'

export function PurchaseCollectionFields({
  session,
  initialVenueId = null
}: {
  session: Session
  initialVenueId?: string | null
}) {
  const [venueId, setVenueId] = useState(initialVenueId)
  return (
    <div className="purchase-collection-fields">
      <VenueNamePicker
        session={session}
        label="購課場地"
        value={venueId}
        optional
        onSelect={(venue) => setVenueId(venue?.id ?? null)}
      />
      <input type="hidden" name="venueId" value={venueId ?? ''} />
    </div>
  )
}
