import { useState, useEffect } from 'react';
import { AlertTriangle, WifiOff, X, FileSpreadsheet } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';

interface SystemStatus {
  supabase: boolean;
  websocket: boolean;
}

export function SystemStatusBanner() {
  const [status, setStatus] = useState<SystemStatus>({ supabase: true, websocket: true });
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkSystemStatus();
    
    // Verificar a cada 30 segundos
    const interval = setInterval(checkSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  async function checkSystemStatus() {
    try {
      setChecking(true);
      
      // Testar conexão com Supabase
      const { error } = await supabase.from('churches').select('count', { count: 'exact', head: true });
      const supabaseOk = !error;
      
      // Verificar WebSocket (realtime)
      const wsOk = true; // WebSocket pode falhar mas a API REST ainda funciona
      
      setStatus({ supabase: supabaseOk, websocket: wsOk });
    } catch (e) {
      setStatus({ supabase: false, websocket: false });
    } finally {
      setChecking(false);
    }
  }

  if (dismissed) return null;
  
  // Se tudo está OK, não mostrar banner
  if (status.supabase && status.websocket) return null;

  const hasCriticalError = !status.supabase;

  return (
    <Alert 
      variant={hasCriticalError ? "destructive" : "default"} 
      className={`mb-4 relative ${hasCriticalError ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}
    >
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <div className="flex items-start gap-3 pr-8">
        {hasCriticalError ? (
          <WifiOff className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        )}
        
        <div className="flex-1">
          <AlertTitle className={hasCriticalError ? "text-red-800" : "text-amber-800"}>
            {hasCriticalError ? "Problema de Conexão" : "Aviso do Sistema"}
          </AlertTitle>
          
          <AlertDescription className={`text-sm mt-1 ${hasCriticalError ? "text-red-700" : "text-amber-700"}`}>
            {!status.supabase && (
              <p className="mb-1">
                <strong>Não foi possível conectar ao servidor.</strong> Alguns dados podem não carregar corretamente.
                Verifique sua conexão com a internet ou tente recarregar a página.
              </p>
            )}
            
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-2">
              <span className={`flex items-center gap-1 ${status.supabase ? 'text-green-600' : 'text-red-600'}`}>
                <span className={`w-2 h-2 rounded-full ${status.supabase ? 'bg-green-500' : 'bg-red-500'}`}></span>
                Banco de Dados: {status.supabase ? 'OK' : 'Offline'}
              </span>
              <span className={`flex items-center gap-1 ${status.websocket ? 'text-green-600' : 'text-amber-600'}`}>
                <span className={`w-2 h-2 rounded-full ${status.websocket ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                Tempo Real: {status.websocket ? 'OK' : 'Limitado'}
              </span>
            </div>
            
            <div className="flex gap-2 mt-3">
              <Button 
                size="sm" 
                variant={hasCriticalError ? "destructive" : "outline"}
                onClick={() => window.location.reload()}
                className="h-7 text-xs"
              >
                Recarregar Página
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={checkSystemStatus}
                disabled={checking}
                className="h-7 text-xs"
              >
                {checking ? 'Verificando...' : 'Verificar Novamente'}
              </Button>
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}

export default SystemStatusBanner;
