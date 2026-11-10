import 'server-only'

export function serverKey(): string {
  const k = process.env.APP_SERVER_KEY
  if (!k) throw new Error('APP_SERVER_KEY não configurada')
  return k
}

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
