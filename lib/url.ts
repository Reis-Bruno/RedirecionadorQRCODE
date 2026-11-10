import 'server-only'
import { headers } from 'next/headers'

/** URL base pública. Em produção, defina NEXT_PUBLIC_APP_URL para os QR/NFC apontarem para o domínio certo. */
export async function getBaseUrl(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_APP_URL
  if (env) return env.replace(/\/$/, '')
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000'
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

export function tagUrl(base: string, slug: string, source?: 'nfc' | 'qr') {
  return `${base}/t/${slug}${source === 'nfc' ? '?s=nfc' : ''}`
}
