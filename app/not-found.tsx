import Link from 'next/link'
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl font-bold">Página não encontrada</h1>
      <Link href="/" className="btn-secondary">Início</Link>
    </main>
  )
}
