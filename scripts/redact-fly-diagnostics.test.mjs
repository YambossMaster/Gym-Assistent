import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { redactFlyDiagnostics, selectLastLines } from './redact-fly-diagnostics.mjs'

test('redacts calendar and capability bearer URLs from Fly diagnostics', () => {
  const input = [
    'GET /v1/public/calendar/abcdefghijklmnopqrstuvwxyz0123456789ABCDE.ics 404',
    'GET /t/private-training-token 200',
    'GET /r/private-reschedule-token?from=email 200',
  ].join('\n')

  const output = redactFlyDiagnostics(input)
  assert.doesNotMatch(output, /abcdefghijklmnopqrstuvwxyz|private-training|private-reschedule/)
  assert.match(output, /\/v1\/public\/calendar\/<REDACTED>\.ics/)
  assert.match(output, /\/t\/<REDACTED>/)
  assert.match(output, /\/r\/<REDACTED>\?from=email/)
})

test('keeps only the requested trailing diagnostic lines', () => {
  const input = Array.from({ length: 60 }, (_, index) => `line-${index + 1}`).join('\n')
  const output = selectLastLines(input, 50)
  assert.equal(output.split('\n').length, 50)
  assert.match(output, /^line-11\n/)
  assert.match(output, /line-60$/)
})
