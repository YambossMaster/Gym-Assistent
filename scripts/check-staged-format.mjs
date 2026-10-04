import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const staged = execFileSync('git', ['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR'])
  .toString('utf8')
  .split('\0')
  .filter((file) => file && /\.(css|html|js|jsx|json|md|mjs|ts|tsx|yaml|yml)$/i.test(file))
  .filter((file) => existsSync(file))

if (staged.length) {
  const prettier = join(process.cwd(), 'node_modules', 'prettier', 'bin', 'prettier.cjs')
  if (!existsSync(prettier)) {
    console.error('Run npm ci before committing so the local format guard can run.')
    process.exit(1)
  }
  const unformatted = []
  for (const file of staged) {
    const contents = execFileSync('git', ['show', `:${file}`], { encoding: 'utf8' })
    const result = spawnSync(process.execPath, [prettier, '--stdin-filepath', file], {
      input: contents,
      encoding: 'utf8',
    })
    if (result.error) throw result.error
    if (result.status !== 0) {
      process.stderr.write(result.stderr)
      process.exit(result.status ?? 1)
    }
    if (result.stdout !== contents) unformatted.push(file)
  }
  if (unformatted.length) {
    console.error(
      `Staged files need formatting:\n${unformatted.join('\n')}\nRun Prettier, then stage again.`,
    )
    process.exit(1)
  }
  console.log(`Staged formatting passed (${staged.length} file${staged.length === 1 ? '' : 's'}).`)
}
