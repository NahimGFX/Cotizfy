import type { ElectronAPI, IpcResponse, ProjectSummary } from '../../electron/preload/types';

// Fallback in case of pure browser dev without Electron
const dummyApi: ElectronAPI = {
  getAppVersion: async () => '1.0.0-web',
  getAppLanguage: async () => 'es',
  setAppLanguage: async () => true,
  checkDbConnection: async () => ({ connected: true, message: 'Browser memory mode' }),
  getProjects: async () => ({ success: true, data: [] }),
  createProject: async (data) => ({ success: true, data: { id: 'mock-1', name: data.name } }),
  minimizeWindow: () => {},
  maximizeWindow: () => {},
  closeWindow: () => {},
};

export const api: ElectronAPI = (typeof window !== 'undefined' && window.api) ? window.api : dummyApi;

export async function checkDatabase(): Promise<{ connected: boolean; message?: string }> {
  try {
    return await api.checkDbConnection();
  } catch (error) {
    return {
      connected: false,
      message: error instanceof Error ? error.message : 'Database check failed',
    };
  }
}

export async function fetchProjects(): Promise<IpcResponse<ProjectSummary[]>> {
  try {
    return await api.getProjects();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch projects',
    };
  }
}

export async function createNewProject(data: {
  name: string;
  description?: string;
  client?: string;
  currency?: string;
}): Promise<IpcResponse<{ id: string; name: string }>> {
  try {
    return await api.createProject(data);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create project',
    };
  }
}
