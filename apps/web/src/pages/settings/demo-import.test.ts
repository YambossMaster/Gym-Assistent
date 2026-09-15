import { describe, expect, it } from 'vitest'
import { MAX_DEMO_BYTES, readDemoSource } from './demo-import'

describe('Demo import file boundary', () => {
  it('parses a JSON backup without changing its values', () => {
    const source = { students: [{ privateNote: '原文' }] }
    expect(readDemoSource(JSON.stringify(source))).toEqual(source)
  })
  it('rejects invalid JSON and oversized input before an API request', () => {
    expect(() => readDemoSource('{')).toThrow('有效')
    expect(() => readDemoSource(`"${'x'.repeat(MAX_DEMO_BYTES)}"`)).toThrow('10 MiB')
  })
})
