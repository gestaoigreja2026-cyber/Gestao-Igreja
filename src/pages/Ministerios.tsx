import React, { useState } from 'react';
import MinisterioCard from '@/components/ministerios/MinisterioCard';
import { Button } from '@/components/ui/button';
import { Plus, Download } from 'lucide-react';
import { toast } from 'sonner';

interface Ministerio {
  id: string;
  icone: string;
  nome: string;
  descricao: string;
  lider: string;
  membros: number;
  reunioes: number;
  cor: string;
}

const ministeriosData: Ministerio[] = [
  {
    id: '1',
    icone: '🎨',
    nome: 'Artes',
    descricao: 'Departamento de Artes',
    lider: 'Maria Silva 1',
    membros: 15,
    reunioes: 4,
    cor: '#8B5CF6'
  },
  {
    id: '2',
    icone: '💑',
    nome: 'Casais',
    descricao: 'Departamento de Casais',
    lider: 'Maria Silva 1',
    membros: 38,
    reunioes: 6,
    cor: '#EC4899'
  },
  {
    id: '3',
    icone: '📚',
    nome: 'Ensino',
    descricao: 'Departamento de Ensino',
    lider: 'Maria Silva 1',
    membros: 25,
    reunioes: 8,
    cor: '#3B82F6'
  },
  {
    id: '4',
    icone: '⚽',
    nome: 'Esportes',
    descricao: 'Departamento de Esportes',
    lider: 'Maria Silva 1',
    membros: 20,
    reunioes: 3,
    cor: '#10B981'
  },
  {
    id: '5',
    icone: '🎵',
    nome: 'Louvor',
    descricao: 'Ministério de Louvor e Adoração',
    lider: 'Pastor João',
    membros: 45,
    reunioes: 12,
    cor: '#F59E0B'
  },
  {
    id: '6',
    icone: '🙏',
    nome: 'Intercessão',
    descricao: 'Equipe de Oração',
    lider: 'Irmã Ana Costa',
    membros: 32,
    reunioes: 24,
    cor: '#6366F1'
  },
  {
    id: '7',
    icone: '📢',
    nome: 'Evangelismo',
    descricao: 'Evangelização e Missões',
    lider: 'Pr. Carlos',
    membros: 28,
    reunioes: 6,
    cor: '#EF4444'
  },
  {
    id: '8',
    icone: '👶',
    nome: 'Infantil',
    descricao: 'Departamento Infantil',
    lider: 'Tia Maria João',
    membros: 25,
    reunioes: 8,
    cor: '#14B8A6'
  }
];

const Ministerios: React.FC = () => {
  const [ministerios, setMinisterios] = useState<Ministerio[]>(ministeriosData);

  // Função para abrir planilha Excel
  const handleOpenPlanilhaExcel = () => {
    toast.info('Abrindo planilha de Ministérios...', {
      description: 'Planilha_Ministerios_Completa.xlsx'
    });
    
    // Tentar abrir o arquivo
    try {
      // Criar um link para o arquivo
      const link = document.createElement('a');
      link.href = 'file:///C:/Users/eduka/Desktop/Planilha_Ministerios_Completa.xlsx';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao abrir planilha:', error);
      toast.error('Não foi possível abrir a planilha automaticamente', {
        description: 'Verifique se o arquivo está na Desktop'
      });
    }
  };

  // Função para deletar ministério
  const handleDelete = (id: string) => {
    setMinisterios(prev => prev.filter(m => m.id !== id));
    toast.success('Ministério excluído com sucesso!');
  };

  // Calcular totais
  const totalMembros = ministerios.reduce((acc, m) => acc + m.membros, 0);
  const totalReunioes = ministerios.reduce((acc, m) => acc + m.reunioes, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ⛪ Gestão de Ministérios
            </h1>
            <p className="text-gray-600">
              Gerencie todos os ministérios e departamentos da igreja
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Novo Ministério
            </Button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white text-2xl">
                ⛪
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de Ministérios</p>
                <p className="text-2xl font-bold text-blue-600">{ministerios.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-xl p-6 border border-green-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white text-2xl">
                👥
              </div>
              <div>
                <p className="text-sm text-gray-600">Membros Ativos</p>
                <p className="text-2xl font-bold text-green-600">{totalMembros}</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white text-2xl">
                📅
              </div>
              <div>
                <p className="text-sm text-gray-600">Reuniões/Mês</p>
                <p className="text-2xl font-bold text-amber-600">{totalReunioes}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Ministérios */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          📋 Ministérios Ativos
        </h2>
        
        <div className="flex flex-wrap gap-6 justify-start">
          {ministerios.map((ministerio) => (
            <MinisterioCard
              key={ministerio.id}
              ministerio={ministerio}
              onOpenPlanilha={handleOpenPlanilhaExcel}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>

    </div>
  );
};

export default Ministerios;
