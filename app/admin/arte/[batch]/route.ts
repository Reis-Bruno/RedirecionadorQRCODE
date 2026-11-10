import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/url'
import { buildPrintPdf, MODELOS, TEMAS, type Modelo, type Tema } from '@/lib/print-art'

export const maxDuration = 60

let fontsCache: { regular: Uint8Array; semibold: Uint8Array; extrabold: Uint8Array } | null = null
async function loadFonts() {
  if (fontsCache) return fontsCache
  const dir = path.join(process.cwd(), 'assets', 'fonts')
  const [regular, semibold, extrabold] = await Promise.all(
    ['Montserrat_400Regular.ttf', 'Montserrat_600SemiBold.ttf', 'Montserrat_800ExtraBold.ttf'].map((f) => readFile(path.join(dir, f))),
  )
  fontsCache = { regular, semibold, extrabold }
  return fontsCache
}

// GET /admin/arte/<lote>?modelo=display-a6&tema=google&marcas=1&guias=1&id=<tag-uuid>
export async function GET(req: NextRequest, { params }: { params: Promise<{ batch: string }> }) {
  const { batch: raw } = await params
  const batch = decodeURIComponent(raw)
  const sp = req.nextUrl.searchParams
  const modelo = (sp.get('modelo') ?? 'display-a6') as Modelo
  const tema = (sp.get('tema') ?? 'google') as Tema
  if (!(modelo in MODELOS) || !(tema in TEMAS)) return new NextResponse('Modelo ou tema inválido', { status: 400 })

  const supabase = await createClient()
  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) return new NextResponse('Forbidden', { status: 403 })

  let q = supabase.from('nfc_tags').select('slug,seq_number,pin_code').order('seq_number').limit(1000)
  const id = sp.get('id')
  q = id ? q.eq('id', id) : q.eq('batch_name', batch)
  const { data, error } = await q
  if (error) return new NextResponse(error.message, { status: 500 })
  if (!data?.length) return new NextResponse('Nenhuma placa neste lote', { status: 404 })

  const pdf = await buildPrintPdf(data, {
    modelo,
    tema,
    baseUrl: await getBaseUrl(),
    marcas: sp.get('marcas') === '1',
    guias: sp.get('guias') === '1',
    fonts: await loadFonts(),
  })
  const safeBatch = batch.replace(/[^\w-]+/g, '_')
  const suffix = sp.get('guias') === '1' ? '_REVISAO-nao-imprimir' : ''
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${sp.get('download') === '1' ? 'attachment' : 'inline'}; filename="${modelo}_${tema}_${safeBatch}${suffix}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
