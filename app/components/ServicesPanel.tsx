'use client';

import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Globe, Shield, Server, Loader2 } from 'lucide-react';

interface NetworkService {
  name: string;
  container: string;
  port: number;
  protocol: string;
  type: string;
  url?: string;
  hasFunnel?: boolean;
}

interface ServicesResponse {
  services: NetworkService[];
  total: number;
}

async function fetchServices(): Promise<ServicesResponse> {
  const response = await fetch('/api/services');
  if (!response.ok) throw new Error('Failed to fetch services');
  return response.json();
}

export function ServicesPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['network-services'],
    queryFn: fetchServices,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const services = data?.services || [];
  const groupedServices = services.reduce((acc, service) => {
    const container = service.container;
    if (!acc[container]) {
      acc[container] = [];
    }
    acc[container].push(service);
    return acc;
  }, {} as Record<string, NetworkService[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Network Services</h2>
          <p className="text-gray-400 text-sm mt-1">
            {data?.total || 0} services running on {Object.keys(groupedServices).length} containers
          </p>
        </div>
      </div>

      {Object.entries(groupedServices).map(([containerName, containerServices]) => (
        <div key={containerName} className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
          <div className="bg-white/5 px-6 py-4 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
                <Server className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{containerName}</h3>
                <p className="text-sm text-gray-400">{containerServices.length} services</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-white/10">
            {containerServices.map((service, idx) => (
              <div key={idx} className="px-6 py-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <ServiceTypeIcon type={service.type} />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-medium">
                            {service.protocol.toUpperCase()}/{service.port}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/20 text-blue-300">
                            {service.type}
                          </span>
                          {service.hasFunnel && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/20 text-green-300">
                              Funnel Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-gray-400 font-mono">
                            {service.container}:{service.port}
                          </span>
                          {service.url && (
                            <a
                              href={service.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>Open</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    className="ml-4 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 text-sm"
                    onClick={() => {
                      // TODO: Implementar criação de funnel
                      console.log('Create funnel for:', service);
                    }}
                  >
                    <Globe className="h-4 w-4" />
                    <span>Create Funnel</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {services.length === 0 && (
        <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
          <Server className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
          <p className="text-gray-300 text-lg">No services detected</p>
          <p className="text-sm text-gray-400 mt-2">
            Start a container with exposed ports to see services here
          </p>
        </div>
      )}
    </div>
  );
}

function ServiceTypeIcon({ type }: { type: string }) {
  const iconClass = "h-5 w-5";

  switch (type) {
    case 'SSH':
      return (
        <div className="bg-yellow-500/20 p-2 rounded-lg">
          <Shield className={`${iconClass} text-yellow-300`} />
        </div>
      );
    case 'HTTP':
    case 'HTTPS':
      return (
        <div className="bg-green-500/20 p-2 rounded-lg">
          <Globe className={`${iconClass} text-green-300`} />
        </div>
      );
    case 'DNS':
      return (
        <div className="bg-blue-500/20 p-2 rounded-lg">
          <Server className={`${iconClass} text-blue-300`} />
        </div>
      );
    default:
      return (
        <div className="bg-gray-500/20 p-2 rounded-lg">
          <Server className={`${iconClass} text-gray-300`} />
        </div>
      );
  }
}
