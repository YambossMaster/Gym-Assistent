export type MobileChromeScrollState = {
  lastY: number
  direction: -1 | 0 | 1
  distance: number
  hidden: boolean
}

const TOP_REVEAL_Y = 8
const HIDE_DISTANCE = 24
const SHOW_DISTANCE = 12
const MIN_DELTA = 1

export function shouldAutoHideMobileChrome(pathname: string) {
  return pathname !== '/today' && pathname !== '/calendar'
}

export function createMobileChromeScrollState(scrollY: number): MobileChromeScrollState {
  return {
    lastY: Math.max(0, scrollY),
    direction: 0,
    distance: 0,
    hidden: false
  }
}

export function updateMobileChromeScrollState(
  state: MobileChromeScrollState,
  scrollY: number
): MobileChromeScrollState {
  const nextY = Math.max(0, scrollY)
  if (nextY <= TOP_REVEAL_Y) {
    return { lastY: nextY, direction: 0, distance: 0, hidden: false }
  }

  const delta = nextY - state.lastY
  if (Math.abs(delta) < MIN_DELTA) return { ...state, lastY: nextY }

  const direction: -1 | 1 = delta > 0 ? 1 : -1
  const distance =
    state.direction === direction ? state.distance + Math.abs(delta) : Math.abs(delta)
  const shouldHide = !state.hidden && direction === 1 && distance >= HIDE_DISTANCE
  const shouldShow = state.hidden && direction === -1 && distance >= SHOW_DISTANCE

  return {
    lastY: nextY,
    direction: shouldHide || shouldShow ? 0 : direction,
    distance: shouldHide || shouldShow ? 0 : distance,
    hidden: shouldHide ? true : shouldShow ? false : state.hidden
  }
}
