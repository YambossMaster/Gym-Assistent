import type { AppData } from './types'

export const DEMO_STORAGE_KEY = 'form-coach-mvp-v1'

export function currentDemoBackup(data: AppData) {
  return localStorage.getItem(DEMO_STORAGE_KEY) ?? JSON.stringify(data)
}

export function downloadDemoBackup(data: AppData, now = new Date()) {
  const content = currentDemoBackup(data)
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `form-coach-demo-backup-${now.toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
