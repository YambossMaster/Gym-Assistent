import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const contractPath = new URL('../deploy/production-runtime-secrets.json', import.meta.url)

const secretName = (entry) => {
  if (!entry || typeof entry !== 'object') return null
  const name = entry.Name ?? entry.name
  return typeof name === 'string' && name.length > 0 ? name : null
}

export function inspectProductionRuntimeSecrets(inventory, contract) {
  if (!Array.isArray(inventory)) throw new Error('Invalid Fly secret inventory')
  if (!contract || !Array.isArray(contract.required) || !Array.isArray(contract.featureRequired)) {
    throw new Error('Invalid Production runtime secret contract')
  }

  const available = new Set(inventory.map(secretName).filter(Boolean))
  const missingRequired = contract.required.filter((name) => !available.has(name))
  if (missingRequired.length > 0) {
    throw new Error(`Missing required Production runtime secrets: ${missingRequired.join(', ')}`)
  }

  return {
    required: [...contract.required],
    missingFeatures: contract.featureRequired
      .filter(({ name }) => !available.has(name))
      .map(({ name, unavailableWithout }) => `${name}: ${unavailableWithout}`),
    missingRecommended: (contract.recommended ?? [])
      .filter(({ name }) => !available.has(name))
      .map(({ name, reason }) => `${name}: ${reason}`),
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const inventory = JSON.parse(readFileSync(0, 'utf8'))
  const contract = JSON.parse(readFileSync(contractPath, 'utf8'))
  const result = inspectProductionRuntimeSecrets(inventory, contract)
  console.log(
    `Production runtime secret preflight passed (${result.required.length} required names).`,
  )
  for (const missing of result.missingFeatures) {
    console.warn(`::warning::Missing feature runtime secret: ${missing}`)
  }
  for (const missing of result.missingRecommended) {
    console.warn(`::warning::Missing recommended runtime secret: ${missing}`)
  }
}
