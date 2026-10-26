import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { membersService } from '@/services/members.service';
import { eventsService } from '@/services/events.service';
import { cellsService } from '@/services/cells.service';
import { ministriesService } from '@/services/ministries.service';
import type { UserRole } from '@/types';

interface Message {
  id: string;
  type: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

const LEADERSHIP_ROLES: UserRole[] = [
  'superadmin',
  'admin',
  'pastor',
  'pastor_admin',
  'secretario',
  'tesoureiro',
  'lider_celula',
  'lider_ministerio',
  'diretor_patrimonio'
];

const KNOWLEDGE_BASE = {
  dashboard: {
    keywords: ['dashboard', 'painel', 'início', 'tela inicial', 'visão geral'],
    response: `📊 **Dashboard (Painel Inicial)**

O Dashboard é a central de comando do sistema! Ele mostra:
• **Versículo do dia** - Palavra motivacional atualizada
• **Aniversariantes** - Lista de membros fazendo aniversário hoje
• **Ações rápidas** - Atalhos para tarefas frequentes
• **Estatísticas** - Cards com totais de membros, células, ministérios e convertidos
• **Próximos eventos** - Calendário de cultos e atividades
• **Resumo financeiro** - Entradas, saídas e saldo do mês (para pastores/tesoureiros)

Acesso: Menu lateral → Dashboard`
  },
  membros: {
    keywords: ['como cadastrar membro', 'membro', 'congregado', 'cadastro', 'pessoa', 'fiel', 'secretaria'],
    response: `👥 **Membros e Congregados**

Cadastro completo com:
• Dados pessoais (nome, foto, telefone, email)
• Endereço completo com CEP
• Data de nascimento e estado civil
• Categoria: Membro, Congregado, Criança ou Visitante
• Status: Ativo, Inativo
• Batismo e data
• Vínculo a célula e ministério
• Upload de foto de perfil

**Recursos especiais:**
- Busca por nome, telefone ou email
- Filtros por categoria, status, célula
- Carteirinha digital com QR Code
- Certificados (batismo, casamento, etc.)
- Transferência entre igrejas
- Aniversariantes do dia/mês

Acesso: Menu → Membros e Congregados`
  },
  celulas: {
    keywords: ['como funciona célula', 'célula', 'grupo', 'pequeno', 'reunião', 'lider', 'líder de célula'],
    response: `🏘️ **Células (Grupos Pequenos)**

Organização completa de células:
• Cadastro de células (nome, dia, horário, bairro)
• Designação de líder e vice-líder
• Vínculo de membros à célula
• Relatórios de frequência semanal
• Controle de visitantes na célula
• Multiplicação de células
• Estatísticas de crescimento

**Relatório de Célula inclui:**
- Data da reunião
- Membros presentes
- Visitantes
- Oferta arrecadada
- Observações

Acesso: Menu → Ministérios e Células → Células`
  },
  ministerios: {
    keywords: ['ministério', 'departamento', 'equipe', 'trabalho', 'setor'],
    response: `⛪ **Ministérios e Departamentos**

Cadastro de ministérios:
• Nome e descrição
• Líder do ministério
• Dia e horário de reuniões
• Local de encontro
• Membros vinculados
• Status: Ativo/Inativo

**Ministérios sugeridos:**
- Ministério Infantil
- Ministério de Jovens
- Ministério de Louvor
- Ministério de Dança
- Intercessão
- Recepção
- Som e Multimídia

Acesso: Menu → Ministérios e Células → Ministérios`
  },
  caixa: {
    keywords: ['caixa', 'financeiro', 'dinheiro', 'entrada', 'saída', 'tesouro', 'oferta', 'dízimo', 'extrato', 'upload', 'ofx', 'csv', 'pdf'],
    response: `💰 **Caixa Diário (Financeiro)**

Controle completo de finanças:
• **Entradas:** Dízimos, ofertas, doações, aluguéis, outros
• **Saídas:** Contas, compras, salários, ajudas, etc.
• **Categorias personalizáveis** para cada tipo
• **Formas de pagamento:** Dinheiro, PIX, Cartão, Transferência
• **Comprovantes:** Upload de notas fiscais/recibos
• **Relatórios:** Por período, por categoria, consolidado
• **Saldo em tempo real**

**Importação de Extratos:**
⚠️ **PDF não suportado** - Extratos em PDF não podem ser lidos automaticamente.
✅ **Formatos suportados:** OFX, CSV, TXT
💡 **Dica:** Baixe o extrato em formato OFX ou CSV diretamente do Internet Banking do seu banco. A maioria dos bancos brasileiros oferece essa opção.

**Segurança:**
- Acesso restrito a pastor, tesoureiro e secretário
- Rastreabilidade de quem lançou cada transação
- Exportação para Excel

Acesso: Menu → Caixa Diário
(Visível apenas para permissões financeiras)`
  },
  escalas: {
    keywords: ['escala', 'culto', 'evento', 'agenda', 'calendário', 'preleção', 'participação'],
    response: `📅 **Escalas e Eventos**

Agenda completa da igreja:
• Cadastro de cultos regulares
• Eventos especiais (congressos, retiros)
• Escalas de trabalho (recepção, som, etc.)
• Escala de pregação/pregadores
• Designação de participantes por função
• Confirmação online via link/email
• Lembretes automáticos

**Funções em escalas:**
- Pregador/Preletor
- Recepção
- Som/Multimídia
- Louvor
- Intercessão
- Outros

Acesso: Menu → Escalas de Culto`
  },
  boletins: {
    keywords: ['boletim', 'aviso', 'comunicado', 'notícia', 'anúncio', 'informativo'],
    response: `📰 **Boletins e Avisos**

Comunicação com a igreja:
• Criação de boletins oficiais
• Envio de avisos rápidos
• Categorias: Geral, Ministério, Célula
• Agendamento de publicações
• Notificações por email/app
• Histórico de comunicados

Acesso: Menu → Boletins e Avisos`
  },
  documentos: {
    keywords: ['documento', 'certificado', 'carteirinha', 'ata', 'transferência', 'comprovante', 'secretaria'],
    response: `📄 **Documentos e Secretaria**

Emissão de documentos oficiais:
• **Certificados:** Batismo, Casamento, Curso
• **Carteirinha de Membro** com QR Code
• **Transferência** entre igrejas
• **Atas de Reunião** (salvas em PDF)
• **Declarações** diversas
• **Upload de documentos** existentes

Todos os documentos são gerados em PDF com design profissional e campos dinâmicos preenchidos automaticamente.

Acesso: Menu → Secretaria`
  },
  consolidacao: {
    keywords: ['consolidação', 'novo convertido', 'visita', 'acompanhamento', 'semana', 'discípulo'],
    response: `✨ **Consolidação (Novos Convertidos)**

Acompanhamento de 4 semanas:
• **Cadastro** de visitantes/novos convertidos
• **1ª Semana:** Contato telefônico
• **2ª Semana:** Convite para célula
• **3ª Semana:** Convite para culto
• **4ª Semana:** Visita no lar
• **Batismo:** Data agendada
• **Observações** de cada etapa

Sistema garante que nenhum visitante seja esquecido!

Acesso: Menu → Consolidação`
  },
  planos_leitura: {
    keywords: ['plano de leitura', 'bíblia', 'estudo', 'leitura', 'devocional', 'versículo'],
    response: `📖 **Planos de Leitura Bíblica**

Engajamento espiritual:
• Planos personalizados (7 dias, 90 dias, ano)
• Acompanhamento de progresso
• Notificações diárias
• Versículo do dia automático
• Compartilhamento social
• Ranking de participação

Acesso: Menu → Planos de Leitura`
  },
  pix: {
    keywords: ['pix', 'qr code', 'doação', 'oferta', 'dízimo online', 'pagamento'],
    response: `💳 **PIX e QR Code**

Doações simplificadas:
• Configuração de chave PIX
• Geração automática de QR Code
• Compartilhamento fácil
• Registro automático no caixa
• Comprovante por email
• Múltiplas chaves (pastoral, missões, construção)

Acesso: Configurações → PIX e QR Code`
  },
  redes_sociais: {
    keywords: ['rede social', 'instagram', 'facebook', 'youtube', 'tiktok', 'link'],
    response: `🔗 **Redes Sociais**

Centralização digital:
• Cadastro de todas as redes sociais
• Links diretos para Instagram, Facebook, YouTube, TikTok
• Site da igreja
• Podcast/Spotify
• Página pública consolidada

Acesso: Menu → Redes Sociais`
  },
  pastores: {
    keywords: ['pastor', 'bispo', 'apóstolo', 'presidente', 'líder', 'dirigente'],
    response: `👨‍⚖️ **Cadastro de Pastores**

Identidade ministerial:
• Nome e foto do pastor
• Texto de apresentação/biografia
• Cargos (Presidente, Vice, Auxiliar)
• Data de consagração
• Contato direto
• Exibição na página institucional

Acesso: Menu → Pastores`
  },
  oracao: {
    keywords: ['oração', 'pedido', 'intercessão', 'súplica', 'orações'],
    response: `🙏 **Solicitação de Oração**

Caderno de orações:
• Registro de pedidos de oração
• Categoria: Saúde, Família, Finanças, etc.
• Status: Aberto, Em Oração, Respondido
• Responsável designado
• Testemunho de resposta
• Prazo/urgência
• Lista de intercessores

Acesso: Menu → Orações`
  },
  discipulado: {
    keywords: ['discipulado', 'mentoria', 'discípulo', 'mentor', 'treinamento'],
    response: `🎓 **Discipulado**

Acompanhamento personalizado:
• Cadastro de discípulos e mentores
• Etapas/módulos do processo
• Progresso de cada discípulo
• Encontros agendados
• Material de estudo
• Conclusão e certificação

Acesso: Menu → Discipulado
(Visível para líderes e pastores)`
  },
  patrimonial: {
    keywords: ['patrimônio', 'bem', 'equipamento', 'inventário', 'móvel', 'patrimonial'],
    response: `🏛️ **Patrimonial**

Controle de bens:
• Cadastro de equipamentos
• Nota fiscal e valor de aquisição
• Depreciação automática
• Manutenções agendadas
• Localização/setor
• Responsável
• Status: Ativo, Em Manutenção, Baixado

Acesso: Menu → Patrimonial`
  },
  uploads: {
    keywords: ['upload', 'arquivo', 'documento', 'pdf', 'foto', 'imagem', 'anexo'],
    response: `📁 **Uploads e Documentos**

Armazenamento organizado:
• Upload de arquivos diversos
• Categorias: Atas, Estudos, Estatutos, Transferências
• Vínculo a membros ou eventos
• Histórico de versões
• Download fácil
• Permissões por perfil

Acesso: Menu → Uploads e Atas`
  },
  permissoes: {
    keywords: ['permissão', 'acesso', 'perfil', 'função', 'cargo', 'nível', 'role'],
    response: `🔐 **Perfis e Permissões**

Níveis de acesso:

**Administrador/Superadmin:**
- Acesso total ao sistema
- Configurações da igreja
- Gestão de usuários

**Pastor:**
- Dashboard completo
- Todos os membros
- Ministérios e células
- Secretaria e documentos
- Relatórios

**Secretário:**
- Cadastro de membros
- Documentação
- Boletins e avisos

**Tesoureiro:**
- Caixa diário
- Relatórios financeiros
- Extratos

**Líder de Célula:**
- Membros da sua célula
- Relatórios de célula
- Discipulado

**Líder de Ministério:**
- Membros do ministério
- Relatórios do ministério

**Membro/Congregado:**
- Perfil pessoal
- Avisos
- Confirmação de escala
- Doação PIX`
  },
  precos: {
    keywords: ['preço', 'valor', 'custo', 'mensalidade', 'assinatura', 'plano', 'pagar'],
    response: `💎 **Investimento**

**Plano Mensal:**
• Valor: R$ 75,00/mês (promocional 50% OFF)
• Valor original: R$ 150,00/mês
• Acesso ilimitado a todos os recursos
• Suporte técnico
• Atualizações gratuitas
• Usuários ilimitados

**Teste Grátis:**
• 7 dias gratuitos
• Sem cartão de crédito
• Acesso completo
• Migração de dados assistida

Clique em "Testar grátis" no topo da página!`
  },
  suporte: {
    keywords: ['suporte', 'ajuda', 'problema', 'erro', 'bug', 'duvida', 'dúvida', 'contato'],
    response: `🆘 **Suporte e Ajuda**

Precisa de ajuda?

**Canais de atendimento:**
• Email: suporte@gestaoigreja.com.br
• WhatsApp: (11) 99999-9999
• Horário: Seg-Sex, 9h às 18h

**Base de conhecimento:**
• Tutoriais em vídeo
• Artigos de ajuda
• FAQ completo

**Suporte Premium (assinantes):**
• Atendimento prioritário
• Treinamento de equipe
• Configuração inicial assistida`
  },
  como_acessar: {
    keywords: ['como acessar', 'login', 'entrar', 'senha', 'registro', 'criar conta', 'primeiro acesso', 'esqueci senha', 'recuperar senha'],
    response: `🔑 **Como Acessar o Sistema**

**Para quem já tem conta:**
1. Clique em **"Entrar"** (botão azul no topo)
2. Digite seu **email** cadastrado
3. Digite sua **senha**
4. Clique em **"Entrar no Sistema"**

**Esqueceu a senha?**
1. Na tela de login, clique em **"Esqueci minha senha"**
2. Digite seu email cadastrado
3. Você receberá um link para redefinir a senha
4. Crie uma nova senha segura

**Primeiro acesso (Teste Grátis):**
1. Clique em **"Testar grátis"** (botão verde)
2. Preencha os dados da sua igreja
3. Crie seu usuário administrador
4. Comece a usar imediatamente!

**Requisitos:**
• Navegador: Chrome, Firefox, Safari ou Edge
• Internet estável
• Disponível em: computador, tablet e celular`
  },
  geral: {
    keywords: ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'e aí', 'hey', 'hi', 'hello'],
    response: `👋 **Olá! Bem-vindo ao Gestão Igreja!**

Sou o **Assistente Virtual** especialista no sistema. Posso ajudar com:

🔑 **Como Acessar** - Login, senha, primeiro acesso
📊 Dashboard e estatísticas
👥 Cadastro de membros
🏘️ Células e ministérios
💰 Finanças e caixa
📅 Escalas e eventos
📄 Documentos e certificados
✨ Consolidação de novos convertidos
🙏 Pedidos de oração
🎓 Discipulado
📖 Planos de leitura
💳 PIX e QR Code
🔗 Redes sociais
🔐 Perfis e permissões

**Como usar:**
Escreva sua dúvida naturalmente, por exemplo:
- "Como cadastrar um membro?"
- "Como funciona o caixa?"
- "O que é consolidação?"
- "Como faço login?"
- "Quanto custa o sistema?"

Como posso ajudar você hoje? 😊`
  }
};

