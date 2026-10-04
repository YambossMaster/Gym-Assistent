import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

let root
try {
  root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
} catch {
  // Package installs outside a Git checkout do not need local hooks.
  process.exit(0)
}
if (resolve(root) === resolve(process.cwd())) {
  execFileSync('git', ['config', '--local', 'core.hooksPath', '.githooks'])
  console.log('Local pre-commit format hook enabled.')
}
