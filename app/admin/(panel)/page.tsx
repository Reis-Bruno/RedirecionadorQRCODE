import Link from 'next/link'
import { requireAdmin } from '@/lib/supabase/server'
import { ScanChart, Stat } from '@/components/ScanChart'
import { brl, dateBr, dateTimeBr, num, todayIso } from '@/lib/format'
import type { DailyPoint } from '@/lib/types'

export const metadata = { title: 'Dashboard' }

interface Kpis {
  active: number
  unclaimed: number
  blocked: number
  mrr: number
  overdue: number
  scans_nfc: number
  scans_qr: number
  funnel_active: number
  feedbacks_total: number
  feedbacks_open: number
  scans_30d: number
  daily: DailyPoint[]
}

export default async function Dashboard() {
  const { supabase } = await requireAdmin()
  const [{ data: k }, { data: overdue }, { data: feedbacks }] = await Promise.all([
    supabase.rpc('admin_kpis'),
    supabase
      .from('nfc_tags')
      .select('id,seq_number,business_name,client_whatsapp,monthly_fee,next_due_date')
      .eq('status', 'ACTIVE')
      .eq('billing_model', 'MONTHLY')
      .lt('next_due_date', todayIso())
      .order('next_due_date')
      .limit(10),
    supabase
      .from('private_feedbacks')
      .select('id,rating,comment,created_at,nfc_tags(id,business_name)')
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(5),
  ])
  const kpi = (k ?? {}) as Kpis
  const totalScans = Number(kpi.scans_nfc) + Number(kpi.scans_qr)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/admin/lotes" className="btn-primary">+ Gerar lote</Link>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="MRR" value={brl(kpi.mrr)} hint={`${num(kpi.overdue)} vencida(s)`} />
        <Stat label="Placas ativas" value={num(kpi.active)} hint={`${num(kpi.funnel_active)} com Funil Blindado`} />
        <Stat label="Em estoque" value={num(kpi.unclaimed)} hint={`${num(kpi.blocked)} bloqueada(s)`} />
        <Stat label="Feedbacks retidos" value={num(kpi.feedbacks_total)} hint={`${num(kpi.feedbacks_open)} em aberto`} />
        <Stat label="Leituras totais" value={num(totalScans)} hint={`${num(kpi.scans_30d)} nos últimos 30 dias`} />
        <Stat label="NFC" tone="nfc" value={num(kpi.scans_nfc)} hint={totalScans ? `${Math.round((kpi.scans_nfc / totalScans) * 100)}%` : '—'} />
        <Stat label="QR Code" tone="qr" value={num(kpi.scans_qr)} hint={totalScans ? `${Math.round((kpi.scans_qr / totalScans) * 100)}%` : '—'} />
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">Leituras — últimos 30 dias</h2>
        <ScanChart data={kpi.daily ?? []} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Cobranças vencidas</h2>
            <Link href="/admin/placas?filtro=vencidas" className="text-sm text-brand-600">ver todas</Link>
          </div>
          {!overdue?.length ? (
            <p className="text-sm text-zinc-500">Nenhuma cobrança vencida. 🎉</p>
          ) : (
            <ul className="divide-y divide-zinc-100 text-sm">
              {overdue.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/admin/placas/${t.id}`} className="font-medium">#{t.seq_number} {t.business_name}</Link>
                  <span className="text-red-700">{brl(t.monthly_fee)} · {dateBr(t.next_due_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Feedbacks em aberto</h2>
            <Link href="/admin/feedbacks" className="text-sm text-brand-600">ver todos</Link>
          </div>
          {!feedbacks?.length ? (
            <p className="text-sm text-zinc-500">Nada pendente.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 text-sm">
              {feedbacks.map((f) => {
                const tag = f.nfc_tags as unknown as { id: string; business_name: string | null } | null
                return (
                  <li key={f.id} className="py-2">
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>{tag?.business_name} · <span className="text-amber-500">{'★'.repeat(f.rating)}</span></span>
                      <span>{dateTimeBr(f.created_at)}</span>
                    </div>
                    <p className="line-clamp-2">{f.comment}</p>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
