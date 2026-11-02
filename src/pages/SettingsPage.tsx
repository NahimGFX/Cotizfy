import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  Database,
  Cpu,
  CheckCircle2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { switchLanguage } from '../i18n';
import { checkDatabase } from '../services/api';

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; message?: string } | null>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  const testDb = async () => {
    setChecking(true);
    const res = await checkDatabase();
    setDbStatus(res);
    setChecking(false);
  };

  useEffect(() => {
    testDb();
  }, []);

  const handleLangChange = async (lng: 'es' | 'en') => {
    await switchLanguage(lng);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          {t('settings.title')}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {t('settings.subtitle')}
        </p>
      </div>

      {savedNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{t('settings.language.changedNotification')}</span>
        </div>
      )}

      {/* Language Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {t('settings.language.title')}
            </h3>
            <p className="text-xs text-slate-500">
              {t('settings.language.description')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <button
            type="button"
            onClick={() => handleLangChange('es')}
            className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
              i18n.language === 'es'
                ? 'border-teal-500 bg-teal-50/40 ring-2 ring-teal-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div>
              <p className="font-semibold text-slate-900 text-sm">{t('settings.language.es')}</p>
              <p className="text-xs text-slate-500 mt-0.5">Español (Predeterminado)</p>
            </div>
            {i18n.language === 'es' && <CheckCircle2 className="w-5 h-5 text-teal-600" />}
          </button>

          <button
            type="button"
            onClick={() => handleLangChange('en')}
            className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
              i18n.language === 'en'
                ? 'border-teal-500 bg-teal-50/40 ring-2 ring-teal-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div>
              <p className="font-semibold text-slate-900 text-sm">{t('settings.language.en')}</p>
              <p className="text-xs text-slate-500 mt-0.5">English (US)</p>
            </div>
            {i18n.language === 'en' && <CheckCircle2 className="w-5 h-5 text-teal-600" />}
          </button>
        </div>
      </div>

      {/* SQLite & Prisma Database Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {t('settings.database.title')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('settings.database.description')}
              </p>
            </div>
          </div>
          <button
            onClick={testDb}
            disabled={checking}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{t('settings.database.checkButton')}</span>
          </button>
        </div>

        <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
          {dbStatus?.connected ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-slate-700 font-medium">{t('settings.database.connected')}</span>
              <span className="text-slate-400">({dbStatus.message})</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="text-red-700 font-medium">Error de base de datos</span>
              <span className="text-red-500">({dbStatus?.message || 'No disponible'})</span>
            </>
          )}
        </div>
      </div>

      {/* System info */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {t('settings.systemInfo.title')}
            </h3>
            <p className="text-xs text-slate-500">
              Stack tecnológico activo en Cotizfy
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 block">{t('settings.systemInfo.desktopEngine')}</span>
            <span className="font-semibold text-slate-800">Electron v33</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 block">{t('settings.systemInfo.frontend')}</span>
            <span className="font-semibold text-slate-800">React 18 + Vite</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 block">{t('settings.systemInfo.orm')}</span>
            <span className="font-semibold text-slate-800">Prisma + SQLite</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 block">Internacionalización</span>
            <span className="font-semibold text-slate-800">i18next</span>
          </div>
        </div>
      </div>
    </div>
  );
};
