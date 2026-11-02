import type { ElectronAPI } from '../../electron/preload/types';

declare global {
  interface Window {
    api?: ElectronAPI;
  }
}

export {};
