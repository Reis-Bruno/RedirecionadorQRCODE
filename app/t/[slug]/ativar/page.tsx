import { notFound, redirect } from 'next/navigation'
import { getPublicTag } from '@/lib/tags'
import { ActivateForm } from './ActivateForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Ativar placa' }

export default async function ActivatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tag = await getPublicTag(slug.toLowerCase())
  if (!tag) notFound()
  if (tag.status !== 'UNCLAIMED') redirect(`/t/${tag.slug}`)
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-6">
      <header className="text-center">
        <div className="text-4xl">✨</div>
        <h1 className="mt-1 text-xl font-bold">Ativar placa inteligente</h1>
        <p className="text-sm text-zinc-500">Código <span className="font-mono">{tag.slug}</span></p>
      </header>
      <ActivateForm slug={tag.slug} />
    </main>
  )
}
