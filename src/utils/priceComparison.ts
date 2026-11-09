import type { ProjectBudgetItem } from "../../electron/preload/types";

export interface ComparisonSupplier {
  id: string;
  name: string;
  color?: string | null;
}
export interface QuoteComparison {
  quote: ProjectBudgetItem["quotes"][number] | null;
  unitPrice: number | null;
  totalPrice: number | null;
  isLowest: boolean;
  tied: boolean;
}
export interface ItemComparison {
  item: ProjectBudgetItem;
  quotes: Record<string, QuoteComparison>;
  lowest: number | null;
  highest: number | null;
  spread: number | null;
  spreadPercent: number | null;
  lowestSupplierIds: string[];
  savings: number;
}
export interface SupplierComparison {
  supplier: ComparisonSupplier;
  quotedTotal: number;
  itemsQuoted: number;
  lowestWins: number;
  ties: number;
  differenceFromCheapest: number | null;
}
export interface PriceComparison {
  items: ItemComparison[];
  suppliers: SupplierComparison[];
  quotedTotals: { supplierId: string; supplierName: string; total: number }[];
  cheapestQuotedSupplierId: string | null;
  cheapestQuotedTotal: number | null;
  mostExpensiveQuotedTotal: number | null;
  potentialSavings: number;
  savingsPercent: number | null;
  itemsWithoutQuotes: number;
  itemsWithMissingQuotes: number;
  wins: { supplierId: string; supplierName: string; count: number }[];
  distribution: { supplierId: string; supplierName: string; count: number }[];
}

