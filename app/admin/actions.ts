'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, requireAdmin } from '@/lib/supabase/server'
import { normalizeOptionalUrl, targetFromForm } from '@/lib/targets'
import type { TagStatus } from '@/lib/types'

export interface ActionState {
  ok?: boolean
  error?: string
  message?: string
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}

export async function generateBatchAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const name = String(fd.get('batch_name') || '').trim()
  const qty = Number(fd.get('quantity'))
  if (!name) return { error: 'Informe o nome do lote.' }
  if (!Number.isInteger(qty) || qty < 1 || qty > 1000) return { error: 'Quantidade entre 1 e 1000.' }
  const { data, error } = await supabase.rpc('admin_generate_batch', { p_batch_name: name, p_quantity: qty })
  if (error) return { error: error.message }
  revalidatePath('/admin', 'layout')
  return { ok: true, message: `${data} placas criadas no lote "${name}".` }
}

export async function updateTagAction(id: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const str = (k: string) => {
    const v = String(fd.get(k) ?? '').trim()
    return v === '' ? null : v
  }
  const patch: Record<string, unknown> = {
    business_name: str('business_name'),
    client_name: str('client_name'),
    client_whatsapp: str('client_whatsapp'),
    logo_url: null,
    batch_name: str('batch_name') ?? 'Lote Inicial',
    routing_mode: fd.get('routing_mode') === 'SMART_FUNNEL' ? 'SMART_FUNNEL' : 'DIRECT_REDIRECT',
    allow_smart_funnel: fd.get('allow_smart_funnel') === 'on',
    funnel_offer_public_review: fd.get('funnel_offer_public_review') === 'on',
    billing_model: fd.get('billing_model') === 'MONTHLY' ? 'MONTHLY' : 'ONE_TIME',
    monthly_fee: Number(String(fd.get('monthly_fee') || '0').replace(',', '.')) || 0,
    next_due_date: str('next_due_date'),
    notes: str('notes'),
  }
  if (patch.routing_mode === 'SMART_FUNNEL') patch.allow_smart_funnel = true

  const logo = normalizeOptionalUrl(str('logo_url'))
  if (logo.error) return { error: 'Logo: ' + logo.error }
  patch.logo_url = logo.url ?? null

  const hasTarget = fd.get('target_value') || fd.get('wifi_ssid')
  if (hasTarget) {
    const t = targetFromForm(fd)
    if (t.error || !t.url) return { error: t.error ?? 'Destino inválido.' }
    patch.target_type = t.type
    patch.target_url = t.url
  }
  const sec = normalizeOptionalUrl(str('secondary_url'))
  if (sec.error) return { error: 'Link secundário: ' + sec.error }
  patch.secondary_url = sec.url ?? null

  const pin = str('pin_code')
  if (pin) {
    if (!/^\d{4,6}$/.test(pin)) return { error: 'PIN deve ter 4 a 6 dígitos.' }
    patch.pin_code = pin
  }

  const { error } = await supabase.from('nfc_tags').update(patch).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin', 'layout')
  return { ok: true, message: 'Placa salva.' }
}

export async function setStatusAction(id: string, status: TagStatus) {
  const { supabase } = await requireAdmin()
  const patch: Record<string, unknown> = { status }
  if (status === 'ACTIVE') {
    const { data } = await supabase.from('nfc_tags').select('activated_at').eq('id', id).single()
    if (!data?.activated_at) patch.activated_at = new Date().toISOString()
  }
  await supabase.from('nfc_tags').update(patch).eq('id', id)
  revalidatePath('/admin', 'layout')
}

/** Devolve a placa ao estoque (cliente cancelou): limpa dados, gera PIN novo. Mantém histórico de scans. */
export async function resetTagAction(id: string) {
  const { supabase } = await requireAdmin()
  const pin = String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, '0')
  await supabase
    .from('nfc_tags')
    .update({
      status: 'UNCLAIMED',
      pin_code: pin,
      business_name: null,
      client_name: null,
      client_whatsapp: null,
      logo_url: null,
      routing_mode: 'DIRECT_REDIRECT',
      target_type: 'GOOGLE_REVIEW',
      target_url: null,
      secondary_url: null,
      allow_smart_funnel: false,
      billing_model: 'ONE_TIME',
      monthly_fee: 0,
      next_due_date: null,
      activated_at: null,
    })
    .eq('id', id)
  revalidatePath('/admin', 'layout')
}

export async function regeneratePinAction(id: string) {
  const { supabase } = await requireAdmin()
  const pin = String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, '0')
  await supabase.from('nfc_tags').update({ pin_code: pin }).eq('id', id)
  revalidatePath('/admin', 'layout')
}

/** Avança o vencimento em 1 mês (pagamento recebido) e desbloqueia. */
export async function registerPaymentAction(id: string) {
  const { supabase } = await requireAdmin()
  const { data } = await supabase.from('nfc_tags').select('next_due_date,status').eq('id', id).single()
  const base = data?.next_due_date ? new Date(data.next_due_date + 'T12:00:00') : new Date()
  const next = new Date(base)
  next.setMonth(next.getMonth() + 1)
  await supabase
    .from('nfc_tags')
    .update({ next_due_date: next.toISOString().slice(0, 10), ...(data?.status === 'BLOCKED' ? { status: 'ACTIVE' } : {}) })
    .eq('id', id)
  revalidatePath('/admin', 'layout')
}

export async function toggleFeedbackAction(id: string, resolved: boolean) {
  const { supabase } = await requireAdmin()
  await supabase.from('private_feedbacks').update({ is_resolved: resolved }).eq('id', id)
  revalidatePath('/admin', 'layout')
}

export async function markNfcWrittenAction(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('nfc_tags').update({ nfc_written_at: new Date().toISOString() }).eq('id', id)
  return { ok: !error }
}

export async function setMasterPasswordAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const a = String(fd.get('password') || '')
  const b = String(fd.get('confirm') || '')
  if (a !== b) return { error: 'As senhas não conferem.' }
  const { data, error } = await supabase.rpc('admin_set_master_password', { p_password: a })
  if (error) return { error: error.message }
  if (data === 'too_short') return { error: 'Mínimo de 8 caracteres.' }
  revalidatePath('/admin/config')
  return { ok: true, message: 'Senha mestre atualizada.' }
}
