# Deploy Atualizado - Correções de Erros

## O que foi corrigido

1. **Banner de Status do Sistema** (`SystemStatusBanner.tsx`)
   - Adicionado na Dashboard para alertar sobre problemas de conexão
   - Mostra status do Supabase e WebSocket em tempo real
   - Botão para recarregar a página quando houver falhas

2. **Erros identificados no console:**
   - WebSocket Supabase falhando (conexão realtime)
   - Erro CORS na API do Railway (serviço de exportação Excel offline)
   - API de exportação retornando 404

## Como fazer o deploy

### Opção 1: Deploy via Netlify CLI
```bash
# Instalar Netlify CLI (se não tiver)
npm install -g netlify-cli

# Fazer login (se necessário)
netlify login

# Linkar com o site existente
netlify link

# Fazer deploy
netlify deploy --dir=dist --prod
```

### Opção 2: Deploy via Vercel
```bash
# Instalar Vercel CLI (se não tiver)
npm install -g vercel

# Fazer deploy
vercel --prod
```

### Opção 3: Upload manual do dist/
1. Compacte a pasta `dist/` em um arquivo ZIP
2. Acesse o painel da Vercel/Netlify
3. Faça upload do ZIP na seção de deploy

## Arquivos modificados

- `src/components/SystemStatusBanner.tsx` (NOVO)
- `src/pages/Dashboard.tsx` (adicionado import e uso do banner)

## Build já está pronto

A pasta `dist/` já foi gerada com sucesso. O build está pronto para deploy.

## Status dos erros

| Problema | Status | Solução |
|----------|--------|---------|
| Failed to fetch (Railway API) | 🔴 Erro externo | API do Railway offline - ignorar |
| WebSocket Supabase | 🟡 Intermitente | Pode ser bloqueio de firewall/proxy |
| CORS Railway | 🔴 Erro externo | Serviço não configurado para CORS |

## Recomendação

Os erros de "Failed to fetch" para a API do Railway são de um serviço externo que não está mais funcionando. A funcionalidade de exportar Excel **já foi migrada** para gerar arquivos localmente no navegador (usando `xlsx-js-style`), então esses erros não afetam a geração de planilhas.

O banner de status irá alertar os usuários quando houver problemas de conexão real com o Supabase.
