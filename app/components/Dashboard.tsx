'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus,
  RefreshCw,
  Globe,
  Server,
  Settings,
  Container,
  Network,
  Eye,
  EyeOff,
  Key,
  Activity,
  Info,
  Zap,
  Shield,
  ExternalLink,
  Copy,
  Check,
  Link
} from 'lucide-react';
import { ServiceList } from './ServiceList';
import { ConfigurationPanel } from './ConfigurationPanel';
import { TailscaleStatus, FunnelStatus, FunnelService, FunnelConfig } from '@/app/types/tailscale';

async function fetchTailscaleStatus(): Promise<TailscaleStatus> {
  const response = await fetch('/api/tailscale/status');
  if (!response.ok) throw new Error('Failed to fetch Tailscale status');
  return response.json();
}

async function fetchFunnelStatus(): Promise<FunnelStatus> {
  const response = await fetch('/api/funnel/status');
  if (!response.ok) throw new Error('Failed to fetch Funnel status');
  return response.json();
}

async function fetchServices(): Promise<FunnelService[]> {
  const response = await fetch('/api/funnel/services');
  if (!response.ok) throw new Error('Failed to fetch services');
  return response.json();
}

async function startFunnel(config: FunnelConfig) {
  const response = await fetch('/api/funnel/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start Funnel');
  }
  return response.json();
}

async function stopFunnel(port: number) {
  const response = await fetch('/api/funnel/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to stop Funnel');
  }
  return response.json();
}

