import { Pool } from 'pg'
import { loadConfig } from '../config.js'
import {
  setAccountClassification,
  type AccountClass,
  type TestKind,
} from './account-classification.js'

const config = loadConfig()
if (config.DEPLOYMENT_TARGET === 'production') {
  const ref = config.EXPECTED_SUPABASE_PROJECT_REF
  if (!ref || config.SUPABASE_URL.replace(/\/$/, '') !== `https://${ref}.supabase.co`)
    throw new Error('Production Supabase project mismatch')
  const database = new URL(config.DATABASE_URL)
  const directHost = database.hostname === `db.${ref}.supabase.co`
  const sessionPooler =
    database.hostname.endsWith('.pooler.supabase.com') &&
    decodeURIComponent(database.username).endsWith(`.${ref}`)
  if (!directHost && !sessionPooler) throw new Error('Production database project mismatch')
}
const pool = new Pool({ connectionString: config.DATABASE_URL, max: 1 })

async function main(args: string[]) {
  process.stdout.write(
    `Target: ${config.DEPLOYMENT_TARGET}${config.EXPECTED_SUPABASE_PROJECT_REF ? ` / ${config.EXPECTED_SUPABASE_PROJECT_REF}` : ''}\n`,
  )
  const [action, ...values] = args
  if (action === 'set') {
    const [userId, accountClass, testKindText, actor, ...reasonWords] = values
    const changed = await setAccountClassification(pool, {
      userId: userId ?? '',
      accountClass: accountClass as AccountClass,
      testKind: testKindText === '-' ? null : (testKindText as TestKind),
      actor: actor ?? '',
      reason: reasonWords.join(' '),
    })
    process.stdout.write(
      changed ? 'Classification saved and audited.\n' : 'Classification unchanged.\n',
    )
    return
  }
  if (action === 'list') {
    const result = await pool.query(
      `select w.owner_user_id as user_id,
              coalesce(c.account_class,'unclassified') as account_class,
              c.test_kind,c.classified_at
       from app_private.workspace w
       left join app_private.account_reporting_classification c on c.user_id=w.owner_user_id
       order by w.created_at,w.owner_user_id`,
    )
    process.stdout.write(`${JSON.stringify(result.rows, null, 2)}\n`)
    return
  }
  throw new Error(
    'Usage: set <user-uuid> <real|test> <owner|manual|automation|-> <actor> <reason...> | list',
  )
}

void main(process.argv.slice(2))
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Operator command failed'}\n`)
    process.exitCode = 1
  })
  .finally(() => pool.end())
