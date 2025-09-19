'use client';

import { FunnelService } from '@/app/types/tailscale';
import { ServiceCard } from './ServiceCard';
import { Loader2 } from 'lucide-react';

interface ServiceListProps {
  services: FunnelService[];
  onServiceSelect: (service: FunnelService) => void;
  onServiceStop: (service: FunnelService) => void;
  isLoading?: boolean;
}

export function ServiceList({
  services,
  onServiceSelect,
  onServiceStop,
  isLoading = false,
}: ServiceListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          No active services found
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
          Create a new service to get started
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          onSelect={() => onServiceSelect(service)}
          onStop={() => onServiceStop(service)}
        />
      ))}
    </div>
  );
}