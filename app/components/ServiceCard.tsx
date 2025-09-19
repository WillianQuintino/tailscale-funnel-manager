'use client';

import { useState } from 'react';
import { FunnelService } from '@/app/types/tailscale';
import {
  Globe,
  Server,
  Copy,
  ExternalLink,
  MoreVertical,
  StopCircle,
  Settings,
  Activity,
  Clock,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { toast } from 'sonner';

interface ServiceCardProps {
  service: FunnelService;
  onSelect: () => void;
  onStop: () => void;
}

export function ServiceCard({ service, onSelect, onStop }: ServiceCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2 rounded-lg',
                service.status === 'active'
                  ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                  : service.status === 'error'
                  ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              )}
            >
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {service.name}
              </h3>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Port: {service.port}
                </span>
                {service.path && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Path: {service.path}
                  </span>
                )}
                <span
                  className={cn(
                    'px-2 py-0.5 text-xs font-medium rounded-full',
                    service.status === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : service.status === 'error'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  )}
                >
                  {service.status}
                </span>
              </div>
            </div>
          </div>

          {service.url && (
            <div className="mt-4 flex items-center gap-2">
              <Globe className="h-4 w-4 text-gray-400" />
              <a
                href={service.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
              >
                {service.url}
                <ExternalLink className="h-3 w-3" />
              </a>
              <button
                onClick={() => copyToClipboard(service.url!)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                title="Copy URL"
              >
                <Copy className="h-3 w-3 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {service.requestCount !== undefined && (
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Requests
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {service.requestCount.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            {service.bytesTransferred !== undefined && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Data
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatBytes(service.bytesTransferred)}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Created
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(service.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <MoreVertical className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>

          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                <button
                  onClick={() => {
                    onSelect();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Configure
                </button>
                <button
                  onClick={() => {
                    onStop();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600 dark:text-red-400"
                >
                  <StopCircle className="h-4 w-4" />
                  Stop Service
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}