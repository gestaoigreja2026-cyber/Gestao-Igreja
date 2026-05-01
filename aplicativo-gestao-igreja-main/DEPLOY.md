# Deploy automático – Gestão Igreja

O projeto pode ser implantado automaticamente em **Vercel** ou **Netlify**.

**Recomendado:** Use a integração nativa (Opção 1 ou 2) – conecte o repo na Vercel/Netlify e cada push na `main` fará o deploy automaticamente, sem configurar GitHub Actions.

---

## Opção 1: Vercel (recomendado – mais simples)

### 1. Conectar o repositório

1. Acesse [vercel.com](https://vercel.com) e faça login (use GitHub).
2. **Add New** → **Project** → importe o repositório do projeto.
3. Se o projeto ainda não está no GitHub, envie antes:
   ```bash
   git remote add origin https://github.com/SEU-USUARIO/gestao-igreja.git
   git push -u origin main
   ```

### 2. Configurar variáveis de ambiente

No passo de configuração do projeto na Vercel, em **Environment Variables**, adicione:

| Nome | Valor | Nota |
|------|-------|------|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Supabase → Settings → API → anon public |
| `VITE_HOTMART_CHECKOUT_URL` | `https://pay.hotmart.com/...` | Opcional |
| `VITE_VAPID_PUBLIC_KEY` | `BNhH...` | Opcional (notificações push) |

### 3. Deploy

1. Clique em **Deploy**.
2. A Vercel fará **deploy automático** em todo push na branch `main`.

---

## Opção 2: Netlify

### 1. Conectar o repositório

1. Acesse [netlify.com](https://netlify.com) e faça login.
2. **Add new site** → **Import an existing project** → GitHub.
3. Selecione o repositório e a branch `main`.

### 2. Configurar build

O projeto já usa `netlify.toml`, então o Netlify detecta automaticamente:

- **Build command:** `npm run build`
- **Publish directory:** `dist`

### 3. Variáveis de ambiente

Em **Site settings** → **Environment variables**, adicione:

| Nome | Valor |
|------|-------|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | sua anon key |
| `NODE_VERSION` | `20` (se necessário) |
| `NPM_FLAGS` | `--legacy-peer-deps` |

### 4. Deploy

O Netlify fará **deploy automático** em todo push na branch `main`.

---

## Opção 3: GitHub Actions (alternativa)

Se preferir usar GitHub Actions para fazer o deploy (em vez da integração nativa da Vercel/Netlify):

### Configurar secrets no GitHub

1. No repositório: **Settings** → **Secrets and variables** → **Actions**.
2. Adicione:

   **Para Vercel:**
   - `VERCEL_TOKEN` – em [vercel.com/account/tokens](https://vercel.com/account/tokens)
   - `VERCEL_ORG_ID` – em Settings do projeto → General
   - `VERCEL_PROJECT_ID` – em Settings do projeto → General
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   **Para Netlify:**
   - `NETLIFY_AUTH_TOKEN` – em Netlify → User settings → Applications
   - `NETLIFY_SITE_ID` – em Site settings → General
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Usar só um provider

Os workflows estão em `.github/workflows/`:

- **Vercel:** `deploy_vercel.yml`
- **Netlify:** `deploy_netlify.yml`

Para desativar o deploy em um deles, basta remover ou renomear o arquivo (por exemplo, para `deploy_netlify.yml.disabled`).

---

## Checklist pós-deploy

- [ ] Executar `supabase/fix-handle-new-user.sql` no Supabase (se ainda não foi feito).
- [ ] Configurar URL do app nas **URLs autorizadas** em Supabase → Auth → URL Configuration.
- [ ] Testar login e cadastro na URL de produção.
