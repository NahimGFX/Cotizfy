import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, ShieldCheck, Sun, Moon, Laptop } from 'lucide-react';
import { LanguageSelector } from '../common/LanguageSelector';
import { checkDatabase, api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  currentTab: string;
}

export const Header: React.FC<HeaderProps> = ({ currentTab }) => {
  const { t } = useTranslation();
  const { theme, effectiveTheme, setTheme } = useTheme();
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [appVersion, setAppVersion] = useState<string>('1.0.0');

  useEffect(() => {
    checkDatabase().then((res) => {
      setDbConnected(res.connected);
    });

    api.getAppVersion().then((ver) => {
      if (ver) setAppVersion(ver);
    });
  }, []);

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 transition-colors">
      <div className="flex items-center space-x-3">
        <h1 className="text-lg font-bold text-slate-800 dark:text-white capitalize">
          {t(`nav.${currentTab}`)}
        </h1>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
          v{appVersion}
        </span>
      </div>

      <div className="flex items-center space-x-3">
        {/* Quick Theme Cycle Button */}
        <button
          type="button"
          onClick={cycleTheme}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors text-xs font-medium"
          title={`Tema: ${theme} (Efectivo: ${effectiveTheme})`}
        >
          {theme === 'light' && <Sun className="w-3.5 h-3.5 text-amber-500" />}
          {theme === 'dark' && <Moon className="w-3.5 h-3.5 text-indigo-400" />}
          {theme === 'system' && <Laptop className="w-3.5 h-3.5 text-teal-500" />}
          <span className="capitalize">{theme}</span>
        </button>

        {/* Database Status indicator */}
        <div
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
          title={dbConnected ? t('app.connected') : t('app.disconnected')}
        >
          <Database className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="text-slate-600 dark:text-slate-300">SQLite</span>
          <span
            className={`w-2 h-2 rounded-full ${
              dbConnected === true
                ? 'bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900'
                : dbConnected === false
                ? 'bg-red-500 ring-2 ring-red-200 dark:ring-red-900'
                : 'bg-amber-400'
            }`}
          />
        </div>

        {/* Security badge */}
        <div className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>IPC Sandbox</span>
        </div>

        {/* Global Language Selector */}
        <LanguageSelector />
      </div>
    </header>
  );
};
