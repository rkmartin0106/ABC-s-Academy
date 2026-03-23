// ─── Browser Client (singleton for Client Components) ────────────────────────
// Uses @supabase/ssr's createBrowserClient so the session is stored in cookies,
// which the middleware (also using @supabase/ssr) can read on every request.
// DO NOT use createClient from @supabase/supabase-js here — it uses localStorage
// and the middleware will never see the session.

import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createSupabaseBrowserClient() {
  if (client) return client
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return client
}