export function Dashboard() {
  const queryClient = useQueryClient();
  const [selectedService, setSelectedService] = useState<FunnelService | null>(null);
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [setupMode, setSetupMode] = useState(false);
  const [authKey, setAuthKey] = useState('');
  const [showAuthKey, setShowAuthKey] = useState(false);
  const [loginUrl, setLoginUrl] = useState('');
  const [showLoginUrl, setShowLoginUrl] = useState(false);
  const [isCheckingLogin, setIsCheckingLogin] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const { data: tailscaleStatus, isLoading: isLoadingTailscale } = useQuery({
    queryKey: ['tailscale-status'],
    queryFn: fetchTailscaleStatus,
    refetchInterval: 5000,
  });

  const { data: funnelStatus, isLoading: isLoadingFunnel } = useQuery({
    queryKey: ['funnel-status'],
    queryFn: fetchFunnelStatus,
    refetchInterval: 5000,
  });

  const { data: services = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ['services'],
    queryFn: fetchServices,
    refetchInterval: 5000,
  });

  // Conectar WebSocket para atualizações em tempo real
  useEffect(() => {
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket conectado');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'service_update':
            queryClient.invalidateQueries({ queryKey: ['services'] });
            break;
          case 'funnel_status_update':
            queryClient.invalidateQueries({ queryKey: ['funnel-status'] });
            break;
          case 'tailscale_status_update':
            queryClient.invalidateQueries({ queryKey: ['tailscale-status'] });
            break;
        }
      };

      ws.onclose = () => {
        console.log('WebSocket desconectado, tentando reconectar...');
        setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error('Erro WebSocket:', error);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [queryClient]);

  // Carregar dados iniciais
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await fetch('/api/status');
        if (response.ok) {
          const data = await response.json();
          // Atualizar dados via React Query
          queryClient.setQueryData(['tailscale-status'], data.tailscale);
          queryClient.setQueryData(['funnel-status'], data.funnel);
          queryClient.setQueryData(['services'], data.containers || []);

          // Verificar se precisa configurar
          if (!data.tailscale || !data.tailscale.connected) {
            setSetupMode(true);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };

    loadInitialData();
  }, [queryClient]);

  const startFunnelMutation = useMutation({
    mutationFn: startFunnel,
    onSuccess: () => {
      toast.success('Funnel started successfully');
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-status'] });
      setIsConfigPanelOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const stopFunnelMutation = useMutation({
    mutationFn: stopFunnel,
    onSuccess: () => {
      toast.success('Funnel stopped successfully');
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-status'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });


  const handleSetupAuthKey = async () => {
    if (!authKey || !authKey.startsWith('tskey-')) {
      toast.error('Por favor, insira um Auth Key válido do Tailscale');
      return;
    }

    try {
      const response = await fetch('/api/setup/auth-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authKey })
      });

      const result = await response.json();

      if (response.ok) {
        if (result.requiresLogin && result.loginUrl) {
          setLoginUrl(result.loginUrl);
          setShowLoginUrl(true);
          toast.info('Complete a autenticação no navegador');
        } else if (result.success) {
          toast.success('Auth Key configurado! Aguarde alguns segundos para a conexão...');
          setSetupMode(false);
          setAuthKey('');
          setShowLoginUrl(false);
          queryClient.invalidateQueries({ queryKey: ['tailscale-status'] });
        }
      } else {
        toast.error('Erro: ' + result.error);
      }
    } catch {
      toast.error('Erro ao configurar Auth Key');
    }
  };

  const handleCheckLogin = async () => {
    setIsCheckingLogin(true);
    try {
      const response = await fetch('/api/setup/check-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (response.ok) {
        if (result.requiresLogin && result.loginUrl) {
          setLoginUrl(result.loginUrl);
          setShowLoginUrl(true);
          toast.info('Complete a autenticação no navegador');
        } else if (result.success) {
          toast.success('Tailscale já está configurado!');
          setSetupMode(false);
          setShowLoginUrl(false);
          queryClient.invalidateQueries({ queryKey: ['tailscale-status'] });
        }
      } else {
        toast.error('Erro: ' + result.error);
      }
    } catch {
      toast.error('Erro ao verificar login');
    } finally {
      setIsCheckingLogin(false);
    }
  };

  const copyLoginUrl = async () => {
    try {
      await navigator.clipboard.writeText(loginUrl);
      toast.success('URL copiada!');
    } catch {
      toast.error('Erro ao copiar URL');
    }
  };

  const isLoading = isLoadingTailscale || isLoadingFunnel || isLoadingServices;

  // Componente de Setup
  const SetupScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6">
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 max-w-md w-full border border-white/20">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full w-16 h-16 mx-auto mb-4">
            <Key className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Configuração Inicial</h1>
          <p className="text-gray-300">Configure seu Tailscale Auth Key para começar</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tailscale Auth Key
            </label>
            <div className="relative">
              <input
                type={showAuthKey ? 'text' : 'password'}
                value={authKey}
                onChange={(e) => setAuthKey(e.target.value)}
                placeholder="tskey-auth-xxxxxxxxxxxxxxxx"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowAuthKey(!showAuthKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showAuthKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {!showLoginUrl && (
            <>
              <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-blue-300 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-200">
                    <p className="font-medium mb-1">Como obter o Auth Key:</p>
                    <p>1. Acesse <a href="https://login.tailscale.com/admin/settings/authkeys" target="_blank" rel="noopener noreferrer" className="underline">login.tailscale.com</a></p>
                    <p>2. Clique em &quot;Generate auth key&quot;</p>
                    <p>3. Marque &quot;Reusable&quot; e &quot;Ephemeral&quot;</p>
                    <p>4. Copie e cole aqui</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={handleSetupAuthKey}
                  disabled={isLoading || !authKey}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Configurando...' : 'Configurar com Auth Key'}
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-900 text-gray-400">ou</span>
                </div>
              </div>

              <button
                onClick={handleCheckLogin}
                disabled={isCheckingLogin}
                className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-medium py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Link className="h-4 w-4" />
                <span>{isCheckingLogin ? 'Verificando...' : 'Obter URL de Login'}</span>
              </button>
            </>
          )}

          {showLoginUrl && (
            <div className="space-y-4">
              <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Check className="h-5 w-5 text-green-300 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-green-200">
                    <p className="font-medium mb-2">URL de Login Gerada!</p>
                    <p className="mb-3">Acesse o link abaixo para completar a autenticação do Tailscale:</p>

                    <div className="bg-black/30 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-blue-300 break-all">{loginUrl}</span>
                        <button
                          onClick={copyLoginUrl}
                          className="ml-2 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                          title="Copiar URL"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => window.open(loginUrl, '_blank')}
                        className="flex-1 bg-blue-500/30 hover:bg-blue-500/40 text-blue-200 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center space-x-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Abrir no Navegador</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowLoginUrl(false);
                          setLoginUrl('');
                        }}
                        className="flex-1 bg-gray-600/30 hover:bg-gray-600/40 text-gray-300 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                      >
                        Fechar
                      </button>
                    </div>

                    <p className="text-xs mt-3 text-green-300">
                      Após completar a autenticação, clique em &quot;Verificar Status&quot; para continuar.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['tailscale-status'] });
                  setShowLoginUrl(false);
                  setLoginUrl('');
                }}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Verificar Status</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Componente de Estatísticas atualizado
  const StatsCard = ({ icon: Icon, title, value, color = 'blue' }: {
    icon: React.ElementType;
    title: string;
    value: string | number;
    color?: string;
  }) => (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-300 text-sm font-medium">{title}</p>
          <p className="text-white text-2xl font-bold">{value}</p>
        </div>
        <div className={`bg-gradient-to-r from-${color}-500 to-${color}-600 p-2 rounded-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (setupMode && (!tailscaleStatus?.isRunning)) {
    return <SetupScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-xl">
                <Network className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Tailscale Funnel Manager</h1>
                <p className="text-gray-300 text-sm">CasaOS Integration</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-full ${
                tailscaleStatus?.isRunning ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  tailscaleStatus?.isRunning ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                <span className="text-sm font-medium">
                  {tailscaleStatus?.isRunning ? 'Conectado' : 'Desconectado'}
                </span>
              </div>

              <button
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['tailscale-status'] });
                  queryClient.invalidateQueries({ queryKey: ['funnel-status'] });
                  queryClient.invalidateQueries({ queryKey: ['services'] });
                }}
                disabled={isLoading}
                className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl transition-all disabled:opacity-50"
                title="Atualizar dados"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => setSetupMode(true)}
                className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl transition-all"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Navegação */}
        <div className="flex space-x-4 mb-6">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Activity },
            { id: 'services', label: 'Services', icon: Globe },
            { id: 'containers', label: 'Containers', icon: Container },
            { id: 'config', label: 'Config', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCard
                icon={Zap}
                title="Status Tailscale"
                value={tailscaleStatus?.isRunning ? 'Online' : 'Offline'}
                color="blue"
              />
              <StatsCard
                icon={Globe}
                title="Funnel Status"
                value={funnelStatus?.isEnabled ? 'Enabled' : 'Disabled'}
                color="green"
              />
              <StatsCard
                icon={Activity}
                title="Active Services"
                value={services.length || 0}
                color="purple"
              />
              <StatsCard
                icon={Server}
                title="Running Services"
                value={funnelStatus?.activeServices || 0}
                color="yellow"
              />
            </div>

            {/* Sistema Info */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Informações do Sistema
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-300">Tailscale Node</p>
                  <p className="text-white font-medium">{tailscaleStatus?.hostname || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-300">Services Active</p>
                  <p className="text-white font-medium">{funnelStatus?.activeServices || 0}</p>
                </div>
                <div>
                  <p className="text-gray-300">Funnel Enabled</p>
                  <p className="text-white font-medium">{funnelStatus?.isEnabled ? 'Sim' : 'Não'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Services */}
        {activeTab === 'services' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Services Configurados</h2>
              <button
                onClick={() => setIsConfigPanelOpen(true)}
                className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>New Service</span>
              </button>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
              <ServiceList
                services={services}
                onServiceSelect={setSelectedService}
                onServiceStop={(service) => stopFunnelMutation.mutate(service.port)}
                isLoading={isLoading}
              />
            </div>

            {(!services || services.length === 0) && (
              <div className="text-center py-12 text-gray-400">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Nenhum Service configurado</p>
                <p className="text-sm">Clique em &quot;New Service&quot; para criar seu primeiro Funnel</p>
              </div>
            )}
          </div>
        )}

        {/* Config Panel Modal */}
        {isConfigPanelOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 max-w-md w-full mx-4 border border-white/20">
              <ConfigurationPanel
                service={selectedService}
                onClose={() => {
                  setIsConfigPanelOpen(false);
                  setSelectedService(null);
                }}
                onSubmit={(config) => startFunnelMutation.mutate(config)}
                isLoading={startFunnelMutation.isPending}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

