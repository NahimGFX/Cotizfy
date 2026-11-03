import type { ElectronAPI, IpcResponse, ProjectSummary, ThemeMode } from '../../electron/preload/types';

// Fallback in case of pure browser dev without Electron
const dummyApi: ElectronAPI = {
  getAppVersion: async () => '1.0.0-web',
  getAppLanguage: async () => 'es',
  setAppLanguage: async () => true,
  getAppTheme: async () => 'system',
  setAppTheme: async () => true,
  checkDbConnection: async () => ({ connected: true, message: 'Browser memory mode' }),
  getProjects: async () => ({ success: true, data: [] }),
  getSuppliers: async () => ({ success: true, data: [] }),
  saveSupplier: async (data) => ({ success: true, data: { id: data.id || 'mock-supplier', name: data.name, contact: data.contact || null, email: data.email || null, phone: data.phone || null, color: data.color || null, projects: [] } }),
  deleteSupplier: async () => ({ success: true, data: true }),
  setProjectSuppliers: async () => ({ success: true, data: true }),
  addSupplierToProject: async () => ({ success: true, data: true }),
  createSupplierForProject: async (_projectId, name) => ({ success: true, data: { id: 'mock-supplier', name } }),
  getProjectSuppliers: async () => ({ success: true, data: [] }),
  selectExcelMatrix: async () => ({ success: true, data: null }),
  importExcelMatrix: async (_projectId, rows) => ({ success: true, data: { importedCount: rows.length } }),
  getProjectItems: async () => ({ success: true, data: [] }),
  createProject: async (data) => ({ success: true, data: { id: 'mock-1', name: data.name } }),
  updateProject: async (id, data) => ({ success: true, data: { id, name: data.name } }),
  deleteProject: async () => ({ success: true, data: true }),
  createBudgetItem: async (_projectId, data) => ({ success: true, data: { id: 'mock-item', ...data, quotes: [] } }),
  updateBudgetItem: async (_projectId, itemId, data) => ({ success: true, data: { id: itemId, ...data, quotes: [] } }),
  deleteBudgetItem: async () => ({ success: true, data: true }),
  saveItemQuote: async () => ({ success: true, data: { id: 'mock-quote', warning: false } }),
  deleteItemQuote: async () => ({ success: true, data: true }),
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
  supplierIds?: string[];
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

export async function getStoredTheme(): Promise<ThemeMode> {
  try {
    return await api.getAppTheme();
  } catch {
    return 'system';
  }
}

export async function persistTheme(theme: ThemeMode): Promise<boolean> {
  try {
    return await api.setAppTheme(theme);
  } catch {
    return false;
  }
}
