export interface FunnelService {
  id: string;
  name: string;
  port: number;
  path?: string;
  url?: string;
  status: 'active' | 'inactive' | 'error';
  protocol: 'http' | 'https';
  createdAt: string;
  lastActive?: string;
  bytesTransferred?: number;
  requestCount?: number;
}

export interface FunnelConfig {
  port: number;
  path?: string;
  protocol?: 'http' | 'https';
  allowedMethods?: string[];
  description?: string;
  mountPath?: string;
  serveMode?: 'proxy' | 'files' | 'text';
  target?: string;
}

export interface TailscaleStatus {
  isRunning: boolean;
  isLoggedIn: boolean;
  hostname?: string;
  ipAddress?: string;
  magicDNS?: string;
  version?: string;
  hasFunnelEnabled?: boolean;
}

export interface FunnelStatus {
  isEnabled: boolean;
  activeServices: number;
  totalBandwidth?: number;
  services: FunnelService[];
}

export interface ServiceMetrics {
  serviceId: string;
  timestamp: string;
  requestCount: number;
  bytesIn: number;
  bytesOut: number;
  avgResponseTime?: number;
  errorRate?: number;
}

export interface AccessControl {
  allowedUsers?: string[];
  allowedGroups?: string[];
  publicAccess: boolean;
  requireAuth: boolean;
}

export interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
}

export interface CreateFunnelRequest {
  config: FunnelConfig;
  accessControl?: AccessControl;
}

export interface UpdateFunnelRequest {
  serviceId: string;
  config?: Partial<FunnelConfig>;
  accessControl?: Partial<AccessControl>;
}

export type FunnelPort = 443 | 8443 | 10000;

export interface FunnelError {
  code: string;
  message: string;
  details?: unknown;
}