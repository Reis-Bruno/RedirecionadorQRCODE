export const metadata = { title: 'Placa não encontrada' }
export default function NotFoundTag() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="text-5xl">🔍</div>
      <h1 className="text-xl font-bold">Placa não encontrada</h1>
      <p className="text-zinc-600">Este código não está cadastrado. Verifique se a placa foi gravada corretamente.</p>
    </main>
  )
}
