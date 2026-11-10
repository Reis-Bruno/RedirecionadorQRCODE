'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'

export function LoginForm() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<{ type: 'error' | 'info'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    const supabase = createClient()
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (error) return setMsg({ type: 'error', text: 'E-mail ou senha incorretos.' })
      router.replace('/admin')
      router.refresh()
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin/setup` },
      })
      setLoading(false)
      if (error) return setMsg({ type: 'error', text: error.message })
      if (data.session) {
        router.replace('/admin/setup')
        router.refresh()
      } else {
        setMsg({ type: 'info', text: 'Conta criada. Confirme pelo link enviado ao seu e-mail e depois entre.' })
      }
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
      </div>
      {msg && <p className={`rounded-xl px-3 py-2 text-sm ${msg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-800'}`}>{msg.text}</p>}
      <button className="btn-primary w-full" disabled={loading}>{loading ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
      <button type="button" className="w-full text-sm text-zinc-500" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        {mode === 'login' ? 'Primeiro acesso? Criar conta' : 'Já tenho conta'}
      </button>
    </form>
  )
}
