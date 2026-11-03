import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI, ThemeMode } from './types';

const api: ElectronAPI = {
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  getAppLanguage: () => ipcRenderer.invoke('app:getLanguage'),
  setAppLanguage: (lang: string) => ipcRenderer.invoke('app:setLanguage', lang),

  getAppTheme: () => ipcRenderer.invoke('app:getTheme'),
  setAppTheme: (theme: ThemeMode) => ipcRenderer.invoke('app:setTheme', theme),

  checkDbConnection: () => ipcRenderer.invoke('db:checkConnection'),

  getProjects: () => ipcRenderer.invoke('projects:getAll'),
  createProject: (data) => ipcRenderer.invoke('projects:create', data),
  updateProject: (id, data) => ipcRenderer.invoke('projects:update', id, data),
  getSuppliers: () => ipcRenderer.invoke('suppliers:getAll'),
  saveSupplier: (data) => ipcRenderer.invoke('suppliers:save', data),
  deleteSupplier: (id) => ipcRenderer.invoke('suppliers:delete', id),
  setProjectSuppliers: (projectId, supplierIds) => ipcRenderer.invoke('projects:setSuppliers', projectId, supplierIds),
  getProjectSuppliers: (projectId) => ipcRenderer.invoke('projects:getSuppliers', projectId),
  selectExcelMatrix: (projectId, language) => ipcRenderer.invoke('excel:selectMatrix', projectId, language),
  importExcelMatrix: (projectId, rows, supplierIds) => ipcRenderer.invoke('excel:importMatrix', projectId, rows, supplierIds),
  getProjectItems: (projectId) => ipcRenderer.invoke('projects:getItems', projectId),

  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
};

contextBridge.exposeInMainWorld('api', api);
