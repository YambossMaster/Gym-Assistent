import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

const CHECK_INTERVAL_MS = 15 * 60_000
const CHECK_COOLDOWN_MS = 5 * 60_000
const PRIMARY_PATHS = new Set(['/today', '/calendar', '/students', '/exercises', '/settings'])

type AppVersion = { buildId: string; assets: string[] }

export function canAutoUpdate(path: string, changedOnRoute: boolean) {
  return PRIMARY_PATHS.has(path) && !changedOnRoute
}

export async function preparedVersion(currentBuild: string): Promise<boolean> {
  const response = await fetch(`/app-version.json?check=${Date.now()}`, { cache: 'no-store' })
  if (!response.ok) return false
  const version = (await response.json()) as AppVersion
  if (!version.buildId || version.buildId === currentBuild || !Array.isArray(version.assets))
    return false
  const assets = version.assets.filter((asset) => /^\/assets\/[\w./-]+\.(?:js|css)$/.test(asset))
  if (!assets.length || assets.length !== version.assets.length) return false
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration()
    await registration?.update().catch(() => undefined)
  }
  const downloads = await Promise.all(assets.map((asset) => fetch(asset, { cache: 'force-cache' })))
  return downloads.every((download) => download.ok)
}

export function hasActiveWork() {
  const focused = document.activeElement
  return (
    document.querySelector('[role="dialog"], [role="alertdialog"], [aria-modal="true"]') !== null ||
    document.querySelector('[aria-busy="true"]') !== null ||
    document.querySelector('.resilience-status') !== null ||
    document.documentElement.classList.contains('is-session-note-focused') ||
    (focused instanceof HTMLElement &&
      (focused.matches('input, textarea, select') || Boolean(focused.isContentEditable)))
  )
}

export function AppUpdateCoordinator() {
  const { pathname } = useLocation()
  const [ready, setReady] = useState(false)
  const [switching, setSwitching] = useState(false)
  const lastCheck = useRef(0)
  const checking = useRef(false)
  const changedOnRoute = useRef(false)
  const lastActivity = useRef(Date.now())
  const previousPath = useRef(pathname)
  const buildId = document.querySelector<HTMLMetaElement>('meta[name="app-build"]')?.content

  useEffect(() => {
    if (!import.meta.env.PROD || !buildId || ready) return
    const check = async () => {
      if (
        checking.current ||
        document.visibilityState !== 'visible' ||
        !navigator.onLine ||
        Date.now() - lastCheck.current < CHECK_COOLDOWN_MS
      )
        return
      checking.current = true
      lastCheck.current = Date.now()
      try {
        if (await preparedVersion(buildId)) setReady(true)
      } catch {
        // A failed check leaves the current app usable; the next interval retries.
      } finally {
        checking.current = false
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check()
    }
    void check()
    const timer = window.setInterval(() => void check(), CHECK_INTERVAL_MS)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [buildId, pathname, ready])

  useEffect(() => {
    if (previousPath.current === pathname) return
    previousPath.current = pathname
    changedOnRoute.current = false
  }, [pathname])

  useEffect(() => {
    const markChanged = (event: Event) => {
      lastActivity.current = Date.now()
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('input, textarea, select, [contenteditable]')
      )
        changedOnRoute.current = true
    }
    const markActivity = () => {
      lastActivity.current = Date.now()
    }
    document.addEventListener('input', markChanged)
    document.addEventListener('change', markChanged)
    document.addEventListener('pointerdown', markActivity, { passive: true })
    document.addEventListener('keydown', markActivity)
    document.addEventListener('scroll', markActivity, true)
    return () => {
      document.removeEventListener('input', markChanged)
      document.removeEventListener('change', markChanged)
      document.removeEventListener('pointerdown', markActivity)
      document.removeEventListener('keydown', markActivity)
      document.removeEventListener('scroll', markActivity, true)
    }
  }, [])

  useEffect(() => {
    if (!ready || switching) return
    const trySwitch = () => {
      if (
        document.visibilityState !== 'visible' ||
        !navigator.onLine ||
        Date.now() - lastActivity.current < 4000 ||
        !canAutoUpdate(pathname, changedOnRoute.current) ||
        hasActiveWork()
      )
        return
      setSwitching(true)
      window.setTimeout(() => window.location.reload(), 180)
    }
    const timer = window.setInterval(trySwitch, 1000)
    trySwitch()
    return () => window.clearInterval(timer)
  }, [pathname, ready, switching])

  if (!switching) return null
  return (
    <div className="app-update-screen" role="status" aria-live="polite">
      <img className="app-update-mark" src="/brand/form-horizontal.png" alt="" />
      <span className="app-update-progress" aria-hidden="true" />
      <strong>正在更新工作台…</strong>
    </div>
  )
}
