# Placas Inteligentes — NFC + QR Code Dinâmico

SaaS de gestão de reputação local: placas NFC/QR que levam o cliente para a avaliação do Google, Instagram, WhatsApp, Wi-Fi ou link livre, com Funil Blindado, portal do lojista, painel do revendedor e PWA.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind 4 · Supabase (Postgres + Auth + RLS) · Vercel (`gru1`).

## Rotas

| Rota | Quem | O que faz |
|---|---|---|
| `/t/[slug]` | cliente final | Motor: virgem → ativação · bloqueada → suspensa · ativa → registra scan (após responder) e faz **307** |
| `/t/[slug]/ativar` | vendedor/lojista | Ativação com PIN da placa ou senha mestre |
| `/t/[slug]/avaliar` | cliente final | Funil Blindado (4–5★ → Google, 1–3★ → feedback privado) |
| `/t/[slug]/wifi` | cliente final | Mostra rede + senha (navegador não conecta Wi-Fi via link) |
| `/p/[slug]` | lojista | Portal com PIN: gráfico NFC×QR, feedbacks, troca de destino |
| `/admin` | revendedor | KPIs, MRR, lotes, CSV, impressão, gravação NFC em série, CRM, relatório WhatsApp |

## Segurança (diferente da spec original, de propósito)

- RLS em todas as tabelas; `anon` não lê nada direto.
- Fluxos públicos usam RPCs `SECURITY DEFINER` que exigem `APP_SERVER_KEY` (só existe no servidor). Sem isso, qualquer um com a anon key inflaria contadores.
- PIN de 4 dígitos tem só 10 mil combinações: bloqueio após 8 erros em 15 min por placa.
- Slug aleatório de 10 caracteres (31^10) — estoque não é enumerável.
- **Não imprima o PIN na placa.** Use a “Folha de PINs” como cartão separado.
- Funil Blindado só pode ser ligado com senha mestre ou liberação do admin (é o produto premium).

## Setup

1. Aplique `supabase/migrations/001_init.sql`.
2. Copie `.env.example` → variáveis da Vercel. `APP_SERVER_KEY` = `select server_key from app_settings`.
3. Crie sua conta em `/admin/login` (ou em Supabase › Authentication › Add user).
4. Em `/admin/setup`, informe `select setup_token from app_settings` — vira admin (só funciona uma vez).
5. Em `/admin/config`, defina a senha mestre.

> Supabase Auth: em Authentication › URL Configuration, coloque o domínio de produção em **Site URL** e `https://SEU-DOMINIO/auth/callback` em Redirect URLs, senão o link de confirmação de e-mail aponta para `localhost`.

## Aviso sobre o Funil Blindado

A política do Google proíbe “review gating” (filtrar quem é convidado a avaliar com base na experiência). Perfis podem ter avaliações removidas. Por padrão, após um feedback negativo, o funil ainda mostra um link discreto para avaliar no Google (`funnel_offer_public_review`). Desligar isso é decisão comercial sua — e risco do seu cliente.
