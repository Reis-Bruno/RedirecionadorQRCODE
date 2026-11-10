import Link from 'next/link'
import { requireAdmin } from '@/lib/supabase/server'
import { signOutAction } from '../actions'
import { RegisterSW } from '@/components/RegisterSW'

export const dynamic = 'force-dynamic'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/placas', label: 'Placas', icon: '🏷️' },
  { href: '/admin/lotes', label: 'Lotes', icon: '📦' },
  { href: '/admin/nfc', label: 'Gravar NFC', icon: '📡' },
  { href: '/admin/feedbacks', label: 'Feedbacks', icon: '💬' },
  { href: '/admin/ferramentas', label: 'Place ID', icon: '🧭' },
  { href: '/admin/config', label: 'Config', icon: '⚙️' },
]

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin()
  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <RegisterSW />
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link href="/admin" className="font-bold">📲 Placas</Link>
          <nav className="hidden gap-1 md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-lg px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-xs text-zinc-500">
            <span className="hidden sm:inline">{user.email}</span>
            <form action={signOutAction}>
              <button className="btn-secondary px-3 py-1.5 text-xs">Sair</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.slice(0, 5).map((n) => (
          <Link key={n.href} href={n.href} className="flex flex-col items-center py-2 text-[11px] text-zinc-600">
            <span className="text-lg">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
