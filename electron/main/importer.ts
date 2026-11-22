import type { PrismaClient } from "@prisma/client";
import type { ImportedBudgetRow } from "./excel";

export async function importExcelRows(
  prisma: PrismaClient,
  projectId: string,
  rows: ImportedBudgetRow[],
  supplierIds: string[],
): Promise<number> {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 10000) {
    throw new Error("The import must contain between 1 and 10,000 rows.");
  }
  if (
    !Array.isArray(supplierIds) ||
    supplierIds.length === 0 ||
    supplierIds.some((id) => typeof id !== "string" || !id.trim()) ||
    new Set(supplierIds).size !== supplierIds.length ||
    rows.some(
      (row) =>
        !Array.isArray(row?.quotes) || row.quotes.length !== supplierIds.length,
    )
  ) {
    throw new Error(
      "Assign one different project supplier to each price group.",
    );
  }

  await prisma.$transaction(async (tx) => {
    const allowed = await tx.projectSupplier.findMany({
      where: { projectId, supplierId: { in: supplierIds } },
      select: { supplierId: true },
    });
    if (allowed.length !== supplierIds.length)
      throw new Error("All suppliers must be associated with this project.");
    const mergedRows = new Map<string, ImportedBudgetRow>();
    for (const [offset, row] of rows.entries()) {
      if (
        !row ||
        typeof row.itemNumber !== "string" ||
        !row.itemNumber.trim() ||
        typeof row.description !== "string" ||
        typeof row.unit !== "string" ||
        !Number.isFinite(row.quantity) ||
        row.quantity < 0 ||
        !Array.isArray(row.quotes) ||
        row.quotes.length !== supplierIds.length
      ) {
        throw new Error(
          `Invalid budget row at spreadsheet row ${row?.rowNumber ?? offset + 1}.`,
        );
      }
      for (const [group, quote] of row.quotes.entries()) {
        if (
          !quote ||
          (quote.unitPrice !== null &&
            (!Number.isFinite(quote.unitPrice) || quote.unitPrice < 0)) ||
          (quote.totalPrice !== null &&
            (!Number.isFinite(quote.totalPrice) || quote.totalPrice < 0))
        ) {
          throw new Error(`Invalid quote at spreadsheet row ${row.rowNumber}.`);
        }
      }

      const normalizedItemNumber = row.itemNumber.trim().toLocaleLowerCase();
      const previous = mergedRows.get(normalizedItemNumber);
      if (!previous) {
        mergedRows.set(normalizedItemNumber, {
          ...row,
          itemNumber: row.itemNumber.trim(),
          description: row.description.trim(),
          unit: row.unit.trim(),
          quotes: row.quotes.map((quote) => ({ ...quote })),
        });
        continue;
      }

      // Keep the latest item details and the latest non-empty quote per supplier.
      previous.itemNumber = row.itemNumber.trim();
      previous.description = row.description.trim();
      previous.quantity = row.quantity;
      previous.unit = row.unit.trim();
      previous.rowNumber = row.rowNumber;
      for (const [group, quote] of row.quotes.entries()) {
        if (quote.unitPrice !== null || quote.totalPrice !== null)
          previous.quotes[group] = { ...quote };
      }
    }

    const existingItems = await tx.budgetItem.findMany({
      where: { projectId },
    });
    const itemByNumber = new Map(
      existingItems.map((item) => [
        item.itemNumber.trim().toLocaleLowerCase(),
        item,
      ]),
    );
    let nextOrder = existingItems.length;

    for (const row of mergedRows.values()) {
      const key = row.itemNumber.trim().toLocaleLowerCase();
      const existing = itemByNumber.get(key);
      const item = existing
        ? await tx.budgetItem.update({
            where: { id: existing.id },
            data: {
              itemNumber: row.itemNumber.trim(),
              description: row.description.trim(),
              quantity: row.quantity,
              unit: row.unit.trim(),
            },
          })
        : await tx.budgetItem.create({
            data: {
              projectId,
              itemNumber: row.itemNumber.trim(),
              description: row.description.trim(),
              quantity: row.quantity,
              unit: row.unit.trim(),
              orderIndex: nextOrder++,
            },
          });
      itemByNumber.set(key, item);

      for (const [group, quote] of row.quotes.entries()) {
        if (quote.unitPrice === null && quote.totalPrice === null) {
          await tx.itemQuote.deleteMany({
            where: { itemId: item.id, supplierId: supplierIds[group] },
          });
          continue;
        }
        const missing = [
          quote.unitPrice === null ? "unit price" : "",
          quote.totalPrice === null ? "total price" : "",
        ]
          .filter(Boolean)
          .join(" and ");
        await tx.itemQuote.upsert({
          where: {
            itemId_supplierId: {
              itemId: item.id,
              supplierId: supplierIds[group],
            },
          },
          create: {
            itemId: item.id,
            supplierId: supplierIds[group],
            unitPrice: quote.unitPrice ?? 0,
            totalPrice: quote.totalPrice ?? 0,
            notes: missing ? `Empty ${missing} in imported workbook.` : null,
          },
          update: {
            unitPrice: quote.unitPrice ?? 0,
            totalPrice: quote.totalPrice ?? 0,
            notes: missing ? `Empty ${missing} in imported workbook.` : null,
          },
        });
      }
    }
  });
  return new Set(rows.map((row) => row.itemNumber.trim().toLocaleLowerCase()))
    .size;
}
