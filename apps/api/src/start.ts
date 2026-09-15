import { Pool } from 'pg'
import { PostgresStudentRepository } from './adapters/postgres-student-repository.js'
import { loadConfig } from './config.js'
import { buildServer } from './http/server.js'
import { OidcIdentityVerifier } from './identity/oidc-identity.js'
import { StudentModule } from './students/student-module.js'
import { TodayModule } from './today/today-module.js'
import { WorkspaceModule } from './workspace/workspace-module.js'
import { AccountLifecycleModule } from './account-lifecycle/account-lifecycle-module.js'
import { SupabaseAccountDeletionExecutor } from './account-lifecycle/supabase-account-deletion-executor.js'
import { SupabaseRegistrationEmailLookup } from './account-registration/supabase-registration-email-lookup.js'
import { SchedulingModule } from './scheduling/scheduling-module.js'
import { PostgresSchedulingRepository } from './adapters/postgres-scheduling-repository.js'
import { PostgresTrainingRepository } from './adapters/postgres-training-repository.js'
import { TrainingModule } from './training/training-module.js'
import { PostgresPublicAccessRepository } from './adapters/postgres-public-access-repository.js'
import { PublicAccessModule } from './public-access/public-access-module.js'
import { DemoImportModule } from './demo-import/demo-import.js'
import { PostgresDemoImportRepository } from './adapters/postgres-demo-import-repository.js'

const config = loadConfig()
const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
})
const repository = new PostgresStudentRepository(pool)
const supabaseIssuer = `${config.SUPABASE_URL.replace(/\/$/, '')}/auth/v1`
const identityVerifier = new OidcIdentityVerifier({
  issuer: supabaseIssuer,
  audience: config.SUPABASE_JWT_AUDIENCE,
  jwksUrl: `${supabaseIssuer}/.well-known/jwks.json`,
})
const server = buildServer({
  identityVerifier,
  students: new StudentModule({ repository }),
  today: new TodayModule(repository),
  workspace: new WorkspaceModule({ repository }),
  accountLifecycle: new AccountLifecycleModule({
    repository,
    deletionExecutor: new SupabaseAccountDeletionExecutor({
      supabaseUrl: config.SUPABASE_URL,
      secretKey: config.SUPABASE_SECRET_KEY,
    }),
  }),
  registrationEmails: new SupabaseRegistrationEmailLookup({
    supabaseUrl: config.SUPABASE_URL,
    ...(config.SUPABASE_SECRET_KEY ? { secretKey: config.SUPABASE_SECRET_KEY } : {}),
  }),
  scheduling: new SchedulingModule(new PostgresSchedulingRepository(pool)),
  training: new TrainingModule(new PostgresTrainingRepository(pool)),
  publicAccess: new PublicAccessModule(
    new PostgresPublicAccessRepository(pool),
    config.CAPABILITY_RATE_LIMIT_SECRET ?? config.SUPABASE_SECRET_KEY ?? config.DATABASE_URL,
  ),
  demoImport: new DemoImportModule(new PostgresDemoImportRepository(pool)),
  logger: {
    redact: {
      paths: [
        'req.headers.x-capability-token',
        'req.body.token',
        'req.body.students',
        'req.body.purchases',
        'req.body.records',
        'req.body.links',
        'res.body.token',
      ],
      censor: '[REDACTED]',
    },
  },
})

server.addHook('onClose', async () => {
  await pool.end()
})

await server.listen({ host: config.HOST, port: config.PORT })
