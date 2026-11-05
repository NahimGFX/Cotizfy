import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const xlsx = require("xlsx");
const { PrismaClient } = require("@prisma/client");
const { buildSync } = require("esbuild");
const temporaryRoot = path.join(root, "work");
fs.mkdirSync(temporaryRoot, { recursive: true });
const isolatedDirectory = fs.mkdtempSync(
  path.join(temporaryRoot, "cotizfy-excel-"),
);
const databaseFile = path.join(isolatedDirectory, "integration.db");
let prisma;

try {
  const parserBundle = path.join(isolatedDirectory, "excel.cjs");
  const importerBundle = path.join(isolatedDirectory, "importer.cjs");
  buildSync({
    entryPoints: [path.join(root, "electron/main/excel.ts")],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: parserBundle,
  });
  buildSync({
    entryPoints: [path.join(root, "electron/main/importer.ts")],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: importerBundle,
  });
  const { parseExcelMatrix } = require(parserBundle);
  const { importExcelRows } = require(importerBundle);

  const matrix = [
    [
      "ITEM",
      "DESCRIPCION",
      "CANTIDAD",
      "UNIDAD",
      "PRECIO UNITARIO_1",
      "PRECIO TOTAL_1",
      "PRECIO UNITARIO_2",
      "PRECIO TOTAL_2",
    ],
    ["A-1", "Cable", 5, "m", 2.5, 12.5, 3, 15],
    ["A-1", "Cable adicional", 3, "m", 4, 14, "", ""],
  ];
  let parsed;
  for (const bookType of ["xlsx", "xls"]) {
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(
      workbook,
      xlsx.utils.aoa_to_sheet(matrix),
      "Matrix",
    );
    parsed = parseExcelMatrix(
      xlsx.write(workbook, { type: "buffer", bookType }),
      "en",
    );
    assert.equal(parsed.rows.length, 2);
    assert.ok(
      parsed.warnings.some((message) => message.includes("Duplicate ITEM")),
    );
    assert.ok(
      parsed.warnings.some((message) =>
        message.includes("differs from quantity"),
      ),
    );
    assert.equal(parsed.rows[1].quotes[1].unitPrice, null);
  }
  const spanishWorkbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(
    spanishWorkbook,
    xlsx.utils.aoa_to_sheet([
      matrix[0],
      ["BAD", "Invalid", "", "ea", "", "", "", ""],
    ]),
    "Spanish",
  );
  assert.ok(
    parseExcelMatrix(
      xlsx.write(spanishWorkbook, { type: "buffer", bookType: "xlsx" }),
      "es",
    ).errors.some((message) => message.startsWith("Fila")),
  );

  const invalidBook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(
    invalidBook,
    xlsx.utils.aoa_to_sheet([
      matrix[0],
      ["BAD", "Invalid", "not-a-number", "ea", -1, 0, "text", 0],
    ]),
    "Invalid",
  );
  const invalidPreview = parseExcelMatrix(
    xlsx.write(invalidBook, { type: "buffer", bookType: "xlsx" }),
    "en",
  );
  assert.ok(
    invalidPreview.errors.some((message) => message.includes("quantity")),
  );
  assert.ok(
    invalidPreview.errors.some((message) => message.includes("unit price")),
  );
  assert.equal(invalidPreview.rows.length, 0);

  const missingBook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(
    missingBook,
    xlsx.utils.aoa_to_sheet([
      ["ITEM", "CANTIDAD"],
      ["1", 1],
    ]),
    "Missing",
  );
  assert.ok(
    parseExcelMatrix(
      xlsx.write(missingBook, { type: "buffer", bookType: "xlsx" }),
      "en",
    ).errors[0].includes("Missing required columns"),
  );

  const sqlite = new DatabaseSync(databaseFile);
  sqlite.exec(
    fs.readFileSync(
      path.join(root, "prisma/migrations/20261102000000_init/migration.sql"),
      "utf8",
    ),
  );
  sqlite.exec(
    fs.readFileSync(
      path.join(
        root,
        "prisma/migrations/20261102010000_supplier_many_to_many/migration.sql",
      ),
      "utf8",
    ),
  );
  assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
  sqlite.close();

  const relativeDatabase = path
    .relative(path.join(root, "prisma"), databaseFile)
    .replace(/\\/g, "/");
  const databaseUrl = `file:${relativeDatabase}`;
  prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const project = await prisma.project.create({
    data: { name: "Isolated Excel integration" },
  });
  const firstSupplier = await prisma.supplier.create({
    data: { name: "Supplier 1" },
  });
  const secondSupplier = await prisma.supplier.create({
    data: { name: "Supplier 2" },
  });
  const unlinkedSupplier = await prisma.supplier.create({
    data: { name: "Unlinked supplier" },
  });
  await prisma.projectSupplier.createMany({
    data: [
      { projectId: project.id, supplierId: firstSupplier.id },
      { projectId: project.id, supplierId: secondSupplier.id },
    ],
  });

  assert.equal(
    await importExcelRows(prisma, project.id, parsed.rows, [
      firstSupplier.id,
      secondSupplier.id,
    ]),
    2,
  );
  assert.equal(
    await prisma.budgetItem.count({ where: { projectId: project.id } }),
    2,
  );
  await prisma.$disconnect();
  prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  const stored = await prisma.budgetItem.findMany({
    where: { projectId: project.id },
    orderBy: { orderIndex: "asc" },
    include: { project: true, quotes: { include: { supplier: true } } },
  });
  assert.equal(stored.length, 2);
  assert.equal(stored[0].project.id, project.id);
  assert.deepEqual(
    stored[0].quotes
      .map((quote) => [quote.supplier.id, quote.unitPrice, quote.totalPrice])
      .sort((a, b) => a[0].localeCompare(b[0])),
    [
      [firstSupplier.id, 2.5, 12.5],
      [secondSupplier.id, 3, 15],
    ].sort((a, b) => a[0].localeCompare(b[0])),
  );
  assert.equal(stored[1].quotes.length, 1);
  assert.equal(stored[1].quotes[0].supplier.id, firstSupplier.id);
  assert.equal(stored[1].quotes[0].unitPrice, 4);
  assert.equal(stored[1].quotes[0].totalPrice, 14);

  const initialCount = await prisma.budgetItem.count({
    where: { projectId: project.id },
  });
  await assert.rejects(
    () =>
      importExcelRows(prisma, project.id, parsed.rows, [
        firstSupplier.id,
        unlinkedSupplier.id,
      ]),
    /Both suppliers must be associated/,
  );
  assert.equal(
    await prisma.budgetItem.count({ where: { projectId: project.id } }),
    initialCount,
  );
  const invalidSecondRow = {
    ...parsed.rows[1],
    quotes: [
      { unitPrice: -1, totalPrice: 1 },
      { unitPrice: null, totalPrice: null },
    ],
  };
  await assert.rejects(
    () =>
      importExcelRows(
        prisma,
        project.id,
        [parsed.rows[0], invalidSecondRow],
        [firstSupplier.id, secondSupplier.id],
      ),
    /Invalid quote/,
  );
  assert.equal(
    await prisma.budgetItem.count({ where: { projectId: project.id } }),
    initialCount,
  );
  assert.equal(
    await prisma.itemQuote.count({
      where: { budgetItem: { projectId: project.id } },
    }),
    3,
  );

  console.log(
    "Excel import integration passed: XLSX/XLS parsing; validation and warnings; applied migrations; project/supplier links; quote values and mapping; SQLite reopen; unlinked supplier rejection; transaction rollback.",
  );
} finally {
  await prisma?.$disconnect().catch(() => {});
  fs.rmSync(isolatedDirectory, { recursive: true, force: true });
}
