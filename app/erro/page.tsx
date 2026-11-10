export const metadata = { title: 'Instabilidade' }
export default function ErrorPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="text-5xl">⚠️</div>
      <h1 className="text-xl font-bold">Instabilidade momentânea</h1>
      <p className="text-zinc-600">Tente aproximar o celular novamente em alguns segundos.</p>
    </main>
  )
}
