import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const isDocsOnly = (paths) => paths.length > 0 && paths.every((file) => file.endsWith('.md'))

export const needsBrowser = (paths) =>
  paths.length === 0 ||
  paths.some(
    (file) =>
      file.startsWith('apps/web/') ||
      file === 'package.json' ||
      file === 'package-lock.json' ||
      file === 'playwright.config.ts' ||
      file === '.github/workflows/ci.yml' ||
      file === 'scripts/ci-scope.mjs',
  )

export function changedPaths(base, head) {
  const output = execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', base, head])
  return output.toString('utf8').split('\0').filter(Boolean)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { BASE_SHA, HEAD_SHA, EVENT_NAME, GITHUB_OUTPUT } = process.env
  let docsOnly = false
  let browserNeeded = true
  if (EVENT_NAME !== 'workflow_dispatch' && BASE_SHA && HEAD_SHA && !/^0+$/.test(BASE_SHA)) {
    try {
      const paths = changedPaths(BASE_SHA, HEAD_SHA)
      docsOnly = isDocsOnly(paths)
      browserNeeded = needsBrowser(paths)
    } catch {
      // Unknown history must run the full gate.
    }
  }
  if (GITHUB_OUTPUT)
    appendFileSync(GITHUB_OUTPUT, `docs_only=${docsOnly}\nbrowser_needed=${browserNeeded}\n`)
  console.log(
    `Verification scope: ${docsOnly ? 'docs format only' : 'full'}; browser ${browserNeeded ? 'needed' : 'not needed'}`,
  )
}
