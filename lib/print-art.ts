// Gerador de artes para gráfica: PDF vetorial, CMYK, fontes embutidas, sangria, TrimBox/BleedBox,
// marcas de corte opcionais e QR Code único por página (dados variáveis).
import { PDFDocument, PDFFont, PDFPage, cmyk, type Color } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import QRCode from 'qrcode'

const MM = 72 / 25.4
const BLEED = 3 // mm de sangria
const MARK_AREA = 10 // mm extras em volta quando há marcas de corte

export const MODELOS = {
  'display-a6': { nome: 'Display de mesa A6 (10×15 cm)', w: 100, h: 150, safe: 4, uso: 'Acrílico de mesa/balcão, papel couché 300g ou PVC 0,3mm' },
  'placa-15': { nome: 'Placa quadrada 15×15 cm', w: 150, h: 150, safe: 5, uso: 'PVC expandido 2–3mm, ACM ou acrílico; parede ou balcão' },
  'adesivo-80': { nome: 'Adesivo redondo Ø8 cm', w: 80, h: 80, safe: 3, uso: 'Vinil adesivo com corte especial (faca na última página)' },
  'cartao-nfc': { nome: 'Cartão NFC 85,6×54 mm', w: 85.6, h: 54, safe: 3, uso: 'Cartão PVC CR80 com chip NFC (frente por placa + verso único)' },
  'cartao-pin': { nome: 'Cartão do lojista (PIN)', w: 85.6, h: 54, safe: 3, uso: 'Papel couché 300g ou PVC — entregar ao dono, NÃO colar na placa' },
} as const
export type Modelo = keyof typeof MODELOS

const K = cmyk(0, 0, 0, 1)
const WHITE = cmyk(0, 0, 0, 0)
const GRAY = cmyk(0, 0, 0, 0.55)
const YELLOW = cmyk(0, 0.25, 1, 0)
const REG = cmyk(1, 1, 1, 1)

export const TEMAS = {
  google: { nome: 'Avaliação Google', cor: cmyk(0.88, 0.5, 0, 0), kicker: 'Gostou do atendimento?', titulo: 'Avalie a gente no Google', curto: 'AVALIE NO GOOGLE', cta: 'Leva só 10 segundos', estrelas: true },
  instagram: { nome: 'Instagram', cor: cmyk(0.12, 0.9, 0.1, 0), kicker: 'Curtiu? Acompanhe!', titulo: 'Siga a gente no Instagram', curto: 'SIGA NO INSTAGRAM', cta: 'Novidades e promoções', estrelas: false },
  whatsapp: { nome: 'WhatsApp', cor: cmyk(0.78, 0, 0.88, 0.05), kicker: 'Pedidos e dúvidas', titulo: 'Chama a gente no WhatsApp', curto: 'FALE NO WHATSAPP', cta: 'Atendimento rápido', estrelas: false },
  wifi: { nome: 'Wi-Fi', cor: cmyk(0.92, 0.72, 0.15, 0.3), kicker: 'Wi-Fi grátis', titulo: 'Conecte-se ao nosso Wi-Fi', curto: 'WI-FI GRÁTIS', cta: 'Rede e senha na tela do celular', estrelas: false },
  cardapio: { nome: 'Cardápio / link', cor: cmyk(0, 0.68, 0.95, 0.04), kicker: 'Cardápio digital', titulo: 'Veja nosso cardápio aqui', curto: 'CARDÁPIO DIGITAL', cta: 'Sempre atualizado', estrelas: false },
} as const
export type Tema = keyof typeof TEMAS

export interface ArtTag {
  slug: string
  seq_number: number
  pin_code: string
}

export interface ArtOptions {
  modelo: Modelo
  tema: Tema
  baseUrl: string
  marcas?: boolean // marcas de corte (gráfica offset). Gráficas online normalmente pedem SEM.
  guias?: boolean // mostra linha de corte e área de segurança (só para revisão; não enviar assim)
  fonts: { regular: Uint8Array; semibold: Uint8Array; extrabold: Uint8Array }
}

