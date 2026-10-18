import { Pool } from 'pg'
import type { FastifyInstance } from 'fastify'
import { BillingEventInbox, BillingEventWorker } from './event-inbox.js'
import { PostgresBillingInbox } from './postgres-inbox.js'
import { PostgresBillingManagement } from './postgres-management.js'
import { BillingManagementModule } from './management.js'
import { LemonTestResources } from './lemon-resources.js'
import { localBillingConfiguration } from './lemon-checkout.js'
import { PostgresTrialChange } from './postgres-trial-change.js'
import { TrialChangeModule } from './trial-change.js'
import { PaidChangeModule } from './paid-change.js'
import { PostgresPaidChange } from './postgres-paid-change.js'
import { ReconciliationError } from './resources.js'
import { MissingBillingEventRecovery } from './missing-event-recovery.js'
import type { BillingEnvironment } from './billing-sql.js'

export type BillingLifecycleConfiguration = {
  environment: BillingEnvironment
  checkout: NonNullable<ReturnType<typeof localBillingConfiguration>>
  secret: string
  workerDatabaseUrl: string
}

export function localLifecycleConfiguration(env: NodeJS.ProcessEnv) {
  if (env.BILLING_LOCAL_LIFECYCLE !== 'true') return null
  if (env.DEPLOYMENT_TARGET === 'production' || env.NODE_ENV === 'production') {
    throw new Error('Local lifecycle cannot run in Production')
  }
  // PO deferred provider testing. This second, explicit switch must stay off until that handoff.
  if (env.BILLING_PROVIDER_TESTS_APPROVED !== 'true')
    throw new Error('Provider testing remains disabled')
  const checkout = localBillingConfiguration(env)
  if (!checkout || !env.LEMON_SQUEEZY_WEBHOOK_SECRET || !env.BILLING_WORKER_DATABASE_URL) {
    throw new Error('Local lifecycle configuration is incomplete')
  }
  return {
    environment: 'test' as const,
    checkout,
    secret: env.LEMON_SQUEEZY_WEBHOOK_SECRET,
    workerDatabaseUrl: env.BILLING_WORKER_DATABASE_URL,
  }
}

export function createBillingLifecycle(config: BillingLifecycleConfiguration, ownerPool: Pool) {
  const workerPool = new Pool({
    connectionString: config.workerDatabaseUrl,
    max: 2,
    connectionTimeoutMillis: 10000,
  })
  const repository = new PostgresBillingInbox(
    workerPool,
    config.checkout.variants,
    config.environment,
  )
  const provider = new LemonTestResources({
    key: config.checkout.key,
    storeId: config.checkout.storeId,
    variantIds: Object.values(config.checkout.variants),
    environment: config.environment,
  })
  const worker = new BillingEventWorker(repository, provider, () => new Date(), config.environment)
  const missingEventRecovery = new MissingBillingEventRecovery(
    repository,
    provider,
    config.checkout.storeId,
    config.environment,
  )
  return {
    environment: config.environment,
    billingInbox: new BillingEventInbox(
      repository,
      config.checkout.storeId,
      config.secret,
      config.environment,
    ),
    billingManagement: new BillingManagementModule(
      new PostgresBillingManagement(ownerPool, config.environment),
      provider,
    ),
    trialChange: new TrialChangeModule(
      new PostgresTrialChange(ownerPool, config.checkout.variants, config.environment),
      provider,
    ),
    paidChange: new PaidChangeModule(
      new PostgresPaidChange(ownerPool, config.checkout.variants, config.environment),
      provider,
    ),
    attach(server: FastifyInstance) {
      let stopped = false
      let running: Promise<void> | null = null
      let recoveryRunning: Promise<void> | null = null
      const tick = () => {
        if (stopped || running) return
        running = (async () => {
          // Bounded batches and one in-process runner; SQL leases coordinate other processes.
          for (let count = 0; !stopped && count < 10; count++) if (!(await worker.runOne())) break
        })()
          .catch(() => {
            server.log.warn('billing_worker_unavailable')
          })
          .finally(() => {
            running = null
          })
      }
      const timer = setInterval(tick, 5000)
      timer.unref()
      const recoveryTick = () => {
        if (stopped || recoveryRunning) return
        recoveryRunning = missingEventRecovery
          .scanBatch()
          .then((result) => {
            if (result.skipped > 0)
              server.log.warn(result, 'billing_missing_event_recovery_skipped_unknown_variant')
            else server.log.info(result, 'billing_missing_event_recovery_scanned')
          })
          .catch((error: unknown) => {
            const code = error instanceof ReconciliationError ? error.code : 'recovery_failed'
            server.log.warn({ code }, 'billing_missing_event_recovery_unavailable')
          })
          .finally(() => {
            recoveryRunning = null
          })
      }
      const recoveryTimer = setInterval(recoveryTick, 5 * 60_000)
      recoveryTimer.unref()
      recoveryTick()
      server.addHook('onClose', async () => {
        stopped = true
        clearInterval(timer)
        clearInterval(recoveryTimer)
        await running
        await recoveryRunning
        await workerPool.end()
      })
    },
  }
}

export function createLocalLifecycle(env: NodeJS.ProcessEnv, ownerPool: Pool) {
  const config = localLifecycleConfiguration(env)
  return config ? createBillingLifecycle(config, ownerPool) : null
}
