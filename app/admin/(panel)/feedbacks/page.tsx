import Link from 'next/link'
import { requireAdmin } from '@/lib/supabase/server'
import { dateTimeBr } from '@/lib/format'
import { whatsappDigits } from '@/lib/targets'
import { toggleFeedbackAction } from '../../actions'

export const metadata = { title: 'Feedbacks' }

export default async function FeedbacksPage({ searchParams }: { searchParams: Promise<{ todos?: string }> }) {
  const { todos } = await searchParams
  const { supabase } = await requireAdmin()
  let q = supabase
    .from('private_feedbacks')
    .select('id,rating,comment,customer_name,customer_contact,is_resolved,created_at,nfc_tags(id,slug,business_name,client_whatsapp)')
    .order('created_at', { ascending: false })
    .limit(200)
  if (!todos) q = q.eq('is_resolved', false)
  const { data } = await q

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Feedbacks retidos</h1>
        <Link href={todos ? '/admin/feedbacks' : '/admin/feedbacks?todos=1'} className="btn-secondary text-xs">
          {todos ? 'Só em aberto' : 'Mostrar resolvidos'}
        </Link>
      </div>
      <p className="text-xs text-zinc-500">Notas 1–3 capturadas pelo Funil Blindado. Use “Avisar lojista” para encaminhar pelo WhatsApp.</p>
      <div className="space-y-3">
        {(data ?? []).map((f) => {
          const tag = f.nfc_tags as unknown as { id: string; slug: string; business_name: string | null; client_whatsapp: string | null } | null
          const wa = tag?.client_whatsapp ? whatsappDigits(tag.client_whatsapp) : null
          const text = encodeURIComponent(
            `⚠️ Novo feedback privado (${f.rating}★) na sua placa — ${tag?.business_name ?? ''}:\n\n"${f.comment}"\n\n${f.customer_name ? `Cliente: ${f.customer_name}\n` : ''}${f.customer_contact ? `Contato: ${f.customer_contact}\n` : ''}\nEsse cliente NÃO foi para o Google. Vale entrar em contato!`,
          )
          return (
            <div key={f.id} className={`card text-sm ${f.is_resolved ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/admin/placas/${tag?.id}`} className="font-semibold text-brand-700">{tag?.business_name ?? tag?.slug}</Link>
                <span className="text-xs text-zinc-500">{dateTimeBr(f.created_at)}</span>
              </div>
              <div className="text-amber-500">{'★'.repeat(f.rating)}<span className="text-zinc-300">{'★'.repeat(5 - f.rating)}</span></div>
              <p className="mt-1 whitespace-pre-wrap">{f.comment}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                {f.customer_name && <span>👤 {f.customer_name}</span>}
                {f.customer_contact && <span>📞 {f.customer_contact}</span>}
                <div className="ml-auto flex gap-2">
                  {wa && <a href={`https://wa.me/${wa}?text=${text}`} target="_blank" className="btn-success px-3 py-1 text-xs">Avisar lojista</a>}
                  <form action={toggleFeedbackAction.bind(null, f.id, !f.is_resolved)}>
                    <button className="btn-secondary px-3 py-1 text-xs">{f.is_resolved ? 'Reabrir' : 'Resolver'}</button>
                  </form>
                </div>
              </div>
            </div>
          )
        })}
        {!data?.length && <p className="text-sm text-zinc-500">Nenhum feedback.</p>}
      </div>
    </div>
  )
}
