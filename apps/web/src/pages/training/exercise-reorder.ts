export function moveItem<T>(items: readonly T[], fromIndex: number, toIndex: number) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  )
    return [...items]
  const next = [...items]
  next.splice(toIndex, 0, next.splice(fromIndex, 1)[0]!)
  return next
}

export function shouldSwapAdjacent(
  direction: -1 | 1,
  activeTop: number,
  activeHeight: number,
  neighbourTop: number,
  neighbourHeight: number
) {
  const activeBottom = activeTop + activeHeight
  const neighbourBottom = neighbourTop + neighbourHeight
  // Pointer events can skip entire rows. Crossing the threshold still counts even
  // when the dragged row has already passed the neighbour between two frames.
  const threshold = Math.min(activeHeight, neighbourHeight) * 0.32
  return direction === 1
    ? activeBottom >= neighbourTop + threshold
    : activeTop <= neighbourBottom - threshold
}

export function compactListHeight(itemCount: number, rowHeight: number, rowGap: number) {
  if (itemCount <= 0) return 0
  return itemCount * rowHeight + (itemCount - 1) * rowGap
}

export function compactRowTop(
  containerTop: number,
  index: number,
  rowHeight: number,
  rowGap: number
) {
  return containerTop + index * (rowHeight + rowGap)
}

export function compactScrollCorrection(
  activeTop: number,
  pointerY: number,
  pointerOffset: number
) {
  return activeTop - (pointerY - pointerOffset)
}

export function clampDragTop(
  desiredTop: number,
  containerTop: number,
  containerBottom: number,
  viewportTop: number,
  viewportBottom: number,
  rowHeight: number
) {
  const minimum = Math.max(containerTop, viewportTop)
  const maximum = Math.min(containerBottom, viewportBottom) - rowHeight
  return Math.min(Math.max(desiredTop, minimum), Math.max(minimum, maximum))
}

export function edgeScrollVelocity(
  pointerY: number,
  top: number,
  bottom: number,
  edgeSize: number,
  maxVelocity: number
) {
  if (bottom <= top || edgeSize <= 0 || maxVelocity <= 0) return 0
  const effectiveEdge = Math.min(edgeSize, (bottom - top) / 2)
  const upperStart = top + effectiveEdge
  const lowerStart = bottom - effectiveEdge
  const distance =
    pointerY < upperStart
      ? pointerY - upperStart
      : pointerY > lowerStart
        ? pointerY - lowerStart
        : 0
  if (!distance) return 0
  const progress = Math.min(1, Math.abs(distance) / effectiveEdge)
  return Math.sign(distance) * maxVelocity * progress * progress
}

export function boundedDragScroll(
  delta: number,
  listTop: number,
  listBottom: number,
  top: number,
  bottom: number
) {
  return delta > 0
    ? Math.min(delta, Math.max(0, listBottom - bottom))
    : Math.max(delta, -Math.max(0, top - listTop))
}

export class ExerciseReorderBuffer {
  readonly original: readonly string[]
  private current: string[]
  private committed = false

  constructor(
    ids: readonly string[],
    private readonly onCommit: (ids: string[]) => void
  ) {
    this.original = [...ids]
    this.current = [...ids]
  }

  get order() {
    return [...this.current]
  }

  step(activeId: string, direction: -1 | 1) {
    if (this.committed) return this.order
    const fromIndex = this.current.indexOf(activeId)
    const toIndex = fromIndex + direction
    if (fromIndex < 0 || toIndex < 0 || toIndex >= this.current.length) return this.order
    this.current = moveItem(this.current, fromIndex, toIndex)
    return this.order
  }

  commit() {
    if (this.committed) return
    this.committed = true
    if (this.current.some((id, index) => id !== this.original[index])) this.onCommit(this.order)
  }
}
