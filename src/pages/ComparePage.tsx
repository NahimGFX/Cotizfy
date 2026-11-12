import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, FileSpreadsheet, GitCompareArrows } from "lucide-react";
import type {
  ProjectSummary,
  ProjectBudgetItem,
  SupplierRecord,
} from "../../electron/preload/types";
import { ExcelImportPanel } from "../components/projects/ExcelImportPanel";
import { MatrixEditor } from "../components/projects/MatrixEditor";
import { FinancialAnalyticsPanel } from "../components/compare/FinancialAnalyticsPanel";
import { PageHeader } from "../components/common/PageHeader";
import { api } from "../services/api";
import {
  calculatePriceComparison,
  type ComparisonSupplier,
} from "../utils/priceComparison";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "../utils/formatters";

interface ComparePageProps {
  projects: ProjectSummary[];
  onNavigateToProjects: () => void;
  activeProjectId: string | null;
  onManageSuppliers: (project: ProjectSummary) => void;
  onImportComplete: () => void;
}
const colors = [
  "#0d9488",
  "#2563eb",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#64748b",
];
const card = "surface-card p-4";

export const ComparePage: React.FC<ComparePageProps> = ({
  projects,
  onNavigateToProjects,
  activeProjectId,
  onManageSuppliers,
  onImportComplete,
}) => {
  const { t, i18n } = useTranslation();
  const [projectId, setProjectId] = useState(
    activeProjectId || projects[0]?.id || "",
  );
  const [items, setItems] = useState<ProjectBudgetItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState("");
  const [reloadItems, setReloadItems] = useState(0);
  useEffect(() => {
    if (
      activeProjectId &&
      projects.some((project) => project.id === activeProjectId)
    )
      setProjectId(activeProjectId);
    else if (!projects.some((project) => project.id === projectId))
      setProjectId(projects[0]?.id || "");
  }, [activeProjectId, projects]);
  useEffect(() => {
    if (!projectId) {
      setItems([]);
      setSuppliers([]);
      return;
    }
    let current = true;
    setItemsLoading(true);
    setItemsError("");
    void Promise.all([
      api.getProjectItems(projectId),
      api.getProjectSuppliers(projectId),
    ])
      .then(([itemResult, supplierResult]) => {
        if (!current) return;
        if (itemResult.success && itemResult.data) setItems(itemResult.data);
        else setItemsError(itemResult.error || t("excel.queryError"));
        if (supplierResult.success && supplierResult.data)
          setSuppliers(supplierResult.data);
        else if (!itemsError)
          setItemsError(supplierResult.error || t("compare.suppliersError"));
      })
      .catch((error) => {
        if (current)
          setItemsError(
            error instanceof Error ? error.message : t("excel.queryError"),
          );
      })
      .finally(() => {
        if (current) setItemsLoading(false);
      });
    return () => {
      current = false;
    };
  }, [projectId, reloadItems, t]);
  const selectedProject = projects.find((project) => project.id === projectId);
  const comparisonSuppliers = useMemo<ComparisonSupplier[]>(
    () =>
      suppliers.map((supplier, index) => ({
        id: supplier.id,
        name: supplier.name,
        color: supplier.color || colors[index % colors.length],
      })),
    [suppliers],
  );
  const comparison = useMemo(
    () => calculatePriceComparison(items, comparisonSuppliers),
    [items, comparisonSuppliers],
  );
  const locale = i18n.language === "en" ? "en-US" : "es-EC";
  const money = (value: number | null) =>
    value === null
      ? "—"
      : formatCurrency(value, selectedProject?.currency || "USD", locale);
  const importComplete = () => {
    setReloadItems((value) => value + 1);
    onImportComplete();
  };

  return (
    <div className="page-content max-w-[1680px] space-y-6">
      <PageHeader
        title={t("compare.title")}
        description={t("compare.subtitle")}
      />
      {projects.length === 0 ? (
        <div className={`${card} mx-auto max-w-xl p-12 text-center`}>
          <GitCompareArrows className="mx-auto mb-4 h-8 w-8 text-teal-600" />
          <h3 className="font-semibold">{t("compare.selectProject")}</h3>
          <p className="mb-6 mt-2 text-sm text-slate-500">
            {t("compare.emptyState")}
          </p>
          <button
            onClick={onNavigateToProjects}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {t("projects.createButton")}
          </button>
        </div>
      ) : (
        <>
          <section
            className={`${card} flex flex-wrap items-end justify-between gap-4`}
          >
            <div>
              <label
                htmlFor="compare-project"
                className="mb-1 block text-xs font-semibold text-slate-500"
              >
                {t("excel.project")}
              </label>
              <select
                id="compare-project"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="min-w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedProject && (
              <ExcelImportPanel
                project={selectedProject}
                onManageSuppliers={() => onManageSuppliers(selectedProject)}
                onImported={importComplete}
              />
            )}
          </section>
          {itemsError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {itemsError}
            </div>
          )}
          {itemsLoading ? (
            <div className={`${card} text-sm text-slate-500`}>
              {t("common.loading")}
            </div>
          ) : (
            <>
              {selectedProject && (
                <section className={`${card} overflow-hidden p-0`}>
                  <MatrixEditor
                    projectId={selectedProject.id}
                    items={items}
                    suppliers={suppliers}
                    onChanged={() => setReloadItems((value) => value + 1)}
                  />
                </section>
              )}
              {items.length > 0 && (
                <>
                  <section className={`${card} overflow-hidden p-0`}>
                    <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                      <h3 className="font-semibold">
                        {t("compare.itemComparison")}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {t("compare.unitPriceAndTotals")}
                      </p>
                    </div>
                    <div
                      role="region"
                      aria-label={t("compare.itemComparison")}
                      tabIndex={0}
                      className="max-w-full overflow-auto focus-visible:rounded-xl"
                    >
                      <table className="data-table w-full min-w-max border-collapse text-left text-xs text-slate-700 dark:text-slate-200">
                        <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm dark:bg-slate-800">
                          <tr>
                            <th rowSpan={2} className="p-3">
                              ITEM
                            </th>
                            <th rowSpan={2} className="min-w-52 p-3">
                              {t("excel.description")}
                            </th>
                            <th rowSpan={2} className="p-3">
                              {t("excel.quantity")}
                            </th>
                            <th rowSpan={2} className="p-3">
                              {t("excel.unit")}
                            </th>
                            {comparisonSuppliers.map((s) => (
                              <th
                                key={s.id}
                                colSpan={2}
                                className="border-l border-slate-200 p-3 text-center dark:border-slate-700"
                              >
                                {s.name}
                              </th>
                            ))}
                            <th rowSpan={2} className="border-l p-3">
                              {t("compare.bestSupplier")}
                            </th>
                            <th rowSpan={2} className="p-3">
                              {t("compare.priceDifference")}
                            </th>
                            <th rowSpan={2} className="p-3">
                              {t("compare.percentDifference")}
                            </th>
                          </tr>
                          <tr>
                            {comparisonSuppliers.flatMap((s) => [
                              <th key={`${s.id}-unit`} className="border-l p-2">
                                {t("excel.unitPrice")}
                              </th>,
                              <th key={`${s.id}-total`} className="p-2">
                                {t("excel.totalPrice")}
                              </th>,
                            ])}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {comparison.items.map((entry) => (
                            <tr
                              key={entry.item.id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            >
                              <td className="p-3 font-medium">
                                {entry.item.itemNumber}
                              </td>
                              <td className="p-3">{entry.item.description}</td>
                              <td className="p-3">
                                {formatNumber(entry.item.quantity, 3, locale)}
                              </td>
                              <td className="p-3">{entry.item.unit}</td>
                              {comparisonSuppliers.flatMap((supplier) => {
                                const row = entry.quotes[supplier.id];
                                const absent = row?.quote === null;
                                return [
                                  <td
                                    key={`${supplier.id}-u`}
                                    className={`border-l p-3 tabular-nums ${row?.isLowest ? "bg-emerald-50 font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200" : ""}`}
                                  >
                                    {row?.unitPrice === null ||
                                    row?.unitPrice === undefined ? (
                                      <span className="text-slate-400">
                                        {t("compare.noQuote")}
                                      </span>
                                    ) : (
                                      money(row.unitPrice)
                                    )}
                                    {row?.tied && (
                                      <span className="ml-1 text-[10px] font-semibold">
                                        {t("compare.tie")}
                                      </span>
                                    )}
                                  </td>,
                                  <td
                                    key={`${supplier.id}-t`}
                                    className="p-3 tabular-nums"
                                  >
                                    {absent ||
                                    row?.totalPrice === null ||
                                    row?.totalPrice === undefined ? (
                                      <span className="text-slate-400">
                                        {t("compare.noQuote")}
                                      </span>
                                    ) : (
                                      money(row.totalPrice)
                                    )}
                                  </td>,
                                ];
                              })}
                              <td className="border-l p-3 font-medium">
                                {entry.lowestSupplierIds.length
                                  ? entry.lowestSupplierIds
                                      .map(
                                        (id) =>
                                          comparisonSuppliers.find(
                                            (s) => s.id === id,
                                          )?.name,
                                      )
                                      .filter(Boolean)
                                      .join(", ") +
                                    (entry.lowestSupplierIds.length > 1
                                      ? ` (${t("compare.tie")})`
                                      : "")
                                  : t("compare.noQuote")}
                              </td>
                              <td className="p-3 tabular-nums">
                                {money(entry.spread)}
                              </td>
                              <td className="p-3 tabular-nums">
                                {entry.spreadPercent === null
                                  ? "—"
                                  : formatPercent(entry.spreadPercent, locale)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <FinancialAnalyticsPanel
                    key={selectedProject?.id || projectId}
                    projectId={selectedProject?.id || projectId}
                    currency={selectedProject?.currency || "USD"}
                    items={items}
                    suppliers={comparisonSuppliers.map((supplier) => ({
                      id: supplier.id,
                      name: supplier.name,
                      color: supplier.color,
                    }))}
                  />
                </>
              )}
              {items.length === 0 && (
                <div
                  className={`${card} flex items-center gap-2 text-sm text-slate-500`}
                >
                  <FileSpreadsheet className="h-5 w-5 shrink-0 text-teal-600" />
                  {t("excel.noItems")}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};
