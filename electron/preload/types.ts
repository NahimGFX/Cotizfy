export interface IpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export type ThemeMode = "light" | "dark" | "system";

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  client: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
  suppliersCount: number;
  supplierNames: string[];
  itemsCount: number;
}

export interface SupplierRecord {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  color: string | null;
  projects: { id: string; name: string }[];
}
export interface ExcelQuotePreview {
  unitPrice: number | null;
  totalPrice: number | null;
}
export interface ExcelRowPreview {
  itemNumber: string;
  description: string;
  quantity: number;
  unit: string;
  quotes: ExcelQuotePreview[];
  rowNumber: number;
}
export interface ExcelMatrixPreview {
  rows: ExcelRowPreview[];
  errors: string[];
  warnings: string[];
  groups: string[];
}
export interface ExcelSelection {
  fileName: string;
  preview: ExcelMatrixPreview;
  suppliers: { id: string; name: string }[];
}
export interface ProjectBudgetItem {
  id: string;
  itemNumber: string;
  description: string;
  quantity: number;
  unit: string;
  quotes: {
    id: string;
    supplierId: string;
    supplierName: string;
    unitPrice: number;
    totalPrice: number;
    notes: string | null;
  }[];
}

export interface ElectronAPI {
  // App & System info
  getAppVersion: () => Promise<string>;
  getAppLanguage: () => Promise<string>;
  setAppLanguage: (lang: string) => Promise<boolean>;

  // Theme settings
  getAppTheme: () => Promise<ThemeMode>;
  setAppTheme: (theme: ThemeMode) => Promise<boolean>;

  // Database status
  checkDbConnection: () => Promise<{ connected: boolean; message?: string }>;

  // Projects IPC
  getProjects: () => Promise<IpcResponse<ProjectSummary[]>>;
  createProject: (data: {
    name: string;
    description?: string;
    client?: string;
    currency?: string;
    supplierIds?: string[];
  }) => Promise<IpcResponse<{ id: string; name: string }>>;
  updateProject: (
    id: string,
    data: {
      name: string;
      description?: string;
      client?: string;
      currency?: string;
      supplierIds?: string[];
    },
  ) => Promise<IpcResponse<{ id: string; name: string }>>;
  deleteProject: (id: string) => Promise<IpcResponse<boolean>>;
  getProjectVatPercent: (projectId: string) => Promise<IpcResponse<number>>;
  setProjectVatPercent: (
    projectId: string,
    vatPercent: number,
  ) => Promise<IpcResponse<boolean>>;
  getSuppliers: () => Promise<IpcResponse<SupplierRecord[]>>;
  saveSupplier: (data: {
    id?: string;
    name: string;
    contact?: string;
    email?: string;
    phone?: string;
    color?: string;
  }) => Promise<IpcResponse<SupplierRecord>>;
  deleteSupplier: (id: string) => Promise<IpcResponse<boolean>>;
  setProjectSuppliers: (
    projectId: string,
    supplierIds: string[],
  ) => Promise<IpcResponse<boolean>>;
  addSupplierToProject: (
    projectId: string,
    supplierId: string,
  ) => Promise<IpcResponse<boolean>>;
  createSupplierForProject: (
    projectId: string,
    name: string,
  ) => Promise<IpcResponse<{ id: string; name: string }>>;
  getProjectSuppliers: (
    projectId: string,
  ) => Promise<IpcResponse<SupplierRecord[]>>;
  selectExcelMatrix: (
    projectId: string,
    language: "es" | "en",
  ) => Promise<IpcResponse<ExcelSelection | null>>;
  importExcelMatrix: (
    projectId: string,
    rows: ExcelRowPreview[],
    supplierIds: string[],
  ) => Promise<IpcResponse<{ importedCount: number }>>;
  getProjectItems: (
    projectId: string,
  ) => Promise<IpcResponse<ProjectBudgetItem[]>>;
  createBudgetItem: (
    projectId: string,
    data: {
      itemNumber: string;
      description: string;
      quantity: number;
      unit: string;
    },
  ) => Promise<IpcResponse<ProjectBudgetItem>>;
  updateBudgetItem: (
    projectId: string,
    itemId: string,
    data: {
      itemNumber: string;
      description: string;
      quantity: number;
      unit: string;
    },
  ) => Promise<IpcResponse<ProjectBudgetItem>>;
  deleteBudgetItem: (
    projectId: string,
    itemId: string,
  ) => Promise<IpcResponse<boolean>>;
  saveItemQuote: (
    projectId: string,
    itemId: string,
    supplierId: string,
    data: { unitPrice: number | null; totalPrice: number | null },
  ) => Promise<IpcResponse<{ id: string; warning: boolean }>>;
  deleteItemQuote: (
    projectId: string,
    itemId: string,
    supplierId: string,
  ) => Promise<IpcResponse<boolean>>;

  // Window controls
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}
