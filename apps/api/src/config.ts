import { z } from 'zod'

const baseConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_JWT_AUDIENCE: z.string().min(1).default('authenticated'),
})

export type AppConfig = z.infer<typeof baseConfigSchema>

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  return baseConfigSchema.parse(environment)
}
