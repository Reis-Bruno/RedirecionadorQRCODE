import Link from 'next/link'
import { requireAdmin } from '@/lib/supabase/server'
import { dateBr, num } from '@/lib/format'
import { BatchForm } from './BatchForm'
import { ArtForm } from './ArtForm'
import { MODELOS } from '@/lib/print-art'

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
      <details className="card text-sm">
        <summary className="cursor-pointer font-semibold">📐 Especificações para enviar à gráfica</summary>
        <ul className="mt-3 space-y-1 text-zinc-700">
          <li>• PDF vetorial, cores <b>CMYK</b>, fontes embutidas, <b>sangria de 3 mm</b> em todos os lados (TrimBox/BleedBox definidos).</li>
          <li>• <b>Dados variáveis:</b> cada página tem um QR Code diferente — peça impressão “1 cópia de cada página”, não “N cópias do arquivo”.</li>
          <li>• Gráfica online (Printi, Zap, etc.): envie <b>sem</b> marcas de corte. Gráfica offset tradicional: marque “Marcas de corte”.</li>
          <li>• Adesivo redondo: a última página é a <b>faca</b> (corte especial) — não imprimir. Cartão NFC: a última página é o <b>verso</b>, igual para todos.</li>
          <li>• Peça <b>prova de cor e teste de leitura</b> do QR em 1 unidade antes da tiragem. Não aceite redução de tamanho do QR.</li>
          <li>• Chip NFC: fica atrás da arte, perto do texto “aproxime”. Não funciona sobre metal/ACM sem chip anti-metal.</li>
          {Object.values(MODELOS).map((m) => (
            <li key={m.nome}>• <b>{m.nome}</b> — {m.uso}</li>
          ))}
        </ul>
      </details>
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
              <ArtForm batch={b.batch_name} />
            </div>
          )
        })}
        {batches.length === 0 && <p className="text-sm text-zinc-500">Nenhum lote ainda.</p>}
      </div>
    </div>
  )
}
