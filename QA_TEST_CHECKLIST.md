# Checklist de Testes QA - Atualização de Permissões

## Resumo das Alterações
- Adicionado role `pastor_admin` com acesso total às igrejas vinculadas
- Todos os usuários podem visualizar itens específicos (somente leitura)
- Criado hook `usePermissions` para gerenciar permissões granulares
- Atualizados TrialGate e SubscriptionBlock para exceções

## Testes Automáticos (Build)
- [x] Build TypeScript sem erros - **PASSOU**
- [x] Compilação Vite sem erros - **PASSOU**

## Testes Manuais

### 1. Testes de Navegação por Role

#### 1.1 Role: pastor_admin
- [ ] Login como pastor_admin
- [ ] Verificar se Dashboard é acessível
- [ ] Verificar se Sidebar mostra todos os itens relevantes
- [ ] Navegar para /solicitacoes-oracao - deve acessar
- [ ] Navegar para /planos-leitura - deve acessar
- [ ] Navegar para /redes-sociais - deve acessar
- [ ] Navegar para /boletins-avisos - deve acessar
- [ ] Navegar para /institucional - deve acessar
- [ ] Navegar para /privacidade - deve acessar
- [ ] Navegar para /contas-pix - deve acessar
- [ ] Navegar para /discipulado - deve acessar
- [ ] Navegar para /escolas - deve acessar
- [ ] Navegar para /celulas - deve acessar
- [ ] Navegar para /ministerios - deve acessar
- [ ] Verificar se TrialGate não bloqueia acesso
- [ ] Verificar se SubscriptionBlock não bloqueia acesso

#### 1.2 Role: membro
- [ ] Login como membro
- [ ] Verificar se Dashboard é acessível
- [ ] Verificar Sidebar mostra itens de visualização
- [ ] Navegar para /solicitacoes-oracao - deve acessar (visualização)
- [ ] Navegar para /planos-leitura - deve acessar (visualização)
- [ ] Navegar para /redes-sociais - deve acessar (visualização)
- [ ] Navegar para /boletins-avisos - deve acessar (visualização)
- [ ] Navegar para /institucional - deve acessar (visualização)
- [ ] Navegar para /privacidade - deve acessar (visualização)
- [ ] Navegar para /contas-pix - deve acessar (visualização)
- [ ] Navegar para /discipulado - deve acessar (visualização)
- [ ] Navegar para /escolas - deve acessar (visualização)
- [ ] Navegar para /celulas - deve acessar (visualização)
- [ ] Navegar para /ministerios - deve acessar (visualização)

#### 1.3 Role: aluno
- [ ] Login como aluno
- [ ] Repetir testes de navegação do membro
- [ ] Verificar comportamento consistente

#### 1.4 Role: congregado
- [ ] Login como congregado
- [ ] Repetir testes de navegação do membro
- [ ] Verificar comportamento consistente

#### 1.5 Role: admin
- [ ] Login como admin
- [ ] Verificar acesso total a todas as funcionalidades
- [ ] Verificar se pode editar/excluir em todas as páginas

#### 1.6 Role: pastor
- [ ] Login como pastor
- [ ] Verificar acesso total a todas as funcionalidades
- [ ] Verificar se pode editar/excluir em todas as páginas

#### 1.7 Role: secretario
- [ ] Login como secretario
- [ ] Verificar acesso total a todas as funcionalidades
- [ ] Verificar se pode editar/excluir em todas as páginas

#### 1.8 Role: tesoureiro
- [ ] Login como tesoureiro
- [ ] Verificar acesso a /caixa-diario
- [ ] Verificar acesso a /relatorios
- [ ] Verificar se TrialGate não bloqueia
- [ ] Verificar se SubscriptionBlock não bloqueia

#### 1.9 Role: diretor_patrimonio
- [ ] Login como diretor_patrimonio
- [ ] Verificar acesso a /patrimonio
- [ ] Verificar se TrialGate não bloqueia
- [ ] Verificar se SubscriptionBlock não bloqueia

### 2. Testes de Edição vs Visualização

#### 2.1 Solicitações de Oração (/solicitacoes-oracao)
- [ ] Como membro: deve ver formulário para postar pedidos
- [ ] Como membro: NÃO deve ver botão de excluir pedidos
- [ ] Como admin: deve ver botão de excluir pedidos
- [ ] Como pastor_admin: deve ver botão de excluir pedidos

#### 2.2 Planos de Leitura (/planos-leitura)
- [ ] Como membro: deve poder criar planos
- [ ] Como membro: NÃO deve poder excluir planos de outros
- [ ] Como admin: deve poder excluir planos
- [ ] Como pastor_admin: deve poder excluir planos

#### 2.3 Redes Sociais (/redes-sociais)
- [ ] Como membro: deve visualizar links (somente leitura)
- [ ] Como membro: NÃO deve ver botão de salvar
- [ ] Como admin: deve ver botão de salvar
- [ ] Como pastor_admin: deve ver botão de salvar

#### 2.4 Página Institucional (/institucional)
- [ ] Como membro: deve visualizar dados (somente leitura)
- [ ] Como membro: NÃO deve ver botão de salvar
- [ ] Como admin: deve ver botão de salvar
- [ ] Como pastor_admin: deve ver botão de salvar

