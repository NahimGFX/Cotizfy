import { contextBridge, ipcRenderer } from "electron";
import type { ElectronAPI, ThemeMode } from "./types";

const api: ElectronAPI = {
  getAppVersion: () => ipcRenderer.invoke("app:getVersion"),
  getAppLanguage: () => ipcRenderer.invoke("app:getLanguage"),
  setAppLanguage: (lang: string) => ipcRenderer.invoke("app:setLanguage", lang),

  getAppTheme: () => ipcRenderer.invoke("app:getTheme"),
  setAppTheme: (theme: ThemeMode) => ipcRenderer.invoke("app:setTheme", theme),

  checkDbConnection: () => ipcRenderer.invoke("db:checkConnection"),

  getProjects: () => ipcRenderer.invoke("projects:getAll"),
  createProject: (data) => ipcRenderer.invoke("projects:create", data),
  updateProject: (id, data) => ipcRenderer.invoke("projects:update", id, data),
  deleteProject: (id) => ipcRenderer.invoke("projects:delete", id),
  getSuppliers: () => ipcRenderer.invoke("suppliers:getAll"),
  saveSupplier: (data) => ipcRenderer.invoke("suppliers:save", data),
  deleteSupplier: (id) => ipcRenderer.invoke("suppliers:delete", id),
  setProjectSuppliers: (projectId, supplierIds) =>
    ipcRenderer.invoke("projects:setSuppliers", projectId, supplierIds),
  addSupplierToProject: (projectId, supplierId) =>
    ipcRenderer.invoke("projects:addSupplier", projectId, supplierId),
  createSupplierForProject: (projectId, name) =>
    ipcRenderer.invoke("projects:createSupplier", projectId, name),
  getProjectSuppliers: (projectId) =>
    ipcRenderer.invoke("projects:getSuppliers", projectId),
  selectExcelMatrix: (projectId, language) =>
    ipcRenderer.invoke("excel:selectMatrix", projectId, language),
  importExcelMatrix: (projectId, rows, supplierIds) =>
    ipcRenderer.invoke("excel:importMatrix", projectId, rows, supplierIds),
  getProjectItems: (projectId) =>
    ipcRenderer.invoke("projects:getItems", projectId),
  createBudgetItem: (projectId, data) =>
    ipcRenderer.invoke("items:create", projectId, data),
  updateBudgetItem: (projectId, itemId, data) =>
    ipcRenderer.invoke("items:update", projectId, itemId, data),
  deleteBudgetItem: (projectId, itemId) =>
    ipcRenderer.invoke("items:delete", projectId, itemId),
  saveItemQuote: (projectId, itemId, supplierId, data) =>
    ipcRenderer.invoke("quotes:save", projectId, itemId, supplierId, data),
  deleteItemQuote: (projectId, itemId, supplierId) =>
    ipcRenderer.invoke("quotes:delete", projectId, itemId, supplierId),

  minimizeWindow: () => ipcRenderer.send("window:minimize"),
  maximizeWindow: () => ipcRenderer.send("window:maximize"),
  closeWindow: () => ipcRenderer.send("window:close"),
};

contextBridge.exposeInMainWorld("api", api);
