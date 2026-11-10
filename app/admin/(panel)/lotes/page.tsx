import Link from 'next/link'
import { requireAdmin } from '@/lib/supabase/server'
import { dateBr, num } from '@/lib/format'
import { BatchForm } from './BatchForm'

export const metadata = { title: 'Lotes' }

interface Batch {
  batch_name: string
  total: number
  unclaimed: number
  written: number
  created_at: string
}

export default async function BatchesPage() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase.rpc('admin_batches')
  const batches = (data ?? []) as Batch[]
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Lotes para gráfica</h1>
      <BatchForm />
      <p className="text-xs text-zinc-500">
        Cada placa recebe um código aleatório de 10 caracteres (impossível de adivinhar) e um PIN de 4 dígitos. <b>Não imprima o PIN na placa</b>: ele dá acesso ao painel do lojista. Use a “Folha de PINs” para cartões separados.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {batches.map((b) => {
          const enc = encodeURIComponent(b.batch_name)
          return (
            <div key={b.batch_name} className="card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{b.batch_name}</h2>
                  <p className="text-xs text-zinc-500">criado em {dateBr(b.created_at)}</p>
                </div>
                <Link href={`/admin/placas?lote=${enc}`} className="text-sm text-brand-600">ver placas</Link>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-xl bg-zinc-50 p-2"><div className="font-bold">{num(b.total)}</div><div className="text-xs text-zinc-500">placas</div></div>
                <div className="rounded-xl bg-zinc-50 p-2"><div className="font-bold">{num(b.unclaimed)}</div><div className="text-xs text-zinc-500">em estoque</div></div>
                <div className="rounded-xl bg-zinc-50 p-2"><div className="font-bold">{num(b.written)}</div><div className="text-xs text-zinc-500">NFC gravadas</div></div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={`/admin/print/${enc}`} target="_blank" className="btn-secondary text-xs">🖨️ Folha de QR Codes</a>
                <a href={`/admin/print/${enc}?pins=1`} target="_blank" className="btn-secondary text-xs">🔑 Folha de PINs</a>
                <a href={`/admin/export/${enc}`} className="btn-secondary text-xs">⬇️ CSV</a>
                <Link href={`/admin/nfc?lote=${enc}`} className="btn-primary text-xs">📡 Gravar NFC em série</Link>
              </div>
            </div>
          )
        })}
        {batches.length === 0 && <p className="text-sm text-zinc-500">Nenhum lote ainda.</p>}
      </div>
    </div>
  )
}
