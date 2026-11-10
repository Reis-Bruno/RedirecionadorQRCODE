import { LoginForm } from './LoginForm'

export const metadata = { title: 'Entrar' }

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm space-y-4 px-4 py-12">
      <header className="text-center">
        <div className="text-4xl">📲</div>
        <h1 className="mt-1 text-xl font-bold">Painel do revendedor</h1>
      </header>
      <LoginForm />
    </main>
  )
}
