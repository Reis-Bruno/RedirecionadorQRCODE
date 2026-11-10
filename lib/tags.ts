import 'server-only'
import { cache } from 'react'
import { publicRpc } from './supabase/public'
import type { PublicTag } from './types'

export const getPublicTag = cache(async (slug: string): Promise<PublicTag | null> => {
  if (!/^[a-z0-9]{4,16}$/i.test(slug)) return null
  const { data, error } = await publicRpc<PublicTag[]>('public_get_tag', { p_slug: slug })
  if (error) {
    console.error('public_get_tag', error)
    throw new Error('Falha ao consultar a placa')
  }
  return data?.[0] ?? null
})
