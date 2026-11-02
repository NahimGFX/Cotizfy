import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, ShieldCheck } from 'lucide-react';
import { LanguageSelector } from '../common/LanguageSelector';
import { checkDatabase, api } from '../../services/api';

interface HeaderProps {
  currentTab: string;
}

export const Header: React.FC<HeaderProps> = ({ currentTab }) => {
  const { t } = useTranslation();
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

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center space-x-3">
        <h1 className="text-lg font-bold text-slate-800 capitalize">
          {t(`nav.${currentTab}`)}
        </h1>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono">
          v{appVersion}
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {/* Database Status indicator */}
        <div
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 bg-slate-50"
          title={dbConnected ? t('app.connected') : t('app.disconnected')}
        >
          <Database className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-600">SQLite</span>
          <span
            className={`w-2 h-2 rounded-full ${
              dbConnected === true
                ? 'bg-emerald-500 ring-2 ring-emerald-200'
                : dbConnected === false
                ? 'bg-red-500 ring-2 ring-red-200'
                : 'bg-amber-400'
            }`}
          />
        </div>

        {/* Security badge */}
        <div className="hidden sm:flex items-center space-x-1 px-2.5 py-1 text-xs text-slate-500 bg-slate-50 rounded-md border border-slate-200">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>IPC Sandbox</span>
        </div>

        {/* Global Language Selector */}
        <LanguageSelector />
      </div>
    </header>
  );
};
