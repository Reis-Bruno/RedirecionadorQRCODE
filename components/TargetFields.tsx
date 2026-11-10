'use client'

import { useMemo, useState } from 'react'
import { normalizeTarget, targetToInput } from '@/lib/targets'
import type { TargetType } from '@/lib/types'

const OPTIONS: { value: TargetType; label: string; icon: string }[] = [
  { value: 'GOOGLE_REVIEW', label: 'Google', icon: '⭐' },
  { value: 'INSTAGRAM', label: 'Instagram', icon: '📸' },
  { value: 'WHATSAPP', label: 'WhatsApp', icon: '💬' },
  { value: 'WIFI', label: 'Wi-Fi', icon: '📶' },
  { value: 'CUSTOM', label: 'Link', icon: '🔗' },
]

const PLACEHOLDER: Record<TargetType, string> = {
  GOOGLE_REVIEW: 'Place ID (ChIJ...) ou link g.page/r/.../review',
  INSTAGRAM: '@minhaloja',
  WHATSAPP: '(11) 99999-9999',
  WIFI: '',
  CUSTOM: 'https://cardapio.minhaloja.com.br',
}

export function TargetFields({
  defaultType = 'GOOGLE_REVIEW',
  defaultUrl = null,
}: {
  defaultType?: TargetType
  defaultUrl?: string | null
}) {
  const initial = targetToInput(defaultType, defaultUrl)
  const [type, setType] = useState<TargetType>(defaultType)
  const [value, setValue] = useState(initial.value)
  const [ssid, setSsid] = useState(initial.wifiSsid ?? '')
  const [pass, setPass] = useState(initial.wifiPassword ?? '')
  const [sec, setSec] = useState(initial.wifiSecurity ?? 'WPA')

  const preview = useMemo(
    () => normalizeTarget({ type, value, wifiSsid: ssid, wifiPassword: pass, wifiSecurity: sec }),
    [type, value, ssid, pass, sec],
  )
  const touched = type === 'WIFI' ? ssid.length > 0 : value.length > 0

  return (
    <div className="space-y-3">
      <input type="hidden" name="target_type" value={type} />
      <div>
        <span className="label">Para onde a placa leva o cliente?</span>
        <div className="grid grid-cols-5 gap-1.5">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setType(o.value)}
              className={`flex flex-col items-center rounded-xl border px-1 py-2 text-xs font-medium transition ${
                type === o.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-zinc-200 bg-white text-zinc-600'
              }`}
            >
              <span className="text-lg">{o.icon}</span>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {type === 'WIFI' ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="label" htmlFor="wifi_ssid">Nome da rede</label>
            <input id="wifi_ssid" name="wifi_ssid" className="input" value={ssid} onChange={(e) => setSsid(e.target.value)} />
          </div>
          <div className="sm:col-span-1">
            <label className="label" htmlFor="wifi_password">Senha</label>
            <input id="wifi_password" name="wifi_password" className="input" value={pass} onChange={(e) => setPass(e.target.value)} />
          </div>
          <div className="sm:col-span-1">
            <label className="label" htmlFor="wifi_security">Segurança</label>
            <select id="wifi_security" name="wifi_security" className="input" value={sec} onChange={(e) => setSec(e.target.value)}>
              <option value="WPA">WPA/WPA2</option>
              <option value="WEP">WEP</option>
              <option value="nopass">Aberta</option>
            </select>
          </div>
        </div>
      ) : (
        <div>
          <input
            name="target_value"
            className="input"
            placeholder={PLACEHOLDER[type]}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode={type === 'WHATSAPP' ? 'tel' : 'text'}
            autoCapitalize="none"
            autoCorrect="off"
          />
          {type === 'GOOGLE_REVIEW' && (
            <p className="mt-1 text-xs text-zinc-500">
              Não sabe o Place ID?{' '}
              <a className="text-brand-600 underline" target="_blank" rel="noreferrer" href="https://developers.google.com/maps/documentation/places/web-service/place-id#find-id">
                Buscar no localizador oficial do Google
              </a>
            </p>
          )}
        </div>
      )}

      {touched && (
        <div className={`rounded-xl px-3 py-2 text-xs ${preview.error ? 'bg-red-50 text-red-700' : preview.warning ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
          {preview.error ?? (
            <>
              {preview.warning && <p className="mb-1">{preview.warning}</p>}
              <span className="break-all">
                Destino: {type === 'WIFI' ? `rede "${ssid}"` : preview.url}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
