import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GitCompareArrows, AlertCircle, FileSpreadsheet } from 'lucide-react';
import type { ProjectSummary } from '../../electron/preload/types';
import { ExcelImportPanel } from '../components/projects/ExcelImportPanel';
import { api } from '../services/api';
import type { ProjectBudgetItem } from '../../electron/preload/types';

interface ComparePageProps {
  projects: ProjectSummary[];
  onNavigateToProjects: () => void;
  activeProjectId: string | null;
  onManageSuppliers: (project: ProjectSummary) => void;
  onImportComplete: () => void;
}

export const ComparePage: React.FC<ComparePageProps> = ({
  projects,
  onNavigateToProjects,
  activeProjectId,
  onManageSuppliers,
  onImportComplete,
}) => {
  const { t } = useTranslation();
  const [projectId, setProjectId] = useState(activeProjectId || projects[0]?.id || '');
  const [items, setItems] = useState<ProjectBudgetItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState('');
  const [reloadItems, setReloadItems] = useState(0);
  useEffect(() => { if (activeProjectId && projects.some(project => project.id === activeProjectId)) setProjectId(activeProjectId); else if (!projects.some(project => project.id === projectId)) setProjectId(projects[0]?.id || ''); }, [activeProjectId, projects]);
  useEffect(() => {
    if (!projectId) { setItems([]); return; }
    let current = true;
    setItemsLoading(true); setItemsError('');
    void api.getProjectItems(projectId).then(result => { if (!current) return; if (result.success && result.data) setItems(result.data); else setItemsError(result.error || t('excel.queryError')); }).finally(() => { if (current) setItemsLoading(false); });
    return () => { current = false; };
  }, [projectId, reloadItems, t]);
  const selectedProject = projects.find(project => project.id === projectId);
  const importComplete = () => { setReloadItems(value => value + 1); onImportComplete(); };

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
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><label htmlFor="compare-project" className="mb-1 block text-xs font-semibold text-slate-500">{t('excel.project')}</label><select id="compare-project" value={projectId} onChange={event=>setProjectId(event.target.value)} className="min-w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">{projects.map(project=><option key={project.id} value={project.id}>{project.name}</option>)}</select></div></div>
          {selectedProject && <ExcelImportPanel project={selectedProject} onManageSuppliers={()=>onManageSuppliers(selectedProject)} onImported={importComplete} />}
          <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800"><h3 className="font-semibold text-slate-800 dark:text-slate-100">{t('excel.projectItems')}</h3></div>
            {itemsError ? <p className="p-4 text-sm text-red-600">{itemsError}</p> : itemsLoading ? <p className="p-4 text-sm text-slate-500">{t('common.loading')}</p> : items.length === 0 ? <p className="p-4 text-sm text-slate-500">{t('excel.noItems')}</p> : <div className="overflow-auto"><table className="w-full min-w-[800px] border-collapse text-left text-xs text-slate-700 dark:text-slate-200"><thead className="bg-slate-50 dark:bg-slate-800"><tr><th className="p-3">ITEM</th><th className="p-3">{t('excel.description')}</th><th className="p-3">{t('excel.quantity')}</th><th className="p-3">{t('excel.unit')}</th><th className="p-3">{t('excel.supplier')}</th><th className="p-3">{t('excel.unitPrice')}</th><th className="p-3">{t('excel.totalPrice')}</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{items.map(item => item.quotes.length ? item.quotes.map(quote=><tr key={quote.id}><td className="p-3">{item.itemNumber}</td><td className="p-3">{item.description}</td><td className="p-3">{item.quantity}</td><td className="p-3">{item.unit}</td><td className="p-3">{quote.supplierName}</td><td className="p-3" title={quote.notes || undefined}>{quote.notes?.includes('unit price') ? '—' : quote.unitPrice}</td><td className="p-3" title={quote.notes || undefined}>{quote.notes?.includes('total price') ? '—' : quote.totalPrice}</td></tr>) : <tr key={item.id}><td className="p-3">{item.itemNumber}</td><td className="p-3">{item.description}</td><td className="p-3">{item.quantity}</td><td className="p-3">{item.unit}</td><td className="p-3 text-slate-400" colSpan={3}>{t('excel.noQuotes')}</td></tr>)}</tbody></table></div>}
          </section>
          {items.length === 0 && <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-4 rounded-lg border border-amber-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{t('compare.emptyState')}</span>
          </div>}
        </div>
      )}
    </div>
  );
};
