import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, FileSpreadsheet, GitCompareArrows } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  ProjectSummary,
  ProjectBudgetItem,
  SupplierRecord,
} from "../../electron/preload/types";
import { ExcelImportPanel } from "../components/projects/ExcelImportPanel";
import { MatrixEditor } from "../components/projects/MatrixEditor";
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
const card =
  "rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900";

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
  const allItemsCovered =
    items.length > 0 &&
    comparison.suppliers.every(
      (supplier) => supplier.itemsQuoted === items.length,
    );
  const estimatedCheapestCost = comparison.items.reduce(
    (sum, entry) => sum + (entry.lowest ?? 0) * entry.item.quantity,
    0,
  );
  const priceRanges = comparison.items
    .filter((entry) => entry.lowest !== null)
    .map((entry) => ({
      item: entry.item.itemNumber,
      difference: entry.savings,
      label: entry.item.description,
    }));
  const actualTotalChart = comparison.quotedTotals.map((entry, index) => ({
    ...entry,
    fill: comparisonSuppliers[index]?.color || colors[index % colors.length],
  }));
  const distributionTotal = comparison.distribution.reduce(
    (sum, row) => sum + row.count,
    0,
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6 lg:p-8">
      <header>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t("compare.title")}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{t("compare.subtitle")}</p>
      </header>
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
                  {comparison.itemsWithoutQuotes > 0 ||
                  comparison.itemsWithMissingQuotes > 0 ? (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        {t("compare.coverageWarning", {
                          without: comparison.itemsWithoutQuotes,
                          partial: comparison.itemsWithMissingQuotes,
                        })}
                      </span>
                    </div>
                  ) : null}
                  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Metric
                      label={t("compare.estimatedCheapestCost")}
                      value={money(estimatedCheapestCost)}
                      detail={t("compare.estimatedCheapestHelp")}
                    />
                    <Metric
                      label={t("compare.potentialSavings")}
                      value={money(comparison.potentialSavings)}
                      detail={t("compare.savingsRate", {
                        rate:
                          comparison.savingsPercent === null
                            ? "—"
                            : formatPercent(comparison.savingsPercent, locale),
                      })}
                    />
                    <Metric
                      label={t("compare.cheapestSupplierTotal")}
                      value={money(comparison.cheapestQuotedTotal)}
                      detail={
                        allItemsCovered
                          ? comparison.suppliers.find(
                              (s) =>
                                s.supplier.id ===
                                comparison.cheapestQuotedSupplierId,
                            )?.supplier.name || "—"
                          : t("compare.incompleteComparison")
                      }
                    />
                    <Metric
                      label={t("compare.highestSupplierTotal")}
                      value={money(comparison.mostExpensiveQuotedTotal)}
                      detail={
                        allItemsCovered
                          ? t("compare.completeCoverage")
                          : t("compare.incompleteComparison")
                      }
                    />
                  </section>
                  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {comparison.suppliers.map((stat) => (
                      <article className={card} key={stat.supplier.id}>
                        <div className="mb-3 flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor: stat.supplier.color || colors[0],
                            }}
                          />
                          <h3 className="truncate font-semibold text-slate-900 dark:text-slate-100">
                            {stat.supplier.name}
                          </h3>
                        </div>
                        <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                          {money(stat.quotedTotal)}{" "}
                          <span className="text-xs font-normal text-slate-500">
                            {t("compare.actualQuoted")}
                          </span>
                        </p>
                        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                          <div>
                            <dt>{t("compare.itemsQuoted")}</dt>
                            <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                              {stat.itemsQuoted}/{items.length}
                            </dd>
                          </div>
                          <div>
                            <dt>{t("compare.lowestWins")}</dt>
                            <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                              {stat.lowestWins}
                            </dd>
                          </div>
                          <div>
                            <dt>{t("compare.ties")}</dt>
                            <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                              {stat.ties}
                            </dd>
                          </div>
                          <div>
                            <dt>{t("compare.differenceCheapest")}</dt>
                            <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                              {allItemsCovered
                                ? money(stat.differenceFromCheapest)
                                : "—"}
                            </dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </section>
                  <section className={`${card} overflow-hidden p-0`}>
                    <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                      <h3 className="font-semibold">
                        {t("compare.itemComparison")}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {t("compare.unitPriceAndTotals")}
                      </p>
                    </div>
                    <div className="overflow-auto">
                      <table className="w-full min-w-max border-collapse text-left text-xs text-slate-700 dark:text-slate-200">
                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
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
                  <section className="grid gap-4 xl:grid-cols-2">
                    <ChartCard title={t("compare.chartTotals")}>
                      <ResponsiveContainer width="100%" height={270}>
                        <BarChart
                          data={actualTotalChart}
                          margin={{ left: 12, right: 12, bottom: 36 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="supplierName"
                            angle={-20}
                            textAnchor="end"
                            interval={0}
                            height={58}
                          />
                          <YAxis />
                          <Tooltip formatter={(v: number) => money(v)} />
                          <Bar
                            dataKey="total"
                            name={t("compare.actualQuoted")}
                            radius={[5, 5, 0, 0]}
                          >
                            {actualTotalChart.map((entry) => (
                              <Cell key={entry.supplierId} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title={t("compare.chartWins")}>
                      <ResponsiveContainer width="100%" height={270}>
                        <BarChart
                          data={comparison.wins}
                          margin={{ left: 12, right: 12, bottom: 36 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="supplierName"
                            angle={-20}
                            textAnchor="end"
                            interval={0}
                            height={58}
                          />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            name={t("compare.lowestWins")}
                            radius={[5, 5, 0, 0]}
                          >
                            {comparison.wins.map((entry, index) => (
                              <Cell
                                key={entry.supplierId}
                                fill={
                                  comparisonSuppliers[index]?.color ||
                                  colors[index % colors.length]
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title={t("compare.chartDifferences")}>
                      <ResponsiveContainer width="100%" height={290}>
                        <BarChart
                          data={priceRanges}
                          margin={{ left: 12, right: 12, bottom: 45 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="item"
                            angle={-25}
                            textAnchor="end"
                            interval={0}
                            height={65}
                          />
                          <YAxis />
                          <Tooltip
                            labelFormatter={(_, payload) =>
                              payload?.[0]?.payload?.label || ""
                            }
                            formatter={(v: number) => money(v)}
                          />
                          <Bar
                            dataKey="difference"
                            name={t("compare.priceDifference")}
                            fill="#f59e0b"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title={t("compare.chartDistribution")}>
                      <ResponsiveContainer width="100%" height={290}>
                        <PieChart>
                          <Pie
                            data={comparison.distribution}
                            dataKey="count"
                            nameKey="supplierName"
                            cx="50%"
                            cy="48%"
                            outerRadius={92}
                            label={(entry) =>
                              `${entry.supplierName} (${entry.count})`
                            }
                          >
                            {comparison.distribution.map((entry, index) => (
                              <Cell
                                key={entry.supplierId}
                                fill={
                                  comparisonSuppliers[index]?.color ||
                                  colors[index % colors.length]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                      <p className="px-3 pb-3 text-center text-xs text-slate-500">
                        {t("compare.distributionCaption", {
                          count: distributionTotal,
                        })}
                      </p>
                    </ChartCard>
                  </section>
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

const Metric: React.FC<{ label: string; value: string; detail: string }> = ({
  label,
  value,
  detail,
}) => (
  <article className={card}>
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <p className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
      {value}
    </p>
    <p className="mt-1 text-xs text-slate-500">{detail}</p>
  </article>
);
const ChartCard: React.FC<React.PropsWithChildren<{ title: string }>> = ({
  title,
  children,
}) => (
  <article className={`${card} min-w-0 overflow-hidden`}>
    <h3 className="mb-2 font-semibold text-slate-800 dark:text-slate-100">
      {title}
    </h3>
    {children}
  </article>
);
