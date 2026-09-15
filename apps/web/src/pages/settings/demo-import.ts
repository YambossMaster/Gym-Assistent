export const DEMO_STORAGE_KEY = 'form-coach-mvp-v1'
export const MAX_DEMO_BYTES = 10 * 1024 * 1024

export function readDemoSource(text: string) {
  if (new TextEncoder().encode(text).byteLength > MAX_DEMO_BYTES)
    throw new Error('備份檔超過 10 MiB，無法匯入。')
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error('這不是有效的 Demo JSON 備份。')
  }
}

export function downloadDemoBackup(text: string, now = new Date()) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `form-coach-demo-backup-${now.toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export const phaseLabels = {
  foundation: '設定、動作與學生',
  purchases: '購課紀錄',
  training: '訓練紀錄',
  scheduling: '排程',
  capability_links: '舊分享連結'
} as const