interface Fonts {
  regular: PDFFont
  semibold: PDFFont
  extrabold: PDFFont
}

/** Contexto de desenho em milímetros com origem no canto superior esquerdo da área de corte. */
class Ctx {
  constructor(
    readonly page: PDFPage,
    readonly ox: number,
    readonly oy: number,
    readonly w: number,
    readonly h: number,
    readonly f: Fonts,
  ) {}
  X(mm: number) {
    return this.ox + mm * MM
  }
  /** y (mm, a partir do topo) → coordenada PDF */
  Y(mm: number) {
    return this.oy + (this.h - mm) * MM
  }
  rect(x: number, y: number, w: number, h: number, color: Color, r = 0) {
    if (r <= 0) {
      this.page.drawRectangle({ x: this.X(x), y: this.Y(y + h), width: w * MM, height: h * MM, color, borderWidth: 0 })
      return
    }
    const d = `M${r},0 H${w - r} A${r},${r} 0 0 1 ${w},${r} V${h - r} A${r},${r} 0 0 1 ${w - r},${h} H${r} A${r},${r} 0 0 1 0,${h - r} V${r} A${r},${r} 0 0 1 ${r},0 Z`
    this.page.drawSvgPath(d, { x: this.X(x), y: this.Y(y), scale: MM, color, borderWidth: 0 })
  }
  strokeRect(x: number, y: number, w: number, h: number, color: Color, widthMm: number, r = 0) {
    const d = `M${r},0 H${w - r} A${r},${r} 0 0 1 ${w},${r} V${h - r} A${r},${r} 0 0 1 ${w - r},${h} H${r} A${r},${r} 0 0 1 0,${h - r} V${r} A${r},${r} 0 0 1 ${r},0 Z`
    this.page.drawSvgPath(d, { x: this.X(x), y: this.Y(y), scale: MM, borderColor: color, borderWidth: widthMm * MM })
  }
  circle(cx: number, cy: number, r: number, color: Color) {
    this.page.drawEllipse({ x: this.X(cx), y: this.Y(cy), xScale: r * MM, yScale: r * MM, color, borderWidth: 0 })
  }
  width(text: string, font: PDFFont, sizePt: number) {
    return font.widthOfTextAtSize(text, sizePt) / MM
  }
  /** Reduz o corpo até caber em maxW. */
  fit(text: string, font: PDFFont, sizePt: number, maxW: number, minPt = 4) {
    let s = sizePt
    while (s > minPt && this.width(text, font, s) > maxW) s -= 0.25
    return s
  }
  /** baseline em mm a partir do topo */
  text(text: string, x: number, baseline: number, o: { font: PDFFont; size: number; color: Color; align?: 'left' | 'center' | 'right'; spacing?: number }) {
    let tw = this.width(text, o.font, o.size)
    if (o.spacing) tw += (o.spacing * (text.length - 1)) / MM
    const dx = o.align === 'center' ? tw / 2 : o.align === 'right' ? tw : 0
    if (o.spacing) {
      let cx = x - dx
      for (const ch of text) {
        this.page.drawText(ch, { x: this.X(cx), y: this.Y(baseline), size: o.size, font: o.font, color: o.color })
        cx += this.width(ch, o.font, o.size) + o.spacing / MM
      }
      return
    }
    this.page.drawText(text, { x: this.X(x - dx), y: this.Y(baseline), size: o.size, font: o.font, color: o.color })
  }
  /** Quebra em linhas que caibam em maxW. */
  wrap(text: string, font: PDFFont, size: number, maxW: number) {
    const words = text.split(' ')
    const lines: string[] = []
    let cur = ''
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w
      if (this.width(t, font, size) <= maxW || !cur) cur = t
      else {
        lines.push(cur)
        cur = w
      }
    }
    if (cur) lines.push(cur)
    return lines
  }
  /** QR vetorial: um único path (sem emendas/fios entre módulos). Inclui zona de silêncio de 2 módulos. */
  qr(url: string, x: number, y: number, size: number, color: Color = K) {
    const q = QRCode.create(url, { errorCorrectionLevel: 'M' })
    const n = q.modules.size
    const quiet = 2
    const total = n + quiet * 2
    const parts: string[] = []
    for (let r = 0; r < n; r++) {
      let c = 0
      while (c < n) {
        if (q.modules.get(r, c)) {
          const start = c
          while (c < n && q.modules.get(r, c)) c++
          parts.push(`M${start + quiet},${r + quiet}h${c - start}v1h${-(c - start)}z`)
        } else c++
      }
    }
    this.rect(x, y, size, size, WHITE)
    this.page.drawSvgPath(parts.join(''), { x: this.X(x), y: this.Y(y), scale: (size / total) * MM, color, borderWidth: 0 })
  }
  star(cx: number, cy: number, r: number, color: Color) {
    const pts: string[] = []
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.45
      const a = (Math.PI / 5) * i - Math.PI / 2
      pts.push(`${(cx + rad * Math.cos(a)).toFixed(3)},${(cy + rad * Math.sin(a)).toFixed(3)}`)
    }
    this.page.drawSvgPath(`M${pts.join('L')}Z`, { x: this.X(0), y: this.Y(0), scale: MM, color, borderWidth: 0 })
  }
  stars(cx: number, cy: number, r: number, gap: number, color: Color = YELLOW) {
    const start = cx - 2 * gap
    for (let i = 0; i < 5; i++) this.star(start + i * gap, cy, r, color)
  }
  /** Símbolo de aproximação (ondas), abrindo para a direita. Faixas preenchidas (sem traço), seguras para RIP. */
  contactless(cx: number, cy: number, size: number, color: Color) {
    const lw = size * 0.12
    const a = (48 * Math.PI) / 180
    const ox = cx - size * 0.4
    const pt = (r: number, ang: number) => `${(ox + r * Math.cos(ang)).toFixed(3)},${(cy + r * Math.sin(ang)).toFixed(3)}`
    let d = ''
    for (let i = 0; i < 4; i++) {
      const r1 = size * (0.2 + i * 0.22)
      const r2 = r1 + lw
      d += `M${pt(r2, -a)} A${r2.toFixed(3)},${r2.toFixed(3)} 0 0 1 ${pt(r2, a)} L${pt(r1, a)} A${r1.toFixed(3)},${r1.toFixed(3)} 0 0 0 ${pt(r1, -a)} Z `
    }
    this.page.drawSvgPath(d, { x: this.X(0), y: this.Y(0), scale: MM, color, borderWidth: 0 })
  }
  /** Fundo sangrando (cobre área de corte + sangria). */
  bleedFill(color: Color) {
    this.rect(-BLEED, -BLEED, this.w + 2 * BLEED, this.h + 2 * BLEED, color)
  }
  /** Faixa de cor que sangra no topo */
  bandTop(height: number, color: Color) {
    this.rect(-BLEED, -BLEED, this.w + 2 * BLEED, height + BLEED, color)
  }
  bandBottom(from: number, color: Color) {
    this.rect(-BLEED, from, this.w + 2 * BLEED, this.h - from + BLEED, color)
  }
}

