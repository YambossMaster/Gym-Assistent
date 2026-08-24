# Data model and persistence

## Source of truth

`src/types.ts` defines the persisted `AppData` graph. `src/store.tsx` owns mutations and writes the complete graph to browser `localStorage` under `form-coach-mvp-v1`. `src/seed.ts` supplies a valid fallback and demo reset state.

## Main relationships

- A `Student` owns purchases, fixed schedule series, and course sessions through `studentId`.
- A `CourseSession` may reference a fixed `ScheduleSeries` and may have one `TrainingRecord` through `sessionId`.
- A `CapabilityLink` grants one narrow public capability for one session and has an expiry time; reschedule links may also have `usedAt`. Training-result links store an explicit `includeNote` opt-in, defaulting to false for older and newly opened share flows.
- `CalendarBlock` is independent and participates in conflict detection.
- Repeated private blocks are stored as ordinary block occurrences sharing an optional
  `recurrenceId`. This keeps old saved blocks valid and lets an occurrence remain independently
  editable.
- `AvailabilityRule` stores reusable weekly baseline windows and supports multiple ranges on the
  same weekday. `AvailabilityOverride` stores the complete effective window list for one calendar
  date; an empty list means unavailable for that date. This makes one-week reductions independent
  from permanent weekly changes.
- `ExerciseDefinition` is the editable library template. Its `performanceMetric` is a single choice:
  `weight` or `reps`. A `TrainingExercise` snapshots that choice and the optional stable
  `definitionId`, so later library edits do not rewrite saved lesson content and renamed exercises
  can still be matched to their history. Older snapshots without an ID fall back to normalized-name
  matching.
- `CoachSettings.calendarStartHour` and `calendarEndHour` define the visible day/week timeline;
  the end boundary may be `24` for midnight. Older settings inherit the seeded 07:00—22:00 range.

## Product invariants

- Remaining lessons equal purchased lessons minus completed sessions.
- Low or negative balance and schedule conflicts remain visible warnings; they do not silently block or rearrange a coach's schedule.
- Active fixed schedule series generate enough future scheduled sessions to cover the student's remaining lesson balance. Generated sessions are chronological and never backfilled into the past.
- A fixed series created from the calendar keeps the coach-drawn occurrence as its first session;
  reconciliation continues from that occurrence instead of moving it to an earlier week.
- Availability edits add to or subtract from either one date or its weekly baseline. Subtraction
  may shorten or split a range. Existing lessons and private blocks are never moved automatically.
- Deleting a student removes their purchases, series, sessions, records, and capability links.
- Public training projection exposes actual training results. `TrainingRecord.privateNote` is exposed only when the coach explicitly enables `includeNote` for that specific result link; student private notes are never exposed.
- A newly added training exercise starts with zero sets. When the coach adds a set, planned values come from that student's latest earlier record for the same exercise; when no history exists, planned weight and repetitions remain blank. Each set stores one working weight, an optional actual repetition count, and an optional completed/incomplete result. Entering actual repetitions derives the result against planned repetitions; toggling a selected result off clears its auto-linked actual repetitions.
- Exercise performance is derived from successfully completed sets rather than stored separately.
  Unmarked and incomplete sets never qualify for current, previous, personal-best, directory-count,
  or chart data. Weight-based exercises use the highest successful working weight in the lesson;
  mixed kg/lb entries are converted before comparison. Repetition-based exercises use the highest
  successful actual repetition count and never substitute a planned count. In a lesson, “previous
  best” is the closest earlier successful lesson result. In the student performance directory, that
  latest successful result is presented as “previous best” because there is no current lesson.
  “Personal best” is the highest value in the available successful history.
- Public rescheduling offers conflict-free, unblocked slots inside availability windows from three calendar days before through three days after the original lesson, including the original date. Redemption revalidates the selected slot before moving the lesson.
- A successful reschedule consumes its single-use link.
- Public-link changes written in another browser tab are synchronized into an already-open coach
  tab, so a successful reschedule appears in the calendar without a manual refresh.
- Student course history contains completed lessons plus only the nearest future scheduled lesson.
  Calendar lessons are visually classified as upcoming, overdue-uncompleted, or completed.

## Schema changes

Persisted data may outlive a deployment. For every field addition, rename, or semantic change:

1. Keep `AppData` strict in `types.ts`.
2. Add fallback or migration logic inside `load()` in `store.tsx`.
3. Test loading the previous shape and the current shape.
4. Record the compatibility decision in `CHANGELOG.md`.

Changing the storage key is a data reset and requires explicit product approval.

The performance-metric addition keeps the existing storage key. Old exercise definitions default
to `weight`. Older training snapshots first inherit a uniquely matching library definition (stable
ID, exact name, then one unambiguous partial-name match); only unmatched snapshots default to
`weight`.
