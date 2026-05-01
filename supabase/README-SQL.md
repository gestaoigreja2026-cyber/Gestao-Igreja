# Ordem de Execução dos Scripts SQL – Gestão Igreja

Este documento descreve a ordem recomendada para aplicar os scripts SQL no Supabase, evitando quebrar o projeto.

## 1. Schema base (projeto novo)

```bash
# Executar primeiro
supabase/schema.sql
```

## 2. Migrações e fixes (ordem recomendada)

| Ordem | Arquivo | Descrição |
|-------|---------|-----------|
| 1 | `add-avatar-url-profiles.sql` | Avatar em profiles |
| 2 | `add-registration-completed.sql` | Flag de cadastro concluído |
| 3 | `add_discipleship_tenant.sql` | Discipulado multi-tenant |
| 4 | `church_pastors.sql` | Pastores da igreja |
| 5 | `church_president.sql` | Presidente da igreja |
| 6 | `church_subscriptions.sql` | Assinaturas |
| 7 | `church_subscriptions_actions.sql` | Ações de assinatura |
| 8 | `church_pix.sql` | PIX e doações |
| 9 | `church_social_links.sql` | Links sociais |
| 10 | `cells_geolocation.sql` | Geolocalização de células |
| 11 | `events_add_ensaio.sql` | Campo ensaio em eventos |
| 12 | `events_extra.sql` | Campos extras de eventos |
| 13 | `ministry_monthly_fields.sql` | Campos mensais de ministérios |
| 14 | `prayer_requests.sql` | Pedidos de oração |
| 15 | `push_subscriptions.sql` | Push notifications |
| 16 | `reading_plans.sql` | Planos de leitura |
| 17 | `reading_plan_completions.sql` | Completudes de leitura |
| 18 | `reading_plan_admin_view.sql` | View de admin |
| 19 | `hotmart_integration.sql` | Integração Hotmart |
| 20 | `budget_schema.sql` | Orçamento |
| 21 | `send_broadcast_rpc.sql` | RPC de broadcast |
| 22 | `notify_church_event.sql` | Notificação de eventos |
| 23 | `confirm_participation_rpc.sql` | Confirmar participação |
| 24 | `provisioning_function.sql` | Provisioning de usuários |

## 3. Correções de RLS e segurança

| Ordem | Arquivo | Descrição |
|-------|---------|-----------|
| 25 | `fix-handle-new-user.sql` | Handler de novo usuário |
| 26 | `fix-rls-church_pastors.sql` | RLS church_pastors |
| 27 | `fix-rls-cells-ministries.sql` | RLS células e ministérios |
| 28 | `fix_discipleship_rls.sql` | RLS discipulado |
| 29 | `fix_rls_recursion.sql` | Evitar recursão RLS |
| 30 | **`apply-rls-isolation.sql`** | **Isolamento multi-tenant (obrigatório)** |

## 4. Correções pontuais

| Ordem | Arquivo | Descrição |
|-------|---------|-----------|
| 31 | `fix-church-delete-cascade.sql` | Cascade ao excluir igreja |
| 32 | `fix_service_scales_declined.sql` | Escalas recusadas |

## 5. Scripts auxiliares (opcional)

- `clear-test-data.sql` – Limpar dados de teste
- `legacy_data_fix.sql` – Correção de dados legados
- `master_fix.sql` – Correções gerais
- `consolidated_fix.sql` – Fix consolidado

---

## Script prioritário: `apply-rls-isolation.sql`

**Aplique este script após o schema e demais migrações.** Ele:

1. Cria funções `get_my_church_id()` e `get_my_role()` (SECURITY DEFINER)
2. Remove políticas antigas com `USING (true)` que misturam dados entre igrejas
3. Aplica políticas por `church_id` em: profiles, members, ministries, cells, events, financial_transactions

**⚠️ Sem este script, dados podem vazar entre igrejas.**

---

## Como executar

**Importante:** Não copie as tabelas deste README. Copie o conteúdo dos arquivos `.sql`.

1. Abra o **Supabase Dashboard** → **SQL Editor** (nova query).
2. No projeto, abra o arquivo `.sql` da pasta `supabase` (ex.: `add-avatar-url-profiles.sql`).
3. **Copie todo o conteúdo do arquivo .sql** (Ctrl+A, Ctrl+C) — apenas código SQL.
4. **Cole** no SQL Editor do Supabase (Ctrl+V).
5. Clique em **Run** e confira sucesso/erro na mensagem.
6. Repita para o próximo script na ordem das tabelas acima.

As tabelas neste README são só um índice. O código executável está dentro de cada arquivo `.sql`.
