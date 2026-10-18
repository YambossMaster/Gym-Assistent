type Lemon = {
  Setup: (options: { eventHandler: (event: { event: string }) => void }) => void
  Url: { Open: (url: string) => void }
}
declare global {
  interface Window {
    LemonSqueezy?: Lemon
    createLemonSqueezy?: () => void
  }
}
let loading: Promise<Lemon> | undefined

export function validateCheckoutUrl(value: string): string {
  const url = new URL(value)
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    !url.hostname.endsWith('.lemonsqueezy.com') ||
    !url.pathname.startsWith('/checkout/')
  )
    throw new Error('invalid_checkout_url')
  return url.href
}

function loadLemon(): Promise<Lemon> {
  if (window.LemonSqueezy) return Promise.resolve(window.LemonSqueezy)
  if (loading) return loading
  loading = new Promise<Lemon>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://app.lemonsqueezy.com/js/lemon.js'
    script.async = true
    const fail = () => {
      window.clearTimeout(timer)
      script.remove()
      reject(new Error('checkout_unavailable'))
    }
    const timer = window.setTimeout(fail, 12000)
    script.onerror = fail
    script.onload = () => {
      window.clearTimeout(timer)
      try {
        window.createLemonSqueezy?.()
        if (!window.LemonSqueezy) {
          fail()
          return
        }
        resolve(window.LemonSqueezy)
      } catch {
        fail()
      }
    }
    document.head.append(script)
  }).catch((error) => {
    loading = undefined
    throw error
  })
  return loading
}

/** Success only asks the authenticated server to reconcile; it never grants a plan. */
export async function openLemonCheckout(url: string, onProviderSuccess: () => void): Promise<void> {
  const safeUrl = validateCheckoutUrl(url)
  const lemon = await loadLemon()
  lemon.Setup({
    eventHandler: (event) => {
      if (event.event === 'Checkout.Success') onProviderSuccess()
    }
  })
  lemon.Url.Open(safeUrl)
}
