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

  const dynamicWorkbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(
    dynamicWorkbook,
    xlsx.utils.aoa_to_sheet([
      [...matrix[0], "PRECIO UNITARIO_5", "PRECIO TOTAL_5"],
      ["D-1", "Partida dinámica", 2, "u", 4.5, 9, 5, 10, 6, 12],
    ]),
    "Dynamic",
  );
  const dynamicParsed = parseExcelMatrix(
    xlsx.write(dynamicWorkbook, { type: "buffer", bookType: "xlsx" }),
    "es",
  );
  assert.deepEqual(dynamicParsed.groups, ["1", "2", "5"]);
  assert.equal(dynamicParsed.rows[0].quotes.length, 3);
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
  const thirdSupplier = await prisma.supplier.create({
    data: { name: "Supplier 3" },
  });
  await prisma.projectSupplier.createMany({
    data: [
      { projectId: project.id, supplierId: firstSupplier.id },
      { projectId: project.id, supplierId: secondSupplier.id },
    ],
  });
  await prisma.projectSupplier.create({
    data: { projectId: project.id, supplierId: thirdSupplier.id },
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
    /All suppliers must be associated/,
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

  const dynamicProject = await prisma.project.create({
    data: { name: "Dynamic supplier integration" },
  });
  const dynamicSuppliers = await Promise.all(
    [1, 2, 3].map((n) =>
      prisma.supplier.create({ data: { name: `Dynamic ${n}` } }),
    ),
  );
  await prisma.projectSupplier.createMany({
    data: dynamicSuppliers.map((supplier, orderIndex) => ({
      projectId: dynamicProject.id,
      supplierId: supplier.id,
      orderIndex,
    })),
  });
  assert.equal(
    await importExcelRows(
      prisma,
      dynamicProject.id,
      dynamicParsed.rows,
      dynamicSuppliers.map((supplier) => supplier.id),
    ),
    1,
  );
  const dynamicStored = await prisma.budgetItem.findFirst({
    where: { projectId: dynamicProject.id },
    include: { quotes: { orderBy: { supplierId: "asc" } } },
  });
  assert.equal(dynamicStored.quotes.length, 3);
  assert.deepEqual(
    dynamicStored.quotes.map((quote) => quote.totalPrice).sort((a, b) => a - b),
    [9, 10, 12],
  );

  const editProject = await prisma.project.create({
    data: { name: "Matrix CRUD integration" },
  });
  const editSupplier = await prisma.supplier.create({
    data: { name: "CRUD supplier" },
  });
  await prisma.projectSupplier.create({
    data: { projectId: editProject.id, supplierId: editSupplier.id },
  });
  let editItem = await prisma.budgetItem.create({
    data: {
      projectId: editProject.id,
      itemNumber: "M-1",
      description: "Original",
      quantity: 2.5,
      unit: "m",
    },
  });
  editItem = await prisma.budgetItem.update({
    where: { id: editItem.id },
    data: {
      itemNumber: "M-1",
      description: "Edited",
      quantity: 3.5,
      unit: "kg",
    },
  });
  assert.equal(editItem.description, "Edited");
  assert.equal(editItem.quantity, 3.5);
  let editQuote = await prisma.itemQuote.create({
    data: {
      itemId: editItem.id,
      supplierId: editSupplier.id,
      unitPrice: 1.25,
      totalPrice: 4.375,
    },
  });
  editQuote = await prisma.itemQuote.update({
    where: { id: editQuote.id },
    data: { unitPrice: 2, totalPrice: 7 },
  });
  assert.equal(editQuote.totalPrice, 7);
  await prisma.itemQuote.delete({ where: { id: editQuote.id } });
  assert.equal(
    await prisma.itemQuote.count({ where: { itemId: editItem.id } }),
    0,
  );
  await prisma.itemQuote.create({
    data: {
      itemId: editItem.id,
      supplierId: editSupplier.id,
      unitPrice: 2,
      totalPrice: 7,
    },
  });
  await prisma.budgetItem.delete({ where: { id: editItem.id } });
  assert.equal(
    await prisma.itemQuote.count({ where: { itemId: editItem.id } }),
    0,
    "deleting an item cascades its quotes",
  );

  const retainedSupplier = await prisma.supplier.create({
    data: { name: "Supplier retained after project deletion" },
  });
  const retainedProject = await prisma.project.create({
    data: { name: "Project to delete" },
  });
  await prisma.projectSupplier.create({
    data: { projectId: retainedProject.id, supplierId: retainedSupplier.id },
  });
  const retainedItem = await prisma.budgetItem.create({
    data: {
      projectId: retainedProject.id,
      itemNumber: "D-1",
      description: "Delete with project",
      quantity: 1,
      unit: "u",
    },
  });
  await prisma.itemQuote.create({
    data: {
      itemId: retainedItem.id,
      supplierId: retainedSupplier.id,
      unitPrice: 3,
      totalPrice: 3,
    },
  });
  const survivorProject = await prisma.project.create({
    data: { name: "Surviving project" },
  });
  await prisma.budgetItem.create({
    data: {
      projectId: survivorProject.id,
      itemNumber: "S-1",
      description: "Keep",
      quantity: 1,
      unit: "u",
    },
  });
  await prisma.$transaction(async (tx) =>
    tx.project.delete({ where: { id: retainedProject.id } }),
  );
  assert.equal(
    await prisma.supplier.count({ where: { id: retainedSupplier.id } }),
    1,
    "project deletion preserves catalog suppliers",
  );
  assert.equal(
    await prisma.budgetItem.count({ where: { projectId: retainedProject.id } }),
    0,
  );
  assert.equal(
    await prisma.itemQuote.count({ where: { itemId: retainedItem.id } }),
    0,
  );
  assert.equal(
    await prisma.budgetItem.count({ where: { projectId: survivorProject.id } }),
    1,
    "other projects remain intact",
  );

  console.log(
    "Excel import integration passed: XLSX/XLS parsing; dynamic price groups; validation and warnings; project/supplier links; quote values and mapping; SQLite reopen; unlinked supplier rejection; transaction rollback.",
  );
} finally {
  await prisma?.$disconnect().catch(() => {});
  fs.rmSync(isolatedDirectory, { recursive: true, force: true });
}
