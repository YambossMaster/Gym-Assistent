import { z } from 'zod'

const baseConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DEPLOYMENT_TARGET: z.enum(['local', 'production']).default('local'),
  EXPECTED_SUPABASE_PROJECT_REF: z
    .string()
    .regex(/^[a-z0-9]{20}$/)
    .optional(),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_JWT_AUDIENCE: z.string().min(1).default('authenticated'),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  CAPABILITY_RATE_LIMIT_SECRET: z.string().min(32).optional(),
  BETA_ADMISSION_SECRET: z.string().min(32).optional(),
})

export type AppConfig = z.infer<typeof baseConfigSchema>

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  return baseConfigSchema.parse(environment)
}
