export const brl = (n: number | string | null | undefined) =>
  Number(n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const num = (n: number | string | null | undefined) => Number(n ?? 0).toLocaleString('pt-BR')
export const dateBr = (d: string | null | undefined) => {
  if (!d) return '—'
  const dt = d.length === 10 ? new Date(d + 'T12:00:00') : new Date(d)
  return dt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}
export const dateTimeBr = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—'
export const todayIso = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
