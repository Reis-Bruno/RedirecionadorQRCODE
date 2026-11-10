import { notFound } from 'next/navigation'
import { getPublicTag } from '@/lib/tags'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Terminal suspenso' }

export default async function SuspendedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ motivo?: string }>
}) {
  const { slug } = await params
  const { motivo } = await searchParams
  const tag = await getPublicTag(slug.toLowerCase())
  if (!tag) notFound()
  const support = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '').replace(/\D/g, '')
  const noTarget = motivo === 'sem-destino' && tag.status === 'ACTIVE'
  const msg = encodeURIComponent(
    `Olá! Sou da loja ${tag.business_name ?? ''} (placa ${tag.slug}) e gostaria de regularizar minha placa inteligente.`,
  )
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-5xl">{noTarget ? '🛠️' : '⏸️'}</div>
      <h1 className="text-xl font-bold">{noTarget ? 'Placa em configuração' : 'Terminal temporariamente suspenso'}</h1>
      <p className="text-zinc-600">
        {noTarget
          ? 'Esta placa ainda não tem um destino configurado.'
          : 'Este terminal está temporariamente indisponível. Se você é o responsável pelo estabelecimento, fale com o suporte para regularizar.'}
      </p>
      {support && (
        <a href={`https://wa.me/${support}?text=${msg}`} className="btn-success w-full py-3 text-base">
          💬 Regularizar pelo WhatsApp
        </a>
      )}
    </main>
  )
}