/** Compare only real unit prices. Legacy/imported quotes with a missing unit price are excluded. */
export function calculatePriceComparison(
  items: ProjectBudgetItem[],
  suppliers: ComparisonSupplier[],
): PriceComparison {
  const supplierIds = new Set(suppliers.map((supplier) => supplier.id));
  const itemComparisons: ItemComparison[] = items.map((item) => {
    const quoteBySupplier = new Map(
      item.quotes
        .filter((quote) => supplierIds.has(quote.supplierId))
        .map((quote) => [quote.supplierId, quote]),
    );
    const validPrices = [...quoteBySupplier.values()]
      .filter(
        (quote) => !(quote.notes || "").toLowerCase().includes("unit price"),
      )
      .map((quote) => quote.unitPrice)
      .filter(Number.isFinite);
    const lowest = validPrices.length ? Math.min(...validPrices) : null;
    const highest = validPrices.length ? Math.max(...validPrices) : null;
    const lowestSupplierIds =
      lowest === null
        ? []
        : [...quoteBySupplier.entries()]
            .filter(
              ([id, quote]) =>
                supplierIds.has(id) &&
                !(quote.notes || "").toLowerCase().includes("unit price") &&
                quote.unitPrice === lowest,
            )
            .map(([id]) => id);
    const quotes: ItemComparison["quotes"] = {};
    for (const supplier of suppliers) {
      const quote = quoteBySupplier.get(supplier.id) || null;
      const unitPrice =
        quote && !(quote.notes || "").toLowerCase().includes("unit price")
          ? quote.unitPrice
          : null;
      const totalPrice =
        quote && !(quote.notes || "").toLowerCase().includes("total price")
          ? quote.totalPrice
          : null;
      quotes[supplier.id] = {
        quote,
        unitPrice,
        totalPrice,
        isLowest: unitPrice !== null && lowest !== null && unitPrice === lowest,
        tied:
          unitPrice !== null &&
          unitPrice === lowest &&
          lowestSupplierIds.length > 1,
      };
    }
    const spread =
      lowest === null || highest === null ? null : highest - lowest;
    return {
      item,
      quotes,
      lowest,
      highest,
      spread,
      spreadPercent: lowest && spread !== null ? spread / lowest : null,
      lowestSupplierIds,
      savings: spread === null ? 0 : spread * item.quantity,
    };
  });
  const supplierStats = suppliers.map((supplier) => {
    const quoted = itemComparisons
      .map((entry) => entry.quotes[supplier.id])
      .filter((entry) => entry?.quote && entry.totalPrice !== null);
    const quotedTotal = quoted.reduce(
      (sum, entry) => sum + (entry.totalPrice ?? 0),
      0,
    );
    const itemsQuoted = itemComparisons.filter(
      (entry) =>
        entry.quotes[supplier.id]?.unitPrice !== null &&
        entry.quotes[supplier.id]?.unitPrice !== undefined &&
        entry.quotes[supplier.id]?.totalPrice !== null &&
        entry.quotes[supplier.id]?.totalPrice !== undefined,
    ).length;
    return {
      supplier,
      quotedTotal,
      itemsQuoted,
      lowestWins: itemComparisons.filter(
        (entry) =>
          entry.lowestSupplierIds.length === 1 &&
          entry.lowestSupplierIds[0] === supplier.id,
      ).length,
      ties: itemComparisons.filter(
        (entry) =>
          entry.lowestSupplierIds.length > 1 &&
          entry.lowestSupplierIds.includes(supplier.id),
      ).length,
      differenceFromCheapest: null as number | null,
    };
  });
  const withQuotes = supplierStats.filter((stat) => stat.itemsQuoted > 0);
  const comparableCoverage =
    itemComparisons.length > 0 &&
    supplierStats.length > 0 &&
    supplierStats.every((stat) => stat.itemsQuoted === itemComparisons.length);
  const cheapest =
    comparableCoverage && withQuotes.length
      ? Math.min(...withQuotes.map((stat) => stat.quotedTotal))
      : null;
  const mostExpensive =
    comparableCoverage && withQuotes.length
      ? Math.max(...withQuotes.map((stat) => stat.quotedTotal))
      : null;
  const suppliersResult = supplierStats.map((stat) => ({
    ...stat,
    differenceFromCheapest:
      cheapest === null ? null : stat.quotedTotal - cheapest,
  }));
  const totalPotentialSavings = itemComparisons.reduce(
    (sum, entry) => sum + entry.savings,
    0,
  );
  const maxAvailableCost = itemComparisons.reduce(
    (sum, entry) => sum + (entry.highest ?? 0) * entry.item.quantity,
    0,
  );
  const wins = suppliers.map((supplier) => ({
    supplierId: supplier.id,
    supplierName: supplier.name,
    count: itemComparisons.filter(
      (entry) =>
        entry.lowestSupplierIds.length === 1 &&
        entry.lowestSupplierIds[0] === supplier.id,
    ).length,
  }));
  const distribution = suppliers.map((supplier) => ({
    supplierId: supplier.id,
    supplierName: supplier.name,
    count: itemComparisons.filter(
      (entry) =>
        entry.quotes[supplier.id]?.quote !== null &&
        entry.quotes[supplier.id]?.quote !== undefined,
    ).length,
  }));
  return {
    items: itemComparisons,
    suppliers: suppliersResult,
    quotedTotals: suppliersResult.map(({ supplier, quotedTotal }) => ({
      supplierId: supplier.id,
      supplierName: supplier.name,
      total: quotedTotal,
    })),
    cheapestQuotedSupplierId:
      cheapest === null
        ? null
        : (withQuotes.find((stat) => stat.quotedTotal === cheapest)?.supplier
            .id ?? null),
    cheapestQuotedTotal: cheapest,
    mostExpensiveQuotedTotal: mostExpensive,
    potentialSavings: totalPotentialSavings,
    savingsPercent:
      maxAvailableCost > 0 ? totalPotentialSavings / maxAvailableCost : null,
    itemsWithoutQuotes: itemComparisons.filter((entry) => entry.lowest === null)
      .length,
    itemsWithMissingQuotes: itemComparisons.filter(
      (entry) =>
        entry.quotes &&
        suppliers.some(
          (supplier) => entry.quotes[supplier.id]?.unitPrice === null,
        ),
    ).length,
    wins,
    distribution,
  };
}
