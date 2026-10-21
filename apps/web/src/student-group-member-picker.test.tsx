// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'
import type { Student } from './api'
import { GroupMemberPicker } from './coach-workspace'

it('keeps one member selected and assigns blue, orange, then pink by selection order', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const people = ['甲', '乙', '丙', '丁'].map((name, index) => ({
    id: `student-${index}`,
    name,
    kind: 'person',
    active: true
  })) as Student[]
  function Picker() {
    const [selectedIds, setSelectedIds] = useState([people[0]!.id])
    return (
      <GroupMemberPicker
        accessToken="test"
        coachId="coach"
        people={people}
        selectedIds={selectedIds}
        onChange={setSelectedIds}
      />
    )
  }
  const client = new QueryClient()
  const choice = (name: string) =>
    [...host.querySelectorAll<HTMLButtonElement>('.student-group-member-choice')].find((button) =>
      button.textContent?.includes(name)
    )!
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Picker />
        </QueryClientProvider>
      )
    )
    expect(choice('甲').disabled).toBe(true)
    expect(choice('甲').classList.contains('tone-0')).toBe(true)
    await act(async () => choice('乙').click())
    expect(choice('甲').disabled).toBe(false)
    expect(choice('乙').classList.contains('tone-1')).toBe(true)
    await act(async () => choice('丙').click())
    expect(choice('丙').classList.contains('tone-2')).toBe(true)
    expect(choice('丁').disabled).toBe(true)
    await act(async () => choice('甲').click())
    expect(choice('乙').classList.contains('tone-0')).toBe(true)
    expect(choice('丙').classList.contains('tone-1')).toBe(true)
    expect(choice('丁').disabled).toBe(false)
  } finally {
    await act(async () => root.unmount())
    host.remove()
    client.clear()
    vi.unstubAllGlobals()
  }
})
