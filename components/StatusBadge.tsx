import { STATUS_LABEL, type TagStatus } from '@/lib/types'

const STYLE: Record<TagStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  UNCLAIMED: 'bg-zinc-100 text-zinc-700',
  BLOCKED: 'bg-red-100 text-red-800',
}
const ICON: Record<TagStatus, string> = { ACTIVE: '●', UNCLAIMED: '○', BLOCKED: '■' }

export function StatusBadge({ status }: { status: TagStatus }) {
  return <span className={`badge ${STYLE[status]}`}>{ICON[status]}&nbsp;{STATUS_LABEL[status]}</span>
}
