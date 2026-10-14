import { Pool } from 'pg'
import type { FastifyInstance } from 'fastify'
import { BillingEventInbox, BillingEventWorker } from './event-inbox.js'
import { PostgresBillingInbox } from './postgres-inbox.js'
import { PostgresBillingManagement } from './postgres-management.js'
import { BillingManagementModule } from './management.js'
import { LemonTestResources } from './lemon-resources.js'
import { localBillingConfiguration } from './lemon-checkout.js'

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
    checkout,
    secret: env.LEMON_SQUEEZY_WEBHOOK_SECRET,
    workerDatabaseUrl: env.BILLING_WORKER_DATABASE_URL,
  }
}

export function createLocalLifecycle(env: NodeJS.ProcessEnv, ownerPool: Pool) {
  const config = localLifecycleConfiguration(env)
  if (!config) return null
  const workerPool = new Pool({
    connectionString: config.workerDatabaseUrl,
    max: 2,
    connectionTimeoutMillis: 10000,
  })
  const repository = new PostgresBillingInbox(workerPool, config.checkout.variants)
  const provider = new LemonTestResources({
    key: config.checkout.key,
    storeId: config.checkout.storeId,
    variantIds: Object.values(config.checkout.variants),
  })
  const worker = new BillingEventWorker(repository, provider)
  return {
    billingInbox: new BillingEventInbox(repository, config.checkout.storeId, config.secret),
    billingManagement: new BillingManagementModule(
      new PostgresBillingManagement(ownerPool),
      provider,
    ),
    attach(server: FastifyInstance) {
      let stopped = false
      let running: Promise<void> | null = null
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
      server.addHook('onClose', async () => {
        stopped = true
        clearInterval(timer)
        await running
        await workerPool.end()
      })
    },
  }
}
