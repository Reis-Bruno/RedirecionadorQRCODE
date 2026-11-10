import QRCode from 'qrcode'
import { requireAdmin } from '@/lib/supabase/server'
import { getBaseUrl, tagUrl } from '@/lib/url'
import { PrintButton } from './PrintButton'

export const metadata = { title: 'Impressão' }

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ batch: string }>
  searchParams: Promise<{ pins?: string; size?: string }>
}) {
  const { batch: raw } = await params
  const { pins, size } = await searchParams
  const batch = decodeURIComponent(raw)
  const { supabase } = await requireAdmin()
  const base = await getBaseUrl()
  const { data } = await supabase.from('nfc_tags').select('seq_number,slug,pin_code').eq('batch_name', batch).order('seq_number')
  const tags = data ?? []
  const host = base.replace(/^https?:\/\//, '')
  const cm = Math.min(10, Math.max(3, Number(size) || 5)) // tamanho do QR em cm

  if (pins) {
    return (
      <main className="mx-auto max-w-5xl bg-white p-6">
        <Toolbar batch={batch} count={tags.length} label="Folha de PINs (entregar ao lojista — NÃO colar na placa)" />
        <div className="grid grid-cols-2 gap-3 print:grid-cols-3">
          {tags.map((t) => (
            <div key={t.slug} className="break-inside-avoid rounded-lg border border-dashed border-zinc-400 p-3 text-sm">
              <p className="font-semibold">Seu painel da placa #{t.seq_number}</p>
              <p className="mt-1 text-xs">Acesse: <b>{host}/p/{t.slug}</b></p>
              <p className="mt-1 text-xs">PIN: <span className="font-mono text-lg font-bold tracking-widest">{t.pin_code}</span></p>
              <p className="mt-1 text-[10px] text-zinc-500">Guarde este cartão. Com ele você vê os acessos, feedbacks e troca o destino da placa.</p>
            </div>
          ))}
        </div>
      </main>
    )
  }

  const qrs = await Promise.all(
    tags.map(async (t) => ({
      ...t,
      svg: await QRCode.toString(tagUrl(base, t.slug), { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }),
    })),
  )
  return (
    <main className="mx-auto max-w-5xl bg-white p-6">
      <Toolbar batch={batch} count={tags.length} label={`QR Codes — ${cm} cm`} sizes />
      <div className="flex flex-wrap gap-4">
        {qrs.map((t) => (
          <div key={t.slug} className="flex break-inside-avoid flex-col items-center rounded-lg border border-zinc-200 p-2 print:border-zinc-300">
            <div style={{ width: `${cm}cm`, height: `${cm}cm` }} dangerouslySetInnerHTML={{ __html: t.svg }} className="[&>svg]:h-full [&>svg]:w-full" />
            <div className="mt-1 flex w-full justify-between font-mono text-[9px] text-zinc-600">
              <span>#{t.seq_number}</span>
              <span>{t.slug}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

function Toolbar({ batch, count, label, sizes }: { batch: string; count: number; label: string; sizes?: boolean }) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-100 p-3">
      <div>
        <p className="font-semibold">{batch} · {count} placas</p>
        <p className="text-sm text-zinc-600">{label}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {sizes && [3, 4, 5, 7].map((s) => (
          <a key={s} href={`?size=${s}`} className="btn-secondary px-2 py-1 text-xs">{s} cm</a>
        ))}
        <PrintButton />
      </div>
    </div>
  )
}