function getAuthenticatedWelcome(userName?: string, canViewMembers?: boolean): string {
  return `👋 **Olá${userName ? `, ${userName}` : ''}! Bem-vindo ao Assistente da Igreja!**

Estou conectado aos dados da sua igreja em tempo real. Veja o que você pode me perguntar aqui dentro do sistema:

📅 **Programação da Igreja:**
- *"Qual a programação da igreja?"*
- *"Próximos cultos e eventos"*

🏘️ **Células e Ministérios:**
- *"Quais são as células e horários?"*
- *"Quais são os ministérios?"*

🎂 **Aniversariantes:**
- *"Quem faz aniversário este mês?"*
- *"Aniversariantes de hoje"*
${canViewMembers ? `
📞 **Consulta de Membros (Liderança):**
- *"Telefone de [nome do membro]"*
- *"Endereço de [nome do membro]"*
- *"Buscar membro [nome]"*` : ''}

💡 Além disso, continuo tirando dúvidas sobre como usar todas as funções do sistema! Como posso ajudar?`;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Não informada';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function extractMemberSearchTerm(rawMsg: string): string {
  const norm = normalizeText(rawMsg);
  const stopWords = new Set([
    'qual', 'quais', 'me', 'passa', 'diz', 'mostrar', 'mostre', 'ver', 'buscar',
    'procurar', 'pesquisar', 'consultar', 'onde', 'mora', 'quem', 'e', 'dados',
    'informacoes', 'ficha', 'contato', 'contatos', 'telefone', 'telefones',
    'celular', 'celulares', 'whatsapp', 'zap', 'numero', 'numeros', 'endereco',
    'enderecos', 'rua', 'bairro', 'email', 'emails', 'e-mail', 'do', 'da', 'de',
    'dos', 'das', 'o', 'a', 'os', 'as', 'membro', 'membros', 'congregado', 'irmao',
    'irma', 'pastor', 'lider'
  ]);
  const words = norm.replace(/[?!.,;:()]/g, ' ').split(/\s+/).filter(Boolean);
  const filtered = words.filter(w => !stopWords.has(w));
  return filtered.join(' ').trim();
}

