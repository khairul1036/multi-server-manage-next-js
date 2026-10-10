import axios from 'axios';

export interface AgentHealthResponse {
  status: string;
  uptime: number;
  cpuUsage: number;
  memory: {
    totalMB: number;
    freeMB: number;
    usedPercentage: number;
  };
  disk: {
    usagePercentage: number;
  };
  os: string;
}

export class AgentClient {
  private baseUrl: string;
  private apiKey: string;
  private timeoutMs: number;

  constructor(ip: string, port = 4000, apiKey: string, timeoutMs = 6000) {
    this.baseUrl = `http://${ip}:${port}`;
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  private get headers() {
    return {
      'x-agent-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  // Health check ping
  async checkHealth(): Promise<{ success: boolean; data?: AgentHealthResponse; error?: string }> {
    try {
      const response = await axios.get<AgentHealthResponse>(`${this.baseUrl}/health`, {
        headers: this.headers,
        timeout: this.timeoutMs,
      });
      return { success: true, data: response.data };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      return { success: false, error: message };
    }
  }

  // User creation on remote Linux server (User File Isolation & Auto Port Assignment)
  async createLinuxUser(
    username: string,
    quotaMB = 1024,
    initialPassword?: string
  ): Promise<{
    success: boolean;
    port?: number;
    password?: string;
    usedMB?: number;
    totalMB?: number;
    message?: string;
    error?: string;
  }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/users/create`,
        { username, quotaMB, initialPassword },
        { headers: this.headers, timeout: this.timeoutMs * 2 }
      );
      return {
        success: true,
        port: response.data?.port,
        password: response.data?.password,
        usedMB: response.data?.usedMB,
        totalMB: response.data?.totalMB,
        message: response.data?.message || 'User created successfully',
      };
    } catch (err: unknown) {
      const message = axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : err instanceof Error
        ? err.message
        : 'Failed to create user on remote agent';
      return { success: false, error: message };
    }
  }

  // Regenerate user SSH / hosting password
  async regeneratePassword(username: string): Promise<{ success: boolean; password?: string; error?: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/users/regenerate-password`,
        { username },
        { headers: this.headers, timeout: this.timeoutMs * 2 }
      );
      return { success: true, password: response.data?.password };
    } catch (err: unknown) {
      const message = axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : err instanceof Error
        ? err.message
        : 'Failed to regenerate password';
      return { success: false, error: message };
    }
  }

  // Delete user from Linux server and kill port
  async deleteLinuxUser(username: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/users/delete`,
        { username },
        { headers: this.headers, timeout: this.timeoutMs * 2 }
      );
      return { success: true, message: response.data?.message };
    } catch (err: unknown) {
      const message = axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : err instanceof Error
        ? err.message
        : 'Failed to delete user';
      return { success: false, error: message };
    }
  }

  // Domain Nginx config creation & reload
  async setupNginxDomain(
    domainName: string,
    targetPort: number,
    username?: string
  ): Promise<{ success: boolean; message?: string; configPath?: string; error?: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/domains/setup`,
        { domainName, targetPort, username },
        { headers: this.headers, timeout: this.timeoutMs * 2 }
      );
      return {
        success: true,
        message: response.data?.message || 'Nginx domain configured',
        configPath: response.data?.configPath,
      };
    } catch (err: unknown) {
      const message = axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : err instanceof Error
        ? err.message
        : 'Failed to configure Nginx on remote agent';
      return { success: false, error: message };
    }
  }

  // Delete Domain Nginx config
  async removeNginxDomain(domainName: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/domains/remove`,
        { domainName },
        { headers: this.headers, timeout: this.timeoutMs * 2 }
      );
      return { success: true, message: response.data?.message };
    } catch (err: unknown) {
      const message = axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : err instanceof Error
        ? err.message
        : 'Failed to remove domain on remote agent';
      return { success: false, error: message };
    }
  }

  // List isolated files strictly inside /home/<username>
  async listUserFiles(username: string, subPath = ''): Promise<{
    success: boolean;
    homePath?: string;
    files?: any[];
    error?: string;
  }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/files/list`,
        { username, subPath },
        { headers: this.headers, timeout: this.timeoutMs * 2 }
      );
      return {
        success: true,
        homePath: response.data.homePath,
        files: response.data.files,
      };
    } catch (err: unknown) {
      const message = axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : err instanceof Error
        ? err.message
        : 'Failed to list user files';
      return { success: false, error: message };
    }
  }

  // Create isolated file or directory inside /home/<username>
  async createUserFile(
    username: string,
    fileName: string,
    isDirectory = false,
    content = ''
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/files/create`,
        { username, fileName, isDirectory, content },
        { headers: this.headers, timeout: this.timeoutMs * 2 }
      );
      return { success: true, message: response.data.message };
    } catch (err: unknown) {
      const message = axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : err instanceof Error
        ? err.message
        : 'Failed to create file';
      return { success: false, error: message };
    }
  }
}

