import { createClient } from '@supabase/supabase-js'
import { loadWebConfig } from './config'

const config = loadWebConfig()

export const supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})
