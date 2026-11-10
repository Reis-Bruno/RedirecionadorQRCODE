export type TagStatus = 'UNCLAIMED' | 'ACTIVE' | 'BLOCKED'
export type RoutingMode = 'DIRECT_REDIRECT' | 'SMART_FUNNEL'
export type TargetType = 'GOOGLE_REVIEW' | 'INSTAGRAM' | 'WHATSAPP' | 'WIFI' | 'CUSTOM'
export type BillingModel = 'ONE_TIME' | 'MONTHLY'

export interface PublicTag {
  id: string
  slug: string
  status: TagStatus
  business_name: string | null
  logo_url: string | null
  routing_mode: RoutingMode
  target_type: TargetType
  target_url: string | null
  secondary_url: string | null
  funnel_offer_public_review: boolean
  allow_smart_funnel: boolean
}

export interface Tag extends PublicTag {
  seq_number: number
  batch_name: string
  pin_code: string
  client_name: string | null
  client_whatsapp: string | null
  billing_model: BillingModel
  monthly_fee: number
  next_due_date: string | null
  notes: string | null
  total_scans_nfc: number
  total_scans_qr: number
  nfc_written_at: string | null
  activated_at: string | null
  created_at: string
  updated_at: string
}

export interface Feedback {
  id: string
  tag_id?: string
  rating: number
  customer_name: string | null
  customer_contact: string | null
  comment: string
  is_resolved: boolean
  created_at: string
}

export interface DailyPoint {
  day: string
  nfc: number
  qr: number
}

export const STATUS_LABEL: Record<TagStatus, string> = {
  UNCLAIMED: 'Em estoque',
  ACTIVE: 'Ativa',
  BLOCKED: 'Bloqueada',
}
export const TARGET_LABEL: Record<TargetType, string> = {
  GOOGLE_REVIEW: 'Avaliação Google',
  INSTAGRAM: 'Instagram',
  WHATSAPP: 'WhatsApp',
  WIFI: 'Wi-Fi',
  CUSTOM: 'Link personalizado',
}
export const MODE_LABEL: Record<RoutingMode, string> = {
  DIRECT_REDIRECT: 'Direto',
  SMART_FUNNEL: 'Funil Blindado',
}
export const BILLING_LABEL: Record<BillingModel, string> = {
  ONE_TIME: 'Venda única',
  MONTHLY: 'Assinatura mensal',
}
