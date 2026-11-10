// Normalização de destinos. Puro (roda no cliente para pré-visualização e no servidor como autoridade).
import type { TargetType } from './types'

export interface TargetInput {
  type: TargetType
  value: string
  wifiSsid?: string
  wifiPassword?: string
  wifiSecurity?: string
}
export interface TargetResult {
  url?: string
  error?: string
  warning?: string
}

const PLACE_ID_RE = /^(ChIJ|GhIJ|Ei|EhI)[A-Za-z0-9_-]{10,}$/

export function googleReviewUrlFromPlaceId(placeId: string) {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`
}

export function normalizeGoogle(raw: string): TargetResult {
  const s = raw.trim()
  if (!s) return { error: 'Informe o Place ID ou o link de avaliação do Google.' }
  if (PLACE_ID_RE.test(s)) return { url: googleReviewUrlFromPlaceId(s) }
  let u: URL
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`)
  } catch {
    return { error: 'Não reconheci esse formato. Cole o Place ID (ChIJ...) ou um link do Google.' }
  }
  const pid = u.searchParams.get('placeid') || u.searchParams.get('place_id')
  if (pid) return { url: googleReviewUrlFromPlaceId(pid) }
  const host = u.hostname.toLowerCase()
  // Links curtos oficiais de avaliação (g.page/r/.../review) já abrem a tela de 5 estrelas
  if (host === 'g.page' || host.endsWith('.g.page')) return { url: u.toString() }
  if (host === 'search.google.com' && u.pathname.includes('writereview')) return { url: u.toString() }
  if (host.includes('google.') || host === 'maps.app.goo.gl' || host === 'goo.gl') {
    return {
      url: u.toString(),
      warning:
        'Link do Maps aceito, mas ele abre o perfil — não a tela de 5 estrelas. Para ir direto à avaliação, use o Place ID (Ferramentas > Place ID).',
    }
  }
  return { error: 'Esse link não parece ser do Google.' }
}

function normalizeInstagram(raw: string): TargetResult {
  let s = raw.trim()
  if (!s) return { error: 'Informe o @ do Instagram.' }
  const m = s.match(/instagram\.com\/([A-Za-z0-9._]+)/i)
  if (m) s = m[1]
  s = s.replace(/^@/, '')
  if (!/^[A-Za-z0-9._]{1,30}$/.test(s)) return { error: '@ do Instagram inválido.' }
  return { url: `https://instagram.com/${s}` }
}

export function whatsappDigits(raw: string): string | null {
  let d = raw.replace(/\D/g, '')
  if (d.length === 10 || d.length === 11) d = '55' + d
  if (d.length < 12 || d.length > 15) return null
  return d
}

function normalizeWhatsapp(raw: string): TargetResult {
  const d = whatsappDigits(raw)
  if (!d) return { error: 'Número de WhatsApp inválido. Use DDD + número.' }
  return { url: `https://wa.me/${d}` }
}

function wifiEscape(v: string) {
  return v.replace(/([\\;,:"])/g, '\\$1')
}

export function buildWifi(ssid: string, password: string, security = 'WPA'): TargetResult {
  if (!ssid.trim()) return { error: 'Informe o nome da rede Wi-Fi.' }
  const sec = ['WPA', 'WEP', 'nopass'].includes(security) ? security : 'WPA'
  return { url: `WIFI:T:${sec};S:${wifiEscape(ssid.trim())};P:${sec === 'nopass' ? '' : wifiEscape(password)};;` }
}

export function parseWifi(s: string): { ssid: string; password: string; security: string } | null {
  if (!s?.startsWith('WIFI:')) return null
  const body = s.slice(5)
  const out: Record<string, string> = {}
  let key = ''
  let val = ''
  let readingKey = true
  for (let i = 0; i < body.length; i++) {
    const c = body[i]
    if (c === '\\' && i + 1 < body.length) {
      ;(readingKey ? (key += body[++i]) : (val += body[++i]))
      continue
    }
    if (readingKey && c === ':') {
      readingKey = false
      continue
    }
    if (!readingKey && c === ';') {
      if (key) out[key] = val
      key = ''
      val = ''
      readingKey = true
      continue
    }
    readingKey ? (key += c) : (val += c)
  }
  return { ssid: out.S ?? '', password: out.P ?? '', security: out.T ?? 'WPA' }
}

function normalizeCustom(raw: string): TargetResult {
  let s = raw.trim()
  if (!s) return { error: 'Informe o link.' }
  if (!/^https?:\/\//i.test(s)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return { error: 'Só links http(s) são permitidos.' }
    s = `https://${s}`
  }
  try {
    const u = new URL(s)
    if (!u.hostname.includes('.')) return { error: 'Link inválido.' }
    return { url: u.toString() }
  } catch {
    return { error: 'Link inválido.' }
  }
}

export function normalizeTarget(input: TargetInput): TargetResult {
  switch (input.type) {
    case 'GOOGLE_REVIEW':
      return normalizeGoogle(input.value)
    case 'INSTAGRAM':
      return normalizeInstagram(input.value)
    case 'WHATSAPP':
      return normalizeWhatsapp(input.value)
    case 'WIFI':
      return buildWifi(input.wifiSsid ?? '', input.wifiPassword ?? '', input.wifiSecurity)
    case 'CUSTOM':
      return normalizeCustom(input.value)
    default:
      return { error: 'Tipo de destino inválido.' }
  }
}

/** Para links secundários (opcional): http(s) apenas. */
export function normalizeOptionalUrl(raw: string | null | undefined): TargetResult {
  if (!raw || !raw.trim()) return {}
  const ig = raw.trim().match(/^@([A-Za-z0-9._]{1,30})$/)
  if (ig) return { url: `https://instagram.com/${ig[1]}` }
  return normalizeCustom(raw)
}

export function isSafeHttpUrl(u: string | null | undefined): u is string {
  if (!u) return false
  try {
    const p = new URL(u)
    return p.protocol === 'https:' || p.protocol === 'http:'
  } catch {
    return false
  }
}

/** Valor "cru" para preencher o formulário a partir da URL salva. */
export function targetToInput(type: TargetType, url: string | null): Omit<TargetInput, 'type'> {
  if (!url) return { value: '' }
  if (type === 'WIFI') {
    const w = parseWifi(url)
    return { value: '', wifiSsid: w?.ssid ?? '', wifiPassword: w?.password ?? '', wifiSecurity: w?.security ?? 'WPA' }
  }
  if (type === 'INSTAGRAM') {
    const m = url.match(/instagram\.com\/([A-Za-z0-9._]+)/i)
    return { value: m ? '@' + m[1] : url }
  }
  if (type === 'WHATSAPP') {
    const m = url.match(/wa\.me\/(\d+)/)
    return { value: m ? m[1] : url }
  }
  return { value: url }
}

export function targetFromForm(fd: FormData, prefix = ''): TargetResult & { type: TargetType } {
  const type = String(fd.get(prefix + 'target_type') || 'GOOGLE_REVIEW') as TargetType
  const r = normalizeTarget({
    type,
    value: String(fd.get(prefix + 'target_value') || ''),
    wifiSsid: String(fd.get(prefix + 'wifi_ssid') || ''),
    wifiPassword: String(fd.get(prefix + 'wifi_password') || ''),
    wifiSecurity: String(fd.get(prefix + 'wifi_security') || 'WPA'),
  })
  return { ...r, type }
}
