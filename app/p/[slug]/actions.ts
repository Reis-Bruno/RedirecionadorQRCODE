'use server'

import { revalidatePath } from 'next/cache'
import { publicRpc } from '@/lib/supabase/public'
import { clearPortalFp, getPortalFp, setPortalFp } from '@/lib/portal-session'
import { normalizeOptionalUrl, targetFromForm } from '@/lib/targets'

export interface PortalState {
  ok?: boolean
  error?: string
}

export async function portalLoginAction(slug: string, _p: PortalState, fd: FormData): Promise<PortalState> {
  const pin = String(fd.get('pin') || '').trim()
  if (!/^\d{4,6}$/.test(pin)) return { error: 'PIN inválido.' }
  const { data, error } = await publicRpc<string>('portal_login', { p_slug: slug, p_pin: pin })
  if (error) return { error: 'Erro ao entrar. Tente novamente.' }
  if (data?.startsWith('ok:')) {
    await setPortalFp(slug, data.slice(3))
    revalidatePath(`/p/${slug}`)
    return { ok: true }
  }
  if (data === 'locked') return { error: 'Muitas tentativas. Aguarde 15 minutos.' }
  if (data === 'not_found') return { error: 'Placa não encontrada ou ainda não ativada.' }
  return { error: 'PIN incorreto.' }
}

export async function portalLogoutAction(slug: string) {
  await clearPortalFp(slug)
  revalidatePath(`/p/${slug}`)
}

export async function portalUpdateTargetAction(slug: string, _p: PortalState, fd: FormData): Promise<PortalState> {
  const fp = await getPortalFp(slug)
  if (!fp) return { error: 'Sessão expirada. Entre novamente.' }
  const target = targetFromForm(fd)
  if (target.error || !target.url) return { error: target.error ?? 'Destino inválido.' }
  const secondary = normalizeOptionalUrl(String(fd.get('secondary_url') || ''))
  if (secondary.error) return { error: 'Link secundário: ' + secondary.error }
  const { data, error } = await publicRpc<string>('portal_update_target', {
    p_slug: slug,
    p_fp: fp,
    p_routing_mode: String(fd.get('routing_mode') || 'DIRECT_REDIRECT'),
    p_target_type: target.type,
    p_target_url: target.url,
    p_secondary_url: secondary.url ?? '',
  })
  if (error) return { error: 'Erro ao salvar.' }
  const msg: Record<string, string> = {
    unauthorized: 'Sessão expirada. Entre novamente.',
    not_active: 'Placa não está ativa.',
    invalid_url: 'Destino inválido.',
    funnel_not_allowed: 'O Funil Blindado é um recurso premium. Fale com seu consultor para liberar.',
  }
  if (data !== 'ok') return { error: msg[data ?? ''] ?? 'Não foi possível salvar.' }
  revalidatePath(`/p/${slug}`)
  return { ok: true }
}

export async function portalResolveFeedbackAction(slug: string, id: string, resolved: boolean) {
  const fp = await getPortalFp(slug)
  if (!fp) return
  await publicRpc('portal_resolve_feedback', { p_slug: slug, p_fp: fp, p_feedback_id: id, p_resolved: resolved })
  revalidatePath(`/p/${slug}`)
}
