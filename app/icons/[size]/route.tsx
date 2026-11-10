import { ImageResponse } from 'next/og'

export const dynamic = 'force-static'
export function generateStaticParams() {
  return [{ size: '192' }, { size: '512' }, { size: 'maskable' }, { size: 'apple' }]
}

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params
  const px = size === '192' ? 192 : size === 'apple' ? 180 : 512
  const maskable = size === 'maskable'
  const inner = maskable ? px * 0.6 : px * 0.78
  return new ImageResponse(
    (
      <div style={{ width: px, height: px, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1f63b8', borderRadius: maskable || size === 'apple' ? 0 : px * 0.22 }}>
        <div style={{ width: inner, height: inner, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: inner * 0.2, border: `${Math.round(px * 0.035)}px solid white`, color: 'white', fontSize: inner * 0.42, fontWeight: 800 }}>
          NFC
        </div>
      </div>
    ),
    { width: px, height: px },
  )
}
