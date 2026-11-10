import 'server-only'

/** Notificação de feedback negativo via webhook opcional (n8n / Make / Zapier → WhatsApp/e-mail). */
export async function notifyFeedback(payload: Record<string, unknown>) {
  const url = process.env.FEEDBACK_WEBHOOK_URL
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'private_feedback.created', ...payload }),
      signal: AbortSignal.timeout(5000),
    })
  } catch (e) {
    console.error('feedback webhook falhou', e)
  }
}
