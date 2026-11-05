import * as XLSX from "xlsx";

export interface ImportedQuote {
  unitPrice: number | null;
  totalPrice: number | null;
}
export interface ImportedBudgetRow {
  itemNumber: string;
  description: string;
  quantity: number;
  unit: string;
  quotes: [ImportedQuote, ImportedQuote];
  rowNumber: number;
}
export interface ExcelPreview {
  rows: ImportedBudgetRow[];
  errors: string[];
  warnings: string[];
  groups: [string, string];
}

const REQUIRED = [
  "ITEM",
  "DESCRIPCION",
  "CANTIDAD",
  "UNIDAD",
  "PRECIO UNITARIO_1",
  "PRECIO TOTAL_1",
  "PRECIO UNITARIO_2",
  "PRECIO TOTAL_2",
];

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  let text = String(value).trim().replace(/\s/g, "").replace(/[$€£]/g, "");
  if (!text) return null;
  if (text.includes(",") && text.includes(".")) {
    text =
      text.lastIndexOf(",") > text.lastIndexOf(".")
        ? text.replace(/\./g, "").replace(",", ".")
        : text.replace(/,/g, "");
  } else if (text.includes(",")) {
    const parts = text.split(",");
    text =
      parts.length === 2 && parts[1].length <= 2
        ? `${parts[0]}.${parts[1]}`
        : parts.join("");
  }
  const number = Number(text);
  return Number.isFinite(number) ? number : NaN;
}

export function parseExcelMatrix(
  buffer: Buffer,
  language: "es" | "en" = "es",
): ExcelPreview {
  const en = language === "en";
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet)
    return {
      rows: [],
      errors: [
        en ? "The workbook has no sheets." : "El libro no contiene hojas.",
      ],
      warnings: [],
      groups: ["_1", "_2"],
    };
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });
  const headerRow = data.findIndex((row) =>
    row.some((cell) => String(cell).trim() !== ""),
  );
  if (headerRow < 0)
    return {
      rows: [],
      errors: [en ? "The worksheet is empty." : "La hoja está vacía."],
      warnings: [],
      groups: ["_1", "_2"],
    };
  const headers = data[headerRow].map((cell) =>
    String(cell).trim().toLocaleUpperCase(),
  );
  const errors: string[] = [];
  const warnings: string[] = [];
  const missing = REQUIRED.filter((header) => !headers.includes(header));
  if (missing.length)
    errors.push(
      `${en ? "Missing required columns" : "Faltan columnas obligatorias"}: ${missing.join(", ")}`,
    );
  if (missing.length)
    return { rows: [], errors, warnings, groups: ["_1", "_2"] };
  const index = Object.fromEntries(
    REQUIRED.map((name) => [name, headers.indexOf(name)]),
  ) as Record<string, number>;
  const rows: ImportedBudgetRow[] = [];
  const identifiers = new Map<string, number[]>();
  for (let i = headerRow + 1; i < data.length; i++) {
    const source = data[i];
    if (
      !source ||
      source.every((cell) => cell === "" || cell === null || cell === undefined)
    )
      continue;
    const rowNumber = i + 1;
    const itemNumber = String(source[index.ITEM] ?? "").trim();
    const description = String(source[index.DESCRIPCION] ?? "").trim();
    const unit = String(source[index.UNIDAD] ?? "").trim();
    const quantity = parseNumber(source[index.CANTIDAD]);
    const label = `Row ${rowNumber}`;
    if (!itemNumber)
      errors.push(
        `${en ? label : `Fila ${rowNumber}`}: ${en ? "ITEM is required." : "ITEM es obligatorio."}`,
      );
    if (!description)
      warnings.push(
        `${en ? label : `Fila ${rowNumber}`}: ${en ? "description is empty." : "la descripción está vacía."}`,
      );
    if (!unit)
      warnings.push(
        `${en ? label : `Fila ${rowNumber}`}: ${en ? "unit is empty." : "la unidad está vacía."}`,
      );
    if (quantity === null || Number.isNaN(quantity) || quantity < 0)
      errors.push(
        `${en ? label : `Fila ${rowNumber}`}: ${en ? "quantity must be a valid non-negative number." : "la cantidad debe ser un número válido no negativo."}`,
      );
    const prices = [1, 2].map((group) => {
      const unitPrice = parseNumber(source[index[`PRECIO UNITARIO_${group}`]]);
      const totalPrice = parseNumber(source[index[`PRECIO TOTAL_${group}`]]);
      for (const [field, value] of [
        ["unit price", unitPrice],
        ["total price", totalPrice],
      ] as const) {
        if (value !== null && (Number.isNaN(value) || value < 0))
          errors.push(
            `${en ? label : `Fila ${rowNumber}`}: ${en ? `${field} for group ${group} must be a non-negative number.` : `${field === "unit price" ? "el precio unitario" : "el precio total"} del grupo ${group} debe ser un número no negativo.`}`,
          );
      }
      if ((unitPrice === null) !== (totalPrice === null))
        warnings.push(
          `${en ? label : `Fila ${rowNumber}`}: ${en ? `group ${group} has an incomplete quote.` : `el grupo ${group} tiene una cotización incompleta.`}`,
        );
      if (
        quantity !== null &&
        !Number.isNaN(quantity) &&
        unitPrice !== null &&
        totalPrice !== null &&
        Math.abs(totalPrice - quantity * unitPrice) > 0.01
      )
        warnings.push(
          `${en ? label : `Fila ${rowNumber}`}: ${en ? `group ${group} total (${totalPrice}) differs from quantity × unit price (${quantity * unitPrice}).` : `el total del grupo ${group} (${totalPrice}) difiere de cantidad × precio unitario (${quantity * unitPrice}).`}`,
        );
      return {
        unitPrice:
          unitPrice !== null && !Number.isNaN(unitPrice) ? unitPrice : null,
        totalPrice:
          totalPrice !== null && !Number.isNaN(totalPrice) ? totalPrice : null,
      };
    });
    if (itemNumber)
      identifiers.set(itemNumber, [
        ...(identifiers.get(itemNumber) || []),
        rowNumber,
      ]);
    if (quantity !== null && !Number.isNaN(quantity) && quantity >= 0)
      rows.push({
        itemNumber,
        description,
        quantity,
        unit,
        quotes: prices as [ImportedQuote, ImportedQuote],
        rowNumber,
      });
  }
  for (const [id, locations] of identifiers)
    if (locations.length > 1)
      warnings.push(
        en
          ? `Duplicate ITEM "${id}" on rows ${locations.join(", ")}.`
          : `El ITEM "${id}" está repetido en las filas ${locations.join(", ")}.`,
      );
  if (!rows.length)
    errors.push(
      en
        ? "No importable budget rows were found."
        : "No se encontraron partidas importables.",
    );
  return { rows, errors, warnings, groups: ["_1", "_2"] };
}
