import { MODELOS, TEMAS } from '@/lib/print-art'

export function ArtForm({ batch }: { batch: string }) {
  return (
    <form action={`/admin/arte/${encodeURIComponent(batch)}`} target="_blank" className="space-y-2 rounded-xl bg-zinc-50 p-3">
      <p className="text-xs font-semibold text-zinc-700">🎨 Arte para gráfica (PDF vetorial CMYK, 1 página por placa)</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <select name="modelo" className="input py-2 text-sm" defaultValue="display-a6">
          {Object.entries(MODELOS).map(([k, m]) => (
            <option key={k} value={k}>{m.nome}</option>
          ))}
        </select>
        <select name="tema" className="input py-2 text-sm" defaultValue="google">
          {Object.entries(TEMAS).map(([k, t]) => (
            <option key={k} value={k}>{t.nome}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
        <label className="flex items-center gap-1"><input type="checkbox" name="marcas" value="1" /> Marcas de corte (gráfica offset)</label>
        <label className="flex items-center gap-1"><input type="checkbox" name="guias" value="1" /> Guias de revisão (não enviar)</label>
        <label className="flex items-center gap-1"><input type="checkbox" name="download" value="1" /> Baixar</label>
      </div>
      <button className="btn-primary w-full text-xs">Gerar PDF</button>
    </form>
  )
}
