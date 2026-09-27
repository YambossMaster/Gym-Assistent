# Formal Web control states

Use these rules for Coach Web controls during M7.5 visual corrections. Preserve the owning route's
business behavior and the established FORM typography and spacing.

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
