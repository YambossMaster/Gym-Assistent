# Changelog

- Reworked the public training-record page to follow the downloaded image's information hierarchy: session identity first, student record title second, then consistently divided exercise rows. Removed the competing praise hero and summary strip.

All notable user-visible, persistence, and structural changes are recorded here.

## Unreleased

### Changed

- Synced reschedules made from a public link back into already-open coach tabs, reduced student
  course history to completed lessons plus the nearest future lesson, and added upcoming,
  overdue-uncompleted, and completed calendar colors.
- Simplified calendar lesson actions to open, completion toggle, and delete. Lesson time/location
  editing now lives under “變更課堂” inside the lesson, and best-performance copy explicitly labels
  the current/previous pair as best values.

- Best-performance calculations now require a set to be explicitly completed. Failed or unmarked
  attempts no longer affect lesson bests, personal bests, movement counts, or trend charts.
- Compressed lesson performance data into the exercise title row: current/previous share one value,
  followed by personal best and the growth-trajectory action without separate boxed cards.
- Added a compact personal-performance entry between fixed rhythm and session history on student
  details. It lists successful movements by recorded-session count and reuses the trend interface;
  this history entry shows previous and personal best only because no current lesson exists.
- Added a single weight-or-repetition performance metric to every exercise definition and lesson
  snapshot. Training cards now derive each lesson's best, previous-lesson best, and personal best,
  with an interactive per-student history chart. Weight comparisons safely normalize kg/lb;
  repetition movements use actual repetitions only.
- Added stable exercise-definition references for new lesson snapshots, with normalized-name
  fallback for older records. Older snapshots inherit a uniquely matched library metric before
  falling back to weight, without changing the `form-coach-mvp-v1` storage key.
- Fixed the lesson exercise picker to a stable all-results height and brought its create form in
  line with the exercise library through selectable equipment suggestions, reusable body-part
  chips, and custom body-part entry.
- Tightened the lesson exercise picker into one search/source/create command row, added all/favorite/custom source filters, softened actual-repetition placeholders, and simplified the public PNG action to “下載”.
- Training sets now use one working weight, actual repetitions, and a reversible
  completed/incomplete result. Older records migrate their actual weight into the surviving
  working-weight field and infer a result without changing the local-storage key.
- The session exercise picker can create a reusable library exercise and add it to the current
  record without leaving the lesson.
- The public training result and PNG export now use a denser, mobile-first layout with larger
  shared notes and a redesigned download action.
- Made public training records identify the lesson with a prominent date, weekday, and time range,
  and added a browser-generated PNG download so students can keep a copy after the link expires.
- Replaced the long reschedule-slot list with one date selector and simultaneous morning,
  afternoon, and evening time grids for the selected day.
- Added a short success state after copying a public link and removed redundant Note-sharing policy
  text from the student-facing training record.
- Removed internal product-policy explanations from the lesson Note, sharing, and time-editing UI.
  Lesson time editing now uses the same date, start, and end controls as the calendar instead of a
  browser-native combined date-time field.
- Training exercises now start at zero sets. Newly added sets reuse the same student's latest
  earlier results for that exercise as planned weight/repetitions, or remain blank when no history
  exists.
- Expanded the fixed Session Context panel and Note editor, removed remaining-lesson clutter, and
  renamed the user-facing Private Note label to Note. Training-result links can explicitly include
  the Note, with sharing off by default and migrated old links remaining private.
- Added direct date/time editing inside a lesson while keeping the optional reschedule-link path.
  Public links now list every valid slot within plus/minus three days of the original lesson and
  revalidate availability, lesson conflicts, and private blocks before moving it.
- Removed the duplicate "save and finish later" action; saving the record and completing the lesson
  are now the two distinct actions.

- Replaced every native form dropdown with the shared `FormSelect` control, matching the
  calendar time picker's lime focus, scrollable menu, and selected-row treatment while preserving
  form submission and keyboard navigation.
- Rebuilt calendar pointer handling around a movement threshold: press-and-release opens an item,
  while pressing and moving anywhere on a lesson, block, or empty track begins a drag. Existing
  events preserve the grabbed offset instead of jumping their start time to the cursor.
- Replaced combined native date-time inputs with a date field and compact, editable time
  pickers. Each picker keeps only five rows visible but scrolls through every 15-minute option;
  calendar forms also accept direct time typing, Enter to confirm, and Escape to cancel.
- Added configurable calendar start/end hours (including 24:00), an old-settings migration, and a
  focus mode that smoothly collapses the page title while the day/week timeline is scrolled. The
  title stays hidden at the top until another upward gesture, preventing scroll-position flicker.
- Added Delete as a shortcut in modals that already expose a delete action, while ignoring Delete
  inside editable fields to prevent accidental record removal.
- Added multiple weekly availability windows and date-specific overrides. Coaches can add or
  subtract a range for one date or the weekly baseline, including splitting an existing range.
- Made private-block notes optional, added direct lesson/block movement, introduced a compact
  lesson-only agenda, and constrained the time grid to one bounded scroll workspace with a narrow
  centered day view.
- Added `availabilityOverrides` migration under the existing `form-coach-mvp-v1` storage key.
- Reworked day/week scheduling around direct calendar manipulation: click for a default slot or
  drag across the time grid, then classify the selection as a lesson, availability, or private
  block in one compact composer.
- Added calendar-native recurring lessons (weekly or biweekly), repeated private blocks, direct
  weekly availability range editing, and single-versus-future scope when moving a recurring lesson.
- Added optional `CalendarBlock.recurrenceId` metadata without changing the
  `form-coach-mvp-v1` storage key; previously saved blocks remain valid.
- Added `start-gym-assistant.cmd` as the explicit Windows entry point and made direct `index.html` access explain the required startup path.
- Removed delayed whole-page entrance animations and GPU-heavy backdrop blur from application surfaces so navigation and scrolling respond immediately.
- Split the previous monolithic application page into route composition, feature pages, a shared exercise filter component, and presentation utilities.
- Added a documented small-change workflow, data-contract guidance, verification rules, pinned formatting, IDE tasks, and generated-file exclusions.
- Pinned direct dependency versions and added a lockfile-first setup path for reproducible local builds.

### Preserved

- Existing routes, local-storage key, business rules, visual classes, and public-link behaviour remain unchanged by the structural split.

# 2026-08-24

- Changed multi-select body-part filtering from union (OR) to intersection (AND) semantics.
- Reconciled active fixed schedules on load/reset and after deleting a future session, with generated lessons always placed in the future.
- Expanded the calendar into day agenda, week planner, and month overview modes with chronological lessons, availability, and private blocks.
