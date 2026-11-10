'use client'

import { useActionState } from 'react'
import { TargetFields } from '@/components/TargetFields'
import { SubmitButton } from '@/components/SubmitButton'
import type { RoutingMode, TargetType } from '@/lib/types'
import { portalLoginAction, portalUpdateTargetAction, type PortalState } from './actions'

export function PortalLogin({ slug }: { slug: string }) {
  const [state, action] = useActionState<PortalState, FormData>(portalLoginAction.bind(null, slug), {})
  return (
    <form action={action} className="card space-y-4">
      <div>
        <label className="label" htmlFor="pin">PIN da placa</label>
        <input id="pin" name="pin" inputMode="numeric" pattern="\d{4,6}" maxLength={6} autoComplete="one-time-code" className="input text-center font-mono text-2xl tracking-[0.5em]" required />
        <p className="mt-1 text-xs text-zinc-500">Está no cartão que acompanha a sua placa.</p>
      </div>
      {state.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <SubmitButton className="btn-primary w-full" pendingText="Entrando…">Entrar</SubmitButton>
    </form>
  )
}

export function PortalTargetForm(props: {
  slug: string
  routingMode: RoutingMode
  targetType: TargetType
  targetUrl: string | null
  secondaryUrl: string | null
  allowFunnel: boolean
}) {
  const [state, action] = useActionState<PortalState, FormData>(portalUpdateTargetAction.bind(null, props.slug), {})
  return (
    <form action={action} className="space-y-4">
      <TargetFields defaultType={props.targetType} defaultUrl={props.targetUrl} />
      <div>
        <span className="label">Modo</span>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-start gap-2 rounded-xl border border-zinc-200 p-3 text-sm">
            <input type="radio" name="routing_mode" value="DIRECT_REDIRECT" defaultChecked={props.routingMode === 'DIRECT_REDIRECT'} className="mt-1" />
            <span><b>Direto</b><br /><span className="text-zinc-500">Abre o destino na hora.</span></span>
          </label>
          <label className={`flex items-start gap-2 rounded-xl border border-zinc-200 p-3 text-sm ${props.allowFunnel ? '' : 'opacity-60'}`}>
            <input type="radio" name="routing_mode" value="SMART_FUNNEL" disabled={!props.allowFunnel} defaultChecked={props.routingMode === 'SMART_FUNNEL'} className="mt-1" />
            <span><b>Funil Blindado</b> {props.allowFunnel ? '' : '🔒'}<br /><span className="text-zinc-500">Pergunta a nota antes. Críticas viram mensagem privada.</span></span>
          </label>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="secondary_url">Link secundário (opcional)</label>
        <input id="secondary_url" name="secondary_url" defaultValue={props.secondaryUrl ?? ''} className="input" placeholder="@instagram ou https://..." />
      </div>
      {state.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Salvo! A placa já leva para o novo destino.</p>}
      <SubmitButton className="btn-primary w-full">Salvar destino</SubmitButton>
    </form>
  )
}
