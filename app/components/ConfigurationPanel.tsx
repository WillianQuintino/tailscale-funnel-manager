'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, Info } from 'lucide-react';
import { FunnelService, FunnelConfig } from '@/app/types/tailscale';
import { cn } from '@/app/lib/utils';

const configSchema = z.object({
  port: z.number().refine(
    (port) => port === 443 || port === 8443 || port === 10000,
    { message: 'Port must be 443, 8443, or 10000' }
  ),
  path: z.string().min(1, 'Path is required'),
  protocol: z.enum(['http', 'https']),
  serveMode: z.enum(['proxy', 'files', 'text']),
  target: z.string().optional(),
  description: z.string().optional(),
});

type ConfigFormData = z.infer<typeof configSchema>;

interface ConfigurationPanelProps {
  service?: FunnelService | null;
  onClose: () => void;
  onSubmit: (config: FunnelConfig) => void;
  isLoading?: boolean;
}

export function ConfigurationPanel({
  service,
  onClose,
  onSubmit,
  isLoading = false,
}: ConfigurationPanelProps) {
  const [serveMode, setServeMode] = useState<'proxy' | 'files' | 'text'>('proxy');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      port: service?.port || 443,
      path: service?.path || '/',
      protocol: (service?.protocol as 'http' | 'https') || 'https',
      serveMode: 'proxy',
      target: '',
      description: '',
    },
  });

  const watchServeMode = watch('serveMode');

  useEffect(() => {
    setServeMode(watchServeMode);
  }, [watchServeMode]);

  const onFormSubmit = (data: ConfigFormData) => {
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {service ? 'Edit Service' : 'New Funnel Service'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">Funnel Port Restrictions</p>
                <p>Tailscale Funnel only supports ports 443, 8443, and 10000. Choose one of these ports for your service.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Port
              </label>
              <select
                {...register('port', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={443}>443 (HTTPS)</option>
                <option value={8443}>8443 (Alternative HTTPS)</option>
                <option value={10000}>10000 (Custom)</option>
              </select>
              {errors.port && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.port.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Protocol
              </label>
              <select
                {...register('protocol')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="https">HTTPS</option>
                <option value="http">HTTP</option>
              </select>
              {errors.protocol && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.protocol.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Path
            </label>
            <input
              type="text"
              {...register('path')}
              placeholder="/"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.path && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.path.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Serve Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label
                className={cn(
                  'flex items-center justify-center px-4 py-2 border rounded-md cursor-pointer transition-colors',
                  serveMode === 'proxy'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                )}
              >
                <input
                  type="radio"
                  {...register('serveMode')}
                  value="proxy"
                  className="sr-only"
                />
                Proxy
              </label>
              <label
                className={cn(
                  'flex items-center justify-center px-4 py-2 border rounded-md cursor-pointer transition-colors',
                  serveMode === 'files'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                )}
              >
                <input
                  type="radio"
                  {...register('serveMode')}
                  value="files"
                  className="sr-only"
                />
                Files
              </label>
              <label
                className={cn(
                  'flex items-center justify-center px-4 py-2 border rounded-md cursor-pointer transition-colors',
                  serveMode === 'text'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                )}
              >
                <input
                  type="radio"
                  {...register('serveMode')}
                  value="text"
                  className="sr-only"
                />
                Text
              </label>
            </div>
          </div>

          {(serveMode === 'proxy' || serveMode === 'files') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target {serveMode === 'proxy' ? 'URL' : 'Directory'}
              </label>
              <input
                type="text"
                {...register('target')}
                placeholder={
                  serveMode === 'proxy'
                    ? 'http://localhost:3000'
                    : '/path/to/directory'
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {serveMode === 'proxy'
                  ? 'Enter the local service URL to proxy requests to'
                  : 'Enter the directory path to serve files from'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Enter a description for this service..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {service ? 'Update Service' : 'Create Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}