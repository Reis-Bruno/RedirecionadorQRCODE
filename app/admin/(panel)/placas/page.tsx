import Link from 'next/link'
import { requireAdmin } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/StatusBadge'
import { brl, dateBr, num, todayIso } from '@/lib/format'
import { MODE_LABEL, TARGET_LABEL, type Tag } from '@/lib/types'
import { setStatusAction } from '../../actions'

export const metadata = { title: 'Placas' }
const PAGE = 50

export default async function TagsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; lote?: string; filtro?: string; p?: string }>
}) {
  const sp = await searchParams
  const { supabase } = await requireAdmin()
  const page = Math.max(0, Number(sp.p ?? 0) || 0)
  let query = supabase
    .from('nfc_tags')
    .select(
      'id,seq_number,batch_name,slug,status,business_name,client_name,routing_mode,target_type,billing_model,monthly_fee,next_due_date,total_scans_nfc,total_scans_qr,nfc_written_at',
      { count: 'exact' },
    )
    .order('seq_number', { ascending: false })
    .range(page * PAGE, page * PAGE + PAGE - 1)

  const q = (sp.q ?? '').replace(/[,()%*\\]/g, ' ').trim()
  if (q) query = query.or(`business_name.ilike.%${q}%,client_name.ilike.%${q}%,slug.ilike.%${q}%`)
  if (sp.status && ['ACTIVE', 'UNCLAIMED', 'BLOCKED'].includes(sp.status)) query = query.eq('status', sp.status)
  if (sp.lote) query = query.eq('batch_name', sp.lote)
  if (sp.filtro === 'vencidas') query = query.eq('status', 'ACTIVE').eq('billing_model', 'MONTHLY').lt('next_due_date', todayIso())

  const { data, count, error } = await query
  const tags = (data ?? []) as Tag[]
  const today = todayIso()
  const qs = (patch: Record<string, string | undefined>) => {
    const u = new URLSearchParams()
    const merged = { ...sp, ...patch }
    Object.entries(merged).forEach(([k, v]) => v && u.set(k, v))
    return `?${u}`
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Placas <span className="text-sm font-normal text-zinc-500">({num(count)})</span></h1>
        <Link href="/admin/lotes" className="btn-primary">+ Gerar lote</Link>
      </div>

      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Buscar loja, cliente ou código" className="input max-w-xs flex-1" />
        <select name="status" defaultValue={sp.status ?? ''} className="input w-auto">
          <option value="">Todos status</option>
          <option value="ACTIVE">Ativas</option>
          <option value="UNCLAIMED">Em estoque</option>
          <option value="BLOCKED">Bloqueadas</option>
        </select>
        <select name="filtro" defaultValue={sp.filtro ?? ''} className="input w-auto">
          <option value="">—</option>
          <option value="vencidas">Cobrança vencida</option>
        </select>
        {sp.lote && <input type="hidden" name="lote" value={sp.lote} />}
        <button className="btn-secondary">Filtrar</button>
        {sp.lote && <Link href={qs({ lote: undefined })} className="btn-secondary">Lote: {sp.lote} ✕</Link>}
      </form>

      {error && <p className="text-sm text-red-600">{error.message}</p>}

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Estabelecimento</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Destino</th>
              <th className="px-3 py-2 text-right">NFC / QR</th>
              <th className="px-3 py-2">Plano</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {tags.map((t) => {
              const overdue = t.status === 'ACTIVE' && t.billing_model === 'MONTHLY' && t.next_due_date && t.next_due_date < today
              return (
                <tr key={t.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 align-top">
                    <div className="font-semibold">{t.seq_number}</div>
                    <div className="font-mono text-xs text-zinc-500">{t.slug}</div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <Link href={`/admin/placas/${t.id}`} className="font-medium text-brand-700 hover:underline">
                      {t.business_name ?? <span className="text-zinc-400">— sem cliente —</span>}
                    </Link>
                    <div className="text-xs text-zinc-500">{t.client_name ?? ''} · {t.batch_name}</div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <StatusBadge status={t.status} />
                    {t.nfc_written_at && <div className="mt-1 text-[11px] text-zinc-500">📡 gravada</div>}
                  </td>
                  <td className="px-3 py-2 align-top text-xs">
                    {t.status === 'UNCLAIMED' ? '—' : <>{MODE_LABEL[t.routing_mode]}<br /><span className="text-zinc-500">{TARGET_LABEL[t.target_type]}</span></>}
                  </td>
                  <td className="px-3 py-2 text-right align-top tabular-nums">{num(t.total_scans_nfc)} / {num(t.total_scans_qr)}</td>
                  <td className="px-3 py-2 align-top text-xs">
                    {t.billing_model === 'MONTHLY' ? (
                      <>
                        {brl(t.monthly_fee)}/mês
                        <div className={overdue ? 'font-semibold text-red-700' : 'text-zinc-500'}>{overdue ? '⚠ venceu ' : 'vence '}{dateBr(t.next_due_date)}</div>
                      </>
                    ) : (
                      <span className="text-zinc-500">Venda única</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-wrap justify-end gap-1">
                      {t.status === 'ACTIVE' && (
                        <form action={setStatusAction.bind(null, t.id, 'BLOCKED')}>
                          <button className="btn-secondary px-2 py-1 text-xs" title="Bloquear">⏸️</button>
                        </form>
                      )}
                      {t.status === 'BLOCKED' && (
                        <form action={setStatusAction.bind(null, t.id, 'ACTIVE')}>
                          <button className="btn-secondary px-2 py-1 text-xs" title="Desbloquear">▶️</button>
                        </form>
                      )}
                      {t.status !== 'UNCLAIMED' && (
                        <a href={`/admin/relatorio/${t.id}`} target="_blank" className="btn-secondary px-2 py-1 text-xs" title="Enviar relatório no WhatsApp">📤</a>
                      )}
                      <Link href={`/admin/nfc?id=${t.id}`} className="btn-secondary px-2 py-1 text-xs" title="Gravar NFC">📡</Link>
                      <Link href={`/admin/placas/${t.id}`} className="btn-secondary px-2 py-1 text-xs" title="Editar">✏️</Link>
                    </div>
                  </td>
                </tr>
              )
            })}
            {tags.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-zinc-500">Nenhuma placa. Gere um lote para começar.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between">
        {page > 0 ? <Link href={qs({ p: String(page - 1) })} className="btn-secondary">← Anterior</Link> : <span />}
        {(count ?? 0) > (page + 1) * PAGE && <Link href={qs({ p: String(page + 1) })} className="btn-secondary">Próxima →</Link>}
      </div>
    </div>
  )
}
