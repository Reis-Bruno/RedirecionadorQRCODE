import Link from 'next/link'

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="text-5xl">📲</div>
      <h1 className="text-2xl font-bold">Placas Inteligentes</h1>
      <p className="text-zinc-600">NFC + QR Code dinâmico para avaliações no Google, Instagram, WhatsApp e Wi-Fi.</p>
      <div className="flex w-full flex-col gap-3">
        <Link href="/admin" className="btn-primary">
          Painel do revendedor
        </Link>
      </div>
      <p className="text-xs text-zinc-500">Lojista? Acesse pelo link do cartão que veio com sua placa.</p>
    </main>
  )
}
