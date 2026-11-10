import { notFound, redirect } from 'next/navigation'
import { getPublicTag } from '@/lib/tags'
import { isSafeHttpUrl } from '@/lib/targets'
import { Funnel } from './Funnel'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tag = await getPublicTag(slug.toLowerCase())
  return { title: tag?.business_name ? `Avalie ${tag.business_name}` : 'Avaliação' }
}

export default async function FunnelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tag = await getPublicTag(slug.toLowerCase())
  if (!tag) notFound()
  if (tag.status !== 'ACTIVE') redirect(`/t/${tag.slug}`)
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <Funnel
        slug={tag.slug}
        businessName={tag.business_name ?? 'Nossa loja'}
        logoUrl={isSafeHttpUrl(tag.logo_url) ? tag.logo_url : null}
        positiveUrl={isSafeHttpUrl(tag.target_url) ? tag.target_url : null}
        secondaryUrl={isSafeHttpUrl(tag.secondary_url) ? tag.secondary_url : null}
        offerPublicReview={tag.funnel_offer_public_review}
      />
    </main>
  )
}
