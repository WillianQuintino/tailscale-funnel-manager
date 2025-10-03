'use client';

import { useState } from 'react';
import { Container, Globe, Loader2, ExternalLink } from 'lucide-react';

interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: Array<{
    internal: number;
    external?: number;
    type: string;
  }>;
  created: string;
}

interface ContainerListProps {
  containers: DockerContainer[];
  onCreateFunnel: (containerId: string, port: number, funnelPort?: number) => void;
  isLoading?: boolean;
}

export function ContainerList({
  containers,
  onCreateFunnel,
  isLoading = false,
}: ContainerListProps) {
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
  const [selectedPort, setSelectedPort] = useState<number | null>(null);
  const [selectedFunnelPort, setSelectedFunnelPort] = useState<number>(443);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (containers.length === 0) {
    return (
      <div className="text-center py-12">
        <Container className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
        <p className="text-gray-300">No running containers found</p>
        <p className="text-sm text-gray-400 mt-2">
          Start a Docker container to create a Funnel
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {containers.map((container) => {
        const isSelected = selectedContainer === container.id;

        return (
          <div
            key={container.id}
            className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:border-white/20 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-500/20 p-2 rounded-lg">
                    <Container className="h-4 w-4 text-blue-300" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{container.name}</h3>
                    <p className="text-sm text-gray-400">{container.image}</p>
                  </div>
                </div>

                {container.ports.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-gray-400 font-medium">Available Ports:</p>
                    <div className="flex flex-wrap gap-2">
                      {container.ports.map((port, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectedContainer(container.id);
                            setSelectedPort(port.internal);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            isSelected && selectedPort === port.internal
                              ? 'bg-blue-500/30 text-blue-200 border border-blue-400/50'
                              : 'bg-white/5 text-gray-300 border border-white/10 hover:border-white/20'
                          }`}
                        >
                          {port.internal}
                          {port.external && ` → ${port.external}`}
                          <span className="ml-1 text-xs opacity-60">/{port.type}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isSelected && selectedPort && (
                <div className="ml-4 flex items-center space-x-3">
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs text-gray-400">Funnel Port:</label>
                    <select
                      value={selectedFunnelPort}
                      onChange={(e) => setSelectedFunnelPort(Number(e.target.value))}
                      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-400"
                    >
                      <option value="443">443 (HTTPS)</option>
                      <option value="8443">8443 (Alt HTTPS)</option>
                      <option value="10000">10000 (Custom)</option>
                    </select>
                  </div>
                  <button
                    onClick={() => onCreateFunnel(container.id, selectedPort, selectedFunnelPort)}
                    className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 mt-6"
                  >
                    <Globe className="h-4 w-4" />
                    <span>Create Funnel</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
              <span className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>{container.status}</span>
              </span>
              <span>ID: {container.id.substring(0, 12)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
