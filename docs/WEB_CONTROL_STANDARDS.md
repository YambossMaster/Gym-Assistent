# Formal Web control states

Use these rules for every new or changed Coach Web control. Preserve the owning route's business
behavior and the established FORM typography and spacing.

## Setting-form scope and inventory

A **setting interface** is any authenticated Coach surface whose main action creates or edits a
record, preference, rule, schedule, access setting, or export configuration through labelled
fields. This includes inline Settings panels and modal/bottom-sheet editors. It does not include
sign-in, registration or recovery; search and filter controls; read-only details; public capability
redemption; or Training set entry. Those surfaces retain their own contracts.

The inventory below is the required review table. Add a row before shipping a new setting
interface; when a row changes, verify its required labels and mobile scroll owner together.

| Setting interface                          | Owning surface               | Required field titles                                                                                                                                                                         | Optional or conditional titles                                 | Mobile scroll owner           |
| ------------------------------------------ | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------- |
| Arrange/edit calendar item                 | `/calendar`                  | Date, Start, End; Student and Venue for a Course                                                                                                                                              | Repeat; Block note                                             | `.scheduling-form-body`       |
| Edit Course Session                        | `/sessions/:id`              | Student, Date, Start, End, Venue                                                                                                                                                              | None                                                           | `.session-editor-form-body`   |
| Create/edit Student profile                | `/students`, `/students/:id` | Name                                                                                                                                                                                          | Phone, age range, introduction, private note                   | dialog content                |
| Create/edit Lesson Purchase                | Student detail               | Purchase date/time, lesson count, total amount                                                                                                                                                | purchase Venue, per-lesson reference, Coach note               | `.purchase-edit-fields`       |
| Create/edit fixed schedule                 | Student detail               | Start date/time, duration, Venue, frequency, auto-arrange range                                                                                                                               | active state                                                   | `.student-series-fields`      |
| Create/edit exercise definition            | `/exercises`                 | Exercise name, equipment                                                                                                                                                                      | body parts, movement type, metrics and recording configuration | `.definition-editor-fields`   |
| Create/edit finance row                    | `/finance`                   | Date, time, direction, name, amount                                                                                                                                                           | description                                                    | `.finance-ledger-fields`      |
| Create/edit Venue rules                    | `/venues`                    | Titles required by the active editor: Venue name; effective/purchase/deduction dates and times; expense type; commission mode/rates; rent; prepaid lesson count/amount; salary amount/pay day | address, Coach note, salary enable state                       | `.finance-form-fields`        |
| Override Venue Course calculation          | Venue Course records         | calculation method; selected batch or amount/rate when that mode is active                                                                                                                    | none                                                           | `.venue-course-edit-fields`   |
| Coach profile                              | `/settings`                  | display name, Workspace time zone                                                                                                                                                             | none                                                           | page document                 |
| Calendar, training and finance preferences | `/settings`                  | all persisted preference values                                                                                                                                                               | none                                                           | page document                 |
| Password setup/change                      | `/settings`                  | current password when applicable, new password, confirmation                                                                                                                                  | none                                                           | dialog content                |
| Device-cache clearing                      | `/settings`                  | confirmation phrase                                                                                                                                                                           | none                                                           | `.ui-settings-dialog-fields`  |
| Promotional code                           | `/plans`                     | promotional code                                                                                                                                                                              | none                                                           | page document                 |
| Export configuration                       | `/settings`                  | data type, format, start date, end date                                                                                                                                                       | Student/Exercise/Venue filters and inclusion checkboxes        | `.settings-export-form-body`  |
| Typed destructive confirmation             | shared confirmation dialog   | confirmation phrase                                                                                                                                                                           | none                                                           | confirmation card when needed |

## Required field titles

- Every required field title uses the shared `RequiredFieldLabel` or `RequiredFieldMark`. The mark is
  a small red `*`, immediately after the title with a 4px gap. It is identical on desktop and
  mobile; do not move it to the far edge, put it in helper text, or rely on color alone.
- Keep native `required` or `aria-required` on the control when the control supports it. The visual
  mark documents the requirement; it does not replace browser or application validation.
- A field with a valid default is still marked when the value is necessary to save the setting.
  Conditional fields show the mark only while their branch is active. Optional fields either say
  `（選填）` or remain unmarked; do not show both `（選填）` and `*`.
- Date, time and required Venue controls render the shared mark from their shared component. New
  route code must not hand-build a second red-star style.

