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

export interface AnalysisPdfReportData {
  projectName: string;
  currency: string;
  locale: "es-EC" | "en-US";
  generatedAt: string;
  selectedSuppliers: string[];
  selectedItemCount: number;
  coveredItemCount: number;
  optimizedTotal: number;
  lowestSupplierTotal: number | null;
  lowestSupplierNames: string[];
  highestSupplierTotal: number | null;
  highestSupplierNames: string[];
  supplierRows: {
    name: string;
    total: number | null;
    lowestWins: number;
    ties: number;
    differenceAmount: number | null;
    differencePercent: number | null;
    participationPercent: number | null;
    totalQuotes: number;
  }[];
  itemComparisons: {
    itemNumber: string;
    description: string;
    quantity: number;
    unit: string;
    lowestSupplierNames: string[];
    spreadAmount: number | null;
    spreadPercent: number | null;
    quotes: {
      supplierName: string;
      hasQuote: boolean;
      unitPrice: number | null;
      totalPrice: number | null;
    }[];
  }[];
  labels: {
    title: string;
    generatedAt: string;
    project: string;
    currency: string;
    selectedSuppliers: string;
    selectedItems: string;
    coverage: string;
    coveredItems: string;
    uncoveredItems: string;
    optimizedTotal: string;
    lowestTotal: string;
    highestTotal: string;
    supplierAnalysis: string;
    supplier: string;
    quotedTotal: string;
    lowestWins: string;
    ties: string;
    difference: string;
    differencePercent: string;
    participation: string;
    itemsQuoted: string;
    itemComparison: string;
    item: string;
    description: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    totalPrice: string;
    lowestSupplier: string;
    spread: string;
    spreadPercent: string;
    tie: string;
    noQuote: string;
  };
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
  exportAnalysisPdf: (
    report: AnalysisPdfReportData,
  ) => Promise<IpcResponse<{ saved: boolean }>>;
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
