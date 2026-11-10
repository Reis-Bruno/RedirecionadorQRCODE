'use client'

import { useActionState } from 'react'
import { TargetFields } from '@/components/TargetFields'
import { SubmitButton } from '@/components/SubmitButton'
import type { Tag } from '@/lib/types'
import { updateTagAction, type ActionState } from '../../../actions'

export function TagForm({ tag }: { tag: Tag }) {
  const [state, action] = useActionState<ActionState, FormData>(updateTagAction.bind(null, tag.id), {})
  return (
    <form action={action} className="space-y-5">
      <section className="card space-y-3">
        <h2 className="font-semibold">Estabelecimento</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Nome da loja</label>
            <input name="business_name" defaultValue={tag.business_name ?? ''} className="input" maxLength={150} />
          </div>
          <div>
            <label className="label">Logo (URL, opcional)</label>
            <input name="logo_url" defaultValue={tag.logo_url ?? ''} className="input" placeholder="https://..." />
          </div>
          <div>
            <label className="label">Responsável</label>
            <input name="client_name" defaultValue={tag.client_name ?? ''} className="input" maxLength={100} />
          </div>
          <div>
            <label className="label">WhatsApp do responsável</label>
            <input name="client_whatsapp" defaultValue={tag.client_whatsapp ?? ''} className="input" inputMode="tel" maxLength={30} />
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Redirecionamento</h2>
        <TargetFields defaultType={tag.target_type} defaultUrl={tag.target_url} />
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-start gap-2 rounded-xl border border-zinc-200 p-3 text-sm">
            <input type="radio" name="routing_mode" value="DIRECT_REDIRECT" defaultChecked={tag.routing_mode === 'DIRECT_REDIRECT'} className="mt-1" />
            <span><b>Direto</b> — 307 instantâneo para o destino.</span>
          </label>
          <label className="flex items-start gap-2 rounded-xl border border-zinc-200 p-3 text-sm">
            <input type="radio" name="routing_mode" value="SMART_FUNNEL" defaultChecked={tag.routing_mode === 'SMART_FUNNEL'} className="mt-1" />
            <span><b>Funil Blindado</b> — 4–5★ vão ao destino; 1–3★ viram feedback privado.</span>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="allow_smart_funnel" defaultChecked={tag.allow_smart_funnel} />
          Lojista pode ligar o Funil Blindado sozinho (recurso premium liberado)
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="funnel_offer_public_review" defaultChecked={tag.funnel_offer_public_review} className="mt-1" />
          <span>
            Após feedback negativo, ainda mostrar link discreto para avaliar no Google
            <span className="block text-xs text-amber-700">Recomendado: desligar isso caracteriza “review gating”, proibido pela política do Google, e pode levar à remoção de avaliações do perfil.</span>
          </span>
        </label>
        <div>
          <label className="label">Link secundário (após feedback)</label>
          <input name="secondary_url" defaultValue={tag.secondary_url ?? ''} className="input" placeholder="@instagram ou https://..." />
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Comercial</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Plano</label>
            <select name="billing_model" defaultValue={tag.billing_model} className="input">
              <option value="ONE_TIME">Venda única</option>
              <option value="MONTHLY">Assinatura mensal</option>
            </select>
          </div>
          <div>
            <label className="label">Mensalidade (R$)</label>
            <input name="monthly_fee" defaultValue={String(tag.monthly_fee ?? 0)} className="input" inputMode="decimal" />
          </div>
          <div>
            <label className="label">Próximo vencimento</label>
            <input type="date" name="next_due_date" defaultValue={tag.next_due_date ?? ''} className="input" />
          </div>
          <div>
            <label className="label">Lote</label>
            <input name="batch_name" defaultValue={tag.batch_name} className="input" maxLength={100} />
          </div>
          <div>
            <label className="label">PIN (4–6 dígitos)</label>
            <input name="pin_code" defaultValue={tag.pin_code} className="input font-mono" inputMode="numeric" maxLength={6} />
          </div>
        </div>
        <div>
          <label className="label">Anotações</label>
          <textarea name="notes" defaultValue={tag.notes ?? ''} rows={3} className="input" />
        </div>
      </section>

      {state.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.message}</p>}
      <div className="sticky bottom-20 md:bottom-4">
        <SubmitButton className="btn-primary w-full py-3 shadow-lg">Salvar alterações</SubmitButton>
      </div>
    </form>
  )
}
