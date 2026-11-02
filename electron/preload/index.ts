import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from './types';

const api: ElectronAPI = {
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  getAppLanguage: () => ipcRenderer.invoke('app:getLanguage'),
  setAppLanguage: (lang: string) => ipcRenderer.invoke('app:setLanguage', lang),

  checkDbConnection: () => ipcRenderer.invoke('db:checkConnection'),

  getProjects: () => ipcRenderer.invoke('projects:getAll'),
  createProject: (data) => ipcRenderer.invoke('projects:create', data),

  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
};

contextBridge.exposeInMainWorld('api', api);
