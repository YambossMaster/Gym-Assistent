import { readFile } from 'node:fs/promises'
import { previewDemoStudentEntitlement } from './demo-student-entitlement.js'

const inputPath = process.argv[2]
if (!inputPath) {
  console.error('Usage: npm run migration:preview:m3 -- <demo-export.json>')
  process.exitCode = 1
} else {
  try {
    const source = JSON.parse(await readFile(inputPath, 'utf8')) as unknown
    const preview = previewDemoStudentEntitlement(source)
    console.log(
      JSON.stringify(
        {
          source: preview.source,
          mapped: {
            students: preview.mapped.students.length,
            purchases: preview.mapped.purchases.length,
          },
          rejected: preview.rejected,
          warnings: preview.warnings,
          checksum: preview.checksum,
        },
        null,
        2,
      ),
    )
  } catch (error) {
    console.error(
      error instanceof Error ? `M3 preview failed: ${error.message}` : 'M3 preview failed.',
    )
    process.exitCode = 1
  }
}
