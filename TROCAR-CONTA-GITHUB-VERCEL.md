# Trocar para outra conta GitHub e Vercel

## 1. GitHub – trocar o repositório remoto

Na pasta do projeto, no terminal:

**Ver o remote atual:**
```bash
git remote -v
```

**Trocar a URL do origin para o repositório da outra conta:**

Substitua `URL_DO_NOVO_REPOSITORIO` pela URL do repositório na outra conta (ex: `https://github.com/outro-usuario/gestao-igreja.git`).

```bash
git remote set-url origin URL_DO_NOVO_REPOSITORIO
```

**Ou adicionar a nova conta como outro remote (sem apagar o antigo):**
```bash
git remote add novo-origin URL_DO_NOVO_REPOSITORIO
git push novo-origin main
```

Antes disso, crie o repositório vazio na outra conta do GitHub (New repository), depois use a URL que o GitHub mostrar.

---

## 2. Vercel – usar a outra conta

O vínculo com a conta Vercel anterior já foi removido (pasta `.vercel` apagada).

1. Faça logout da Vercel no terminal (se estiver logado):
   ```bash
   npx vercel logout
   ```

2. Faça login com a outra conta:
   ```bash
   npx vercel login
   ```
   Siga o link ou e-mail para entrar com a conta desejada.

3. Faça o deploy (vai criar um projeto novo nessa conta):
   ```bash
   npx vercel --prod
   ```
   Se perguntar, escolha linkar a um projeto novo (não ao antigo).

4. Conectar ao GitHub da outra conta:
   - No dashboard da Vercel (vercel.com), abra o projeto que foi criado.
   - Em **Settings** > **Git**, conecte o repositório da outra conta do GitHub (o mesmo que você colocou no `origin` ou em `novo-origin`).

Depois disso, os pushes nesse repositório na outra conta vão gerar deploy automático na Vercel da outra conta.
