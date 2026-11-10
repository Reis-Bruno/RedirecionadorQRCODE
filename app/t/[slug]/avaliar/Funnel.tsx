'use client'

import { useActionState, useState } from 'react'
import { SubmitButton } from '@/components/SubmitButton'
import { submitFeedbackAction, type FeedbackState } from './actions'

const LABELS = ['', 'Péssima', 'Ruim', 'Regular', 'Boa', 'Excelente']

export function Funnel(props: {
  slug: string
  businessName: string
  logoUrl: string | null
  positiveUrl: string | null
  secondaryUrl: string | null
  offerPublicReview: boolean
}) {
  const [rating, setRating] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const [state, action] = useActionState<FeedbackState, FormData>(submitFeedbackAction.bind(null, props.slug), {})

  function choose(n: number) {
    setRating(n)
    if (n >= 4 && props.positiveUrl) {
      setLeaving(true)
      window.location.href = props.positiveUrl
    }
  }

  const header = (
    <div className="text-center">
      {props.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.logoUrl} alt="" className="mx-auto mb-3 h-16 w-16 rounded-2xl object-cover" />
      ) : (
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-bold text-white">
          {props.businessName.slice(0, 1).toUpperCase()}
        </div>
      )}
      <h1 className="text-lg font-bold">{props.businessName}</h1>
    </div>
  )

  if (state.ok) {
    return (
      <div className="space-y-4 text-center">
        {header}
        <div className="card space-y-3">
          <div className="text-4xl">🙏</div>
          <h2 className="text-lg font-bold">Obrigado por nos contar!</h2>
          <p className="text-sm text-zinc-600">Sua mensagem foi enviada direto para a gerência. Vamos usar isso para melhorar.</p>
          {props.secondaryUrl && (
            <a href={props.secondaryUrl} className="btn-primary w-full">Conheça nossas novidades</a>
          )}
          {props.offerPublicReview && props.positiveUrl && (
            <a href={props.positiveUrl} className="block text-xs text-zinc-500 underline">Prefere deixar uma avaliação pública no Google?</a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {header}
      <div className="card text-center">
        <h2 className="text-xl font-semibold">Como foi sua experiência hoje?</h2>
        <div className="mt-4 flex justify-center gap-1" role="radiogroup" aria-label="Nota">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
              onClick={() => choose(n)}
              className={`text-5xl transition active:scale-90 ${n <= rating ? 'text-amber-400' : 'text-zinc-300'}`}
            >
              ★
            </button>
          ))}
        </div>
        <p className="mt-2 h-5 text-sm text-zinc-500">{rating ? LABELS[rating] : 'Toque nas estrelas'}</p>
        {leaving && <p className="mt-2 text-sm text-emerald-700">Que ótimo! Abrindo o Google…</p>}
      </div>

      {rating > 0 && rating <= 3 && (
        <form action={action} className="card space-y-3">
          <input type="hidden" name="rating" value={rating} />
          <div>
            <h3 className="font-semibold">Sentimos muito! 😔</h3>
            <p className="text-sm text-zinc-600">Conte para a gerência o que houve para melhorarmos. Só a loja verá esta mensagem.</p>
          </div>
          <textarea name="comment" required rows={4} maxLength={2000} className="input" placeholder="O que aconteceu?" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="customer_name" className="input" placeholder="Seu nome (opcional)" maxLength={100} />
            <input name="customer_contact" className="input" placeholder="WhatsApp/e-mail (opcional)" maxLength={100} />
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <SubmitButton className="btn-primary w-full" pendingText="Enviando…">Enviar para a gerência</SubmitButton>
        </form>
      )}
    </div>
  )
}