## Mobile setting-interface scrolling

- Every modal or bottom-sheet setting interface uses `useDialogBehavior`. On viewports up to 720px,
  the shared behavior measures the actual scroll owner and adds a bottom fade plus
  `向下滑看更多 ↓` only while more content remains. It disappears at the lower boundary and is
  never shown when the content fits.
- Mark a deliberately nested scroll owner with `data-dialog-scroll-region`. A form with a fixed
  action footer must keep that footer outside the marked region; validation needed to understand a
  failed action belongs in a fixed, reserved message slot beside that footer.
- The cue is an affordance, not a replacement for reachability. The last control must remain fully
  reachable above any safe-area inset, the cue must not intercept pointer/touch input, and the page
  behind the dialog remains locked.
- Desktop retains its normal scrollbar behavior and does not show the mobile cue.

## New choice and date fields

- Before building a route-specific choice, use the shared `FormSelect`, `OptionItem`, `RadioGroup`,
  or `Checkbox` where its interaction fits. A custom choice must still use the shared
  `ui-text-body-compact` primary text and `ui-text-secondary` description roles (both 14px with
  distinct contrast) and the 4px spacing scale. Do not introduce an 11px description or an
  unrelated selected color just because the choice is presented as a card.
- Use the existing `SeriesDatePicker` for Coach date selection, including start/end ranges. Do not
  add a browser-native `input type="date"` to a formal Coach route. Keep dates as `YYYY-MM-DD` in
  state and apply the route's own range validation after selection.
- Inspect every newly added choice and its open state at desktop and 390px. For entitlement-gated
  controls, inspect the unlocked form as well as the locked state; a locked-only preview does not
  validate the controls behind it.

## Checkbox

- Use a native checkbox input so label clicks, keyboard toggles, form submission, and accessibility
  semantics remain intact. Use the shared `Checkbox` component when a label and description appear
  together.
- The control is a 24px square with a dark 2px border when unchecked. Checked state uses the FORM
  lime fill and a dark check. Keep the surrounding row, card, and border neutral in both states;
  selection must not color an entire field.
- Hover may softly shade the row, but the square does not scale or bounce. Keyboard focus must have
  a visible outline. Disabled state must remain legible and must not imply an available action.

## Hover and selected states

- Hover changes only the surface or border slightly. Keep text and icon contrast clear, avoid lifts,
  scaling, strong color floods, or unexpected motion on newly standardized controls.
- Selection remains distinct from hover. Selected dropdown rows use a pale tint of the FORM lime
  (`--lime`, mixed with white), with a dark checkmark. Keep ordinary hover neutral. Do not use an
  olive or gray-green selected fill, and never rely on hover to identify the current value.
- Action buttons retain their normal semantic color and readable text while hovered. A white general
  or cancel action becomes a slightly darker neutral; it does not become lime or dark green.
- Scope route toolbar Hover rules to toolbar buttons. A nested dialog must use its own button rules.
- Apply hover styling only where hover is available. Keyboard focus is independently visible.

## Dialog close action

- Place one close action at the upper right of each dialog header. Use the same `X` icon with a 24px
  graphic inside a transparent 44px button. Do not use a text multiplication sign or a persistent
  outlined square.
- Hover adds a subtle neutral background without moving the button. Keyboard focus uses a distinct
  outline. Provide an accessible `關閉` label (or `關閉` plus the dialog subject) and keep Escape,
  backdrop behavior, and focus restoration with the existing dialog behavior.
- Apply this presentation at desktop and mobile sizes; do not shrink the touch target on mobile.

## Text input suggestions

- Coach workflow text fields, including contact, search, and venue fields, must not open browser
  history or contact autofill suggestion lists. Set `autoComplete="off"` on their owning forms and
  explicit text inputs outside forms. Do not apply this rule to sign-in and password fields, which
  retain the browser's credential behavior.
- Use the same rule in create and edit versions of a form. Keep the site's own `FormSelect` menus;
  this rule concerns browser-generated suggestions only.

## Mobile modal scrolling

- While a modal dialog is open, lock both the page root and body. The dialog's own content may scroll,
  but a swipe inside it or at its edge must not move or change the page behind it.
- Keep the lock reference counted for nested dialogs and restore the prior inline overflow values
  when the last dialog closes. Public confirmation dialogs use the same lock.
- Route gestures such as Calendar header collapse must ignore wheel input while a modal is open.
