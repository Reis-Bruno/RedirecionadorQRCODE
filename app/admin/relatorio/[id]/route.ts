import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/url'
import { whatsappDigits } from '@/lib/targets'

// Monta o resumo mensal e abre o wa.me do lojista com a mensagem pronta.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) return NextResponse.redirect(new URL('/admin/login', req.nextUrl.origin))

  const since = new Date(Date.now() - 30 * 864e5).toISOString()
  const [{ data: tag }, nfc, qr, fb] = await Promise.all([
    supabase.from('nfc_tags').select('slug,business_name,client_name,client_whatsapp,total_scans_nfc,total_scans_qr,routing_mode').eq('id', id).single(),
    supabase.from('tag_scans').select('id', { count: 'exact', head: true }).eq('tag_id', id).eq('source', 'nfc').gte('scanned_at', since),
    supabase.from('tag_scans').select('id', { count: 'exact', head: true }).eq('tag_id', id).eq('source', 'qr').gte('scanned_at', since),
    supabase.from('private_feedbacks').select('id', { count: 'exact', head: true }).eq('tag_id', id).gte('created_at', since),
  ])
  if (!tag) return new NextResponse('Placa não encontrada', { status: 404 })
  const base = await getBaseUrl()
  const n = nfc.count ?? 0
  const q = qr.count ?? 0
  const lines = [
    `Olá${tag.client_name ? `, ${tag.client_name.split(' ')[0]}` : ''}! 👋`,
    `Aqui está o relatório da sua Placa Inteligente — *${tag.business_name ?? ''}* (últimos 30 dias):`,
    '',
    `📲 *${n + q}* clientes interagiram com a placa`,
    `   • Aproximação NFC: ${n}`,
    `   • QR Code: ${q}`,
  ]
  if (tag.routing_mode === 'SMART_FUNNEL') lines.push(`🛡️ *${fb.count ?? 0}* críticas recebidas em privado (não foram para o Google)`)
  lines.push('', `📈 Total desde a ativação: ${tag.total_scans_nfc + tag.total_scans_qr}`, '', `Veja os detalhes no seu painel: ${base}/p/${tag.slug}`)
  const text = encodeURIComponent(lines.join('\n'))
  const phone = tag.client_whatsapp ? whatsappDigits(tag.client_whatsapp) : null
  return NextResponse.redirect(phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`)
}
