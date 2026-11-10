'use client'

import { useState } from 'react'
import { normalizeGoogle } from '@/lib/targets'

export function PlaceIdTool() {
  const [input, setInput] = useState('')
  const [copied, setCopied] = useState(false)
  const r = input ? normalizeGoogle(input) : null
  return (
    <div className="card space-y-3">
      <label className="label" htmlFor="pid">Place ID ou link do Google</label>
      <input id="pid" className="input font-mono text-sm" value={input} onChange={(e) => { setInput(e.target.value); setCopied(false) }} placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4" autoCapitalize="none" />
      {r?.error && <p className="text-sm text-red-600">{r.error}</p>}
      {r?.url && (
        <div className="space-y-2">
          {r.warning && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{r.warning}</p>}
          <code className="block break-all rounded-lg bg-zinc-100 p-2 text-xs">{r.url}</code>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={async () => { await navigator.clipboard.writeText(r.url!); setCopied(true) }}>{copied ? 'Copiado ✓' : 'Copiar'}</button>
            <a href={r.url} target="_blank" rel="noreferrer" className="btn-secondary">Testar</a>
          </div>
        </div>
      )}
    </div>
  )
}
