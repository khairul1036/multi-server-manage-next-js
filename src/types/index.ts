export type UserRole = 'superadmin' | 'admin' | 'user';

export interface IUserLimits {
  ramLimitMB: number; // e.g. 2048 (2GB RAM)
  diskLimitMB: number; // e.g. 20480 (20GB ROM / Disk)
  cpuLimitPercent?: number; // e.g. 50%
}

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  linuxUsername?: string;
  hostingPort?: number;
  sshPassword?: string;
  usedStorageMB?: number;
  assignedServers?: string[];
  limits?: IUserLimits;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type ServerStatus = 'online' | 'offline' | 'pending' | 'unreachable';

export interface IServerSpecs {
  cpuUsage?: number;
  memoryUsage?: number;
  totalMemoryMB?: number;
  freeMemoryMB?: number;
  diskUsage?: number;
  uptimeSeconds?: number;
}

export interface IServer {
  _id?: string;
  name: string;
  ip: string;
  sshPort: number;
  agentPort: number;
  agentApiKey: string;
  status: ServerStatus;
  os?: string;
  specs?: IServerSpecs;
  lastPing?: string | Date;
  tags?: string[];
  assignedUsersCount?: number;
  domainsCount?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type DomainStatus = 'active' | 'pending' | 'error';
export type SslStatus = 'none' | 'pending' | 'active' | 'failed';

export interface IDomain {
  _id?: string;
  domainName: string;
  serverId: string;
  userId: string;
  server?: IServer;
  user?: IUser;
  targetPort: number;
  status: DomainStatus;
  sslStatus: SslStatus;
  nginxConfigPath?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface IServerRequest {
  _id?: string;
  userId: string;
  user?: IUser;
  requestedRamMB: number;
  requestedDiskMB: number;
  purpose: string;
  status: RequestStatus;
  assignedServerId?: string;
  assignedServer?: IServer;
  adminNotes?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IFileInfo {
  name: string;
  path: string;
  sizeBytes: number;
  isDir: boolean;
  modifiedAt: string | Date;
  permissions?: string;
}

export interface IActivityLog {
  _id?: string;
  action: string;
  performedBy: string;
  target?: string;
  status: 'success' | 'failure' | 'warning' | 'info';
  details?: string;
  createdAt?: string | Date;
}
