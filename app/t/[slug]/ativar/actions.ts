'use server'

import { publicRpc } from '@/lib/supabase/public'
import { normalizeOptionalUrl, targetFromForm } from '@/lib/targets'

export interface ActivateState {
  ok?: boolean
  error?: string
  kind?: 'pin' | 'master'
}

const MESSAGES: Record<string, string> = {
  not_found: 'Placa não encontrada.',
  already_active: 'Esta placa já foi ativada.',
  invalid_credential: 'PIN ou senha mestre incorretos.',
  missing_fields: 'Preencha o nome da loja e o destino.',
  invalid_url: 'Destino inválido.',
  locked: 'Muitas tentativas erradas. Aguarde 15 minutos.',
}

export async function activateAction(slug: string, _prev: ActivateState, fd: FormData): Promise<ActivateState> {
  const credential = String(fd.get('credential') || '').trim()
  const business = String(fd.get('business_name') || '').trim()
  if (!credential) return { error: 'Informe o PIN da placa ou a senha mestre.' }
  if (!business) return { error: 'Informe o nome do estabelecimento.' }
  const target = targetFromForm(fd)
  if (target.error || !target.url) return { error: target.error ?? 'Destino inválido.' }
  const secondary = normalizeOptionalUrl(String(fd.get('secondary_url') || ''))
  if (secondary.error) return { error: 'Link secundário: ' + secondary.error }

  const { data, error } = await publicRpc<string>('activate_tag', {
    p_slug: slug,
    p_credential: credential,
    p_business_name: business,
    p_client_name: String(fd.get('client_name') || ''),
    p_client_whatsapp: String(fd.get('client_whatsapp') || ''),
    p_routing_mode: String(fd.get('routing_mode') || 'DIRECT_REDIRECT'),
    p_target_type: target.type,
    p_target_url: target.url,
    p_secondary_url: secondary.url ?? '',
  })
  if (error) {
    console.error('activate_tag', error)
    return { error: 'Erro ao ativar. Tente novamente.' }
  }
  if (data?.startsWith('ok:')) return { ok: true, kind: data.slice(3) as 'pin' | 'master' }
  return { error: MESSAGES[data ?? ''] ?? 'Não foi possível ativar.' }
}
