import { NextResponse, after, type NextRequest } from 'next/server'
import { getPublicTag } from '@/lib/tags'
import { publicRpc } from '@/lib/supabase/public'
import { detectOs } from '@/lib/device'
import { isSafeHttpUrl } from '@/lib/targets'

export const dynamic = 'force-dynamic'

function go(url: string | URL) {
  const res = NextResponse.redirect(url, 307)
  // sem cache: mudança de destino/bloqueio vale na hora e todo scan é contado
  res.headers.set('Cache-Control', 'no-store, max-age=0')
  return res
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params
  const slug = rawSlug.toLowerCase()
  const local = (path: string) => new URL(path, req.nextUrl.origin)

  let tag
  try {
    tag = await getPublicTag(slug)
  } catch {
    return go(local('/erro'))
  }
  if (!tag) return go(local('/nao-encontrada'))
  if (tag.status === 'UNCLAIMED') return go(local(`/t/${slug}/ativar`))
  if (tag.status === 'BLOCKED') return go(local(`/t/${slug}/suspenso`))

  // ACTIVE: registra o scan DEPOIS de responder (não atrasa o redirect)
  const source = req.nextUrl.searchParams.get('s') === 'nfc' ? 'nfc' : 'qr'
  const ua = req.headers.get('user-agent') ?? ''
  const cityHeader = req.headers.get('x-vercel-ip-city')
  let city: string | null = null
  try {
    city = cityHeader ? decodeURIComponent(cityHeader) : null
  } catch {
    city = cityHeader
  }
  const isPrefetch = req.headers.get('purpose') === 'prefetch' || req.headers.get('sec-purpose')?.includes('prefetch')
  if (!isPrefetch) {
    after(async () => {
      const { error } = await publicRpc('register_tag_scan', {
        p_tag_id: tag.id,
        p_source: source,
        p_device_os: detectOs(ua),
        p_ip_city: city,
        p_user_agent: ua,
      })
      if (error) console.error('register_tag_scan', error)
    })
  }

  if (tag.routing_mode === 'SMART_FUNNEL') return go(local(`/t/${slug}/avaliar`))
  if (tag.target_type === 'WIFI') return go(local(`/t/${slug}/wifi`))
  if (isSafeHttpUrl(tag.target_url)) return go(tag.target_url)
  return go(local(`/t/${slug}/suspenso?motivo=sem-destino`))
}
