# M8-B-Plan-Choice contract — no-charge selection

> Product Owner correction, 2026-10-05. This later package follows M8-B-Export and precedes
> M8-C. It opens Pro and Prime selection to exercise the real plan flow before payment integration.

## Job and authority

From the standalone `/plans` page, a verified Coach can select Pro or Prime with a monthly or
annual period and change the selection. Settings `方案與帳單` owns current-plan, cancellation,
payment-method and billing-history management. Every selection currently costs NT$0. No card,
checkout provider, payment receipt or tax
invoice exists in this package. The planned paid prices remain a future commercial decision; an
existing zero-price selection cannot become chargeable without explicit later consent.

The API resolves Workspace from verified identity and stores one private subscription row per
Workspace. The row stores the selected tier, interval, current UTC period instants, optional next
tier/interval, optimistic version and zero due/paid amounts. The browser cannot write a Workspace
ID or change entitlements outside authenticated operations. Existing promotional and permanent
Prime grants keep their higher effective access while active; a stored selection can coexist and
take effect when a time-limited grant ends. Permanent grants remain Prime regardless of selection.

## Transitions

| Coach action                                                   | Effective access                                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Free to Pro or Prime                                           | Immediately after the API saves the zero-price selection.                |
| Pro to Prime                                                   | Immediately; keep the current period end when the interval is unchanged. |
| Monthly to annual at the same or higher tier                   | Immediately; begin a new annual period.                                  |
| Prime to Pro, or annual to monthly at the same tier            | Schedule for the current period end; keep present access until then.     |
| Cancel                                                         | Schedule Free for the current period end; preserve all data.             |
| Select the current tier and interval while a change is pending | Withdraw the pending change.                                             |

The server derives period rollover from UTC instants on read; monthly and annual anniversaries
preserve the original UTC day when possible, clamping to the destination month's final day. At
the boundary, a pending change takes effect before authorization checks. Without a pending
change, the zero-price selection renews for another period at NT$0. No background payment job is
required. A stale version returns 409; the Web refreshes the current state without losing the
Coach's data. Existing Free capacity and feature locks apply to the effective tier. A downgrade
that leaves more than five active Students or one active Venue preserves records and applies the
existing write lock.

## Settings and plan-page interaction

Settings `方案與帳單` is the management entry. Its green-black current-plan card combines the tier,
interval and active state in one product heading, then shows only the period end and a visual
current-to-next transition. A separated management footer contains the consequential actions.
`取消訂閱` schedules Free at period end. When cancellation is already scheduled, `繼續訂閱`
selects the current tier and interval to withdraw it without reopening the comparison flow or
checkout. The same withdrawal presents as `保留目前方案` for a scheduled downgrade. The page
retains the formal `帳單與付款` structure for future payment-method and billing-history states. A
separate `查看所有方案` banner opens the standalone `/plans` comparison page.

The standalone page follows established SaaS pricing patterns: compare Free, Pro and Prime in one
constrained, centered pricing grid; switch between `月費方案` and `年費方案`; show the approved list
prices and the approximately 17% annual discount; align feature lists and actions; distinguish the
recommended plan; and return explicitly to Settings. The temporary zero-price implementation is
not presented as a plan benefit, price or payment-method message. A selection confirmation states
the chosen tier and interval and discloses only the consequential fact that this selection will not
charge the Coach. On success, refresh plan-dependent private queries and the current-plan summary.
On failure or conflict, show a recoverable message. At desktop and 390px, the confirmation supports
Escape, focus restoration, no horizontal overflow and keyboard interaction.

Each non-current card uses the same selection action pattern, including `選擇 Free 方案`; choosing
Free schedules the existing subscription to end and Free to begin at the period boundary. The
current tier and interval are labeled explicitly. Its action is absent for the selected interval;
switching the comparison to the other interval exposes the applicable interval-change action.

## Evidence

- Unit cases for exact boundary, upgrade, scheduled downgrade/cancellation, withdrawal, rollover
  and stale version.
- Authenticated HTTP cases for tenant ownership, malformed input, 409 and Free capacity recovery.
- Private-schema migration dry-run and live development verification on isolated data.
- Browser selection/change/cancel/reload at desktop and 390px, plus a premium feature and Free
  write-lock check after the entitlement changes.
- Root check/build, relevant security and migration checks, then exact-SHA remote CI only after
  Product Owner review and push authorization.

Payment-provider sandbox, tax, receipts, card update, retries, refunds, proration and live money
remain in M8-E.
