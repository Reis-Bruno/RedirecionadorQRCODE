import { PlaceIdTool } from './PlaceIdTool'

export const metadata = { title: 'Place ID' }

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">Link direto de avaliação do Google</h1>
      <PlaceIdTool />
      <div className="card space-y-2 text-sm text-zinc-700">
        <h2 className="font-semibold">Como achar o Place ID em 30 segundos</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Abra o <a className="text-brand-600 underline" target="_blank" rel="noreferrer" href="https://developers.google.com/maps/documentation/places/web-service/place-id#find-id">Localizador de Place ID do Google</a>.</li>
          <li>Digite o nome da loja e selecione no mapa.</li>
          <li>Copie o código que começa com <code>ChIJ</code> e cole acima.</li>
        </ol>
        <p className="text-xs text-zinc-500">
          Alternativa: no Perfil da Empresa do Google, “Pedir avaliações” gera um link <code>g.page/r/…/review</code> — também funciona aqui.
          Links comuns do Maps (<code>maps.app.goo.gl</code>) não contêm o Place ID; convertê-los exigiria a API paga do Google Places.
        </p>
      </div>
    </div>
  )
}
