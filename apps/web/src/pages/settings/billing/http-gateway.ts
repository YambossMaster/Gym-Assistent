import type { BillingGateway, CheckoutIntent, PaidChangePreview, Quote } from './types'

/** Authenticated requests only; no private billing data is written to browser storage. */
export function createHttpBillingGateway(accessToken: string) {
  async function request<T>(
    path: string,
    method = 'GET',
    body?: unknown,
    signal?: AbortSignal
  ): Promise<T> {
    const response = await fetch(`/api/v1/billing${path}`, {
      method,
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(25_000)])
        : AbortSignal.timeout(25_000)
    })
    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as { error?: string }
      throw new Error(error.error ?? 'billing_unavailable')
    }
    return (await response.json()) as T
  }
  const gateway: BillingGateway = {
    quote: (selection, signal) => request('/quote', 'POST', selection, signal),
    begin: (input) => request('/checkouts', 'POST', input),
    intent: (id) => request(`/checkouts/${encodeURIComponent(id)}`),
    abandon: (id) => request(`/checkouts/${encodeURIComponent(id)}/abandon`, 'POST', {}),
    submitted: (id) => request(`/checkouts/${encodeURIComponent(id)}/submitted`, 'POST', {}),
    billing: (signal) => request('', 'GET', undefined, signal),
    cancel: () => request('/cancel', 'POST', {}),
    changeTrial: (selection) => request('/trial-change', 'POST', selection),
    previewPaid: (selection) =>
      request<PaidChangePreview>('/paid-change/preview', 'POST', selection),
    confirmPaid: (previewId) => request('/paid-change', 'POST', { previewId }),
    receipt: async (id) =>
      (await request<{ url: string }>(`/invoices/${encodeURIComponent(id)}/receipt`, 'POST', {}))
        .url
  }
  return {
    ...gateway,
    current: (signal: AbortSignal) =>
      request<{ current: { intent: CheckoutIntent; quote: Quote } | null }>(
        '/checkouts/current',
        'GET',
        undefined,
        signal
      )
  }
}
