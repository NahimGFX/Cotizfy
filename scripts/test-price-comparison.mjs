import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "cotizfy-compare-"));
try {
  const bundle = path.join(temp, "comparison.cjs");
  require("esbuild").buildSync({
    entryPoints: [path.join(root, "src/utils/priceComparison.ts")],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: bundle,
  });
  const { calculatePriceComparison } = require(bundle);
  const financialBundle = path.join(temp, "financial-analysis.cjs");
  require("esbuild").buildSync({
    entryPoints: [path.join(root, "src/utils/financialAnalysis.ts")],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: financialBundle,
  });
  const { calculateFinancialAnalysis } = require(financialBundle);
  const suppliers = [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
    { id: "c", name: "C" },
  ];
  const item = (id, quantity, quotes) => ({
    id,
    itemNumber: id,
    description: id,
    quantity,
    unit: "u",
    quotes,
  });
  const quote = (supplierId, unitPrice, totalPrice, notes = null) => ({
    id: `${supplierId}-q`,
    supplierId,
    supplierName: supplierId,
    unitPrice,
    totalPrice,
    notes,
  });
  const result = calculatePriceComparison(
    [
      item("one", 2, [
        quote("a", 1.25, 2.5),
        quote("b", 2, 4),
        quote("c", 3, 6),
      ]),
      item("tie", 1, [quote("a", 5, 5), quote("b", 5, 5), quote("c", 7, 7)]),
      item("partial", 3, [
        quote("a", 2, 6),
        quote("c", null, 0, "Empty unit price in imported workbook."),
      ]),
      item("empty", 4, []),
    ],
    suppliers,
  );
  assert.equal(result.items[0].lowest, 1.25);
  assert.equal(result.items[0].savings, 3.5);
  assert.deepEqual(result.items[1].lowestSupplierIds, ["a", "b"]);
  assert.equal(result.items[1].quotes.a.tied, true);
  assert.equal(result.items[2].quotes.b.unitPrice, null);
  assert.equal(result.itemsWithoutQuotes, 1);
  assert.equal(result.itemsWithMissingQuotes, 2);
  assert.equal(result.suppliers[0].quotedTotal, 13.5);
  assert.equal(
    result.cheapestQuotedTotal,
    null,
    "partial coverage must not be ranked by total",
  );
  assert.equal(result.savingsPercent !== null, true);

  const financialItems = [
    item("one", 2, [quote("a", 1.25, 2.5), quote("b", 2, 4), quote("c", 3, 6)]),
    item("tie", 1, [quote("a", 5, 5), quote("b", 5, 5), quote("c", 7, 7)]),
    item("partial", 3, [
      quote("a", 2, 6),
      quote("c", null, 0, "Empty unit price in imported workbook."),
    ]),
    item("empty", 4, []),
  ];
  const allSupplierIds = suppliers.map((supplier) => supplier.id);
  const allItemIds = financialItems.map((entry) => entry.id);
  const allSelected = calculateFinancialAnalysis(
    financialItems,
    suppliers,
    allSupplierIds,
    allItemIds,
    15,
  );
  assert.equal(allSelected.selectedSupplierCount, 3);
  assert.equal(allSelected.selectedItemCount, 4);
  assert.equal(allSelected.referenceSubtotal, 7.5);
  assert.equal(allSelected.referenceVat, 1.125);
  assert.equal(allSelected.referenceTotal, 8.625);
  assert.equal(allSelected.potentialSavings, 11.5);
  assert.equal(allSelected.potentialSavingsPercent, (11.5 / 19) * 100);
  assert.equal(allSelected.lowestSupplierTotal, null);
  assert.equal(allSelected.highestSupplierTotal, null);
  assert.equal(allSelected.uncoveredItems, 1);
  assert.equal(allSelected.coverageIncomplete, true);
  assert.equal(allSelected.suppliers[0].subtotal, 13.5);
  assert.equal(allSelected.suppliers[0].total, 15.525);
  assert.equal(allSelected.suppliers[0].differenceAmount, null);
  assert.equal(allSelected.suppliers[0].differencePercent, null);
  assert.equal(allSelected.suppliers[0].participationPercent > 0, true);
  assert.equal(allSelected.distribution.length, 3);

  const twoSuppliersTwoItems = calculateFinancialAnalysis(
    financialItems,
    suppliers,
    ["a", "b"],
    ["one", "tie"],
    15,
  );
  assert.equal(twoSuppliersTwoItems.referenceSubtotal, 7.5);
  assert.equal(twoSuppliersTwoItems.referenceVat, 1.125);
  assert.equal(twoSuppliersTwoItems.referenceTotal, 8.625);
  assert.equal(twoSuppliersTwoItems.suppliers[0].total, 8.625);
  assert.equal(twoSuppliersTwoItems.suppliers[1].total, 10.35);
  assert.ok(
    Math.abs(twoSuppliersTwoItems.suppliers[1].differenceAmount - 1.725) <
      1e-10,
  );
  assert.ok(
    Math.abs(twoSuppliersTwoItems.suppliers[1].differencePercent - 20) < 1e-10,
  );
  assert.ok(
    Math.abs(twoSuppliersTwoItems.distribution[0].sharePercent - 100 / 3) <
      1e-10,
  );

  const oneSupplierAndItem = calculateFinancialAnalysis(
    financialItems,
    suppliers,
    ["a"],
    ["partial"],
    12,
  );
  assert.equal(oneSupplierAndItem.referenceSubtotal, 6);
  assert.equal(oneSupplierAndItem.referenceVat, 0.72);
  assert.equal(oneSupplierAndItem.referenceTotal, 6.72);
  assert.equal(oneSupplierAndItem.suppliers[0].itemsQuoted, 1);

  const noVat = calculateFinancialAnalysis(
    financialItems,
    suppliers,
    ["a"],
    ["one"],
    0,
  );
  assert.equal(noVat.referenceTotal, noVat.referenceSubtotal);
  assert.throws(
    () =>
      calculateFinancialAnalysis(financialItems, suppliers, ["a"], ["one"], -1),
    /VAT percentage/,
  );
  assert.throws(
    () =>
      calculateFinancialAnalysis(
        financialItems,
        suppliers,
        ["a"],
        ["one"],
        101,
      ),
    /VAT percentage/,
  );
  const noQuotes = calculatePriceComparison([item("none", 1, [])], suppliers);
  assert.equal(noQuotes.potentialSavings, 0);
  assert.equal(noQuotes.savingsPercent, null);
  assert.equal(noQuotes.cheapestQuotedTotal, null);
  const zero = calculatePriceComparison(
    [item("zero", 1, [quote("a", 0, 0), quote("b", 0, 0)])],
    suppliers.slice(0, 2),
  );
  assert.equal(zero.savingsPercent, null);
  const zeroFinancial = calculateFinancialAnalysis(
    [item("zero", 1, [quote("a", 0, 0), quote("b", 0, 0)])],
    suppliers.slice(0, 2),
    ["a", "b"],
    ["zero"],
    15,
  );
  assert.equal(zeroFinancial.referenceTotal, 0);
  assert.equal(zeroFinancial.suppliers[0].differenceAmount, 0);
  assert.equal(zeroFinancial.suppliers[0].differencePercent, null);
  assert.equal(zeroFinancial.suppliers[0].participationPercent, null);
  assert.equal(zeroFinancial.distribution[0].sharePercent, 0);
  console.log(
    "Price comparison tests passed: supplier/item filters, VAT, savings, equal and unequal coverage, differing and tied prices, missing quotes, decimals, no quotes, and zero division.",
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
