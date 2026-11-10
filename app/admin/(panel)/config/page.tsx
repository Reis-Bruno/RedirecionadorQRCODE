import { requireAdmin } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/url'
import { MasterPasswordForm } from './MasterPasswordForm'
import { ChangePasswordForm } from './ChangePasswordForm'

export const metadata = { title: 'Configurações' }

export default async function ConfigPage() {
  const { supabase } = await requireAdmin()
  const { data: hasMaster } = await supabase.rpc('admin_has_master_password')
  const base = await getBaseUrl()
  const checks = [
    { ok: !!process.env.APP_SERVER_KEY, label: 'APP_SERVER_KEY configurada (scans, ativação e portal)' },
    { ok: !!process.env.NEXT_PUBLIC_APP_URL, label: `NEXT_PUBLIC_APP_URL definida (QR/NFC usam: ${base})` },
    { ok: !!process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP, label: 'WhatsApp de suporte (tela de placa suspensa)' },
    { ok: !!process.env.FEEDBACK_WEBHOOK_URL, label: 'Webhook de feedback negativo (opcional)' },
  ]
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-xl font-bold">Configurações</h1>
      <section className="card space-y-3">
        <h2 className="font-semibold">Minha senha de acesso ao painel</h2>
        <ChangePasswordForm />
      </section>
      <section className="card space-y-3">
        <h2 className="font-semibold">Senha mestre do vendedor</h2>
        <p className="text-sm text-zinc-600">
          Ativa qualquer placa virgem na rua sem precisar do PIN e permite ligar o Funil Blindado na ativação.
          Status: {hasMaster ? <b className="text-emerald-700">definida</b> : <b className="text-red-700">não definida</b>}
        </p>
        <MasterPasswordForm />
      </section>
      <section className="card space-y-2">
        <h2 className="font-semibold">Ambiente</h2>
        <ul className="space-y-1 text-sm">
          {checks.map((c) => (
            <li key={c.label}>{c.ok ? '✅' : '⚠️'} {c.label}</li>
          ))}
        </ul>
      </section>
      <section className="card space-y-2 text-sm text-zinc-700">
        <h2 className="font-semibold">Instalar como app</h2>
        <p><b>Android (Chrome):</b> menu ⋮ → “Instalar app”. <b>iPhone (Safari):</b> Compartilhar → “Adicionar à Tela de Início”.</p>
        <p className="text-xs text-zinc-500">Gravação NFC só funciona no Chrome para Android.</p>
      </section>
    </div>
  )
}
