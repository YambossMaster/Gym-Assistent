import { previewM5Training } from './preview-m5-training.js'
const result = previewM5Training()
if (result.manifestCount !== 100 || result.duplicateKeys || result.rejections.length)
  throw new Error('M5 manifest validation failed')
console.log(JSON.stringify(result, null, 2))
