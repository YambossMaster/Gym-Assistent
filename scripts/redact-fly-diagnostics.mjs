import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function redactFlyDiagnostics(input) {
  return input
    .replace(/\/v1\/public\/calendar\/[^?\s"']+\.ics/gi, '/v1/public/calendar/<REDACTED>.ics')
    .replace(/\/(t|r)\/[^?\s"']+/gi, '/$1/<REDACTED>')
    .replace(
      /((?:authorization|x-capability-token)["']?\s*[:=]\s*)(?:bearer\s+)?[^\s,"']+/gi,
      '$1<REDACTED>',
    )
}

export function selectLastLines(input, count) {
  const lines = input.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n')
  return lines.slice(-count).join('\n')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const lastFlag = process.argv.indexOf('--last')
  const requested = lastFlag >= 0 ? Number(process.argv[lastFlag + 1]) : 50
  if (!Number.isInteger(requested) || requested < 1 || requested > 500) {
    throw new Error('--last must be an integer from 1 to 500')
  }
  const input = readFileSync(0, 'utf8')
  process.stdout.write(`${selectLastLines(redactFlyDiagnostics(input), requested)}\n`)
}