function findBestStaticResponse(userMessage: string, isAuthenticated: boolean, userName?: string, canViewMembers?: boolean): string {
  const msg = userMessage.toLowerCase();

  if (KNOWLEDGE_BASE.geral.keywords.some(k => msg === k || msg.startsWith(k + ' ') || msg.startsWith(k + '!'))) {
    return isAuthenticated ? getAuthenticatedWelcome(userName, canViewMembers) : KNOWLEDGE_BASE.geral.response;
  }

  for (const [, data] of Object.entries(KNOWLEDGE_BASE)) {
    if (data.keywords.some(k => msg.includes(k))) {
      return data.response;
    }
  }

  if (isAuthenticated) {
    return `🤔 Não encontrei uma resposta exata para isso.

Você pode me perguntar coisas como:
• **"Qual a programação da igreja?"** (cultos e eventos)
• **"Quais são as células?"** (dias, locais e líderes)
• **"Aniversariantes do mês"**${canViewMembers ? `\n• **"Telefone de [nome]"** ou **"Endereço de [nome]"**` : ''}
• Ou dúvidas sobre o sistema (ex: *"Como funciona o caixa?"*, *"Certificados"*)`;
  }

  return `🤔 Desculpe, não entendi completamente. 

Posso ajudar com esses tópicos:
• Dashboard e relatórios
• Membros e células
• Finanças (caixa)
• Escalas e eventos
• Documentos (certificados, carteirinhas)
• Consolidação de convertidos
• Configurações

Tente reformular ou escolha um desses temas!`;
}

