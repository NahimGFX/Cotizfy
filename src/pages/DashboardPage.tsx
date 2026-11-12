import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FolderKanban,
  Users,
  Layers,
  TrendingDown,
  PlusCircle,
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { fetchProjects } from "../services/api";
import type { ProjectSummary } from "../../electron/preload/types";
import { formatCurrency, formatNumber, formatDate } from "../utils/formatters";
import { useTheme } from "../context/ThemeContext";
import { api } from "../services/api";
import { calculatePriceComparison } from "../utils/priceComparison";
import { PageHeader } from "../components/common/PageHeader";

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
  const isDark = effectiveTheme === "dark";

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [supplierCount, setSupplierCount] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [potentialSavings, setPotentialSavings] = useState<{
    amount: number;
    currency: string;
  } | null>(null);
  const [savingsByProject, setSavingsByProject] = useState<
    { project: string; savings: number }[]
  >([]);

  useEffect(() => {
    let current = true;
    void (async () => {
      const [res, suppliersResult] = await Promise.all([
        fetchProjects(),
        api.getSuppliers(),
      ]);
      if (!current) return;
      if (suppliersResult.success && suppliersResult.data)
        setSupplierCount(suppliersResult.data.length);
      if (res.success && res.data) {
        setProjects(res.data);
        const currencies = [
          ...new Set(res.data.map((project) => project.currency)),
        ];
        const results = await Promise.all(
          res.data.map(async (project) => {
            const [itemsResult, suppliersResult] = await Promise.all([
              api.getProjectItems(project.id),
              api.getProjectSuppliers(project.id),
            ]);
            if (
              !itemsResult.success ||
              !itemsResult.data ||
              !suppliersResult.success ||
              !suppliersResult.data
            )
              return null;
            return {
              name: project.name,
              savings: calculatePriceComparison(
                itemsResult.data,
                suppliersResult.data.map((supplier) => ({
                  id: supplier.id,
                  name: supplier.name,
                })),
              ).potentialSavings,
            };
          }),
        );
        if (current) {
          const dashboardComparisonIsValid =
            currencies.length <= 1 && results.every((value) => value !== null);
          setSavingsByProject(
            dashboardComparisonIsValid
              ? results.map((value) => ({
                  project: value!.name,
                  savings: value!.savings,
                }))
              : [],
          );
          setPotentialSavings(
            dashboardComparisonIsValid
              ? {
                  amount: results.reduce<number>(
                    (sum, value) => sum + (value?.savings ?? 0),
                    0,
                  ),
                  currency: currencies[0] || "USD",
                }
              : null,
          );
        }
      } else setPotentialSavings(null);
      if (current) setLoading(false);
    })();
    return () => {
      current = false;
    };
  }, []);

  const totalSuppliers = supplierCount;
  const totalItems = projects.reduce((acc, p) => acc + p.itemsCount, 0);

  return (
    <div className="page-content space-y-7 transition-colors">
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.subtitle")}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="surface-card flex items-center justify-between p-5 transition-colors">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("dashboard.stats.totalProjects")}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {loading ? "—" : formatNumber(projects.length, 0)}
            </p>
          </div>
          <div className="w-11 h-11 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 rounded-lg flex items-center justify-center">
            <FolderKanban className="w-6 h-6" />
          </div>
        </div>

        <div className="surface-card flex items-center justify-between p-5 transition-colors">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("dashboard.stats.totalSuppliers")}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {loading ? "—" : formatNumber(totalSuppliers, 0)}
            </p>
          </div>
          <div className="w-11 h-11 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="surface-card flex items-center justify-between p-5 transition-colors">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("dashboard.stats.totalItems")}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {loading ? "—" : formatNumber(totalItems, 0)}
            </p>
          </div>
          <div className="w-11 h-11 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="surface-card flex items-center justify-between p-5 transition-colors">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("dashboard.stats.potentialSavings")}
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {loading
                ? "—"
                : potentialSavings
                  ? formatCurrency(
                      potentialSavings.amount,
                      potentialSavings.currency,
                    )
                  : "—"}
            </p>
          </div>
          <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="surface-card p-6 transition-colors">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4">
          {t("dashboard.quickActions.title")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={onOpenNewProjectModal}
            className="flex items-center justify-between p-4 rounded-lg border border-teal-200 dark:border-teal-800/80 bg-teal-50/50 dark:bg-teal-950/30 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-medium transition-colors"
          >
            <div className="flex items-center space-x-3">
              <PlusCircle className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>{t("dashboard.quickActions.newProject")}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </button>

          <button
            onClick={() => onNavigate("projects")}
            className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium transition-colors"
          >
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>{t("dashboard.quickActions.importExcel")}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => onNavigate("compare")}
            className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium transition-colors"
          >
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>{t("dashboard.quickActions.compareSuppliers")}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Visual Analytics / Recharts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="surface-card min-w-0 p-6 transition-colors lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {t("dashboard.marketTrends")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("dashboard.chartPlaceholder")}
              </p>
            </div>
          </div>
          <div className="h-64 w-full">
            {loading || savingsByProject.length === 0 ? (
              <div
                role="status"
                className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 px-6 text-center text-sm text-slate-500 dark:border-slate-800"
              >
                {loading ? t("common.loading") : t("dashboard.chartEmpty")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={savingsByProject}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={isDark ? "#334155" : "#f1f5f9"}
                  />
                  <XAxis
                    dataKey="project"
                    tick={{
                      fontSize: 12,
                      fill: isDark ? "#94a3b8" : "#64748b",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fontSize: 12,
                      fill: isDark ? "#94a3b8" : "#64748b",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#020617" : "#0f172a",
                      border: isDark ? "1px solid #334155" : "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="savings"
                    name={t("dashboard.stats.potentialSavings")}
                    fill="#0d9488"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Projects column */}
        <div className="surface-card flex min-w-0 flex-col p-6 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {t("dashboard.recentProjects")}
            </h3>
            <button
              onClick={() => onNavigate("projects")}
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700"
            >
              {t("common.view")}
            </button>
          </div>

          <div className="flex-1 space-y-3">
            {loading ? (
              <div className="h-32 flex items-center justify-center text-xs text-slate-400">
                {t("common.loading")}
              </div>
            ) : projects.length === 0 ? (
              <div className="h-36 flex flex-col items-center justify-center text-center p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {t("dashboard.noRecentProjects")}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {t("dashboard.createFirstProject")}
                </p>
              </div>
            ) : (
              projects.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onNavigate("projects")}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-left transition-colors hover:bg-slate-100/60 focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-800/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/80"
                >
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {p.name}
                  </p>
                  <div className="flex items-center justify-between mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>{p.client || "General"}</span>
                    <span>{formatDate(p.updatedAt, "short")}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
