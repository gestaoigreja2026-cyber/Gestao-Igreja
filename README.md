# [![Netlify Status](https://api.netlify.com/api/v1/badges/f2d62539-f91c-47a5-bee7-8d9657eb9bcd/deploy-status)](https://app.netlify.com/projects/gestigreja/deploys)Gestão Igreja / gestao-church

App de gestão para igreja — deploy no GitHub, Netlify e Supabase.

> **Selo de status Netlify:** Configuração do projeto → Geral → Indicadores de status → copie o Markdown.

## Passos principais

1. **Repositório no GitHub**
   - `origin` → [seminariosebitam-dot/gestao.igreja](https://github.com/seminariosebitam-dot/gestao.igreja)

2. **Variáveis de ambiente (local e Vercel/Netlify)**
   - Copie `.env.example` para `.env.local` e preencha:
     - `VITE_SUPABASE_URL` — URL do projeto Supabase
     - `VITE_SUPABASE_ANON_KEY` — chave anon (Settings > API no Supabase)
   - No Vercel/Netlify, configure as mesmas variáveis.

3. **Deploy**
   - **Deploy automático:** todo `git push` na `main` dispara o deploy. Ver `docs/DEPLOY-AUTOMATICO.md`.
   - **Vercel:** conectar o repositório no painel ou configurar os secrets no GitHub Actions.
   - **Netlify:** ver `docs/NETLIFY-EDUKADOSH.md` e `netlify.toml`.

4. **Supabase**
   - Criar projeto no Supabase, aplicar o schema: `supabase/schema.sql`.
   - Usar a mesma URL e anon key no app (local e deploys).

## Desenvolvimento

```bash
npm install
npm run setup:env   # cria .env.local a partir do .env.example
# Edite .env.local com a chave anon do Supabase
npm run dev
```

Build: `npm run build`

**Se alterar `package.json`:** rode `npm install` e commite o `package-lock.json` — obrigatório para Netlify, Vercel e Cloudflare.
