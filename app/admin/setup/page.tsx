import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SubmitButton } from '@/components/SubmitButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Configuração inicial' }

async function claim(fd: FormData) {
  'use server'
  const supabase = await createClient()
  const { data } = await supabase.rpc('claim_first_admin', { p_token: String(fd.get('token') || '').trim() })
  if (data === 'ok') redirect('/admin')
  redirect(`/admin/setup?erro=${data ?? 'erro'}`)
}

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}

const ERR: Record<string, string> = {
  invalid_token: 'Token inválido.',
  already_claimed: 'O administrador já foi definido. Peça a ele para liberar seu acesso.',
  not_logged_in: 'Faça login primeiro.',
}

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (isAdmin) redirect('/admin')
  const { erro } = await searchParams
  return (
    <main className="mx-auto max-w-sm space-y-4 px-4 py-12">
      <header className="text-center">
        <div className="text-4xl">🛡️</div>
        <h1 className="mt-1 text-xl font-bold">Acesso de administrador</h1>
        <p className="text-sm text-zinc-500">Logado como {user.email}</p>
      </header>
      <form action={claim} className="card space-y-4">
        <p className="text-sm text-zinc-600">
          Sua conta ainda não é administradora. No primeiro acesso, informe o <b>token de instalação</b> (coluna{' '}
          <code>setup_token</code> da tabela <code>app_settings</code> no Supabase).
        </p>
        <input name="token" className="input font-mono" placeholder="token de instalação" required autoComplete="off" />
        {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{ERR[erro] ?? 'Erro.'}</p>}
        <SubmitButton className="btn-primary w-full">Tornar-me administrador</SubmitButton>
      </form>
      <form action={signOut} className="text-center">
        <button className="text-sm text-zinc-500">Sair</button>
      </form>
    </main>
  )
}
