import 'server-only'
import { cookies } from 'next/headers'

// O cookie guarda o fingerprint do PIN (sha256(pin||id)), que o banco revalida a cada request.
// Se o admin trocar o PIN, todas as sessões do portal daquela placa caem automaticamente.
const name = (slug: string) => `pp_${slug}`

export async function getPortalFp(slug: string) {
  return (await cookies()).get(name(slug))?.value ?? null
}
export async function setPortalFp(slug: string, fp: string) {
  ;(await cookies()).set(name(slug), fp, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: `/p/${slug}`,
    maxAge: 60 * 60 * 24 * 30,
  })
}
export async function clearPortalFp(slug: string) {
  ;(await cookies()).set(name(slug), '', { path: `/p/${slug}`, maxAge: 0 })
}
