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
  subtotal: number | null;
  vat: number | null;
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
  vatPercent: number;
  referenceSubtotal: number;
  referenceVat: number;
  referenceTotal: number;
  potentialSavings: number;
  potentialSavingsPercent: number | null;
  lowestSupplierTotal: number | null;
  highestSupplierTotal: number | null;
  referenceCoveredItems: number;
  uncoveredItems: number;
  distribution: PartDistribution[];
  suppliers: SupplierFinancialRow[];
  coverageIncomplete: boolean;
}

/**
 * Recalculates the financial dashboard from stored quote values. The reference
 * distribution uses the lowest available total per item when several suppliers
 * are selected; it never synthesizes a missing quote.
 */
export function calculateFinancialAnalysis(
  items: ProjectBudgetItem[],
  suppliers: ComparisonSupplier[],
  selectedSupplierIds: string[],
  selectedItemIds: string[],
  vatPercent: number,
): FinancialAnalysis {
  if (!Number.isFinite(vatPercent) || vatPercent < 0 || vatPercent > 100)
    throw new RangeError("VAT percentage must be between 0 and 100.");

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
    if (!available.length) return null;
    if (filteredSuppliers.length === 1) return available[0];
    return available.reduce((lowest, candidate) =>
      candidate.total < lowest.total ? candidate : lowest,
    );
  });

  const referenceSubtotal = partValues.reduce(
    (sum, value) => sum + (value?.total ?? 0),
    0,
  );
  const referenceVat = referenceSubtotal * (vatPercent / 100);
  const referenceTotal = referenceSubtotal + referenceVat;
  const referenceCoveredItems = partValues.filter(Boolean).length;
  const maximumAvailableTotal = comparison.items.reduce((sum, entry) => {
    const totals = filteredSuppliers
      .map((supplier) => entry.quotes[supplier.id]?.totalPrice ?? null)
      .filter(
        (total): total is number => total !== null && Number.isFinite(total),
      );
    return sum + (totals.length ? Math.max(...totals) : 0);
  }, 0);
  const potentialSavings = maximumAvailableTotal - referenceSubtotal;
  const distribution = comparison.items.flatMap((entry, index) => {
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
          referenceSubtotal > 0 ? (value.total / referenceSubtotal) * 100 : 0,
      },
    ];
  });

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
      const subtotal = totalQuotes > 0 ? stat.quotedTotal : null;
      const vat = subtotal === null ? null : subtotal * (vatPercent / 100);
      return {
        supplier: stat.supplier,
        subtotal,
        vat,
        total: subtotal === null ? null : subtotal + (vat ?? 0),
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
      } satisfies SupplierFinancialRow;
    },
  );

  const comparable = supplierRows.filter(
    (row): row is SupplierFinancialRow & { total: number } =>
      row.total !== null,
  );
  const coverageBySupplier = comparison.suppliers
    .filter((stat) =>
      supplierRows.some(
        (row) => row.supplier.id === stat.supplier.id && row.total !== null,
      ),
    )
    .map((stat) =>
      comparison.items.map(
        (entry) => entry.quotes[stat.supplier.id]?.totalPrice !== null,
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
  const supplierTotalsSum = comparable.reduce((sum, row) => sum + row.total, 0);
  const highestTotal =
    lowestTotal === null
      ? null
      : Math.max(...comparable.map((row) => row.total as number));
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
    vatPercent,
    referenceSubtotal,
    referenceVat,
    referenceTotal,
    potentialSavings,
    potentialSavingsPercent:
      maximumAvailableTotal > 0
        ? (potentialSavings / maximumAvailableTotal) * 100
        : null,
    lowestSupplierTotal: lowestTotal,
    highestSupplierTotal: highestTotal,
    referenceCoveredItems,
    uncoveredItems: filteredItems.length - referenceCoveredItems,
    distribution,
    suppliers: financialSuppliers,
    coverageIncomplete: financialSuppliers.some(
      (row) => row.totalQuotes < filteredItems.length,
    ),
  };
}
