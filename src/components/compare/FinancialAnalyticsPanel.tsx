import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  BarChart3,
  Check,
  ChevronDown,
  Download,
  FilterX,
  LoaderCircle,
  PieChart as PieIcon,
  Search,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProjectBudgetItem } from "../../../electron/preload/types";
import { api } from "../../services/api";
import {
  calculateFinancialAnalysis,
  type PartDistribution,
  type SupplierFinancialRow,
} from "../../utils/financialAnalysis";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "../../utils/formatters";

interface Props {
  projectName: string;
  currency: string;
  items: ProjectBudgetItem[];
  suppliers: { id: string; name: string; color?: string | null }[];
}

interface FilterOption {
  id: string;
  label: string;
  secondary?: string;
}

const chartColors = [
  "#0d9488",
  "#2563eb",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#64748b",
  "#84cc16",
  "#06b6d4",
];

const MultiSelectFilter: React.FC<{
  label: string;
  allLabel: string;
  searchPlaceholder: string;
  selectAllLabel: string;
  clearLabel: string;
  options: FilterOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  locale: string;
}> = ({
  label,
  allLabel,
  searchPlaceholder,
  selectAllLabel,
  clearLabel,
  options,
  selectedIds,
  onChange,
  locale,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = `filter-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const visible = options.filter((option) =>
    `${option.label} ${option.secondary || ""}`
      .toLocaleLowerCase(locale)
      .includes(search.toLocaleLowerCase(locale)),
  );
  const allSelected =
    options.length > 0 && selectedIds.length === options.length;
  const summary = allSelected
    ? allLabel
    : `${selectedIds.length} / ${options.length}`;

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, []);

  const toggle = (id: string) =>
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selected) => selected !== id)
        : [...selectedIds, id],
    );

  return (
    <div className="relative min-w-0" ref={containerRef}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="control flex w-full min-w-[220px] items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:border-teal-500"
      >
        <span className="truncate font-medium">{summary}</span>
        <span className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {selectedIds.length}
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      {open && (
        <div
          id={panelId}
          className="absolute left-0 top-full z-40 mt-2 w-[min(340px,calc(100vw-40px))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between border-b border-slate-100 p-2.5 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onChange(options.map((option) => option.id))}
              className="rounded-md px-2 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/60"
            >
              {selectAllLabel}
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {clearLabel}
            </button>
          </div>
          <div className="relative border-b border-slate-100 p-2 dark:border-slate-800">
            <Search
              aria-hidden="true"
              className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="control h-9 w-full py-1 pl-8 pr-2 text-xs"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1.5">
            {visible.length ? (
              visible.map((option) => {
                const checked = selectedIds.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                  >
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "border-teal-600 bg-teal-600 text-white dark:border-teal-400 dark:bg-teal-400 dark:text-slate-950" : "border-slate-300 dark:border-slate-600"}`}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(option.id)}
                      className="sr-only"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-slate-800 dark:text-slate-100">
                        {option.label}
                      </span>
                      {option.secondary && (
                        <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                          {option.secondary}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })
            ) : (
              <p className="px-3 py-5 text-center text-xs text-slate-500">
                {searchPlaceholder}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const FinancialAnalyticsPanel: React.FC<Props> = ({
  projectName,
  currency,
  items,
  suppliers,
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "es-EC";
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>(() =>
    suppliers.map((supplier) => supplier.id),
  );
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(() =>
    items.map((item) => item.id),
  );
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const supplierOptions = useMemo<FilterOption[]>(
    () =>
      suppliers.map((supplier) => ({ id: supplier.id, label: supplier.name })),
    [suppliers],
  );
  const itemOptions = useMemo<FilterOption[]>(
    () =>
      items.map((item) => ({
        id: item.id,
        label: item.itemNumber,
        secondary: item.description,
      })),
    [items],
  );

  const previousSupplierIds = useRef(
    supplierOptions.map((option) => option.id),
  );
  const previousItemIds = useRef(itemOptions.map((option) => option.id));
  useEffect(() => {
    const nextIds = supplierOptions.map((option) => option.id);
    const priorIds = previousSupplierIds.current;
    if (nextIds.join("\u0000") === priorIds.join("\u0000")) return;
    setSelectedSupplierIds((current) => {
      const wasAllSelected =
        priorIds.length > 0 && priorIds.every((id) => current.includes(id));
      return wasAllSelected
        ? nextIds
        : current.filter((id) => nextIds.includes(id));
    });
    previousSupplierIds.current = nextIds;
  }, [supplierOptions]);
  useEffect(() => {
    const nextIds = itemOptions.map((option) => option.id);
    const priorIds = previousItemIds.current;
    if (nextIds.join("\u0000") === priorIds.join("\u0000")) return;
    setSelectedItemIds((current) => {
      const wasAllSelected =
        priorIds.length > 0 && priorIds.every((id) => current.includes(id));
      return wasAllSelected
        ? nextIds
        : current.filter((id) => nextIds.includes(id));
    });
    previousItemIds.current = nextIds;
  }, [itemOptions]);

  const analysis = useMemo(
    () =>
      calculateFinancialAnalysis(
        items,
        suppliers.map((supplier) => ({
          id: supplier.id,
          name: supplier.name,
          color: supplier.color,
        })),
        selectedSupplierIds,
        selectedItemIds,
      ),
    [items, suppliers, selectedSupplierIds, selectedItemIds],
  );
  const money = (value: number | null) =>
    value === null ? "—" : formatCurrency(value, currency || "USD", locale);
  const chartWidth = Math.max(560, analysis.suppliers.length * 112);

  const resetFilters = () => {
    setSelectedSupplierIds(supplierOptions.map((option) => option.id));
    setSelectedItemIds(itemOptions.map((option) => option.id));
  };

  const exportPdf = async () => {
    setPdfStatus(null);
    setExportingPdf(true);
    try {
      const result = await api.exportAnalysisPdf({
        projectName,
        currency: currency || "USD",
        locale,
        generatedAt: new Date().toISOString(),
        selectedSuppliers: supplierOptions
          .filter((option) => selectedSupplierIds.includes(option.id))
          .map((option) => option.label),
        selectedItemCount: analysis.selectedItemCount,
        coveredItemCount: analysis.referenceCoveredItems,
        optimizedTotal: analysis.optimizedTotal,
        lowestSupplierTotal: analysis.lowestSupplierTotal,
        lowestSupplierNames: analysis.lowestSupplierNames,
        highestSupplierTotal: analysis.highestSupplierTotal,
        highestSupplierNames: analysis.highestSupplierNames,
        supplierRows: analysis.suppliers.map((row) => ({
          name: row.supplier.name,
          total: row.total,
          lowestWins: row.lowestWins,
          ties: row.ties,
          differenceAmount: row.differenceAmount,
          differencePercent: row.differencePercent,
          participationPercent: row.participationPercent,
          totalQuotes: row.totalQuotes,
        })),
        itemComparisons: analysis.comparison.items.map((entry) => ({
          itemNumber: entry.item.itemNumber,
          description: entry.item.description,
          quantity: entry.item.quantity,
          unit: entry.item.unit,
          lowestSupplierNames: entry.lowestSupplierIds
            .map((id) => suppliers.find((supplier) => supplier.id === id)?.name)
            .filter((name): name is string => Boolean(name)),
          spreadAmount: entry.spread,
          spreadPercent: entry.spreadPercent,
          quotes: selectedSupplierIds.flatMap((supplierId) => {
            const supplier = suppliers.find(
              (candidate) => candidate.id === supplierId,
            );
            const quote = entry.quotes[supplierId];
            return supplier && quote
              ? [
                  {
                    supplierName: supplier.name,
                    hasQuote: quote.quote !== null,
                    unitPrice: quote.unitPrice,
                    totalPrice: quote.totalPrice,
                  },
                ]
              : [];
          }),
        })),
        labels: {
          title: t("financial.pdfReportTitle"),
          generatedAt: t("financial.pdfGeneratedAt"),
          project: t("projects.table.name"),
          currency: t("projects.table.currency"),
          selectedSuppliers: t("financial.suppliers"),
          selectedItems: t("financial.items"),
          coverage: t("financial.pdfCoverage"),
          coveredItems: t("financial.pdfCoveredItems"),
          uncoveredItems: t("financial.pdfUncoveredItems"),
          optimizedTotal: t("financial.optimizedTotal"),
          lowestTotal: t("compare.cheapestSupplierTotal"),
          highestTotal: t("compare.highestSupplierTotal"),
          supplierAnalysis: t("financial.supplierAnalysis"),
          supplier: t("financial.columns.supplier"),
          quotedTotal: t("financial.columns.totalCost"),
          lowestWins: t("financial.columns.lowestWins"),
          ties: t("financial.columns.ties"),
          difference: t("financial.columns.difference"),
          differencePercent: t("financial.columns.differencePercent"),
          participation: t("financial.columns.participation"),
          itemsQuoted: t("financial.columns.itemsQuoted"),
          itemComparison: t("compare.itemComparison"),
          item: t("financial.pdfItem"),
          description: t("excel.description"),
          quantity: t("excel.quantity"),
          unit: t("excel.unit"),
          unitPrice: t("excel.unitPrice"),
          totalPrice: t("excel.totalPrice"),
          lowestSupplier: t("compare.bestSupplier"),
          spread: t("compare.priceDifference"),
          spreadPercent: t("compare.percentDifference"),
          tie: t("compare.tie"),
          noQuote: t("compare.noQuote"),
        },
      });
      if (!result.success) {
        throw new Error(result.error || t("financial.pdfExportError"));
      }
      if (result.data?.saved) {
        setPdfStatus({
          type: "success",
          message: t("financial.pdfExportSuccess"),
        });
      }
    } catch (error) {
      setPdfStatus({
        type: "error",
        message:
          error instanceof Error
            ? `${t("financial.pdfExportError")} ${error.message}`
            : t("financial.pdfExportError"),
      });
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <section className="space-y-5" aria-labelledby="financial-analysis-title">
      <div className="surface-card space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                <BarChart3 className="h-4 w-4" />
              </div>
              <h3
                id="financial-analysis-title"
                className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100"
              >
                {t("financial.title")}
              </h3>
            </div>
            <p className="mt-2 max-w-3xl text-xs text-slate-500 dark:text-slate-400">
              {t("financial.description")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void exportPdf()}
              disabled={
                exportingPdf ||
                analysis.selectedSupplierCount === 0 ||
                analysis.selectedItemCount === 0
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              {exportingPdf ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {exportingPdf
                ? t("financial.pdfExportBusy")
                : t("financial.exportPdf")}
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <FilterX className="h-3.5 w-3.5" />
              {t("financial.resetFilters")}
            </button>
          </div>
        </div>

        {pdfStatus && (
          <p
            role={pdfStatus.type === "error" ? "alert" : "status"}
            className={`text-xs ${pdfStatus.type === "error" ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}
          >
            {pdfStatus.message}
          </p>
        )}

        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          <MultiSelectFilter
            label={t("financial.suppliers")}
            allLabel={t("financial.allSuppliers")}
            searchPlaceholder={t("financial.searchSuppliers")}
            selectAllLabel={t("financial.selectAll")}
            clearLabel={t("financial.clearSelection")}
            options={supplierOptions}
            selectedIds={selectedSupplierIds}
            onChange={setSelectedSupplierIds}
            locale={locale}
          />
          <MultiSelectFilter
            label={t("financial.items")}
            allLabel={t("financial.allItems")}
            searchPlaceholder={t("financial.searchItems")}
            selectAllLabel={t("financial.selectAll")}
            clearLabel={t("financial.clearSelection")}
            options={itemOptions}
            selectedIds={selectedItemIds}
            onChange={setSelectedItemIds}
            locale={locale}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500 dark:border-slate-800">
          <span>{t("financial.currencyAssumption", { currency })}</span>
        </div>
      </div>

      {analysis.coverageIncomplete && analysis.selectedItemCount > 0 && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {t("financial.coverageWarning", {
              covered: analysis.referenceCoveredItems,
              selected: analysis.selectedItemCount,
            })}
          </span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <FinanceCard
          icon={<span className="text-sm font-bold">↓</span>}
          label={t("compare.cheapestSupplierTotal")}
          value={money(analysis.lowestSupplierTotal)}
          detail={
            analysis.lowestSupplierNames.length
              ? analysis.lowestSupplierNames.join(", ")
              : t("financial.supplierTotalsIncomparable")
          }
          tone="emerald"
        />
        <FinanceCard
          icon={<span className="text-sm font-bold">↑</span>}
          label={t("compare.highestSupplierTotal")}
          value={money(analysis.highestSupplierTotal)}
          detail={
            analysis.highestSupplierNames.length
              ? analysis.highestSupplierNames.join(", ")
              : t("financial.supplierTotalsIncomparable")
          }
          tone="slate"
        />
      </div>

      {analysis.selectedSupplierCount === 0 ||
      analysis.selectedItemCount === 0 ? (
        <div className="surface-card flex min-h-36 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-slate-500">
          <FilterX className="h-6 w-6 text-slate-400" />
          {t("financial.emptySelection")}
        </div>
      ) : (
        <>
          <div className="grid min-w-0 gap-4 2xl:grid-cols-2">
            <article className="surface-card min-w-0 overflow-hidden p-4 sm:p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                    {t("financial.costBySupplier")}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    {t("financial.costBySupplierHelp")}
                  </p>
                </div>
                <BarChart3 className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
              </div>
              {analysis.suppliers.some((row) => row.total !== null) ? (
                <div className="max-w-full overflow-x-auto">
                  <div style={{ width: `${chartWidth}px`, height: 310 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analysis.suppliers.filter(
                          (row) => row.total !== null,
                        )}
                        margin={{ top: 8, right: 20, left: 4, bottom: 50 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="var(--border-subtle)"
                        />
                        <XAxis
                          dataKey="supplier.name"
                          angle={-25}
                          textAnchor="end"
                          interval={0}
                          height={70}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          tickFormatter={(value: number) =>
                            formatNumber(value, 0, locale)
                          }
                          tick={{ fontSize: 10 }}
                          width={58}
                        />
                        <Tooltip
                          content={(props) => (
                            <SupplierTooltip {...props} money={money} t={t} />
                          )}
                        />
                        <Bar
                          dataKey="total"
                          name={t("financial.columns.totalCost")}
                          radius={[6, 6, 0, 0]}
                          maxBarSize={54}
                        >
                          {analysis.suppliers
                            .filter((row) => row.total !== null)
                            .map((row, index) => (
                              <Cell
                                key={row.supplier.id}
                                fill={
                                  row.isCheapest
                                    ? "#10b981"
                                    : row.supplier.color ||
                                      chartColors[index % chartColors.length]
                                }
                              />
                            ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <EmptyChart text={t("financial.noSupplierTotals")} />
              )}
            </article>

            <article className="surface-card min-w-0 overflow-hidden p-4 sm:p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                    {t("financial.costDistribution")}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    {t("financial.costDistributionHelp")}
                  </p>
                </div>
                <PieIcon className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
              </div>
              {analysis.optimizedTotal > 0 && analysis.distribution.length ? (
                <div className="grid min-w-0 gap-2 md:grid-cols-[minmax(210px,0.9fr)_minmax(0,1.1fr)]">
                  <div className="h-[290px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analysis.distribution}
                          dataKey="total"
                          nameKey="itemNumber"
                          cx="50%"
                          cy="50%"
                          outerRadius="78%"
                          minAngle={2}
                          paddingAngle={1}
                        >
                          {analysis.distribution.map((part, index) => (
                            <Cell
                              key={part.itemId}
                              fill={chartColors[index % chartColors.length]}
                              stroke="var(--bg-card)"
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={(props) => (
                            <PartTooltip
                              {...props}
                              money={money}
                              locale={locale}
                              t={t}
                            />
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="max-h-[290px] min-w-0 space-y-1 overflow-y-auto pr-1">
                    {analysis.distribution.map((part, index) => (
                      <div
                        key={part.itemId}
                        className="flex items-start justify-between gap-2 rounded-lg px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        title={part.description}
                      >
                        <div className="flex min-w-0 items-start gap-2">
                          <span
                            className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{
                              backgroundColor:
                                chartColors[index % chartColors.length],
                            }}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold">
                              {part.itemNumber}
                            </p>
                            <p className="truncate text-[11px] text-slate-500">
                              {part.description}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-semibold tabular-nums">
                            {money(part.total)}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {formatPercent(part.sharePercent / 100, locale)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyChart
                  text={
                    analysis.referenceCoveredItems
                      ? t("financial.zeroDistribution")
                      : t("financial.noPartTotals")
                  }
                />
              )}
              {analysis.uncoveredItems > 0 && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                  {t("financial.uncoveredParties", {
                    count: analysis.uncoveredItems,
                  })}
                </p>
              )}
            </article>
          </div>

          <article className="surface-card overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                {t("financial.supplierAnalysis")}
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                {t("financial.shareNote")}
              </p>
            </div>
            <div className="max-w-full overflow-x-auto">
              <table className="data-table w-full min-w-[980px] border-collapse text-left">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    {[
                      "supplier",
                      "lowestWins",
                      "ties",
                      "totalCost",
                      "difference",
                      "differencePercent",
                      "participation",
                      "itemsQuoted",
                    ].map((key) => (
                      <th key={key} className="px-3 py-3">
                        {t(`financial.columns.${key}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {analysis.suppliers.map((row) => (
                    <tr
                      key={row.supplier.id}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                row.supplier.color || chartColors[0],
                            }}
                          />
                          <span className="font-semibold">
                            {row.supplier.name}
                          </span>
                          {row.isCheapest && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                              {t("financial.lowestCost")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {row.lowestWins}
                      </td>
                      <td className="px-3 py-3 tabular-nums">{row.ties}</td>
                      <td className="px-3 py-3 font-semibold tabular-nums">
                        {money(row.total)}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {money(row.differenceAmount)}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {row.differencePercent === null
                          ? "—"
                          : formatPercent(row.differencePercent / 100, locale)}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {row.participationPercent === null
                          ? "—"
                          : formatPercent(
                              row.participationPercent / 100,
                              locale,
                            )}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {row.totalQuotes} / {analysis.selectedItemCount}
                      </td>
                    </tr>
                  ))}
                  {!analysis.suppliers.length && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-8 text-center text-sm text-slate-500"
                      >
                        {t("financial.emptySelection")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}
    </section>
  );
};

const FinanceCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "teal" | "blue" | "emerald" | "slate";
}> = ({ icon, label, value, detail, tone }) => {
  const toneClasses = {
    teal: "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    emerald:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
  return (
    <article className="surface-card min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClasses[tone]}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        {detail}
      </p>
    </article>
  );
};

const EmptyChart: React.FC<{ text: string }> = ({ text }) => (
  <div
    role="status"
    className="flex min-h-[230px] items-center justify-center rounded-xl border border-dashed border-slate-200 px-6 text-center text-xs text-slate-500 dark:border-slate-700"
  >
    {text}
  </div>
);

const SupplierTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload?: SupplierFinancialRow }>;
  money: (value: number | null) => string;
  t: (key: string) => string;
}> = ({ active, payload, money, t }) => {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-2 font-semibold text-slate-900 dark:text-slate-100">
        {row.supplier.name}
      </p>
      <dl className="space-y-1.5 text-slate-500">
        <div className="flex justify-between gap-5 border-t border-slate-100 pt-1.5 dark:border-slate-800">
          <dt>{t("financial.columns.totalCost")}</dt>
          <dd className="font-semibold text-slate-900 dark:text-slate-100">
            {money(row.total)}
          </dd>
        </div>
        <div className="flex justify-between gap-5">
          <dt>{t("financial.columns.itemsQuoted")}</dt>
          <dd>{row.totalQuotes}</dd>
        </div>
      </dl>
    </div>
  );
};

const PartTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload?: PartDistribution }>;
  money: (value: number | null) => string;
  locale: string;
  t: (key: string) => string;
}> = ({ active, payload, money, locale, t }) => {
  const part = payload?.[0]?.payload;
  if (!active || !part) return null;
  return (
    <div className="max-w-64 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <p className="font-semibold text-slate-900 dark:text-slate-100">
        {part.itemNumber} · {part.description}
      </p>
      <p className="mt-1 text-slate-500">
        {t("financial.partCost")}:{" "}
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {money(part.total)}
        </span>
      </p>
      <p className="text-slate-500">
        {t("financial.partShare")}:{" "}
        {formatPercent(part.sharePercent / 100, locale)}
      </p>
      <p className="mt-1 text-slate-400">{part.supplierName}</p>
    </div>
  );
};
