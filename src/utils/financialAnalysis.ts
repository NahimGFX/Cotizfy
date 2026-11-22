import type { ProjectBudgetItem } from "../../electron/preload/types";
import {
  calculatePriceComparison,
  type ComparisonSupplier,
  type PriceComparison,
} from "./priceComparison";

export interface PartDistribution {
  itemId: string;
  itemNumber: string;
  description: string;
  total: number;
  supplierId: string;
  supplierName: string;
  sharePercent: number;
}

export interface SupplierFinancialRow {
  supplier: ComparisonSupplier;
  total: number | null;
  totalQuotes: number;
  itemsQuoted: number;
  lowestWins: number;
  ties: number;
  coveragePercent: number | null;
  differenceAmount: number | null;
  differencePercent: number | null;
  participationPercent: number | null;
  isCheapest: boolean;
}

export interface FinancialAnalysis {
  comparison: PriceComparison;
  selectedItemCount: number;
  selectedSupplierCount: number;
  optimizedTotal: number;
  lowestSupplierTotal: number | null;
  highestSupplierTotal: number | null;
  lowestSupplierNames: string[];
  highestSupplierNames: string[];
  referenceCoveredItems: number;
  uncoveredItems: number;
  distribution: PartDistribution[];
  suppliers: SupplierFinancialRow[];
  coverageIncomplete: boolean;
}

/** Rebuilds filtered financial summaries from stored quote totals. */
export function calculateFinancialAnalysis(
  items: ProjectBudgetItem[],
  suppliers: ComparisonSupplier[],
  selectedSupplierIds: string[],
  selectedItemIds: string[],
): FinancialAnalysis {
  const selectedSupplierSet = new Set(selectedSupplierIds);
  const selectedItemSet = new Set(selectedItemIds);
  const filteredSuppliers = suppliers.filter((supplier) =>
    selectedSupplierSet.has(supplier.id),
  );
  const filteredItems = items.filter((item) => selectedItemSet.has(item.id));
  const comparison = calculatePriceComparison(filteredItems, filteredSuppliers);

  const partValues = comparison.items.map((entry) => {
    const available = filteredSuppliers
      .map((supplier) => ({
        supplier,
        total: entry.quotes[supplier.id]?.totalPrice ?? null,
      }))
      .filter(
        (
          candidate,
        ): candidate is { supplier: ComparisonSupplier; total: number } =>
          candidate.total !== null && Number.isFinite(candidate.total),
      );
    return available.length
      ? available.reduce((lowest, candidate) =>
          candidate.total < lowest.total ? candidate : lowest,
        )
      : null;
  });

  const optimizedTotal = partValues.reduce(
    (sum, value) => sum + (value?.total ?? 0),
    0,
  );
  const referenceCoveredItems = partValues.filter(Boolean).length;
  const distribution = comparison.items
    .flatMap((entry, index) => {
      const value = partValues[index];
      if (!value) return [];
      return [
        {
          itemId: entry.item.id,
          itemNumber: entry.item.itemNumber,
          description: entry.item.description,
          total: value.total,
          supplierId: value.supplier.id,
          supplierName: value.supplier.name,
          sharePercent:
            optimizedTotal > 0 ? (value.total / optimizedTotal) * 100 : 0,
        },
      ];
    })
    .sort(
      (a, b) =>
        b.total - a.total ||
        a.itemNumber.localeCompare(b.itemNumber, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
    );

  const supplierRows: SupplierFinancialRow[] = comparison.suppliers.map(
    (stat) => {
      const quoteRows = comparison.items.map(
        (entry) => entry.quotes[stat.supplier.id],
      );
      const totalQuotes = quoteRows.filter(
        (quote) =>
          quote?.quote !== null &&
          quote?.quote !== undefined &&
          quote.totalPrice !== null,
      ).length;
      return {
        supplier: stat.supplier,
        total: totalQuotes > 0 ? stat.quotedTotal : null,
        totalQuotes,
        itemsQuoted: stat.itemsQuoted,
        lowestWins: stat.lowestWins,
        ties: stat.ties,
        coveragePercent:
          filteredItems.length > 0
            ? (totalQuotes / filteredItems.length) * 100
            : null,
        differenceAmount: null,
        differencePercent: null,
        participationPercent: null,
        isCheapest: false,
      };
    },
  );

  const comparable = supplierRows.filter(
    (row): row is SupplierFinancialRow & { total: number } =>
      row.total !== null,
  );
  const coverageBySupplier = comparable.map((row) =>
    comparison.items.map(
      (entry) => entry.quotes[row.supplier.id]?.totalPrice != null,
    ),
  );
  const hasComparableCoverage =
    coverageBySupplier.length > 0 &&
    coverageBySupplier.every((coverage) =>
      coverage.every(
        (quoted, index) => quoted === coverageBySupplier[0][index],
      ),
    );
  const lowestTotal =
    comparable.length && hasComparableCoverage
      ? Math.min(...comparable.map((row) => row.total))
      : null;
  const highestTotal =
    lowestTotal === null
      ? null
      : Math.max(...comparable.map((row) => row.total as number));
  const supplierTotalsSum = comparable.reduce((sum, row) => sum + row.total, 0);
  const financialSuppliers = supplierRows.map((row) => ({
    ...row,
    differenceAmount:
      row.total === null || lowestTotal === null
        ? null
        : row.total - lowestTotal,
    differencePercent:
      row.total === null || lowestTotal === null || lowestTotal === 0
        ? null
        : ((row.total - lowestTotal) / lowestTotal) * 100,
    participationPercent:
      row.total === null || supplierTotalsSum === 0
        ? null
        : (row.total / supplierTotalsSum) * 100,
    isCheapest:
      row.total !== null && lowestTotal !== null && row.total === lowestTotal,
  }));

  return {
    comparison,
    selectedItemCount: filteredItems.length,
    selectedSupplierCount: filteredSuppliers.length,
    optimizedTotal,
    lowestSupplierTotal: lowestTotal,
    highestSupplierTotal: highestTotal,
    lowestSupplierNames:
      lowestTotal === null
        ? []
        : comparable
            .filter((row) => row.total === lowestTotal)
            .map((row) => row.supplier.name),
    highestSupplierNames:
      highestTotal === null
        ? []
        : comparable
            .filter((row) => row.total === highestTotal)
            .map((row) => row.supplier.name),
    referenceCoveredItems,
    uncoveredItems: filteredItems.length - referenceCoveredItems,
    distribution,
    suppliers: financialSuppliers,
    coverageIncomplete: financialSuppliers.some(
      (row) => row.totalQuotes < filteredItems.length,
    ),
  };
}
