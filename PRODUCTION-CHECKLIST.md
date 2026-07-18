# Checklist de Produção — Gestão Igreja

Este documento reúne os passos necessários para validar e lançar o app em produção.

## 1. Configuração de ambiente

- [ ] Ter o repositório no GitHub ou no provedor de deployment.
- [ ] Configurar variáveis de ambiente no host de produção (Vercel, Netlify ou outro):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ASAAS_API_KEY`
  - `ASAAS_WEBHOOK_TOKEN`
  - `RESEND_API_KEY`
  - `VITE_HOTMART_CHECKOUT_URL` (opcional)
  - `VITE_VAPID_PUBLIC_KEY` (opcional)
- [ ] Certificar que `.env.local` não esteja versionado e que `.env.example` esteja atualizado.
- [ ] Revisar `netlify.toml` e `vercel.json` para garantir public path e rules corretas.

## 2. Base de dados e Supabase

- [ ] Verificar se o projeto Supabase está ativo e com acesso API configurado.
- [ ] Confirmar que as URLs de produção estão autorizadas em Supabase → Auth → URL Configuration.
- [ ] Executar migrations e scripts necessários do `supabase/` no ambiente Supabase.
- [ ] Validar permissões e RLS para os tipos de usuário do app.
- [ ] Confirmar que o `SUPABASE_SERVICE_ROLE_KEY` está disponível apenas no backend / functions.

## 3. Integrações comerciais

- [ ] Testar pagamento Asaas via fluxo de checkout.
- [ ] Validar criação de cliente/assinatura no Asaas pelo app.
- [ ] Confirmar recebimento e processamento de webhook Asaas.
- [ ] Testar landing page / Hotmart se aplicável.
- [ ] Validar envio de email via `RESEND_API_KEY` nas funções/schedules.
- [ ] Se usar push notifications, validar `VITE_VAPID_PUBLIC_KEY` e o registro do service worker.

## 4. Testes e qualidade

- [ ] Rodar o build de produção:
  - `npm run build`
- [ ] Rodar o suite de E2E:
  - `npm run e2e:playwright:all`
- [ ] Rodar lint e corrigir erros críticos:
  - `npm run lint`
- [ ] Confirmar que `package-lock.json` está comprometido no repositório.

## 5. Deploy

- [ ] Fazer o deploy em staging/separate branch primeiro.
- [ ] Testar o login real, o fluxo de recuperação de senha e as telas de administração.
- [ ] Garantir que o build está servindo corretamente `index.html` em todas as rotas.
- [ ] Validar o PWA no ambiente de produção.

## 6. Pós-lançamento

- [ ] Monitorar erros de frontend e backend.
- [ ] Confirmar que todas as variáveis secretas estão protegidas no host.
- [ ] Revisar logs de webhook, asaas e notificações.
- [ ] Atualizar documentos de operação e suporte.

> Observação: o build de produção agora falha se `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` estiverem ausentes, garantindo que o deploy só ocorra com configuração válida.
