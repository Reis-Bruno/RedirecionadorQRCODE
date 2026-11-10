'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser'

export function ChangePasswordForm() {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (a.length < 8) return setMsg({ ok: false, text: 'Mínimo de 8 caracteres.' })
    if (a !== b) return setMsg({ ok: false, text: 'As senhas não conferem.' })
    setLoading(true)
    const { error } = await createClient().auth.updateUser({ password: a })
    setLoading(false)
    if (error) return setMsg({ ok: false, text: error.message })
    setA('')
    setB('')
    setMsg({ ok: true, text: 'Senha de acesso alterada.' })
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input type="password" value={a} onChange={(e) => setA(e.target.value)} placeholder="Nova senha" className="input" autoComplete="new-password" required />
        <input type="password" value={b} onChange={(e) => setB(e.target.value)} placeholder="Confirmar" className="input" autoComplete="new-password" required />
      </div>
      {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>}
      <button className="btn-primary" disabled={loading}>{loading ? 'Salvando…' : 'Trocar minha senha'}</button>
    </form>
  )
}
