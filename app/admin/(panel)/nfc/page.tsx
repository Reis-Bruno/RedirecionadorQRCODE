import Link from 'next/link'
import { requireAdmin } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/url'
import { NfcWriter } from './NfcWriter'

export const metadata = { title: 'Gravar NFC' }

export default async function NfcPage({ searchParams }: { searchParams: Promise<{ lote?: string; id?: string }> }) {
  const { lote, id } = await searchParams
  const { supabase } = await requireAdmin()
  const base = await getBaseUrl()
  const cols = 'id,seq_number,slug,business_name,nfc_written_at'

  if (!lote && !id) {
    const { data } = await supabase.rpc('admin_batches')
    const batches = (data ?? []) as { batch_name: string; total: number; written: number }[]
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Gravar NFC</h1>
        <p className="text-sm text-zinc-600">Escolha um lote para gravar em série. Funciona no Chrome para Android com NFC ligado.</p>
        <div className="grid gap-2">
          {batches.map((b) => (
            <Link key={b.batch_name} href={`/admin/nfc?lote=${encodeURIComponent(b.batch_name)}`} className="card flex items-center justify-between">
              <span className="font-medium">{b.batch_name}</span>
              <span className="text-sm text-zinc-500">{b.written}/{b.total} gravadas</span>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  const q = supabase.from('nfc_tags').select(cols).order('seq_number')
  const { data } = id ? await q.eq('id', id) : await q.eq('batch_name', lote!)
  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <Link href="/admin/nfc" className="text-sm text-zinc-500">← Lotes</Link>
        <h1 className="text-xl font-bold">📡 {id ? 'Gravar placa' : lote}</h1>
      </div>
      <NfcWriter items={data ?? []} baseUrl={base} />
    </div>
  )
}
