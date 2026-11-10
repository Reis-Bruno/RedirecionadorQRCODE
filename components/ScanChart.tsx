import type { DailyPoint } from '@/lib/types'

// Barras empilhadas NFC (azul) + QR (laranja), 30 dias. Tooltip nativo por barra; tabela acessível oculta.
export function ScanChart({ data, height = 140 }: { data: DailyPoint[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => Number(d.nfc) + Number(d.qr)))
  const total = data.reduce((s, d) => s + Number(d.nfc) + Number(d.qr), 0)
  const fmt = (day: string) => new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return (
    <figure>
      <div className="mb-2 flex items-center gap-4 text-xs text-zinc-600">
        <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--series-nfc)' }} />NFC</span>
        <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--series-qr)' }} />QR Code</span>
        <span className="ml-auto text-zinc-500">máx./dia: {max}</span>
      </div>
      <div className="relative flex items-end gap-[2px] border-b border-zinc-200" style={{ height }} aria-hidden>
        {data.map((d) => {
          const nfc = Number(d.nfc)
          const qr = Number(d.qr)
          return (
            <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end" title={`${fmt(d.day)} — NFC: ${nfc} · QR: ${qr}`}>
              {qr > 0 && <div className="rounded-t-[4px]" style={{ height: `${(qr / max) * 100}%`, background: 'var(--series-qr)', marginBottom: nfc > 0 ? 2 : 0 }} />}
              {nfc > 0 && <div className={qr > 0 ? '' : 'rounded-t-[4px]'} style={{ height: `${(nfc / max) * 100}%`, background: 'var(--series-nfc)' }} />}
              <div className="absolute inset-0 rounded group-hover:bg-zinc-900/5" />
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-zinc-500">
        <span>{data[0] ? fmt(data[0].day) : ''}</span>
        <span>{data.at(-1) ? fmt(data.at(-1)!.day) : ''}</span>
      </div>
      <figcaption className="sr-only">
        {total} leituras nos últimos {data.length} dias.
        <table>
          <thead><tr><th>Dia</th><th>NFC</th><th>QR</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.day}><td>{d.day}</td><td>{d.nfc}</td><td>{d.qr}</td></tr>)}</tbody>
        </table>
      </figcaption>
    </figure>
  )
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: 'nfc' | 'qr' }) {
  return (
    <div className="card">
      <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
        {tone && <i className="inline-block h-2 w-2 rounded-sm" style={{ background: `var(--series-${tone})` }} />}
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
    </div>
  )
}