function setupPage(doc: PDFDocument, w: number, h: number, f: Fonts, opts: Pick<ArtOptions, 'marcas' | 'guias'>, safe: number) {
  const margin = (opts.marcas ? MARK_AREA : 0) + BLEED
  const pw = (w + margin * 2) * MM
  const ph = (h + margin * 2) * MM
  const page = doc.addPage([pw, ph])
  const ox = margin * MM
  const oy = margin * MM
  page.setTrimBox(ox, oy, w * MM, h * MM)
  page.setBleedBox(ox - BLEED * MM, oy - BLEED * MM, (w + 2 * BLEED) * MM, (h + 2 * BLEED) * MM)
  const ctx = new Ctx(page, ox, oy, w, h, f)
  return {
    ctx,
    finish() {
      if (opts.marcas) cropMarks(ctx)
      if (opts.guias) guides(ctx, safe)
    },
  }
}

function cropMarks(c: Ctx) {
  const off = BLEED + 1
  const len = 5
  const lw = 0.25
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    c.page.drawLine({ start: { x: c.X(x1), y: c.Y(y1) }, end: { x: c.X(x2), y: c.Y(y2) }, thickness: lw, color: REG })
  for (const [x, sx] of [
    [0, -1],
    [c.w, 1],
  ] as const) {
    for (const [y, sy] of [
      [0, -1],
      [c.h, 1],
    ] as const) {
      line(x + sx * off, y, x + sx * (off + len), y)
      line(x, y + sy * off, x, y + sy * (off + len))
    }
  }
}

