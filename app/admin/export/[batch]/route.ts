import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBaseUrl, tagUrl } from '@/lib/url'

const esc = (v: unknown) => {
  const s = v == null ? '' : String(v)
  // evita CSV injection (=, +, -, @ no início viram fórmula no Excel)
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ batch: string }> }) {
  const { batch: raw } = await params
  const batch = decodeURIComponent(raw)
  const supabase = await createClient()
  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) return new NextResponse('Forbidden', { status: 403 })
  const { data, error } = await supabase
    .from('nfc_tags')
    .select('seq_number,batch_name,slug,pin_code,status,business_name')
    .eq('batch_name', batch)
    .order('seq_number')
  if (error) return new NextResponse(error.message, { status: 500 })
  const base = await getBaseUrl()
  const header = ['numero', 'lote', 'codigo', 'pin', 'status', 'estabelecimento', 'url_qr', 'url_nfc', 'painel_lojista']
  const rows = (data ?? []).map((t) =>
    [t.seq_number, t.batch_name, t.slug, t.pin_code, t.status, t.business_name, tagUrl(base, t.slug), tagUrl(base, t.slug, 'nfc'), `${base}/p/${t.slug}`]
      .map(esc)
      .join(';'),
  )
  const csv = '﻿' + [header.join(';'), ...rows].join('\r\n') // BOM + ; para Excel pt-BR
  const filename = `placas-${batch.replace(/[^\w-]+/g, '_')}.csv`
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
