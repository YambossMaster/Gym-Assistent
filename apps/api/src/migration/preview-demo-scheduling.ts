import { readFile } from 'node:fs/promises'
import { previewDemoScheduling } from './demo-scheduling.js'

const path = process.argv[2]
if (!path) {
  console.error('Usage: npm run migration:preview:m4 -- <demo-export.json>')
  process.exitCode = 1
} else {
  try {
    const source = JSON.parse(await readFile(path, 'utf8'))
    console.log(JSON.stringify(previewDemoScheduling(source), null, 2))
  } catch (error) {
    console.error(
      error instanceof Error ? `M4 preview failed: ${error.message}` : 'M4 preview failed.',
    )
    process.exitCode = 1
  }
}