export function AIAssistant() {
  const { isAuthenticated, user, churchId, viewingChurch } = useAuth();
  const effectiveChurchId = viewingChurch?.id || churchId || user?.churchId;
  const canViewMemberContacts = Boolean(user?.role && LEADERSHIP_ROLES.includes(user.role));

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      type: 'bot',
      text: isAuthenticated
        ? getAuthenticatedWelcome(user?.name, canViewMemberContacts)
        : KNOWLEDGE_BASE.geral.response,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === 'welcome') {
        return [
          {
            id: 'welcome',
            type: 'bot',
            text: isAuthenticated
              ? getAuthenticatedWelcome(user?.name, canViewMemberContacts)
              : KNOWLEDGE_BASE.geral.response,
            timestamp: new Date()
          }
        ];
      }
      return prev;
    });
  }, [isAuthenticated, user?.name, canViewMemberContacts]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  async function processMessage(userMessage: string): Promise<string> {
    const norm = normalizeText(userMessage);

    // Verifica se o usuário está tentando consultar dados internos da igreja
    const isScheduleQuery =
      /\b(programacao|agenda|proximos cultos|proximo culto|proximos eventos|proximo evento|cultos da semana|eventos da semana|eventos do mes|quando tem culto|horario de culto|horarios de culto|culto hoje|eventos hoje)\b/.test(norm) ||
      (norm.includes('programacao') || norm.includes('proximos cultos') || norm.includes('proximos eventos'));

    const isBirthdayQuery =
      /\b(aniversariante|aniversariantes|aniversario|aniversarios|quem faz aniversario)\b/.test(norm);

    const isCellsListQuery =
      /\b(quais sao as celulas|lista de celulas|celulas da igreja|horarios das celulas|horario das celulas|dias de celula|onde tem celula|endereco das celulas)\b/.test(norm);

    const isMinistriesListQuery =
      /\b(quais sao os ministerios|lista de ministerios|ministerios da igreja)\b/.test(norm);

    const isMemberLookupQuery =
      /\b(telefone|celular|whatsapp|zap|endereco|onde mora|contato|numero|ficha|buscar membro|procurar membro|dados de|dados do|dados da)\b/.test(norm) &&
      !norm.includes('suporte') &&
      !norm.includes('como cadastrar');

    // Se NÃO está logado no app, bloqueia consultas internas da igreja
    if (!isAuthenticated || !effectiveChurchId) {
      if (isScheduleQuery || isBirthdayQuery || isCellsListQuery || isMinistriesListQuery || isMemberLookupQuery) {
        return `🔒 **Acesso Restrito ao App**

Consultas sobre **telefones e endereços de membros**, **programação da igreja**, **células** e **aniversariantes** ficam disponíveis apenas **dentro do aplicativo** após fazer login.

👉 Clique em **"Entrar"** no topo da página para acessar sua conta e consultar os dados da sua igreja!`;
      }
      return findBestStaticResponse(userMessage, false);
    }

    // =========================================================================
    // DENTRO DO APP (USUÁRIO LOGADO) - CONSULTAS EM TEMPO REAL
    // =========================================================================

    try {
      // 1. Consulta de Telefone / Endereço / Contato de Membros
      if (isMemberLookupQuery) {
        if (!canViewMemberContacts) {
          return `🔒 **Permissão Restrita à Liderança**

Por questões de privacidade (LGPD), a consulta de **telefone e endereço de outros membros** pelo assistente está liberada apenas para a **Liderança e Administração** (Pastores, Secretários, Tesoureiros e Líderes).

Você pode consultar livremente:
• 📅 **Programação e cultos da igreja**
• 🏘️ **Células e horários**
• 🎂 **Aniversariantes do mês**`;
        }

        const searchTerm = extractMemberSearchTerm(userMessage);
        const allMembers = await membersService.getAll(effectiveChurchId);

        if (!allMembers || allMembers.length === 0) {
          return `📭 Ainda não há membros cadastrados nesta igreja.`;
        }

        if (!searchTerm || searchTerm.length < 2) {
          return `🔎 Para consultar o telefone ou endereço de um membro, digite o nome dele.

**Exemplos:**
• *"Telefone do João"*
• *"Endereço da Maria"*
• *"Contato de Pedro"*`;
        }

        const matched = allMembers.filter(m =>
          normalizeText(m.name || '').includes(searchTerm)
        );

        if (matched.length === 0) {
          return `🔎 Não encontrei nenhum membro com o nome **"${searchTerm}"**. Verifique a grafia ou consulte a aba **Membros**.`;
        }

        const topMatches = matched.slice(0, 5);
        const lines = topMatches.map(m => {
          const phone = m.phone || 'Não cadastrado';
          const addressParts = [m.address, m.city, m.state].filter(Boolean);
          const address = addressParts.length > 0 ? addressParts.join(' - ') : 'Não cadastrado';
          const email = m.email ? `\n  ✉️ Email: ${m.email}` : '';
          return `👤 **${m.name}** (${m.status || 'ativo'})\n  📞 Tel/WhatsApp: **${phone}**\n  📍 Endereço: ${address}${email}`;
        });

        const moreText = matched.length > 5 ? `\n\n*(Mostrando 5 de ${matched.length} resultados encontrados)*` : '';
        return `📋 **Dados encontrados (${matched.length}):**\n\n${lines.join('\n\n')}${moreText}`;
      }

      // 2. Consulta de Programação / Agenda / Cultos / Eventos da Igreja
      if (isScheduleQuery) {
        const upcoming = await eventsService.getUpcoming(effectiveChurchId);
        if (!upcoming || upcoming.length === 0) {
          return `📅 **Programação da Igreja**

No momento não há próximos cultos ou eventos agendados no calendário.
Você pode visualizar ou cadastrar atividades no menu **Escalas e Eventos**.`;
        }

        const nextEvents = upcoming.slice(0, 8);
        const list = nextEvents.map(e => {
          const dateFormatted = formatDateBR(e.date);
          const timeFormatted = e.time ? String(e.time).substring(0, 5) : '';
          const loc = e.location ? ` • 📍 ${e.location}` : '';
          const typeLabel = e.type ? `[${e.type.toUpperCase()}] ` : '';
          return `• **${dateFormatted}${timeFormatted ? ` às ${timeFormatted}` : ''}** — ${typeLabel}**${e.title}**${loc}`;
        });

        return `📅 **Próxima Programação da Igreja:**\n\n${list.join('\n')}\n\n💡 *Para ver escalas completas e detalhes, acesse o menu **Eventos**.*`;
      }

      // 3. Consulta de Aniversariantes
      if (isBirthdayQuery) {
        const allMembers = await membersService.getAll(effectiveChurchId);
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();
        const isTodayOnly = norm.includes('hoje') || norm.includes('dia');

        const birthdays = (allMembers || []).filter(m => {
          if (!m.birth_date) return false;
          const parts = m.birth_date.split('-');
          if (parts.length !== 3) return false;
          const month = parseInt(parts[1], 10);
          const day = parseInt(parts[2], 10);
          return isTodayOnly ? (month === currentMonth && day === currentDay) : (month === currentMonth);
        }).sort((a, b) => {
          const dayA = parseInt((a.birth_date || '').split('-')[2] || '0', 10);
          const dayB = parseInt((b.birth_date || '').split('-')[2] || '0', 10);
          return dayA - dayB;
        });

        if (birthdays.length === 0) {
          return isTodayOnly
            ? `🎂 Nenhum membro cadastrado faz aniversário hoje (${String(currentDay).padStart(2, '0')}/${String(currentMonth).padStart(2, '0')}).`
            : `🎂 Nenhum aniversariante encontrado para este mês.`;
        }

        const list = birthdays.slice(0, 15).map(m => {
          const parts = (m.birth_date || '').split('-');
          const dayMonth = `${parts[2]}/${parts[1]}`;
          const isToday = parseInt(parts[2], 10) === currentDay && parseInt(parts[1], 10) === currentMonth;
          return `• **${dayMonth}** — ${m.name}${isToday ? ' 🎉 **(Hoje!)**' : ''}`;
        });

        return `🎂 **Aniversariantes ${isTodayOnly ? 'de Hoje' : 'deste Mês'} (${birthdays.length}):**\n\n${list.join('\n')}`;
      }

      // 4. Consulta de Células da Igreja
      if (isCellsListQuery || (norm === 'celulas' || norm === 'as celulas')) {
        const activeCells = await cellsService.getActive(effectiveChurchId);
        if (!activeCells || activeCells.length === 0) {
          return `🏘️ Ainda não há células ativas cadastradas na igreja.`;
        }

        const list = activeCells.slice(0, 10).map((c: any) => {
          const day = c.meeting_day || 'Dia a definir';
          const time = c.meeting_time ? ` às ${String(c.meeting_time).substring(0, 5)}` : '';
          const leader = c.leader?.name ? `\n  👤 Líder: ${c.leader.name}` : '';
          const addr = c.address ? `\n  📍 Local: ${c.address}` : '';
          return `🏘️ **${c.name}** (${day}${time})${leader}${addr}`;
        });

        return `🏘️ **Células Ativas da Igreja (${activeCells.length}):**\n\n${list.join('\n\n')}`;
      }

      // 5. Consulta de Ministérios da Igreja
      if (isMinistriesListQuery) {
        const ministries = await ministriesService.getActive(effectiveChurchId);
        if (!ministries || ministries.length === 0) {
          return `⛪ Ainda não há ministérios ativos cadastrados na igreja.`;
        }

        const list = ministries.slice(0, 12).map((m: any) => {
          const leader = m.leader?.name ? ` — Líder: ${m.leader.name}` : '';
          return `• **${m.name}**${leader}`;
        });

        return `⛪ **Ministérios da Igreja (${ministries.length}):**\n\n${list.join('\n')}`;
      }
    } catch (err) {
      console.error('[AIAssistant] Erro ao consultar dados:', err);
    }

    return findBestStaticResponse(userMessage, true, user?.name, canViewMemberContacts);
  }

  const handleSend = (customText?: string) => {
    const textToSend = (customText ?? inputText).trim();
    if (!textToSend || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInputText('');
    setIsTyping(true);

    setTimeout(async () => {
      const response = await processMessage(userMsg.text);

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        text: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 400);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 print:hidden">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          title="Abrir Assistente Virtual"
          className="rounded-full w-14 h-14 shadow-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 border-0 group animate-pulse"
        >
          <MessageCircle className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed z-50 transition-all duration-300 print:hidden ${
      isMinimized 
        ? 'bottom-6 right-6' 
        : 'bottom-6 right-6 w-[380px] max-w-[calc(100vw-32px)]'
    }`}>
      {isMinimized ? (
        <Button
          onClick={() => setIsMinimized(false)}
          size="lg"
          className="rounded-full w-14 h-14 shadow-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 border-0"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </Button>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[600px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Assistente Virtual</h3>
                <p className="text-xs text-blue-100">
                  {isAuthenticated ? 'Conectado à sua Igreja' : 'Especialista em Gestão Igreja'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Actions (Apenas Logado) */}
          {isAuthenticated && (
            <div className="px-3 py-2 bg-blue-50/80 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700 flex gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => handleSend('Qual a programação da igreja?')}
                className="shrink-0 text-xs bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-slate-700 rounded-full px-2.5 py-1 hover:bg-blue-100 transition-colors"
              >
                📅 Programação
              </button>
              <button
                type="button"
                onClick={() => handleSend('Quais são as células?')}
                className="shrink-0 text-xs bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-slate-700 rounded-full px-2.5 py-1 hover:bg-blue-100 transition-colors"
              >
                🏘️ Células
              </button>
              <button
                type="button"
                onClick={() => handleSend('Aniversariantes do mês')}
                className="shrink-0 text-xs bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-slate-700 rounded-full px-2.5 py-1 hover:bg-blue-100 transition-colors"
              >
                🎂 Aniversariantes
              </button>
              {canViewMemberContacts && (
                <button
                  type="button"
                  onClick={() => {
                    setInputText('Telefone de ');
                    inputRef.current?.focus();
                  }}
                  className="shrink-0 text-xs bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-slate-700 rounded-full px-2.5 py-1 hover:bg-blue-100 transition-colors"
                >
                  📞 Buscar Membro
                </button>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-slate-950 max-h-[380px] min-h-[280px]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.type === 'user' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gradient-to-r from-blue-600 to-cyan-500'
                }`}>
                  {msg.type === 'user' ? (
                    <User className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${
                  msg.type === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-slate-800 rounded-bl-md shadow-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl rounded-bl-md p-3 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isAuthenticated ? "Pergunte agenda, célula, contato..." : "Digite sua dúvida..."}
                className="flex-1"
              />
              <Button
                onClick={() => handleSend()}
                disabled={!inputText.trim() || isTyping}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              {isAuthenticated
                ? 'Conectado aos dados da igreja • Respostas em tempo real'
                : 'Assistente automatizado • Respostas baseadas em base de conhecimento'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
