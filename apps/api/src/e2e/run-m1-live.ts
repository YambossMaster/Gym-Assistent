import { z } from 'zod'
import { M1LiveE2eError, runM1LiveE2e } from './m1-live.js'

const environmentSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  API_BASE_URL: z.string().url(),
  COACH_A_EMAIL: z.string().email(),
  COACH_A_PASSWORD: z.string().min(1),
  COACH_B_EMAIL: z.string().email(),
  COACH_B_PASSWORD: z.string().min(1),
})

const parsed = environmentSchema.safeParse(process.env)
if (!parsed.success) {
  const missingOrInvalid = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')
  console.error(`M1 live E2E configuration is missing or invalid: ${missingOrInvalid}`)
  process.exitCode = 1
} else {
  try {
    const result = await runM1LiveE2e({
      supabaseUrl: parsed.data.SUPABASE_URL,
      supabasePublishableKey: parsed.data.SUPABASE_PUBLISHABLE_KEY,
      apiBaseUrl: parsed.data.API_BASE_URL,
      coachA: { email: parsed.data.COACH_A_EMAIL, password: parsed.data.COACH_A_PASSWORD },
      coachB: { email: parsed.data.COACH_B_EMAIL, password: parsed.data.COACH_B_PASSWORD },
    })
    console.log(`M1 live E2E passed for student ${result.studentId}.`)
    for (const check of result.checks) console.log(`- ${check}`)
  } catch (error) {
    if (error instanceof M1LiveE2eError) {
      console.error(`M1 live E2E failed: ${error.message}`)
    } else {
      console.error('M1 live E2E failed with an unexpected error.')
    }
    process.exitCode = 1
  }
}
