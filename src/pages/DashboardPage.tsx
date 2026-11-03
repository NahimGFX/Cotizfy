import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FolderKanban,
  Users,
  Layers,
  TrendingDown,
  PlusCircle,
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { fetchProjects } from '../services/api';
import type { ProjectSummary } from '../../electron/preload/types';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { calculatePriceComparison } from '../utils/priceComparison';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
  onOpenNewProjectModal: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenNewProjectModal,
}) => {
  const { t } = useTranslation();
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [potentialSavings, setPotentialSavings] = useState<{ amount: number; currency: string } | null>({ amount: 0, currency: 'USD' });

  useEffect(() => {
    let current = true;
    void (async () => {
      const res = await fetchProjects();
      if (!current) return;
      if (res.success && res.data) {
        setProjects(res.data);
        const currencies = [...new Set(res.data.map(project => project.currency))];
        const results = await Promise.all(res.data.map(async project => {
          const [itemsResult, suppliersResult] = await Promise.all([api.getProjectItems(project.id), api.getProjectSuppliers(project.id)]);
          if (!itemsResult.success || !itemsResult.data || !suppliersResult.success || !suppliersResult.data) return null;
          return calculatePriceComparison(itemsResult.data, suppliersResult.data.map(supplier => ({ id: supplier.id, name: supplier.name }))).potentialSavings;
        }));
        if (current) setPotentialSavings(currencies.length <= 1 && results.every(value => value !== null) ? { amount: results.reduce<number>((sum, value) => sum + (value ?? 0), 0), currency: currencies[0] || 'USD' } : null);
      } else setPotentialSavings(null);
      if (current) setLoading(false);
    })();
    return () => { current = false; };
  }, []);

  const totalSuppliers = projects.reduce((acc, p) => acc + p.suppliersCount, 0);
  const totalItems = projects.reduce((acc, p) => acc + p.itemsCount, 0);

  // Sample data for Recharts comparison demo
  const sampleComparisonData = [
    { item: 'Concreto f\'c 210', Prov_A: 320, Prov_B: 295, Prov_C: 310 },
    { item: 'Acero corrugado 1/2"', Prov_A: 420, Prov_B: 450, Prov_C: 395 },
    { item: 'Ladrillo King Kong', Prov_A: 180, Prov_B: 165, Prov_C: 190 },
    { item: 'Cemento Portland', Prov_A: 260, Prov_B: 250, Prov_C: 255 },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto transition-colors">
      {/* Title & subtitle */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          {t('dashboard.title')}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('dashboard.stats.totalProjects')}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {formatNumber(projects.length, 0)}
            </p>
          </div>
          <div className="w-11 h-11 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 rounded-lg flex items-center justify-center">
            <FolderKanban className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('dashboard.stats.totalSuppliers')}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {formatNumber(totalSuppliers, 0)}
            </p>
          </div>
          <div className="w-11 h-11 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('dashboard.stats.totalItems')}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {formatNumber(totalItems, 0)}
            </p>
          </div>
          <div className="w-11 h-11 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('dashboard.stats.potentialSavings')}
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {potentialSavings ? formatCurrency(potentialSavings.amount, potentialSavings.currency) : '—'}
            </p>
          </div>
          <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4">
          {t('dashboard.quickActions.title')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={onOpenNewProjectModal}
            className="flex items-center justify-between p-4 rounded-lg border border-teal-200 dark:border-teal-800/80 bg-teal-50/50 dark:bg-teal-950/30 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-medium transition-colors"
          >
            <div className="flex items-center space-x-3">
              <PlusCircle className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>{t('dashboard.quickActions.newProject')}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </button>

          <button
            onClick={() => onNavigate('projects')}
            className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium transition-colors"
          >
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>{t('dashboard.quickActions.importExcel')}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => onNavigate('compare')}
            className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium transition-colors"
          >
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>{t('dashboard.quickActions.compareSuppliers')}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Visual Analytics / Recharts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {t('dashboard.marketTrends')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('dashboard.chartPlaceholder')}
              </p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sampleComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                <XAxis dataKey="item" tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#020617' : '#0f172a',
                    border: isDark ? '1px solid #334155' : 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: isDark ? '#94a3b8' : '#64748b' }} />
                <Bar dataKey="Prov_A" name="Proveedor 1" fill="#0d9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Prov_B" name="Proveedor 2" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Prov_C" name="Proveedor 3" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Projects column */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {t('dashboard.recentProjects')}
            </h3>
            <button
              onClick={() => onNavigate('projects')}
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700"
            >
              {t('common.view')}
            </button>
          </div>

          <div className="flex-1 space-y-3">
            {loading ? (
              <div className="h-32 flex items-center justify-center text-xs text-slate-400">
                {t('common.loading')}
              </div>
            ) : projects.length === 0 ? (
              <div className="h-36 flex flex-col items-center justify-center text-center p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{t('dashboard.noRecentProjects')}</p>
                <p className="text-[11px] text-slate-400 mt-1">{t('dashboard.createFirstProject')}</p>
              </div>
            ) : (
              projects.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  onClick={() => onNavigate('projects')}
                  className="p-3 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                >
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{p.name}</p>
                  <div className="flex items-center justify-between mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>{p.client || 'General'}</span>
                    <span>{formatDate(p.updatedAt, 'short')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
