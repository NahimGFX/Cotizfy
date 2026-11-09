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
  const noQuotes = calculatePriceComparison([item("none", 1, [])], suppliers);
  assert.equal(noQuotes.potentialSavings, 0);
  assert.equal(noQuotes.savingsPercent, null);
  assert.equal(noQuotes.cheapestQuotedTotal, null);
  const zero = calculatePriceComparison(
    [item("zero", 1, [quote("a", 0, 0), quote("b", 0, 0)])],
    suppliers.slice(0, 2),
  );
  assert.equal(zero.savingsPercent, null);
  console.log(
    "Price comparison tests passed: differing and tied prices, three suppliers, missing quotes, partial coverage, totals, decimals, no quotes, and zero division.",
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
