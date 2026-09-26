import { describe, expect, it } from 'vitest'
import {
  allocatedCommission,
  deriveFinance,
  financeLedger,
  venueCreditBalances,
  venueCourseRecords,
  monthlyFinance,
  ruleSchema,
  type FeeRule,
  type FinanceSnapshot,
} from './finance.js'
import { localMonthPeriod } from '../today/today.js'
const rule: FeeRule = {
  id: 'r',
  venueId: 'v',
  effectiveFrom: '2026-01-01',
  kind: 'prepaid',
  collectionMode: 'coach',
  rate: null,
  coachRate: null,
  venueRate: null,
  amountMinor: null,
  currency: null,
}
const fixture = (): FinanceSnapshot => ({
  timeZone: 'Asia/Taipei',
  venues: [
    { id: 'v', name: '場地', active: true, version: 1, lowOccurrence: null, lowOccurredAt: null },
  ],
  rules: [rule],
  credits: [
    {
      id: 'c',
      venueId: 'v',
      purchasedOn: '2026-08-31',
      lessonCount: 1,
      amountMinor: 3000,
      currency: 'TWD',
      privateNote: '',
      version: 1,
    },
  ],
  payouts: [],
  purchases: [
    {
      id: 'p',
      studentId: 's',
      studentName: '學生',
      purchasedOn: '2026-08-01',
      lessonCount: 3,
      amountMinor: 1000,
      currency: 'TWD',
      collectionMode: 'coach',
      venueId: null,
    },
  ],
  sessions: [
    {
      id: 's1',
      studentId: 's',
      studentName: '學生',
      date: '2026-09-01',
      status: 'completed',
      venueId: 'v',
      feeRuleId: 'r',
      customerSource: null,
      location: '原地點',
      version: 1,
    },
  ],
})
describe('monthly finance authority', () => {
  it('shows prepaid activation time without changing its booked date or ledger order', () => {
    const snapshot = fixture()
    snapshot.credits[0]!.startsDeductingAt = '2026-09-02T03:30:00.000Z'
    const row = financeLedger(snapshot, '2026-09-24').rows.find((item) => item.kind === 'prepaid')
    expect(row).toMatchObject({
      date: snapshot.credits[0]!.purchasedOn,
      effectiveAt: '2026-09-02T03:30:00.000Z',
      occurredAt: null,
    })
  })
  it('recomputes purchase-month expense and Venue balance when a prepaid batch is removed', () => {
    const snapshot = fixture()
    expect(monthlyFinance(snapshot, '2026-08', '2026-09-24').totals[0]?.expenseMinor).toBe(3000)
    snapshot.credits = []
    expect(monthlyFinance(snapshot, '2026-08', '2026-09-24').totals[0]?.expenseMinor ?? 0).toBe(0)
    expect(deriveFinance(snapshot, '2026-09-24').venues[0]).toMatchObject({
      remaining: 0,
      pendingLessons: 1,
      netRemaining: -1,
    })
    expect(venueCreditBalances(snapshot)).toEqual([])
    expect(snapshot.sessions[0]?.status).toBe('completed')
  })
  it('shows each prepaid batch balance after consuming the oldest purchase first', () => {
    const snapshot = fixture()
    snapshot.sessions[0]!.endsAt = '2026-09-01T01:00:00.000Z'
    snapshot.credits = [
      {
        ...snapshot.credits[0]!,
        id: 'later',
        purchasedOn: '2026-09-02',
        startsDeductingAt: '2026-09-01T00:00:00.000Z',
        lessonCount: 3,
      },
      { ...snapshot.credits[0]!, id: 'older', lessonCount: 2 },
    ]
    snapshot.sessions.push(
      { ...snapshot.sessions[0]!, id: 's2' },
      { ...snapshot.sessions[0]!, id: 's3' },
    )
    expect(
      venueCreditBalances(snapshot).map(({ id, remainingLessons }) => [id, remainingLessons]),
    ).toEqual([
      ['older', 0],
      ['later', 2],
    ])
    snapshot.sessions.push(
      { ...snapshot.sessions[0]!, id: 's4' },
      { ...snapshot.sessions[0]!, id: 's5' },
      { ...snapshot.sessions[0]!, id: 's6' },
    )
    expect(venueCreditBalances(snapshot).map(({ remainingLessons }) => remainingLessons)).toEqual([
      0, 0,
    ])
  })
  it('expenses a prepaid batch once, allows negative balance, and restores credits on reopen', () => {
    const s = fixture()
    s.sessions.push({ ...s.sessions[0]!, id: 's2' })
    expect(monthlyFinance(s, '2026-08', '2026-09-24').totals[0]).toMatchObject({
      incomeMinor: 1000,
      expenseMinor: 3000,
      differenceMinor: -2000,
    })
    expect(monthlyFinance(s, '2026-09', '2026-09-24').rows).toEqual([])
    expect(deriveFinance(s, '2026-09-24').venues[0]).toMatchObject({
      remaining: 0,
      pendingLessons: 1,
      netRemaining: -1,
    })
    s.sessions[1]!.status = 'scheduled'
    expect(deriveFinance(s, '2026-09-24').venues[0]!.remaining).toBe(0)
    s.sessions[1]!.status = 'completed'
    expect(deriveFinance(s, '2026-09-24').venues[0]).toMatchObject({
      remaining: 0,
      pendingLessons: 1,
      netRemaining: -1,
    })
  })
  it('allocates oldest eligible purchases, rounds once and reports missing price', () => {
    const s = fixture()
    s.rules = [{ ...rule, kind: 'commission', rate: 30 }]
    expect(monthlyFinance(s, '2026-09', '2026-09-24').totals[0]!.expenseMinor).toBe(100)
    s.purchases[0]!.purchasedOn = '2026-10-01'
    expect(monthlyFinance(s, '2026-09', '2026-09-24').missing[0]!.reason).toBe('price')
    expect(allocatedCommission(999999999999, 3, 33.33)).toBe(111100000000)
  })
  it('calculates gross purchase less venue expense regardless of legacy collection mode or payout', () => {
    const s = fixture()
    s.credits = []
    s.purchases[0]!.collectionMode = 'venue'
    s.rules = [{ ...rule, kind: 'commission', rate: 30, collectionMode: 'venue' }]
    expect(deriveFinance(s, '2026-09-24').rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ direction: 'income', amountMinor: 1000 }),
        expect.objectContaining({ direction: 'expense', amountMinor: 100 }),
      ]),
    )
    s.payouts = [
      {
        id: 'pay',
        venueId: 'v',
        purchaseId: 'p',
        sessionId: null,
        receivedOn: '2026-09-10',
        amountMinor: 700,
        currency: 'TWD',
        version: 1,
      },
    ]
    expect(monthlyFinance(s, '2026-08', '2026-09-24').totals[0]).toMatchObject({
      incomeMinor: 1000,
      expenseMinor: 0,
      differenceMinor: 1000,
    })
    expect(monthlyFinance(s, '2026-09', '2026-09-24').totals[0]).toMatchObject({
      incomeMinor: 0,
      expenseMinor: 100,
      differenceMinor: -100,
    })
  })
  it('uses the rule effective at Session end, cancellation free of cost, and currencies separate', () => {
    const s = fixture()
    s.rules = [
      { ...rule, kind: 'rent', amountMinor: 100, currency: 'USD' },
      {
        ...rule,
        id: 'new',
        kind: 'rent',
        amountMinor: 200,
        currency: 'USD',
        effectiveFrom: '2026-09-01',
      },
    ]
    s.purchases[0]!.purchasedOn = '2026-09-01'
    expect(monthlyFinance(s, '2026-09', '2026-09-24').totals).toHaveLength(2)
    expect(
      monthlyFinance(s, '2026-09', '2026-09-24').totals.find((t) => t.currency === 'USD')!
        .expenseMinor,
    ).toBe(200)
    s.sessions[0]!.status = 'cancelled'
    expect(monthlyFinance(s, '2026-09', '2026-09-24').rows.some((r) => r.id === 'session:s1')).toBe(
      false,
    )
  })
  it('distinguishes untracked from free and defaults dual commission to Venue-supplied', () => {
    const s = fixture()
    s.rules = [{ ...rule, kind: 'untracked' }]
    expect(deriveFinance(s, '2026-09-24').coverage).toBe('none')
    s.rules = [{ ...rule, kind: 'free' }]
    expect(deriveFinance(s, '2026-09-24').coverage).toBe('complete')
    s.rules = [{ ...rule, kind: 'commission', coachRate: 20, venueRate: 40 }]
    expect(
      deriveFinance(s, '2026-09-24').rows.find((r) => r.id === 'session:s1')!.amountMinor,
    ).toBe(133)
    s.sessions[0]!.customerSource = 'venue'
    expect(
      deriveFinance(s, '2026-09-24').rows.find((r) => r.id === 'session:s1')!.amountMinor,
    ).toBe(133)
  })
  it('charges a Venue-bound purchase commission once and general lessons at completion', () => {
    const s = fixture()
    s.credits = []
    s.rules = [{ ...rule, kind: 'commission', rate: 30 }]
    s.purchases[0]!.venueId = 'v'
    s.purchases[0]!.customerSource = 'venue'
    const purchaseMonth = monthlyFinance(s, '2026-08', '2026-09-24')
    expect(purchaseMonth.rows.find((r) => r.id === 'purchase-commission:p')?.amountMinor).toBe(300)
    expect(monthlyFinance(s, '2026-09', '2026-09-24').rows.some((r) => r.id === 'session:s1')).toBe(
      false,
    )
    s.purchases[0]!.venueId = null
    expect(
      monthlyFinance(s, '2026-08', '2026-09-24').rows.some((r) => r.id === 'purchase-commission:p'),
    ).toBe(false)
    expect(
      monthlyFinance(s, '2026-09', '2026-09-24').rows.find((r) => r.id === 'session:s1')
        ?.amountMinor,
    ).toBe(100)
  })
  it('deducts one lesson at the completed Venue, using its bound purchase before general lessons', () => {
    const s = fixture()
    s.credits = []
    s.rules = [{ ...rule, kind: 'free' }]
    s.purchases = [
      { ...s.purchases[0]!, id: 'bound', venueId: 'v', lessonCount: 1 },
      { ...s.purchases[0]!, id: 'general', venueId: null, lessonCount: 2 },
    ]
    s.sessions = [{ ...s.sessions[0]!, id: 'one' }]
    const balances = deriveFinance(s, '2026-09-24').studentVenueBalances
    expect(balances.find((b) => b.venueId === 'v')).toMatchObject({
      purchased: 1,
      completed: 1,
      remaining: 0,
    })
    expect(balances.find((b) => b.venueId === null)).toMatchObject({
      purchased: 2,
      completed: 0,
      remaining: 2,
    })
    s.sessions[0]!.status = 'scheduled'
    expect(
      deriveFinance(s, '2026-09-24').studentVenueBalances.find((b) => b.venueId === 'v')!.remaining,
    ).toBe(1)
  })
  it('places base salary on the configured pay day, including short months', () => {
    const s = fixture()
    s.credits = []
    s.salaryRules = [
      {
        id: 'salary',
        venueId: 'v',
        effectiveFrom: '2026-01-01',
        enabled: true,
        amountMinor: 5000,
        currency: 'TWD',
        payDay: 31,
      },
    ]
    expect(
      monthlyFinance(s, '2026-02', '2026-03-01').rows.find((r) => r.kind === 'salary')?.date,
    ).toBe('2026-02-28')
    expect(monthlyFinance(s, '2026-09', '2026-09-24').rows.some((r) => r.kind === 'salary')).toBe(
      false,
    )
    s.salaryRules.push({
      id: 'disabled',
      venueId: 'v',
      effectiveFrom: '2026-03-20',
      enabled: false,
      amountMinor: null,
      currency: null,
      payDay: null,
    })
    expect(monthlyFinance(s, '2026-03', '2026-04-01').rows.some((r) => r.kind === 'salary')).toBe(
      false,
    )
    expect(monthlyFinance(s, '2026-02', '2026-04-01').rows.some((r) => r.kind === 'salary')).toBe(
      true,
    )
  })
  it('selects current month by verified Workspace time zone and rejects invalid rules', () => {
    expect(
      ruleSchema.safeParse({
        version: 1,
        effectiveFrom: '2026-09-01',
        kind: 'free',
        collectionMode: 'venue',
      }).success,
    ).toBe(false)
    expect(localMonthPeriod(new Date('2026-08-31T16:00:00Z'), 'Asia/Taipei').startsOn).toBe(
      '2026-09-01',
    )
    expect(localMonthPeriod(new Date('2026-08-31T16:00:00Z'), 'America/Los_Angeles').startsOn).toBe(
      '2026-08-01',
    )
    expect(
      ruleSchema.safeParse({ version: 1, effectiveFrom: '2026-02-30', kind: 'free' }).success,
    ).toBe(false)
    expect(
      ruleSchema.safeParse({
        version: 1,
        effectiveFrom: '2026-01-01',
        kind: 'commission',
        rate: 101,
      }).success,
    ).toBe(false)
  })
  it('selects a fee rule at the exact Session end instant and records a later commission difference', () => {
    const s = fixture()
    s.credits = []
    s.purchases[0]!.venueId = 'v'
    s.purchases[0]!.purchasedAt = '2026-09-01T03:00:00.000Z'
    s.purchases[0]!.purchasedOn = '2026-09-01'
    s.sessions[0]!.endsAt = '2026-09-01T06:00:00.000Z'
    s.rules = [
      { ...rule, kind: 'commission', rate: 20, effectiveAt: '2026-09-01T00:00:00.000Z' },
      {
        ...rule,
        id: 'later',
        kind: 'commission',
        rate: 30,
        effectiveAt: '2026-09-01T06:00:00.000Z',
      },
    ]
    expect(venueCourseRecords(s, 'v', '2026-09-24')[0]?.rule?.id).toBe('later')
    expect(
      monthlyFinance(s, '2026-09', '2026-09-24').rows.find((r) => r.id === 'session:s1')
        ?.amountMinor,
    ).toBe(33)
  })
  it('explains the source of each amount and orders the displayed ledger from old to new', () => {
    const s = fixture()
    s.credits = []
    s.purchases[0] = {
      ...s.purchases[0]!,
      purchasedOn: '2026-06-01',
      purchasedAt: '2026-06-01T05:00:00.000Z',
      lessonCount: 10,
      amountMinor: 18000,
      venueId: 'v',
      customerSource: 'coach',
    }
    s.sessions[0] = {
      ...s.sessions[0]!,
      date: '2026-07-29',
      startsAt: '2026-07-29T10:00:00.000Z',
      endsAt: '2026-07-29T11:00:00.000Z',
      customerSource: 'coach',
    }
    s.rules = [
      {
        ...rule,
        id: 'original',
        kind: 'commission',
        effectiveAt: '2026-03-01T00:00:00.000Z',
        coachRate: 35,
        venueRate: 65,
      },
      {
        ...rule,
        id: 'new',
        kind: 'commission',
        effectiveAt: '2026-07-01T00:00:00.000Z',
        coachRate: 37,
        venueRate: 67,
      },
    ]
    s.salaryRules = [
      {
        id: 'salary',
        venueId: 'v',
        effectiveFrom: '2026-07-01',
        enabled: true,
        amountMinor: 5000,
        currency: 'TWD',
        payDay: 5,
      },
    ]
    const purchaseRows = monthlyFinance(s, '2026-06', '2026-09-24').rows
    expect(purchaseRows.find((row) => row.id === 'purchase:p')?.detail).toContain(
      '+10 堂 · $1,800／堂',
    )
    expect(purchaseRows.find((row) => row.id === 'purchase-commission:p')?.detail).toContain(
      '自帶客 35%',
    )
    const july = monthlyFinance(s, '2026-07', '2026-09-24')
    expect(july.rows.map((row) => row.kind)).toEqual(['salary', 'commission'])
    expect(july.rows.find((row) => row.id === 'session:s1')).toMatchObject({
      amountMinor: 36,
      detail: expect.stringContaining('補扣抽成差額 · 自帶客 35% → 自帶客 37%'),
    })
    expect(venueCourseRecords(s, 'v', '2026-09-24')[0]?.calculation).toMatchObject({
      originalCustomerSource: 'coach',
      originalRateMode: 'by-source',
      originalRate: 35,
      appliedRate: 37,
    })
  })
  it('sorts by the Workspace date and time shown to the Coach across a UTC day boundary', () => {
    const s = fixture()
    s.purchases = [
      { ...s.purchases[0]!, id: 'day-start', purchasedOn: '2026-07-01' },
      {
        ...s.purchases[0]!,
        id: 'after-midnight',
        purchasedOn: '2026-07-01',
        purchasedAt: '2026-06-30T16:30:00.000Z',
      },
    ]
    expect(
      financeLedger(s, '2026-09-24')
        .rows.filter((row) => row.kind === 'purchase')
        .map((row) => row.id),
    ).toEqual(['purchase:day-start', 'purchase:after-midnight'])
  })
  it('recomputes each prepaid Session balance after an earlier Session is assigned', () => {
    const s = fixture()
    s.credits = [
      {
        ...s.credits[0]!,
        purchasedOn: '2026-06-01',
        startsDeductingAt: '2026-06-01T00:00:00.000Z',
        lessonCount: 4,
      },
    ]
    s.sessions = ['2026-07-01', '2026-07-02', '2026-07-03'].map((date, index) => ({
      ...s.sessions[0]!,
      id: `s${index + 1}`,
      date,
      startsAt: `${date}T01:00:00.000Z`,
      endsAt: `${date}T02:00:00.000Z`,
    }))
    s.sessionAdjustments = [
      {
        sessionId: 's2',
        venueId: 'v',
        mode: 'exempt',
        creditId: null,
        amountMinor: null,
        rate: null,
        version: 1,
      },
    ]
    const balances = () =>
      venueCourseRecords(s, 'v', '2026-09-24')
        .slice()
        .reverse()
        .map((row) => row.remainingAfterDeduction)
    expect(balances()).toEqual([3, null, 2])
    s.sessionAdjustments[0] = { ...s.sessionAdjustments[0]!, mode: 'batch', creditId: 'c' }
    expect(balances()).toEqual([3, 2, 1])
  })
  it('shows the purchase actually assigned to each completed Session and flags missing price', () => {
    const s = fixture()
    s.credits = []
    s.rules = [{ ...rule, kind: 'commission', rate: 20, effectiveAt: '2026-08-01T00:00:00.000Z' }]
    s.purchases = [
      { ...s.purchases[0]!, id: 'p1', venueId: 'v', lessonCount: 1 },
      { ...s.purchases[0]!, id: 'p2', venueId: 'v', lessonCount: 1, purchasedOn: '2026-08-02' },
    ]
    s.sessions = [
      { ...s.sessions[0]!, id: 's1', endsAt: '2026-09-01T01:00:00.000Z' },
      { ...s.sessions[0]!, id: 's2', endsAt: '2026-09-01T02:00:00.000Z' },
    ]
    expect(
      venueCourseRecords(s, 'v', '2026-09-24').map((row) => [row.sessionId, row.purchaseId]),
    ).toEqual([
      ['s2', 'p2'],
      ['s1', 'p1'],
    ])
    s.purchases = []
    expect(venueCourseRecords(s, 'v', '2026-09-24')[0]?.status).toBe('missing')
  })
  it('moves only a modified ledger row between months and retains its value after source changes', () => {
    const s = fixture()
    s.purchases[0]!.purchasedAt = '2026-08-01T03:00:00.000Z'
    const original = financeLedger(s, '2026-09-24').rows.find((r) => r.id === 'purchase:p')!
    s.entryStates = [
      {
        entryId: original.id,
        version: 1,
        hidden: false,
        manualAmountMinor: 1500,
        manualAt: '2026-09-01T08:00:00.000Z',
        manualLabel: '調整購課',
        sourceFingerprint: original.sourceFingerprint!,
        sourceSnapshot: original,
      },
    ]
    expect(monthlyFinance(s, '2026-08', '2026-09-24').rows.some((r) => r.id === original.id)).toBe(
      false,
    )
    expect(monthlyFinance(s, '2026-09', '2026-09-24').totals[0]?.incomeMinor).toBe(1500)
    s.purchases[0]!.amountMinor = 2000
    const adjusted = financeLedger(s, '2026-09-24').rows.find((r) => r.id === original.id)!
    expect(adjusted).toMatchObject({
      amountMinor: 1500,
      originalAmountMinor: 2000,
      originalOccurredAt: '2026-08-01T03:00:00.000Z',
      sourceChanged: true,
      status: 'modified',
    })
    s.entryStates[0]!.hidden = true
    expect(monthlyFinance(s, '2026-09', '2026-09-24').rows.some((r) => r.id === original.id)).toBe(
      false,
    )
    expect(monthlyFinance(s, '2026-09', '2026-09-24').deletedCount).toBe(1)
  })
})
