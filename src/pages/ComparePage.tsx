import React from 'react';
import { useTranslation } from 'react-i18next';
import { GitCompareArrows, AlertCircle, FileSpreadsheet } from 'lucide-react';
import type { ProjectSummary } from '../../electron/preload/types';

interface ComparePageProps {
  projects: ProjectSummary[];
  onNavigateToProjects: () => void;
}

export const ComparePage: React.FC<ComparePageProps> = ({
  projects,
  onNavigateToProjects,
}) => {
  const { t } = useTranslation();

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          {t('compare.title')}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {t('compare.subtitle')}
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-xl mx-auto shadow-xs">
          <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <GitCompareArrows className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">
            {t('compare.selectProject')}
          </h3>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            {t('compare.emptyState')}
          </p>
          <button
            onClick={onNavigateToProjects}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t('projects.createButton')}</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-4 rounded-lg border border-amber-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{t('compare.emptyState')}</span>
          </div>
        </div>
      )}
    </div>
  );
};
