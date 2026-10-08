import { execFileSync } from 'node:child_process'
import { changedPaths, isReleaseCandidate } from './ci-scope.mjs'

try {
  execFileSync('git', ['merge-base', '--is-ancestor', 'HEAD', 'origin/main'])
} catch {
  throw new Error('Release commit is no longer an ancestor of Main')
}

if (isReleaseCandidate(changedPaths('HEAD', 'origin/main')))
  throw new Error('A newer code, migration, or release commit superseded this deployment')
