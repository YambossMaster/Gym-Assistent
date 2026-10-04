import { describe, expect, it } from 'vitest'
import { getFeedbackFormUrl } from './feedback-link'

describe('feedback form URL', () => {
  it('accepts Google Forms responder links', () => {
    expect(getFeedbackFormUrl(' https://docs.google.com/forms/d/e/abc/viewform?usp=sharing ')).toBe(
      'https://docs.google.com/forms/d/e/abc/viewform?usp=sharing'
    )
    expect(getFeedbackFormUrl('https://forms.gle/abc123')).toBe('https://forms.gle/abc123')
  })

  it.each([
    undefined,
    '',
    'https://docs.google.com/forms/d/e/abc/edit',
    'https://docs.google.com.evil.test/forms/d/e/abc/viewform',
    'http://forms.gle/abc123',
    'javascript:alert(1)',
    'https://forms.gle@evil.test/abc123',
    'https://forms.gle:8443/abc123'
  ])('rejects missing or unsafe destination %s', (value) => {
    expect(getFeedbackFormUrl(value)).toBeNull()
  })
})
