type Lemon = {
  Setup: (options: { eventHandler: (event: { event: string }) => void }) => void
  Url: { Open: (url: string) => void; Close: () => void }
}
declare global {
  interface Window {
    LemonSqueezy?: Lemon
    createLemonSqueezy?: () => void
  }
}
let loading: Promise<Lemon> | undefined
let heldCheckoutLock: { name: string; release: () => void } | undefined
const submittedChannel = 'billing-checkout-submitted'

function releaseCheckoutLock(): void {
  heldCheckoutLock?.release()
  heldCheckoutLock = undefined
}

async function acquireCheckoutLock(accountId: string, intentId: string): Promise<boolean> {
  if (!navigator.locks) return true
  const name = `billing-checkout:${accountId}:${intentId}`
  if (heldCheckoutLock?.name === name) return true
  releaseCheckoutLock()
  return new Promise<boolean>((resolve, reject) => {
    void navigator.locks
      .request(name, { ifAvailable: true }, async (lock) => {
        if (!lock) {
          resolve(false)
          return
        }
        await new Promise<void>((release) => {
          heldCheckoutLock = { name, release }
          resolve(true)
        })
      })
      .catch(reject)
  })
}

export function onProviderSubmitted(
  accountId: string,
  listener: (intentId: string) => void
): () => void {
  if (!window.BroadcastChannel) return () => {}
  const channel = new BroadcastChannel(submittedChannel)
  channel.onmessage = (message: MessageEvent<{ accountId: string; intentId: string }>) => {
    if (message.data?.accountId !== accountId || typeof message.data.intentId !== 'string') return
    rememberProviderSubmitted(accountId, message.data.intentId)
    listener(message.data.intentId)
  }
  return () => channel.close()
}

function rememberProviderSubmitted(accountId: string, intentId: string): void {
  try {
    window.sessionStorage.setItem(submittedKey(accountId, intentId), 'true')
  } catch {
    /* Session storage is optional. */
  }
}

function submittedKey(accountId: string, intentId: string) {
  return `billing-provider-submitted:${accountId}:${intentId}`
}
export function wasProviderSubmitted(accountId: string, intentId: string): boolean {
  try {
    return window.sessionStorage.getItem(submittedKey(accountId, intentId)) === 'true'
  } catch {
    return false
  }
}
export function markProviderSubmitted(accountId: string, intentId: string): void {
  rememberProviderSubmitted(accountId, intentId)
  if (!window.BroadcastChannel) return
  const channel = new BroadcastChannel(submittedChannel)
  channel.postMessage({ accountId, intentId })
  channel.close()
}
export function clearProviderSubmitted(accountId: string, intentId: string): void {
  try {
    window.sessionStorage.removeItem(submittedKey(accountId, intentId))
  } catch {
    /* Session storage is optional. */
  }
}

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
export async function openLemonCheckout(
  url: string,
  onProviderSuccess: () => void,
  signal?: AbortSignal,
  scope?: { accountId: string; intentId: string }
): Promise<void> {
  const safeUrl = validateCheckoutUrl(url)
  const lemon = await loadLemon()
  if (signal?.aborted) return
  if (scope && !(await acquireCheckoutLock(scope.accountId, scope.intentId)))
    throw new Error('checkout_open_elsewhere')
  if (signal?.aborted) {
    releaseCheckoutLock()
    return
  }
  signal?.addEventListener('abort', releaseCheckoutLock, { once: true })
  try {
    lemon.Setup({
      eventHandler: (event) => {
        if (event.event === 'Checkout.Success' && !signal?.aborted) {
          releaseCheckoutLock()
          onProviderSuccess()
        }
      }
    })
    lemon.Url.Open(safeUrl)
  } catch (error) {
    releaseCheckoutLock()
    throw error
  }
}

export function closeLemonCheckout(): boolean {
  try {
    window.LemonSqueezy?.Url.Close()
    window.LemonSqueezy?.Setup({ eventHandler: () => {} })
    releaseCheckoutLock()
    return true
  } catch {
    return false
  }
}
