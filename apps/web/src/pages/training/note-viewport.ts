export function getNoteKeyboardInset({
  layoutHeight,
  visualHeight
}: {
  layoutHeight: number
  visualHeight: number
  visualOffsetTop: number
}) {
  // iOS can pan the Visual Viewport after the caret moves. That offset is not
  // extra usable space: subtracting it lets a fixed dock sink into the keyboard.
  const inset = Math.max(0, Math.round(layoutHeight - visualHeight))
  return inset > 120 ? inset : 0
}
