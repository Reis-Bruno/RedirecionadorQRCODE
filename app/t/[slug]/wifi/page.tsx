import { notFound, redirect } from 'next/navigation'
import { getPublicTag } from '@/lib/tags'
import { parseWifi } from '@/lib/targets'
import { WifiCard } from './WifiCard'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Wi-Fi' }

// Navegadores não conectam em Wi-Fi via link; mostramos a rede e a senha com botão de copiar.
export default async function WifiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tag = await getPublicTag(slug.toLowerCase())
  if (!tag) notFound()
  if (tag.status !== 'ACTIVE' || tag.target_type !== 'WIFI') redirect(`/t/${tag.slug}`)
  const wifi = parseWifi(tag.target_url ?? '')
  if (!wifi) notFound()
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-8">
      <h1 className="text-center text-lg font-bold">{tag.business_name}</h1>
      <WifiCard ssid={wifi.ssid} password={wifi.password} />
    </main>
  )
}
