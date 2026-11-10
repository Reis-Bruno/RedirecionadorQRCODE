'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { markNfcWrittenAction } from '../../actions'

interface Item {
  id: string
  seq_number: number
  slug: string
  business_name: string | null
  nfc_written_at: string | null
}

// Tipagem mínima do Web NFC (Chrome Android)
interface NDEFReaderLike {
  write(msg: { records: { recordType: string; data: string }[] }, opts?: { overwrite?: boolean; signal?: AbortSignal }): Promise<void>
  makeReadOnly?(opts?: { signal?: AbortSignal }): Promise<void>
}
declare global {
  interface Window {
    NDEFReader?: new () => NDEFReaderLike
  }
}

type Phase = 'idle' | 'waiting' | 'locking' | 'done' | 'error'

export function NfcWriter({ items: initial, baseUrl }: { items: Item[]; baseUrl: string }) {
  const [supported, setSupported] = useState<boolean | null>(null)
  const [items, setItems] = useState(initial)
  const [idx, setIdx] = useState(() => Math.max(0, initial.findIndex((i) => !i.nfc_written_at)))
  const [phase, setPhase] = useState<Phase>('idle')
  const [msg, setMsg] = useState('')
  const [series, setSeries] = useState(true)
  const [lock, setLock] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => setSupported(typeof window !== 'undefined' && 'NDEFReader' in window), [])
  useEffect(() => () => abortRef.current?.abort(), [])

  const current = items[idx]
  const url = current ? `${baseUrl}/t/${current.slug}?s=nfc` : ''

  const writeAt = useCallback(
    async (i: number) => {
      const item = items[i]
      if (!item || !window.NDEFReader) return
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      setPhase('waiting')
      setMsg(`Aproxime a placa #${item.seq_number} do celular…`)
      try {
        const ndef = new window.NDEFReader()
        const target = `${baseUrl}/t/${item.slug}?s=nfc`
        await ndef.write({ records: [{ recordType: 'url', data: target }] }, { signal: ac.signal })
        if (lock && ndef.makeReadOnly) {
          setPhase('locking')
          setMsg('Gravado. Mantenha encostado para travar o chip…')
          await ndef.makeReadOnly({ signal: ac.signal })
        }
        if ('vibrate' in navigator) navigator.vibrate(200)
        await markNfcWrittenAction(item.id)
        const now = new Date().toISOString()
        setItems((prev) => prev.map((p, k) => (k === i ? { ...p, nfc_written_at: now } : p)))
        const next = i + 1
        if (series && next < items.length) {
          setIdx(next)
          setMsg(`✅ #${item.seq_number} gravada! Próxima: #${items[next].seq_number}`)
          // Encadeia a próxima gravação (permissão já concedida)
          setTimeout(() => writeAt(next).catch(() => {}), 600)
        } else {
          setPhase('done')
          setMsg(`✅ #${item.seq_number} gravada!${next >= items.length ? ' Lote concluído.' : ''}`)
          if (next < items.length) setIdx(next)
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') {
          setPhase('idle')
          setMsg('Gravação pausada.')
          return
        }
        setPhase('error')
        const name = (e as Error).name
        setMsg(
          name === 'NotAllowedError'
            ? 'Permissão de NFC negada ou exige toque. Toque em “Gravar” novamente.'
            : name === 'NotSupportedError'
              ? 'Chip incompatível ou travado.'
              : `Falha: ${(e as Error).message}`,
        )
      }
    },
    [items, baseUrl, series, lock],
  )

  if (supported === false) {
    return (
      <div className="card space-y-2 text-sm">
        <p className="font-semibold">Este navegador não suporta Web NFC.</p>
        <p className="text-zinc-600">Abra o painel no <b>Chrome para Android</b> (com NFC ligado). iPhone não permite gravar NFC pelo navegador — use um app como “NFC Tools” com a URL abaixo.</p>
        {current && <code className="block break-all rounded-lg bg-zinc-100 p-2 text-xs">{url}</code>}
      </div>
    )
  }

  if (!items.length) return <p className="text-sm text-zinc-500">Nenhuma placa selecionada.</p>

  return (
    <div className="space-y-4">
      <div className="card space-y-4 text-center">
        <p className="text-sm text-zinc-500">Placa {idx + 1} de {items.length}</p>
        <p className="text-4xl font-bold">#{current?.seq_number}</p>
        <p className="font-mono text-sm text-zinc-600">{current?.slug}</p>
        {current?.business_name && <p className="text-sm">{current.business_name}</p>}
        <code className="block break-all rounded-lg bg-zinc-100 p-2 text-xs">{url}</code>
        <div className={`min-h-6 text-sm ${phase === 'error' ? 'text-red-600' : 'text-zinc-700'}`}>
          {(phase === 'waiting' || phase === 'locking') && <span className="mr-2 inline-block animate-pulse">📡</span>}
          {msg}
        </div>
        <div className="flex gap-2">
          {phase === 'waiting' || phase === 'locking' ? (
            <button className="btn-secondary flex-1 py-3" onClick={() => abortRef.current?.abort()}>Pausar</button>
          ) : (
            <button className="btn-primary flex-1 py-3 text-base" onClick={() => writeAt(idx)} disabled={supported === null}>
              {current?.nfc_written_at ? 'Regravar' : 'Gravar'} #{current?.seq_number}
            </button>
          )}
        </div>
        <div className="flex justify-between text-sm">
          <button className="text-brand-600 disabled:opacity-30" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>← anterior</button>
          <button className="text-brand-600 disabled:opacity-30" disabled={idx >= items.length - 1} onClick={() => setIdx(idx + 1)}>pular →</button>
        </div>
        <div className="space-y-2 border-t border-zinc-100 pt-3 text-left text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={series} onChange={(e) => setSeries(e.target.checked)} /> Modo gravação em série (avança sozinho)</label>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} className="mt-1" />
            <span>Travar chip após gravar <span className="text-xs text-amber-700">(irreversível — impede que terceiros regravem a placa com outro link; como o link é dinâmico, nunca precisará regravar)</span></span>
          </label>
        </div>
      </div>
      <div className="card max-h-72 overflow-y-auto p-0">
        <ul className="divide-y divide-zinc-100 text-sm">
          {items.map((it, k) => (
            <li key={it.id}>
              <button onClick={() => setIdx(k)} className={`flex w-full items-center justify-between px-4 py-2 text-left ${k === idx ? 'bg-brand-50' : ''}`}>
                <span>#{it.seq_number} <span className="font-mono text-xs text-zinc-500">{it.slug}</span></span>
                <span className="text-xs">{it.nfc_written_at ? '✅' : '—'}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
