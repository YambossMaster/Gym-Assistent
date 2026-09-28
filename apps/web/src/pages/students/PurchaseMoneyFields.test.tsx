// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { PurchaseMoneyFields } from './PurchaseMoneyFields'

it('preserves an indivisible exact total and exposes its approximate unit price', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <form>
          <PurchaseMoneyFields count={3} amount={1000} />
        </form>
      )
    )
    expect(host.textContent).toContain('每堂參考價（約）')
    expect(host.textContent).toContain('3 堂 · 合計 $1,000 · $333.33 / 堂')
    expect(new FormData(host.querySelector('form')!).get('amountMinor')).toBe('1000')
    expect(host.querySelector('form')!.checkValidity()).toBe(true)
    expect((host.querySelector('[aria-label="每堂參考價"]') as HTMLInputElement).value).toBe(
      '333.33'
    )
  } finally {
    await act(async () => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  }
})

it('lets the Coach clear zero from unit price before typing a new amount', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const edit = async (input: HTMLInputElement, value: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }
  try {
    await act(async () =>
      root.render(
        <form>
          <PurchaseMoneyFields />
        </form>
      )
    )
    expect(host.textContent).not.toContain('輸入堂數')
    await edit(host.querySelector<HTMLInputElement>('input[name="lessonCount"]')!, '1')
    const unit = host.querySelector<HTMLInputElement>('[aria-label="每堂參考價"]')!
    await edit(unit, '0')
    expect(unit.value).toBe('0')
    await edit(unit, '')
    expect(unit.value).toBe('')
    expect(host.querySelector<HTMLInputElement>('input[name="amountMinor"]')!.value).toBe('')
    await edit(unit, '120')
    expect(unit.value).toBe('120')
    expect(host.querySelector<HTMLInputElement>('input[name="amountMinor"]')!.value).toBe('120')
    await edit(host.querySelector<HTMLInputElement>('input[name="lessonCount"]')!, '3')
    expect(unit.value).toBe('120')
    expect(host.querySelector<HTMLInputElement>('[aria-label="總金額"]')!.value).toBe('360')
    expect(host.querySelector<HTMLInputElement>('input[name="amountMinor"]')!.value).toBe('360')
  } finally {
    await act(async () => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  }
})
