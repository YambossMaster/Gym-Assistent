import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const wideInputs =
  /^(package(-lock)?\.json|tsconfig[^/]*\.json|vitest[^/]*|vite\.config\.[^/]*|\.github\/workflows\/)/

export const eligibleUntracked = (paths) => paths.filter((path) => !path.endsWith('.md'))
export const eligibleForPrettier = (paths) =>
  paths.filter((path) => /\.(md|mdx|[cm]?[jt]sx?|json|ya?ml|css|scss|html)$/.test(path))

export function broadenForMissing(scope, paths) {
  for (const path of paths) {
    if (path.startsWith('apps/api/')) scope.fullApi = true
    else if (path.startsWith('apps/web/')) scope.fullWeb = true
    else {
      scope.fullApi = true
      scope.fullWeb = true
    }
  }
  return scope
}

export function vitestArguments(workspace, files, full) {
  return [
    full ? 'run' : 'related',
    '--run',
    '--maxWorkers=1',
    ...(full ? [] : ['--passWithNoTests']),
    ...(full && workspace === 'web' ? ['src'] : []),
    ...(full ? [] : files.map((file) => resolve(root, file))),
  ]
}

export function scopeFor(paths) {
  const scope = {
    api: [],
    web: [],
    apiTouched: false,
    webTouched: false,
    browserTouched: false,
    fullApi: false,
    fullWeb: false,
    docsOnly: false,
  }
  scope.docsOnly = paths.length > 0 && paths.every((path) => path.endsWith('.md'))
  for (const path of paths) {
    if (wideInputs.test(path) || path.startsWith('supabase/')) {
      scope.fullApi = true
      scope.fullWeb = true
    } else if (path.startsWith('apps/api/')) {
      scope.apiTouched = true
      if (wideInputs.test(path.slice('apps/api/'.length))) scope.fullApi = true
      else if (/\.[cm]?[jt]sx?$/.test(path)) scope.api.push(path)
      else if (!path.endsWith('.md')) scope.fullApi = true
    } else if (path.startsWith('apps/web/e2e/') || path === 'playwright.config.ts') {
      scope.browserTouched = true
    } else if (path.startsWith('apps/web/')) {
      scope.webTouched = true
      if (wideInputs.test(path.slice('apps/web/'.length))) scope.fullWeb = true
      else if (/\.[cm]?[jt]sx?$/.test(path)) scope.web.push(path)
      else if (!path.endsWith('.md') && !path.endsWith('.css')) scope.fullWeb = true
    } else if (!path.endsWith('.md') && !path.startsWith('scripts/') && !path.startsWith('demo/')) {
      scope.fullApi = true
      scope.fullWeb = true
    }
  }
  return scope
}

function gitPaths(args) {
  return execFileSync('git', args, { cwd: root }).toString('utf8').split('\0').filter(Boolean)
}

function run(label, executable, args, cwd = root) {
  console.log(`\n> ${label}`)
  const result = spawnSync(executable, args, {
    cwd,
    stdio: 'inherit',
    shell: executable === 'npm' && process.platform === 'win32',
  })
  if (result.error) throw result.error
  if (result.status === null)
    throw new Error(`${label} terminated without an exit code (${result.signal})`)
  if (result.status !== 0) process.exit(result.status)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arguments_ = process.argv.slice(2)
  const planOnly = arguments_.includes('--plan')
  const base = arguments_.find((value) => value !== '--plan') ?? 'origin/main'
  let paths
  try {
    // Untracked Markdown is often a concurrent Product Owner draft; stage it when ready to check.
    const untracked = gitPaths(['ls-files', '--others', '--exclude-standard', '-z'])
    paths = [
      ...new Set([
        ...gitPaths(['diff', '--name-only', '-z', base]),
        ...eligibleUntracked(untracked),
      ]),
    ]
    const deferred = untracked.filter((path) => path.endsWith('.md'))
    if (deferred.length)
      console.log(`Deferred ${deferred.length} untracked Markdown draft(s); stage to include.`)
  } catch {
    console.error(`Cannot determine changes from ${base}; choose an existing base ref.`)
    process.exit(2)
  }
  if (paths.length === 0) {
    console.log('No changed files; no local affected check to run.')
    process.exit(0)
  }
  const scope = scopeFor(paths)
  const missing = paths.filter((path) => !existsSync(resolve(root, path)))
  broadenForMissing(scope, missing)
  console.log(
    `Affected check (${base}): ${paths.length} changed file(s); API ${scope.fullApi ? 'full' : scope.api.length}; Web ${scope.fullWeb ? 'full' : scope.web.length}`,
  )
  if (scope.browserTouched) console.log('Browser E2E changed: GitHub browser-ui remains required.')
  if (planOnly) process.exit(0)
  const prettier = resolve(root, 'node_modules/prettier/bin/prettier.cjs')
  const present = eligibleForPrettier(paths.filter((path) => !missing.includes(path)))
  if (present.length)
    run('Changed-file formatting', process.execPath, [prettier, '--check', ...present])
  run('Diff whitespace', 'git', ['diff', '--check', base])
  if (paths.some((path) => path.startsWith('scripts/'))) {
    run('Script tests', process.execPath, [
      '--test',
      'scripts/affected-check.test.mjs',
      'scripts/ci-scope.test.mjs',
    ])
  }
  if (!scope.docsOnly)
    for (const [workspace, files, full, touched] of [
      ['api', scope.api, scope.fullApi, scope.apiTouched],
      ['web', scope.web, scope.fullWeb, scope.webTouched],
    ]) {
      if (!full && !touched) continue
      const cwd = resolve(root, 'apps', workspace)
      run(`${workspace} typecheck`, 'npm', ['run', 'typecheck'], cwd)
      if (!full && files.length === 0) {
        console.log(
          `${workspace}: no statically related tests; browser/visual evidence remains separate.`,
        )
        continue
      }
      const vitest = resolve(root, 'node_modules/vitest/vitest.mjs')
      run(
        `${workspace} ${full ? 'full' : 'related'} tests`,
        process.execPath,
        [vitest, ...vitestArguments(workspace, files, full)],
        cwd,
      )
    }
}
