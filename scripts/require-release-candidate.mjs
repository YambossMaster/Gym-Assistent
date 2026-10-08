import { changedPaths, isReleaseCandidate } from './ci-scope.mjs'

if (!isReleaseCandidate(changedPaths('HEAD^', 'HEAD')))
  throw new Error('A docs-only or empty commit has no full CI gate and cannot be released')
