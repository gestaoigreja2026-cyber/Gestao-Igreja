# Revisão do Deploy Netlify

Este documento reúne os pontos de validação para deploy no Netlify.

## 1. Configuração do projeto

- `netlify.toml` já aponta:
  - `build.command = "npm run build"`
  - `publish = "dist"`
  - `functions = "netlify/functions"`
- `NODE_VERSION=20` já está definido.
- `NPM_FLAGS=--legacy-peer-deps` força instalação compatível.
- `NPM_USE_NPM_CI=false` significa que o Netlify usará `npm install` em vez de `npm ci`.

## 2. Regras de redirect / SPA

- Há redirect para `/api/manifest` via função:
  - `/api/manifest` → `/.netlify/functions/manifest`
- Há regra SPA para todas as outras rotas:
  - `/*` → `/index.html`

Isso está correto para um app Vite SPA com rotas client-side.

## 3. Variáveis de ambiente essenciais

No Netlify, defina:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `NODE_VERSION=20`
- `NPM_FLAGS=--legacy-peer-deps`

## 4. Chaves de backend e funções

Como o app usa Supabase Edge Functions para processar pagamentos e webhooks, as chaves sensíveis devem ser definidas no Supabase, não no Netlify:
- `SUPABASE_SERVICE_ROLE_KEY`
- `ASAAS_API_KEY`
- `ASAAS_WEBHOOK_TOKEN`
- `RESEND_API_KEY`

Essas chaves são usadas em:
- `supabase/functions/asaas-integration/index.ts`
- `supabase/functions/chat-notification/index.ts`
- `supabase/functions/send-tips/index.ts`
- `supabase/functions/weekly-report/index.ts`
- `supabase/functions/welcome-email/index.ts`

## 5. Recomendações

- Se o projeto Netlify usa funções internas, garanta que `netlify/functions` contenha apenas funções Netlify compatíveis. No repo atual, a camada de backend principal depende de Supabase Edge Functions.
- Se precisar de rotas de API adicionais no Netlify, valide se elas não entram em conflito com o redirect SPA.
- Teste um deploy de staging primeiro, acessando a URL de produção e verificando:
  - login
  - reset de senha
  - geração de boleto/pix na integração Asaas
  - função de manifest PWA em `/api/manifest`

## 6. Pontos de atenção

- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são obrigatórias para o build local e de produção.
- `test-results/`, `.playwright/`, `playwright-report/` estão no `.gitignore`, então não são versionados.
- O app depende de `SUPABASE_SERVICE_ROLE_KEY` somente para funções server-side, garantindo que o frontend não receba essa chave.
