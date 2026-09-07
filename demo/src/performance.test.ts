import { describe, expect, it } from 'vitest'
import styles from './styles.css?inline'

describe('interaction performance budget', () => {
  it('does not delay whole-page content with entrance animations', () => {
    expect(styles).toMatch(/\.reveal\s*{[^}]*animation:\s*none;/s)
  })

  it('does not apply backdrop blur to application surfaces', () => {
    expect(styles).not.toMatch(/backdrop-filter\s*:/)
  })
})
