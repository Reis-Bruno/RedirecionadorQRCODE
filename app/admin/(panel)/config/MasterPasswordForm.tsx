'use client'

import { useActionState } from 'react'
import { SubmitButton } from '@/components/SubmitButton'
import { setMasterPasswordAction, type ActionState } from '../../actions'

export function MasterPasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(setMasterPasswordAction, {})
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="password" type="password" minLength={8} required placeholder="Nova senha mestre" className="input" autoComplete="new-password" />
        <input name="confirm" type="password" minLength={8} required placeholder="Confirmar" className="input" autoComplete="new-password" />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-700">{state.message}</p>}
      <SubmitButton>Salvar senha mestre</SubmitButton>
    </form>
  )
}
