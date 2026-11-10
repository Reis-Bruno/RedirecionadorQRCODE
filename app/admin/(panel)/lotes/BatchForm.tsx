'use client'

import { useActionState } from 'react'
import { SubmitButton } from '@/components/SubmitButton'
import { generateBatchAction, type ActionState } from '../../actions'

export function BatchForm() {
  const [state, action] = useActionState<ActionState, FormData>(generateBatchAction, {})
  const d = new Date()
  const suggested = `Lote ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  return (
    <form action={action} className="card grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
      <div>
        <label className="label" htmlFor="batch_name">Nome do lote</label>
        <input id="batch_name" name="batch_name" defaultValue={suggested} className="input" required maxLength={100} />
      </div>
      <div>
        <label className="label" htmlFor="quantity">Quantidade</label>
        <input id="quantity" name="quantity" type="number" min={1} max={1000} defaultValue={50} className="input" required />
      </div>
      <SubmitButton pendingText="Gerando…">Gerar placas</SubmitButton>
      {state.error && <p className="text-sm text-red-600 sm:col-span-3">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-700 sm:col-span-3">{state.message}</p>}
    </form>
  )
}
