// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'
import type { Student } from './api'
import { GroupMemberPicker } from './coach-workspace'

vi.mock('./supabase', () => ({ supabase: { auth: {} } }))

it('lets the last member be deselected and preserves avatar, name, and check for selected members', async () => {
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
    expect(choice('甲').disabled).toBe(false)
    expect(choice('甲').classList.contains('tone-0')).toBe(true)
    expect(host.textContent).not.toContain('點選一起上課的學生加入群組')
    expect(choice('甲').querySelector('.group-member-avatar')?.textContent).toBe('甲')
    expect(choice('甲').querySelector('svg')).not.toBeNull()
    expect(host.textContent).toContain('已選 1 / 3 位')
    await act(async () => choice('乙').click())
    expect(host.textContent).toContain('已選 2 / 3 位')
    expect(choice('甲').disabled).toBe(false)
    expect(choice('乙').classList.contains('tone-1')).toBe(true)
    await act(async () => choice('丙').click())
    expect(choice('丙').classList.contains('tone-2')).toBe(true)
    expect(choice('丁').disabled).toBe(true)
    await act(async () => choice('甲').click())
    expect(choice('乙').classList.contains('tone-0')).toBe(true)
    expect(choice('丙').classList.contains('tone-1')).toBe(true)
    expect(choice('丁').disabled).toBe(false)
    await act(async () => choice('乙').click())
    await act(async () => choice('丙').click())
    expect(host.textContent).toContain('已選 0 / 3 位')
    expect(choice('甲').querySelector('.student-group-choice-mark')).not.toBeNull()
    expect(choice('甲').querySelector('.group-member-avatar')).toBeNull()
  } finally {
    await act(async () => root.unmount())
    host.remove()
    client.clear()
    vi.unstubAllGlobals()
  }
})