function guides(c: Ctx, safe: number) {
  const cyan = cmyk(1, 0, 0, 0)
  const magenta = cmyk(0, 1, 0, 0)
  c.strokeRect(0, 0, c.w, c.h, cyan, 0.2)
  c.strokeRect(safe, safe, c.w - 2 * safe, c.h - 2 * safe, magenta, 0.2)
  c.text('corte', 1, -0.6, { font: c.f.regular, size: 4, color: cyan })
  c.text('área de segurança', safe + 1, safe + 2, { font: c.f.regular, size: 4, color: magenta })
}

const codeLabel = (t: ArtTag) => `#${t.seq_number} · ${t.slug}`
const tagUrl = (base: string, slug: string) => `${base.replace(/\/$/, '')}/t/${slug}`

// ---------------------------------------------------------------------------
// Modelos
// ---------------------------------------------------------------------------

function displayA6(c: Ctx, t: ArtTag, o: ArtOptions) {
  const T = TEMAS[o.tema]
  const { w } = c
  c.bandTop(44, T.cor)
  c.text(T.kicker, w / 2, 13, { font: c.f.semibold, size: c.fit(T.kicker, c.f.semibold, 12, w - 12), color: WHITE, align: 'center' })
  const lines = c.wrap(T.titulo, c.f.extrabold, 21, w - 14)
  const size = Math.min(...lines.map((l) => c.fit(l, c.f.extrabold, 21, w - 12)))
  lines.slice(0, 2).forEach((l, i) => c.text(l, w / 2, 24.5 + i * 9, { font: c.f.extrabold, size, color: WHITE, align: 'center' }))

  if (T.estrelas) c.stars(w / 2, 53, 4.3, 11)
  else c.text(T.cta, w / 2, 55, { font: c.f.semibold, size: 10, color: T.cor, align: 'center' })

  c.strokeRect(19, 62, 62, 62, T.cor, 0.9, 4)
  c.qr(tagUrl(o.baseUrl, t.slug), 23, 66, 54)

  c.text('Aponte a câmera do celular', w / 2, 131, { font: c.f.semibold, size: 9.5, color: K, align: 'center' })
  const nfc = 'ou aproxime o celular da placa'
  const nfcW = c.width(nfc, c.f.regular, 8.5)
  const startX = w / 2 - (nfcW + 7) / 2
  c.contactless(startX + 2.5, 137.2, 5, T.cor)
  c.text(nfc, startX + 7, 138.5, { font: c.f.regular, size: 8.5, color: K })

  c.text(codeLabel(t), w - 5, 144.5, { font: c.f.regular, size: 5, color: GRAY, align: 'right' })
}

function placa15(c: Ctx, t: ArtTag, o: ArtOptions) {
  const T = TEMAS[o.tema]
  const { w } = c
  c.bandTop(40, T.cor)
  c.text(T.kicker, w / 2, 14, { font: c.f.semibold, size: 15, color: WHITE, align: 'center' })
  c.text(T.titulo, w / 2, 29, { font: c.f.extrabold, size: c.fit(T.titulo, c.f.extrabold, 26, w - 16), color: WHITE, align: 'center' })

  c.strokeRect(38, 45, 74, 74, T.cor, 1.1, 5)
  c.qr(tagUrl(o.baseUrl, t.slug), 42, 49, 66)

  if (T.estrelas) c.stars(w / 2, 127.5, 4.5, 12)
  else c.text(T.cta, w / 2, 129.5, { font: c.f.semibold, size: 12, color: T.cor, align: 'center' })

  const nfc = 'Aponte a câmera ou aproxime o celular'
  const nfcW = c.width(nfc, c.f.semibold, 10)
  const sx = w / 2 - (nfcW + 8) / 2
  c.contactless(sx + 3, 136.3, 6, T.cor)
  c.text(nfc, sx + 8, 137.8, { font: c.f.semibold, size: 10, color: K })
  c.text(codeLabel(t), w - 6, 143.5, { font: c.f.regular, size: 5.5, color: GRAY, align: 'right' })
}

