import { getPortalFp } from '@/lib/portal-session'
import { publicRpc } from '@/lib/supabase/public'
import { ScanChart, Stat } from '@/components/ScanChart'
import { dateTimeBr, num } from '@/lib/format'
import { MODE_LABEL, TARGET_LABEL, type DailyPoint, type Feedback, type RoutingMode, type TargetType } from '@/lib/types'
import { PortalLogin, PortalTargetForm } from './PortalForms'
import { portalLogoutAction, portalResolveFeedbackAction } from './actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Painel do lojista' }

interface PortalData {
  tag: {
    slug: string
    status: string
    business_name: string | null
    routing_mode: RoutingMode
    target_type: TargetType
    target_url: string | null
    secondary_url: string | null
    allow_smart_funnel: boolean
    total_scans_nfc: number
    total_scans_qr: number
    activated_at: string | null
  }
  daily: DailyPoint[]
  feedbacks: Feedback[]
}

export default async function PortalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params
  const slug = raw.toLowerCase()
  const fp = await getPortalFp(slug)
  const { data } = fp ? await publicRpc<PortalData | null>('portal_get', { p_slug: slug, p_fp: fp }) : { data: null }

  if (!data) {
    return (
      <main className="mx-auto max-w-sm space-y-4 px-4 py-10">
        <header className="text-center">
          <div className="text-4xl">🔐</div>
          <h1 className="mt-1 text-xl font-bold">Painel do lojista</h1>
          <p className="text-sm text-zinc-500">Placa <span className="font-mono">{slug}</span></p>
        </header>
        <PortalLogin slug={slug} />
      </main>
    )
  }

  const { tag, daily, feedbacks } = data
  const last30 = daily.reduce((s, d) => s + Number(d.nfc) + Number(d.qr), 0)
  const open = feedbacks.filter((f) => !f.is_resolved).length
  const logout = portalLogoutAction.bind(null, slug)

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{tag.business_name}</h1>
          <p className="text-sm text-zinc-500">
            {tag.status === 'ACTIVE' ? '🟢 Ativa' : '⏸️ Suspensa'} · {MODE_LABEL[tag.routing_mode]} → {TARGET_LABEL[tag.target_type]}
          </p>
        </div>
        <form action={logout}>
          <button className="btn-secondary text-xs">Sair</button>
        </form>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Últimos 30 dias" value={num(last30)} />
        <Stat label="Total NFC" value={num(tag.total_scans_nfc)} tone="nfc" />
        <Stat label="Total QR Code" value={num(tag.total_scans_qr)} tone="qr" />
        <Stat label="Feedbacks abertos" value={num(open)} hint={`${feedbacks.length} no total`} />
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">Aproximações por dia</h2>
        <ScanChart data={daily} />
      </section>

      <section className="card">
        <h2 className="mb-1 font-semibold">Feedbacks privados</h2>
        <p className="mb-3 text-xs text-zinc-500">Clientes que deram 1 a 3 estrelas no Funil Blindado e falaram direto com você.</p>
        {feedbacks.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum feedback ainda.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {feedbacks.map((f) => (
              <li key={f.id} className={`py-3 ${f.is_resolved ? 'opacity-60' : ''}`}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-amber-500">{'★'.repeat(f.rating)}<span className="text-zinc-300">{'★'.repeat(5 - f.rating)}</span></span>
                  <span className="text-xs text-zinc-500">{dateTimeBr(f.created_at)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{f.comment}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                  {f.customer_name && <span>👤 {f.customer_name}</span>}
                  {f.customer_contact && <span>📞 {f.customer_contact}</span>}
                  <form action={portalResolveFeedbackAction.bind(null, slug, f.id, !f.is_resolved)} className="ml-auto">
                    <button className="font-medium text-brand-600">{f.is_resolved ? 'Reabrir' : 'Marcar resolvido'}</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {tag.status === 'ACTIVE' && (
        <section className="card">
          <h2 className="mb-3 font-semibold">Destino da placa</h2>
          <PortalTargetForm
            slug={slug}
            routingMode={tag.routing_mode}
            targetType={tag.target_type}
            targetUrl={tag.target_url}
            secondaryUrl={tag.secondary_url}
            allowFunnel={tag.allow_smart_funnel}
          />
        </section>
      )}
    </main>
  )
}
