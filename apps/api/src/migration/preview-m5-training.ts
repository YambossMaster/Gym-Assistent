import { createHash } from 'node:crypto'
import { trainingCatalog } from '../training/catalog.js'

export function previewM5Training() {
  const checksum = createHash('sha256').update(JSON.stringify(trainingCatalog)).digest('hex')
  const duplicateKeys =
    trainingCatalog.length - new Set(trainingCatalog.map((x) => x.catalogKey)).size
  const invalid = trainingCatalog.filter(
    (x) => !x.name.trim() || !x.equipment.trim() || !x.bodyParts.length,
  )
  return {
    manifestCount: trainingCatalog.length,
    duplicateKeys,
    rejections: invalid.map((x) => x.catalogKey),
    checksum,
    preservedLegacyRows: true,
    createdHistoricalTrainingFacts: 0,
  }
}
if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}`) {
  const result = previewM5Training()
  if (result.manifestCount !== 100 || result.duplicateKeys || result.rejections.length)
    throw new Error('M5 manifest validation failed')
  console.log(JSON.stringify(result, null, 2))
}
