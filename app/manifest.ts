import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Placas Inteligentes — Painel',
    short_name: 'Placas',
    description: 'Ative, grave e gerencie placas NFC + QR Code na rua.',
    id: '/admin',
    start_url: '/admin',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f6f7f9',
    theme_color: '#1f63b8',
    lang: 'pt-BR',
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Gravar NFC', url: '/admin/nfc' },
      { name: 'Placas', url: '/admin/placas' },
    ],
  }
}
