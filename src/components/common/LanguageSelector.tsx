import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { switchLanguage } from '../../i18n';

interface LanguageSelectorProps {
  compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ compact = false }) => {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (lng: 'es' | 'en') => {
    switchLanguage(lng);
  };

  return (
    <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium">
      {!compact && (
        <span className="flex items-center pl-1.5 text-slate-500">
          <Languages className="w-3.5 h-3.5 mr-1" />
        </span>
      )}
      <button
        type="button"
        onClick={() => handleLanguageChange('es')}
        className={`px-2.5 py-1 rounded transition-colors ${
          i18n.language === 'es'
            ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-400 shadow-xs font-semibold'
            : 'text-slate-600 hover:text-slate-900'
        }`}
        title={t('settings.language.es')}
      >
        ES
      </button>
      <button
        type="button"
        onClick={() => handleLanguageChange('en')}
        className={`px-2.5 py-1 rounded transition-colors ${
          i18n.language === 'en'
            ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-400 shadow-xs font-semibold'
            : 'text-slate-600 hover:text-slate-900'
        }`}
        title={t('settings.language.en')}
      >
        EN
      </button>
    </div>
  );
};
