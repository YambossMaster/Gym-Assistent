import { z } from 'zod'

const environment = z
  .object({
    SUPABASE_URL: z.string().url(),
    SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    API_BASE_URL: z.string().url(),
    COACH_A_EMAIL: z.string().email(),
    COACH_A_PASSWORD: z.string().min(1),
    COACH_B_EMAIL: z.string().email(),
    COACH_B_PASSWORD: z.string().min(1),
  })
  .parse(process.env)

const api = environment.API_BASE_URL.replace(/\/$/, '')
const token = async (email: string, password: string) => {
  const response = await fetch(`${environment.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: environment.SUPABASE_PUBLISHABLE_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) throw new Error(`sign-in failed: ${response.status}`)
  const value = (await response.json()) as { access_token?: string }
  if (!value.access_token) throw new Error('sign-in returned no access token')
  return value.access_token
}
const request = (path: string, accessToken: string, init: RequestInit = {}) =>
  fetch(`${api}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
  })
const requireStatus = async (label: string, response: Response, status: number) => {
  if (response.status !== status)
    throw new Error(
      `${label}: expected ${status}, received ${response.status}: ${await response.text()}`,
    )
  return response
}

const [coachA, coachB] = await Promise.all([
  token(environment.COACH_A_EMAIL, environment.COACH_A_PASSWORD),
  token(environment.COACH_B_EMAIL, environment.COACH_B_PASSWORD),
])
const marker = `m4-e2e-${Date.now()}`
const studentResponse = await requireStatus(
  'create Student',
  await request('/v1/students', coachA, {
    method: 'POST',
    body: JSON.stringify({ name: marker, privateNote: marker }),
  }),
  201,
)
const student = (await studentResponse.json()).student as { id: string; version: number }
let blockCleanup: { id: string; version: number } | null = null
try {
  await requireStatus(
    'create Purchase',
    await request(`/v1/students/${student.id}/lesson-purchases`, coachA, {
      method: 'POST',
      body: JSON.stringify({
        purchasedAt: new Date().toISOString(),
        lessonCount: 8,
        amountMinor: 8000,
        currency: 'TWD',
      }),
    }),
    201,
  )
  const start = new Date(Date.now() + 60 * 60 * 1000)
  start.setUTCMinutes(Math.ceil(start.getUTCMinutes() / 15) * 15, 0, 0)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  const manualStart = new Date(start.getTime() + 3 * 60 * 60 * 1000)
  const manualEnd = new Date(manualStart.getTime() + 60 * 60 * 1000)
  const manualResponse = await requireStatus(
    'create manual Session',
    await request('/v1/sessions', coachA, {
      method: 'POST',
      body: JSON.stringify({
        studentId: student.id,
        startsAt: manualStart.toISOString(),
        endsAt: manualEnd.toISOString(),
        location: 'M4 Manual Studio',
      }),
    }),
    201,
  )
  const manual = (await manualResponse.json()) as {
    session: { id: string; version: number }
  }
  const movedManualStart = new Date(manualStart.getTime() + 15 * 60 * 1000)
  const movedManualEnd = new Date(manualEnd.getTime() + 15 * 60 * 1000)
  const movedManualResponse = await requireStatus(
    'move manual Session',
    await request(`/v1/sessions/${manual.session.id}`, coachA, {
      method: 'PATCH',
      body: JSON.stringify({
        startsAt: movedManualStart.toISOString(),
        endsAt: movedManualEnd.toISOString(),
        location: 'M4 Manual Studio',
        version: manual.session.version,
      }),
    }),
    200,
  )
  const movedManual = (await movedManualResponse.json()) as {
    session: { id: string; version: number }
  }
  const staleMove = await request(`/v1/sessions/${manual.session.id}`, coachA, {
    method: 'PATCH',
    body: JSON.stringify({
      startsAt: manualStart.toISOString(),
      endsAt: manualEnd.toISOString(),
      location: 'stale device',
      version: manual.session.version,
    }),
  })
  await requireStatus('two-device Session conflict', staleMove, 409)
  const staleBody = (await staleMove.json()) as { current?: { version?: number } }
  if (staleBody.current?.version !== movedManual.session.version)
    throw new Error('Session conflict did not return current authorized state')
  await requireStatus(
    'two-Coach Session isolation',
    await request(`/v1/sessions/${manual.session.id}`, coachB),
    404,
  )

  const blockResponse = await requireStatus(
    'create recurring Blocks',
    await request('/v1/calendar-blocks', coachA, {
      method: 'POST',
      body: JSON.stringify({
        startsAt: new Date(start.getTime() + 6 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(start.getTime() + 7 * 60 * 60 * 1000).toISOString(),
        note: marker,
        repeatCount: 2,
      }),
    }),
    201,
  )
  const blocks = (await blockResponse.json()) as {
    blocks: Array<{ id: string; startsAt: string; endsAt: string; version: number }>
  }
  blockCleanup = blocks.blocks[0] ?? null
  const shiftedBlockStart = new Date(start.getTime() + 6 * 60 * 60 * 1000 + 15 * 60 * 1000)
  const shiftedBlockEnd = new Date(shiftedBlockStart.getTime() + 75 * 60 * 1000)
  const updatedBlocksResponse = await requireStatus(
    'update future recurring Blocks',
    await request(`/v1/calendar-blocks/${blocks.blocks[0]!.id}`, coachA, {
      method: 'PATCH',
      body: JSON.stringify({
        startsAt: shiftedBlockStart.toISOString(),
        endsAt: shiftedBlockEnd.toISOString(),
        note: marker,
        version: blocks.blocks[0]!.version,
        scope: 'future',
      }),
    }),
    200,
  )
  const updatedBlocks = (await updatedBlocksResponse.json()) as {
    blocks: Array<{ id: string; startsAt: string; endsAt: string; version: number }>
  }
  if (
    updatedBlocks.blocks.length !== 2 ||
    Date.parse(updatedBlocks.blocks[1]!.startsAt) -
      Date.parse(updatedBlocks.blocks[0]!.startsAt) !==
      7 * 24 * 60 * 60 * 1000 ||
    Date.parse(updatedBlocks.blocks[0]!.endsAt) - Date.parse(updatedBlocks.blocks[0]!.startsAt) !==
      75 * 60 * 1000
  )
    throw new Error('Recurring Block future scope did not preserve weekly offset and new duration')
  blockCleanup = updatedBlocks.blocks[0] ?? blockCleanup
  const created = await requireStatus(
    'create Series',
    await request(`/v1/students/${student.id}/schedule-series`, coachA, {
      method: 'POST',
      body: JSON.stringify({
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        location: 'M4 Studio',
        intervalWeeks: 1,
        autoScheduleHorizon: '2_WEEKS',
      }),
    }),
    201,
  )
  const seriesResult = (await created.json()) as {
    series: { id: string; version: number; autoScheduleHorizon: string }
    anchor: { id: string }
  }
  if (seriesResult.series.autoScheduleHorizon !== '2_WEEKS')
    throw new Error('Series did not retain horizon')
  const movedStart = new Date(start.getTime() + 15 * 60 * 1000)
  const movedEnd = new Date(movedStart.getTime() + 60 * 60 * 1000)
  await requireStatus(
    'effective Series update',
    await request(`/v1/schedule-series/${seriesResult.series.id}`, coachA, {
      method: 'PATCH',
      body: JSON.stringify({
        startsAt: movedStart.toISOString(),
        endsAt: movedEnd.toISOString(),
        location: 'M4 Studio',
        intervalWeeks: 1,
        autoScheduleHorizon: '1_WEEK',
        active: true,
        effective_from_session_id: seriesResult.anchor.id,
        version: seriesResult.series.version,
      }),
    }),
    200,
  )
  const localDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(start)
  const localEnd = new Date(`${localDate}T12:00:00.000Z`)
  localEnd.setUTCDate(localEnd.getUTCDate() + 15)
  const calendarResponse = await requireStatus(
    'Calendar projection',
    await request(
      `/v1/calendar?start=${localDate}&end=${localEnd.toISOString().slice(0, 10)}`,
      coachA,
    ),
    200,
  )
  const calendarText = await calendarResponse.text()
  if (calendarText.includes(marker) && calendarText.includes('privateNote'))
    throw new Error('Calendar projection leaked a private-note field')
  const calendarBody = JSON.parse(calendarText) as {
    calendar: {
      availabilityRulesByWeekday: Record<
        string,
        { windows: Array<{ startTime: string; endTime: string }>; version: number }
      >
    }
  }
  const rawWeekday = new Date(`${localDate}T12:00:00.000Z`).getUTCDay()
  const weekday = rawWeekday === 0 ? 7 : rawWeekday
  const originalAvailability = calendarBody.calendar.availabilityRulesByWeekday[
    String(weekday)
  ] ?? {
    windows: [],
    version: 1,
  }
  const availabilityResponse = await requireStatus(
    'replace Availability baseline',
    await request(`/v1/availability/rules/${weekday}`, coachA, {
      method: 'PUT',
      body: JSON.stringify(originalAvailability),
    }),
    200,
  )
  const availability = (await availabilityResponse.json()) as {
    availability: { version: number; windows: Array<{ startTime: string; endTime: string }> }
  }
  const staleAvailability = await request(`/v1/availability/rules/${weekday}`, coachA, {
    method: 'PUT',
    body: JSON.stringify(originalAvailability),
  })
  await requireStatus('two-device Availability conflict', staleAvailability, 409)
  const staleAvailabilityBody = (await staleAvailability.json()) as {
    current?: { version?: number }
  }
  if (staleAvailabilityBody.current?.version !== availability.availability.version)
    throw new Error('Availability conflict did not return current authorized state')
  const scheduleResponse = await requireStatus(
    'Student schedule projection',
    await request(`/v1/students/${student.id}`, coachA),
    200,
  )
  const scheduleBody = (await scheduleResponse.json()) as {
    detail?: { schedule?: { nearestFuture?: { id?: string } } }
  }
  if (!scheduleBody.detail?.schedule?.nearestFuture?.id)
    throw new Error('Student schedule projection did not expose a nearest future Session')
  await requireStatus(
    'delete all recurring Blocks',
    await request(`/v1/calendar-blocks/${updatedBlocks.blocks[0]!.id}`, coachA, {
      method: 'DELETE',
      body: JSON.stringify({
        confirmation: 'DELETE',
        version: updatedBlocks.blocks[0]!.version,
        scope: 'all',
      }),
    }),
    204,
  )
  blockCleanup = null
  await requireStatus(
    'two-Coach Series isolation',
    await request(`/v1/students/${student.id}/schedule-series`, coachB),
    404,
  )
  await requireStatus(
    'two-Coach Student isolation',
    await request(`/v1/students/${student.id}`, coachB),
    404,
  )
  console.log(
    `M4 live E2E passed for isolated Student ${student.id}: Session two-device conflict/current state, recurring Block future/all scope with preserved offsets, projections, horizon/effective boundary, and two-Coach isolation.`,
  )
} finally {
  if (blockCleanup) {
    await request(`/v1/calendar-blocks/${blockCleanup.id}`, coachA, {
      method: 'DELETE',
      body: JSON.stringify({ confirmation: 'DELETE', version: blockCleanup.version, scope: 'all' }),
    })
  }
  const detail = await request(`/v1/students/${student.id}`, coachA)
  if (detail.ok) {
    const current = (await detail.json()) as { detail: { student: { version: number } } }
    await requireStatus(
      'cleanup Student',
      await request(`/v1/students/${student.id}`, coachA, {
        method: 'DELETE',
        body: JSON.stringify({ confirmation: 'DELETE', version: current.detail.student.version }),
      }),
      204,
    )
  }
}
