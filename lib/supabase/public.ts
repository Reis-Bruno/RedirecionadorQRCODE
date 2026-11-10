import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Cliente sem sessão: só consegue chamar as RPCs públicas (que exigem APP_SERVER_KEY).
let client: ReturnType<typeof createClient> | null = null
export function publicDb() {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}

/** Chamada de RPC pública já com a server key. */
export async function publicRpc<T = unknown>(fn: string, args: Record<string, unknown>) {
  const { serverKey } = await import('../env')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (publicDb() as any).rpc(fn, { p_key: serverKey(), ...args })
  return { data: data as T | null, error }
}