function adesivo80(c: Ctx, t: ArtTag, o: ArtOptions) {
  const T = TEMAS[o.tema]
  const ctr = 40
  c.circle(ctr, ctr, 40 + BLEED, T.cor) // sangra além da faca
  c.text(T.kicker, ctr, 12, { font: c.f.semibold, size: c.fit(T.kicker, c.f.semibold, 7, 40), color: WHITE, align: 'center' })
  c.text(T.curto, ctr, 18, { font: c.f.extrabold, size: c.fit(T.curto, c.f.extrabold, 10.5, 54), color: WHITE, align: 'center' })
  c.circle(ctr, ctr, 20.5, WHITE)
  c.qr(tagUrl(o.baseUrl, t.slug), ctr - 13.5, ctr - 13.5, 27)
  if (T.estrelas) c.stars(ctr, 65, 2.1, 5.6)
  c.text('escaneie ou aproxime', ctr, T.estrelas ? 71 : 67, { font: c.f.semibold, size: 6, color: WHITE, align: 'center' })
  c.text(codeLabel(t), ctr, T.estrelas ? 74.6 : 71, { font: c.f.regular, size: 3.8, color: WHITE, align: 'center' })
}

function facaAdesivo(doc: PDFDocument, f: Fonts, o: ArtOptions) {
  const { ctx: c, finish } = setupPage(doc, 80, 80, f, o, MODELOS['adesivo-80'].safe)
  const mag = cmyk(0, 1, 0, 0)
  c.page.drawEllipse({ x: c.X(40), y: c.Y(40), xScale: 40 * MM, yScale: 40 * MM, borderColor: mag, borderWidth: 0.5 })
  c.text('FACA DE CORTE — Ø 80 mm', 40, 38, { font: c.f.semibold, size: 7, color: mag, align: 'center' })
  c.text('não imprimir · usar como linha de corte especial', 40, 43, { font: c.f.regular, size: 5, color: mag, align: 'center' })
  finish()
}

function cartaoNfc(c: Ctx, t: ArtTag, o: ArtOptions) {
  const T = TEMAS[o.tema]
  c.bleedFill(T.cor)
  c.rect(4, 4, 36, 46, WHITE, 2.5)
  c.qr(tagUrl(o.baseUrl, t.slug), 6, 6, 32)
  c.text(codeLabel(t), 22, 45.5, { font: c.f.regular, size: 4.3, color: GRAY, align: 'center' })

  const x = 45
  const maxW = c.w - x - 4
  c.text(T.kicker, x, 11, { font: c.f.semibold, size: c.fit(T.kicker, c.f.semibold, 7, maxW), color: WHITE })
  const lines = c.wrap(T.titulo, c.f.extrabold, 11.5, maxW)
  const size = Math.min(...lines.map((l) => c.fit(l, c.f.extrabold, 11.5, maxW)))
  lines.slice(0, 3).forEach((l, i) => c.text(l, x, 18 + i * 5, { font: c.f.extrabold, size, color: WHITE }))
  if (T.estrelas) for (let i = 0; i < 5; i++) c.star(x + 2 + i * 5, 36.5, 1.9, YELLOW)
  c.contactless(x + 2.2, 45.5, 4, WHITE)
  c.text('Aproxime o celular', x + 6, 46.6, { font: c.f.semibold, size: 6.5, color: WHITE })
}

