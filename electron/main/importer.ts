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
    const startOrder = await tx.budgetItem.count({ where: { projectId } });
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
      const item = await tx.budgetItem.create({
        data: {
          projectId,
          itemNumber: row.itemNumber.trim(),
          description: row.description.trim(),
          quantity: row.quantity,
          unit: row.unit.trim(),
          orderIndex: startOrder + offset,
        },
      });

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
        if (quote.unitPrice === null && quote.totalPrice === null) continue;
        const missing = [
          quote.unitPrice === null ? "unit price" : "",
          quote.totalPrice === null ? "total price" : "",
        ]
          .filter(Boolean)
          .join(" and ");
        await tx.itemQuote.create({
          data: {
            itemId: item.id,
            supplierId: supplierIds[group],
            unitPrice: quote.unitPrice ?? 0,
            totalPrice: quote.totalPrice ?? 0,
            notes: missing ? `Empty ${missing} in imported workbook.` : null,
          },
        });
      }
    }
  });
  return rows.length;
}
