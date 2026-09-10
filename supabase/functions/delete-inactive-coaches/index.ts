import '@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from '@supabase/server'

interface DeletionCandidate {
  user_id: string
}

function hasValidCronToken(request: Request): boolean {
  const expected = Deno.env.get('GYM_ASSISTANT_LIFECYCLE_CRON_TOKEN')
  const received = request.headers.get('x-gym-assistant-lifecycle-token')
  if (!expected || !received) return false

  const length = Math.max(expected.length, received.length)
  let difference = expected.length ^ received.length
  for (let index = 0; index < length; index += 1) {
    difference |= (expected.charCodeAt(index) || 0) ^ (received.charCodeAt(index) || 0)
  }
  return difference === 0
}

export default {
  fetch: withSupabase({ auth: 'none' }, async (request, context) => {
    if (request.method !== 'POST') {
      return new Response(null, { status: 405, headers: { allow: 'POST' } })
    }
    if (!hasValidCronToken(request)) return new Response(null, { status: 401 })

    const { data, error } = await context.supabaseAdmin.rpc('claim_due_account_deletions', {
      p_limit: 100,
    })
    if (error) {
      console.error('Unable to claim due account deletions', { code: error.code })
      return Response.json({ message: 'Unable to claim due account deletions' }, { status: 500 })
    }

    let deleted = 0
    let failed = 0
    for (const { user_id: userId } of (data ?? []) as DeletionCandidate[]) {
      const { error: deletionError } = await context.supabaseAdmin.auth.admin.deleteUser(userId)
      if (!deletionError) {
        deleted += 1
        continue
      }

      failed += 1
      const { error: releaseError } = await context.supabaseAdmin.rpc(
        'release_due_account_deletion',
        {
          p_user_id: userId,
        },
      )
      if (releaseError)
        console.error('Unable to release failed account deletion claim', {
          code: releaseError.code,
        })
    }

    return Response.json({ deleted, failed })
  }),
}