function versoCartaoNfc(doc: PDFDocument, f: Fonts, o: ArtOptions) {
  const T = TEMAS[o.tema]
  const { ctx: c, finish } = setupPage(doc, 85.6, 54, f, o, MODELOS['cartao-nfc'].safe)
  c.bleedFill(WHITE)
  c.rect(-BLEED, 48, c.w + 2 * BLEED, 6 + BLEED, T.cor)
  c.text('Como usar', 6, 10, { font: c.f.extrabold, size: 10, color: T.cor })
  const steps = ['Abra a câmera do celular e aponte para o QR Code', 'Ou encoste o celular neste cartão (NFC ligado)', 'Pronto! Leva menos de 10 segundos']
  steps.forEach((s, i) => {
    c.circle(8, 17.6 + i * 8, 2.4, T.cor)
    c.text(String(i + 1), 8, 18.7 + i * 8, { font: c.f.extrabold, size: 6.5, color: WHITE, align: 'center' })
    c.text(s, 12.5, 18.8 + i * 8, { font: c.f.regular, size: c.fit(s, c.f.regular, 6.8, c.w - 18), color: K })
  })
  finish()
}

function cartaoPin(c: Ctx, t: ArtTag, o: ArtOptions) {
  const T = TEMAS[o.tema]
  c.bleedFill(WHITE)
  c.bandTop(13, T.cor)
  c.text('Painel do Lojista', 5, 8.6, { font: c.f.extrabold, size: 10, color: WHITE })
  c.text(`Placa #${t.seq_number}`, c.w - 5, 8.6, { font: c.f.semibold, size: 7, color: WHITE, align: 'right' })
  c.text('Veja acessos, feedbacks e troque o destino da sua placa.', 5, 19, { font: c.f.regular, size: c.fit('Veja acessos, feedbacks e troque o destino da sua placa.', c.f.regular, 6.4, c.w - 10), color: K })
  c.text('ACESSE', 5, 26, { font: c.f.semibold, size: 5, color: GRAY })
  const url = `${o.baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}/p/${t.slug}`
  c.text(url, 5, 30.5, { font: c.f.semibold, size: c.fit(url, c.f.semibold, 7.5, c.w - 10), color: K })
  c.text('SEU PIN', 5, 37.5, { font: c.f.semibold, size: 5, color: GRAY })
  c.text(t.pin_code, 5, 46, { font: c.f.extrabold, size: 20, color: T.cor, spacing: 3 })
  c.text('Guarde este cartão.', c.w - 5, 42, { font: c.f.semibold, size: 5.5, color: K, align: 'right' })
  c.text('Não deixe junto da placa.', c.w - 5, 45.5, { font: c.f.regular, size: 5.5, color: K, align: 'right' })
  c.text(t.slug, c.w - 5, 50.5, { font: c.f.regular, size: 4.2, color: GRAY, align: 'right' })
}

const DRAW: Record<Modelo, (c: Ctx, t: ArtTag, o: ArtOptions) => void> = {
  'display-a6': displayA6,
  'placa-15': placa15,
  'adesivo-80': adesivo80,
  'cartao-nfc': cartaoNfc,
  'cartao-pin': cartaoPin,
}

export async function buildPrintPdf(tags: ArtTag[], o: ArtOptions): Promise<Uint8Array> {
  const spec = MODELOS[o.modelo]
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const f: Fonts = {
    regular: await doc.embedFont(o.fonts.regular, { subset: true }),
    semibold: await doc.embedFont(o.fonts.semibold, { subset: true }),
    extrabold: await doc.embedFont(o.fonts.extrabold, { subset: true }),
  }
  doc.setTitle(`${spec.nome} — ${TEMAS[o.tema].nome} — ${tags.length} un.`)
  doc.setCreator('Placas Inteligentes')
  doc.setProducer('Placas Inteligentes (pdf-lib)')

  for (const t of tags) {
    const { ctx, finish } = setupPage(doc, spec.w, spec.h, f, o, spec.safe)
    DRAW[o.modelo](ctx, t, o)
    finish()
  }
  if (o.modelo === 'adesivo-80') facaAdesivo(doc, f, o)
  if (o.modelo === 'cartao-nfc') versoCartaoNfc(doc, f, o)
  return doc.save()
}
