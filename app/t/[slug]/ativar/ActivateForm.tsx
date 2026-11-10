'use client'

import { useActionState, useState } from 'react'
import { TargetFields } from '@/components/TargetFields'
import { SubmitButton } from '@/components/SubmitButton'
import { activateAction, type ActivateState } from './actions'

export function ActivateForm({ slug }: { slug: string }) {
  const [state, action] = useActionState<ActivateState, FormData>(activateAction.bind(null, slug), {})
  const [more, setMore] = useState(false)

  if (state.ok) {
    return (
      <div className="card space-y-4 text-center">
        <div className="text-5xl">✅</div>
        <h2 className="text-xl font-bold">Placa ativada!</h2>
        <p className="text-zinc-600">Aproxime o celular de novo ou leia o QR Code para testar.</p>
        <a href={`/t/${slug}`} className="btn-primary w-full">Testar agora</a>
        <a href={`/p/${slug}`} className="btn-secondary w-full">Abrir painel do lojista</a>
        <p className="text-xs text-zinc-500">
          O lojista acessa o painel em <b>/p/{slug}</b> com o PIN do cartão que acompanha a placa.
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="card space-y-4">
      <div>
        <label className="label" htmlFor="credential">PIN da placa ou senha mestre</label>
        <input id="credential" name="credential" type="password" className="input" autoComplete="off" required />
      </div>
      <div>
        <label className="label" htmlFor="business_name">Nome do estabelecimento</label>
        <input id="business_name" name="business_name" className="input" required maxLength={150} />
      </div>

      <TargetFields />

      <button type="button" onClick={() => setMore((v) => !v)} className="text-sm font-medium text-brand-600">
        {more ? '− Menos opções' : '+ Dados do cliente e Funil Blindado'}
      </button>

      {more && (
        <div className="space-y-3 rounded-xl bg-zinc-50 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="client_name">Nome do responsável</label>
              <input id="client_name" name="client_name" className="input" maxLength={100} />
            </div>
            <div>
              <label className="label" htmlFor="client_whatsapp">WhatsApp do responsável</label>
              <input id="client_whatsapp" name="client_whatsapp" className="input" inputMode="tel" maxLength={30} />
            </div>
          </div>
          <div>
            <span className="label">Modo</span>
            <label className="flex items-start gap-2 text-sm">
              <input type="radio" name="routing_mode" value="DIRECT_REDIRECT" defaultChecked className="mt-1" />
              <span><b>Direto</b> — abre o destino na hora.</span>
            </label>
            <label className="mt-1 flex items-start gap-2 text-sm">
              <input type="radio" name="routing_mode" value="SMART_FUNNEL" className="mt-1" />
              <span><b>Funil Blindado (premium)</b> — pergunta a nota antes; 4–5★ vão ao Google, 1–3★ viram feedback privado. Requer senha mestre.</span>
            </label>
          </div>
          <div>
            <label className="label" htmlFor="secondary_url">Link secundário (opcional)</label>
            <input id="secondary_url" name="secondary_url" className="input" placeholder="@instagram ou https://..." />
            <p className="mt-1 text-xs text-zinc-500">Mostrado ao cliente depois de enviar um feedback.</p>
          </div>
        </div>
      )}

      {state.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <SubmitButton className="btn-primary w-full py-3 text-base" pendingText="Ativando…">Ativar placa</SubmitButton>
    </form>
  )
}
