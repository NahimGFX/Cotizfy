export interface IpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  client: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
  suppliersCount: number;
  itemsCount: number;
}

export interface ElectronAPI {
  // App & System info
  getAppVersion: () => Promise<string>;
  getAppLanguage: () => Promise<string>;
  setAppLanguage: (lang: string) => Promise<boolean>;

  // Database status
  checkDbConnection: () => Promise<{ connected: boolean; message?: string }>;

  // Projects IPC
  getProjects: () => Promise<IpcResponse<ProjectSummary[]>>;
  createProject: (data: { name: string; description?: string; client?: string; currency?: string }) => Promise<IpcResponse<{ id: string; name: string }>>;

  // Window controls (optional / standard)
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}
