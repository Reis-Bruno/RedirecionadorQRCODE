'use client'
import { useState } from 'react'

export function WifiCard({ ssid, password }: { ssid: string; password: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="card space-y-4 text-center">
      <div className="text-5xl">📶</div>
      <div>
        <p className="text-sm text-zinc-500">Rede</p>
        <p className="text-xl font-bold break-all">{ssid}</p>
      </div>
      {password ? (
        <>
          <div>
            <p className="text-sm text-zinc-500">Senha</p>
            <p className="font-mono text-xl break-all">{password}</p>
          </div>
          <button
            className="btn-primary w-full py-3"
            onClick={async () => {
              await navigator.clipboard.writeText(password)
              setCopied(true)
            }}
          >
            {copied ? 'Senha copiada ✓' : 'Copiar senha'}
          </button>
          <p className="text-xs text-zinc-500">Abra as configurações de Wi-Fi do celular, escolha a rede e cole a senha.</p>
        </>
      ) : (
        <p className="text-sm text-zinc-600">Rede aberta — é só conectar.</p>
      )}
    </div>
  )
}
