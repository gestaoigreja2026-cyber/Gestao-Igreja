Guia rápido para configurar segredos no Supabase (Edge Functions)

1) Pré-requisitos
- `supabase` CLI instalada e autenticada (`supabase login`).
- Acesso ao projeto Supabase correto.

2) Segredos necessários (nomes usados no código):
- `ASAAS_API_KEY` — chave da API Asaas (server)
- `ASAAS_WEBHOOK_TOKEN` — token secreto para validar webhooks
- `SUPABASE_SERVICE_ROLE_KEY` — chave `service_role` usada por funções servidor
- `RESEND_API_KEY` — (opcional) chave da API Resend para envios de e-mail

3) Comandos (local, interativo)
Abra o PowerShell no diretório do projeto e execute:

```powershell
# executar o helper interativo
scripts\set-supabase-secrets.ps1
```

Ou use diretamente o `supabase` CLI:

```powershell
supabase secrets set ASAAS_API_KEY="<sua-chave>"
supabase secrets set ASAAS_WEBHOOK_TOKEN="<seu-token>"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<sua-service-role>"
# opcional
supabase secrets set RESEND_API_KEY="<sua-chave-resend>"
```

4) CI / Vercel / Netlify
- No Vercel: Defina as variáveis no dashboard do projeto (Settings > Environment Variables) com os mesmos nomes.
- No Netlify: Defina as `Environment variables` no site settings.

5) Deploy e testes
- Redeploy das Edge Functions após alterar secrets:
```powershell
# redeploya todas as functions
supabase functions deploy --project-ref <PROJECT_REF> --all
# ou deploy específico
supabase functions deploy asaas-integration
```

- Testes rápidos (local ou em staging):
```powershell
# ajustar SUPABASE_FUNCTIONS_URL para o seu projeto
$env:SUPABASE_FUNCTIONS_URL = "https://<project>.functions.supabase.co"
node scripts\test-asaas-integration.js
```

6) Observações de segurança
- Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Armazene chaves em variáveis de ambiente do provedor (Vercel/Netlify) ou no Supabase Secrets.

Se quiser, posso executar os comandos de criação de secrets localmente — preciso que você cole os valores sensíveis aqui (não recomendado) ou execute o script `scripts\set-supabase-secrets.ps1` no seu terminal conforme instruções.
