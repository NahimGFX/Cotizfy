import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, FolderKanban, Users, Layers, ExternalLink } from 'lucide-react';
import type { ProjectSummary } from '../../electron/preload/types';
import { formatDate } from '../utils/formatters';

interface ProjectsPageProps {
  projects: ProjectSummary[];
  loading: boolean;
  onOpenCreateModal: () => void;
  onSelectProject: (projectId: string) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  projects,
  loading,
  onOpenCreateModal,
  onSelectProject,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProjects = projects.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.client && p.client.toLowerCase().includes(term))
    );
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t('projects.title')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {t('projects.subtitle')}
          </p>
        </div>
        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('projects.createButton')}</span>
        </button>
      </div>

      {/* Filter and search bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('projects.searchPlaceholder')}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder:text-slate-400"
        />
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">
            {t('common.loading')}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-12 text-center">
            <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">
              {t('projects.noProjects')}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {t('dashboard.createFirstProject')}
            </p>
            <button
              onClick={onOpenCreateModal}
              className="mt-4 inline-flex items-center space-x-2 px-3.5 py-2 bg-teal-50 text-teal-700 rounded-lg text-xs font-semibold hover:bg-teal-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t('projects.createButton')}</span>
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">{t('projects.table.name')}</th>
                <th className="py-3 px-4">{t('projects.table.client')}</th>
                <th className="py-3 px-4">{t('projects.table.currency')}</th>
                <th className="py-3 px-4 text-center">{t('projects.table.suppliers')}</th>
                <th className="py-3 px-4 text-center">{t('projects.table.items')}</th>
                <th className="py-3 px-4">{t('projects.table.lastUpdate')}</th>
                <th className="py-3 px-4 text-right">{t('projects.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  onClick={() => onSelectProject(project.id)}
                >
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{project.name}</div>
                    {project.description && (
                      <div className="text-xs text-slate-400 truncate max-w-xs">{project.description}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {project.client || '-'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 text-slate-700">
                      {project.currency}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center space-x-1 text-xs text-slate-600 font-medium">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{project.suppliersCount}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center space-x-1 text-xs text-slate-600 font-medium">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>{project.itemsCount}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500">
                    {formatDate(project.updatedAt, 'short')}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProject(project.id);
                      }}
                      className="p-1.5 hover:bg-slate-200/60 rounded-md text-slate-500 hover:text-slate-800 transition-colors"
                      title={t('common.view')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
