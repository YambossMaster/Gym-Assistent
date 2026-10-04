export const DEFAULT_FEEDBACK_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfr_F8ilQEAyO7AIX1-CkFCCirGEr4td8eN_qyd3oMJWkdWuA/viewform'

export function getFeedbackFormUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null

  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
    if (url.hostname === 'forms.gle' && /^\/[^/]+\/?$/.test(url.pathname)) return url.href
    if (
      url.hostname === 'docs.google.com' &&
      /^\/forms\/d\/(?:e\/)?[^/]+\/viewform\/?$/.test(url.pathname)
    ) {
      return url.href
    }
  } catch {
    return null
  }

  return null
}
