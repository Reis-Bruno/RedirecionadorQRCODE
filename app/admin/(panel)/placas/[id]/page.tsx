import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/supabase/server'
import { getBaseUrl, tagUrl } from '@/lib/url'
import { StatusBadge } from '@/components/StatusBadge'
import { ScanChart, Stat } from '@/components/ScanChart'
import { ConfirmButton } from '@/components/ConfirmButton'
import { dateTimeBr, num } from '@/lib/format'
import type { DailyPoint, Feedback, Tag } from '@/lib/types'
import { registerPaymentAction, resetTagAction, setStatusAction, toggleFeedbackAction } from '../../../actions'
import { TagForm } from './TagForm'

export const metadata = { title: 'Placa' }

export default async function TagDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const { supabase } = await requireAdmin()
  const since = new Date(Date.now() - 29 * 864e5)
  since.setHours(0, 0, 0, 0)
  const [{ data: tag }, { data: scans }, { data: feedbacks }] = await Promise.all([
    supabase.from('nfc_tags').select('*').eq('id', id).single(),
    supabase.from('tag_scans').select('scanned_at,source,device_os,ip_city').eq('tag_id', id).gte('scanned_at', since.toISOString()).order('scanned_at', { ascending: false }).limit(10000),
    supabase.from('private_feedbacks').select('*').eq('tag_id', id).order('created_at', { ascending: false }).limit(100),
  ])
  if (!tag) notFound()
  const t = tag as Tag
  const base = await getBaseUrl()

  // agrega por dia (fuso de São Paulo)
  const byDay = new Map<string, DailyPoint>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    byDay.set(d, { day: d, nfc: 0, qr: 0 })
  }
  const os = new Map<string, number>()
  const cities = new Map<string, number>()
  for (const s of scans ?? []) {
    const d = new Date(s.scanned_at).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const p = byDay.get(d)
    if (p) p[s.source as 'nfc' | 'qr']++
    os.set(s.device_os ?? 'other', (os.get(s.device_os ?? 'other') ?? 0) + 1)
    if (s.ip_city) cities.set(s.ip_city, (cities.get(s.ip_city) ?? 0) + 1)
  }
  const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/placas" className="text-sm text-zinc-500">← Placas</Link>
          <h1 className="text-xl font-bold">#{t.seq_number} {t.business_name ?? 'Placa sem cliente'}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            <StatusBadge status={t.status} /> <span className="font-mono">{t.slug}</span> · PIN <span className="font-mono">{t.pin_code}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={tagUrl(base, t.slug)} target="_blank" className="btn-secondary">Abrir link</a>
          <Link href={`/admin/nfc?id=${t.id}`} className="btn-secondary">📡 Gravar NFC</Link>
          {t.status !== 'UNCLAIMED' && <a href={`/admin/relatorio/${t.id}`} target="_blank" className="btn-success">📤 Relatório WhatsApp</a>}
          {t.status === 'ACTIVE' && (
            <form action={setStatusAction.bind(null, t.id, 'BLOCKED')}><button className="btn-danger">⏸️ Bloquear</button></form>
          )}
          {t.status === 'BLOCKED' && (
            <form action={setStatusAction.bind(null, t.id, 'ACTIVE')}><button className="btn-success">▶️ Desbloquear</button></form>
          )}
          {t.status === 'UNCLAIMED' && t.business_name && t.target_url && (
            <form action={setStatusAction.bind(null, t.id, 'ACTIVE')}><button className="btn-success">✅ Ativar manualmente</button></form>
          )}
          {t.billing_model === 'MONTHLY' && t.status !== 'UNCLAIMED' && (
            <form action={registerPaymentAction.bind(null, t.id)}><button className="btn-secondary">💰 Pagamento recebido (+1 mês)</button></form>
          )}
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="NFC (total)" tone="nfc" value={num(t.total_scans_nfc)} />
        <Stat label="QR (total)" tone="qr" value={num(t.total_scans_qr)} />
        <Stat label="Ativada em" value={<span className="text-base">{dateTimeBr(t.activated_at)}</span>} />
        <Stat label="Feedbacks" value={num(feedbacks?.length)} hint={`${(feedbacks ?? []).filter((f) => !f.is_resolved).length} em aberto`} />
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">Leituras — 30 dias</h2>
        <ScanChart data={[...byDay.values()]} />
        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <h3 className="mb-1 text-xs font-semibold text-zinc-500">Sistemas</h3>
            {top(os).map(([k, v]) => <div key={k} className="flex justify-between"><span>{k}</span><span className="tabular-nums">{v}</span></div>)}
          </div>
          <div>
            <h3 className="mb-1 text-xs font-semibold text-zinc-500">Cidades</h3>
            {top(cities).map(([k, v]) => <div key={k} className="flex justify-between"><span>{k}</span><span className="tabular-nums">{v}</span></div>)}
          </div>
        </div>
      </section>

      <TagForm tag={t} />

      {!!feedbacks?.length && (
        <section className="card">
          <h2 className="mb-3 font-semibold">Feedbacks privados</h2>
          <ul className="divide-y divide-zinc-100">
            {(feedbacks as Feedback[]).map((f) => (
              <li key={f.id} className={`py-3 text-sm ${f.is_resolved ? 'opacity-60' : ''}`}>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span className="text-amber-500">{'★'.repeat(f.rating)}</span>
                  <span>{dateTimeBr(f.created_at)}</span>
                </div>
                <p className="whitespace-pre-wrap">{f.comment}</p>
                <div className="mt-1 flex gap-3 text-xs text-zinc-500">
                  {f.customer_name && <span>👤 {f.customer_name}</span>}
                  {f.customer_contact && <span>📞 {f.customer_contact}</span>}
                  <form action={toggleFeedbackAction.bind(null, f.id, !f.is_resolved)} className="ml-auto">
                    <button className="text-brand-600">{f.is_resolved ? 'Reabrir' : 'Resolver'}</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {t.status !== 'UNCLAIMED' && (
        <section className="card border-red-200">
          <h2 className="font-semibold text-red-700">Zona de perigo</h2>
          <p className="mb-3 text-sm text-zinc-600">Devolver ao estoque apaga os dados do cliente, gera PIN novo e deixa a placa pronta para outro comércio. O histórico de leituras é mantido.</p>
          <ConfirmButton action={resetTagAction.bind(null, t.id)} message="Devolver esta placa ao estoque? Os dados do cliente serão apagados." className="btn-danger">
            Devolver ao estoque
          </ConfirmButton>
        </section>
      )}
    </div>
  )
}
