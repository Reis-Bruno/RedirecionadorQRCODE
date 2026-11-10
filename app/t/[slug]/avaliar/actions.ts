'use server'

import { publicRpc } from '@/lib/supabase/public'
import { notifyFeedback } from '@/lib/notify'
import { after } from 'next/server'

export interface FeedbackState {
  ok?: boolean
  error?: string
}

export async function submitFeedbackAction(slug: string, _prev: FeedbackState, fd: FormData): Promise<FeedbackState> {
  const rating = Number(fd.get('rating'))
  const comment = String(fd.get('comment') || '').trim()
  if (!comment) return { error: 'Conte rapidamente o que aconteceu.' }
  if (!(rating >= 1 && rating <= 5)) return { error: 'Nota inválida.' }
  const name = String(fd.get('customer_name') || '')
  const contact = String(fd.get('customer_contact') || '')
  const { data, error } = await publicRpc<{ ok: boolean; error?: string; business_name?: string; client_whatsapp?: string }>(
    'submit_feedback',
    { p_slug: slug, p_rating: rating, p_name: name, p_contact: contact, p_comment: comment.slice(0, 2000) },
  )
  if (error || !data) return { error: 'Não foi possível enviar agora. Tente novamente.' }
  if (!data.ok) return { error: data.error === 'rate_limited' ? 'Muitos envios. Tente mais tarde.' : 'Não foi possível enviar.' }
  after(() =>
    notifyFeedback({
      slug,
      business_name: data.business_name,
      owner_whatsapp: data.client_whatsapp,
      rating,
      comment,
      customer_name: name || null,
      customer_contact: contact || null,
    }),
  )
  return { ok: true }
}
