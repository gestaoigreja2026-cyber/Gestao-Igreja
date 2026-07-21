import React from 'react';
import { Building2, Users, Calendar, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

interface MinisterioCardProps {
  ministerio: Ministerio;
  onOpenPlanilha?: () => void;
  onDelete?: (id: string) => void;
}

const MinisterioCard: React.FC<MinisterioCardProps> = ({ 
  ministerio, 
  onOpenPlanilha,
  onDelete 
}) => {
  // Função para abrir a planilha Excel
  const handleOpenPlanilha = () => {
    // Tentar abrir o arquivo Excel local
    const excelPath = 'C:/Users/eduka/Desktop/Planilha_Ministerios_Completa.xlsx';
    
    // Criar um link temporário para download/abertura
    const link = document.createElement('a');
    link.href = `file://${excelPath}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    // Para sistemas Windows, tentar abrir via protocolo
    try {
      window.open(`file://${excelPath}`, '_blank');
    } catch (e) {
      console.log('Tentativa de abrir arquivo local:', e);
    }
    
    // Callback opcional
    if (onOpenPlanilha) {
      onOpenPlanilha();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border-t-4 hover:shadow-xl transition-all duration-300 p-6 min-w-[280px] max-w-[320px]">
      {/* Header com ícone e botão deletar */}
      <div className="flex justify-between items-start mb-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: `${ministerio.cor}20`, color: ministerio.cor }}
        >
          <Building2 className="w-6 h-6" style={{ color: ministerio.cor }} />
        </div>
        
        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-red-400 hover:text-red-600 transition-colors p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Ministério?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o ministério {ministerio.nome}? 
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => onDelete(ministerio.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Nome e Descrição */}
      <h3 className="text-xl font-bold text-gray-900 mb-1">
        {ministerio.nome}
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        {ministerio.descricao}
      </p>

      {/* Líder e Membros */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4 text-gray-400" />
          <span>{ministerio.lider}</span>
        </div>
        <div 
          className="flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full"
          style={{ backgroundColor: `${ministerio.cor}15`, color: ministerio.cor }}
        >
          <Users className="w-3 h-3" />
          {ministerio.membros}
        </div>
      </div>

      {/* Reuniões */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Calendar className="w-4 h-4 text-gray-400" />
        <span>Reuniões: </span>
        <span className="font-medium text-gray-700">{ministerio.reunioes}</span>
      </div>

      {/* Botão Gerenciar */}
      <Button 
        onClick={handleOpenPlanilha}
        className="w-full font-medium transition-all duration-200"
        style={{ 
          backgroundColor: ministerio.cor,
          color: 'white'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = ministerio.cor;
          e.currentTarget.style.opacity = '0.9';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = ministerio.cor;
          e.currentTarget.style.opacity = '1';
        }}
      >
        Gerenciar Ministério
      </Button>
    </div>
  );
};

export default MinisterioCard;