#### 2.5 Privacidade e LGPD (/privacidade)
- [ ] Como membro: deve visualizar configurações
- [ ] Como membro: pode alterar senha própria
- [ ] Como admin: pode editar configurações de privacidade

#### 2.6 Contas e PIX (/contas-pix)
- [ ] Como membro: deve visualizar dados PIX (somente leitura)
- [ ] Como membro: NÃO deve ver botão de salvar
- [ ] Como admin: deve ver botão de salvar
- [ ] Como tesoureiro: deve ver botão de salvar

#### 2.7 Discipulado (/discipulado)
- [ ] Como membro: deve visualizar discipulados (somente leitura)
- [ ] Como membro: NÃO deve ver botão de criar/editar
- [ ] Como admin: deve ver botão de criar/editar
- [ ] Como pastor_admin: deve ver botão de criar/editar

#### 2.8 Escolas (/escolas)
- [ ] Como membro: deve visualizar escolas (somente leitura)
- [ ] Como membro: NÃO deve ver botão de criar/editar
- [ ] Como admin: deve ver botão de criar/editar
- [ ] Como pastor_admin: deve ver botão de criar/editar

#### 2.9 Células (/celulas)
- [ ] Como membro: deve visualizar células (somente leitura)
- [ ] Como membro: NÃO deve ver botão de criar/editar
- [ ] Como admin: deve ver botão de criar/editar
- [ ] Como pastor_admin: deve ver botão de criar/editar
- [ ] Como lider_celula: deve ver botão de criar/editar

#### 2.10 Ministérios (/ministerios)
- [ ] Como membro: deve visualizar ministérios (somente leitura)
- [ ] Como membro: NÃO deve ver botão de criar/editar
- [ ] Como admin: deve ver botão de criar/editar
- [ ] Como pastor_admin: deve ver botão de criar/editar
- [ ] Como lider_ministerio: deve ver botão de criar/editar

#### 2.11 Eventos (/events)
- [ ] Como membro: deve visualizar eventos (somente leitura)
- [ ] Como membro: NÃO deve ver botão de criar/editar
- [ ] Como admin: deve ver botão de criar/editar
- [ ] Como pastor_admin: deve ver botão de criar/editar

#### 2.12 Boletins e Avisos (/boletins-avisos)
- [ ] Como membro: deve visualizar boletins (somente leitura)
- [ ] Como membro: NÃO deve ver botão de enviar
- [ ] Como admin: deve ver botão de enviar
- [ ] Como pastor_admin: deve ver botão de enviar

#### 2.13 Patrimônio (/patrimonio)
- [ ] Como membro: deve visualizar patrimônio (somente leitura)
- [ ] Como membro: NÃO deve ver botão de criar/editar
- [ ] Como admin: deve ver botão de criar/editar
- [ ] Como diretor_patrimonio: deve ver botão de criar/editar
- [ ] Como tesoureiro: deve ver botão de criar/editar

#### 2.14 Uploads (/uploads)
- [ ] Como membro: deve visualizar arquivos (somente leitura)
- [ ] Como membro: NÃO deve ver botão de upload
- [ ] Como admin: deve ver botão de upload
- [ ] Como pastor_admin: deve ver botão de upload

### 3. Testes de Exceções em Gates

#### 3.1 TrialGate
- [ ] pastor_admin não deve ser redirecionado para /institucional
- [ ] tesoureiro não deve ser redirecionado para /institucional
- [ ] secretario não deve ser redirecionado para /institucional
- [ ] diretor_patrimonio não deve ser redirecionado para /institucional
- [ ] membro deve ser redirecionado para /institucional se dados não preenchidos

#### 3.2 SubscriptionBlock
- [ ] pastor_admin não deve ser bloqueado por assinatura
- [ ] tesoureiro não deve ser bloqueado por assinatura
- [ ] secretario não deve ser bloqueado por assinatura
- [ ] diretor_patrimonio não deve ser bloqueado por assinatura
- [ ] membro deve ser bloqueado se assinatura inadimplente

### 4. Testes de Sidebar

- [ ] pastor_admin vê todos os itens relevantes
- [ ] membro vê itens de visualização (não de edição)
- [ ] tesoureiro vê apenas itens permitidos (caixa, relatórios)
- [ ] diretor_patrimonio vê patrimônio e itens básicos

### 5. Testes de Dashboard

- [ ] pastor_admin vê quick actions relevantes
- [ ] membro vê quick actions de visualização
- [ ] Verificar consistência entre Dashboard e Sidebar

## Resultados Esperados

- Build sem erros TypeScript
- Build Vite sem erros
- Todas as roles conseguem navegar para itens permitidos
- Permissões de edição vs visualização funcionam corretamente
- Exceções em TrialGate e SubscriptionBlock funcionam
- Sidebar e Dashboard consistentes com permissões

## Issues Encontrados

(Registrar issues durante testes)

## Status Final

- Build: ✅ PASSOU
- Testes Manuais: ⏳ PENDENTE
