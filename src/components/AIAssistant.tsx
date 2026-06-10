import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Message {
  id: string;
  type: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

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
    keywords: ['membro', 'congregado', 'cadastro', 'pessoa', 'fiel', 'secretaria'],
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
    keywords: ['célula', 'grupo', 'pequeno', 'reunião', 'lider', 'líder de célula'],
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
    keywords: ['caixa', 'financeiro', 'dinheiro', 'entrada', 'saída', 'tesouro', 'oferta', 'dízimo', 'financeiro', 'extrato', 'upload', 'ofx', 'csv', 'pdf'],
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
    keywords: ['como acessar', 'login', 'entrar', 'senha', 'cadastro', 'registro', 'criar conta', 'primeiro acesso', 'esqueci senha', 'recuperar senha'],
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

� **Como Acessar** - Login, senha, primeiro acesso
�📊 Dashboard e estatísticas
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

function findBestResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();
  
  // Procura por correspondências exatas primeiro
  for (const [key, data] of Object.entries(KNOWLEDGE_BASE)) {
    if (data.keywords.some(k => msg.includes(k))) {
      return data.response;
    }
  }
  
  // Se não encontrou, retorna resposta genérica
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
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      type: 'bot',
      text: KNOWLEDGE_BASE.geral.response,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Simula tempo de processamento da IA
    setTimeout(() => {
      const response = findBestResponse(userMsg.text);
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        text: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 800 + Math.random() * 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full w-14 h-14 shadow-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 border-0 group animate-pulse"
        >
          <MessageCircle className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed z-50 transition-all duration-300 ${
      isMinimized 
        ? 'bottom-6 right-6' 
        : 'bottom-6 right-6 w-[380px] max-w-[calc(100vw-48px)]'
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
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[600px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Assistente Virtual</h3>
                <p className="text-xs text-blue-100">Especialista em Gestão Igreja</p>
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

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 max-h-[400px] min-h-[300px]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.type === 'user' ? 'bg-blue-100' : 'bg-gradient-to-r from-blue-600 to-cyan-500'
                }`}>
                  {msg.type === 'user' ? (
                    <User className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${
                  msg.type === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'
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
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md p-3 shadow-sm">
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
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua dúvida..."
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!inputText.trim()}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Assistente automatizado • Respostas baseadas em base de conhecimento
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
