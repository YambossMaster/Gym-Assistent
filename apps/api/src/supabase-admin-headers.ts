export function supabaseAdminHeaders(secretKey: string): Record<string, string> {
  return secretKey.startsWith('sb_secret_')
    ? { apikey: secretKey }
    : { apikey: secretKey, authorization: `Bearer ${secretKey}` }
}
