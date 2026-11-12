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
  quotes: ImportedQuote[];
  rowNumber: number;
}
export interface ExcelPreview {
  rows: ImportedBudgetRow[];
  errors: string[];
  warnings: string[];
  groups: string[];
}

const REQUIRED = ["ITEM", "DESCRIPCION", "CANTIDAD", "UNIDAD"];

function isEmptyCell(value: unknown): boolean {
  return value === null || value === undefined ||
    (typeof value === "string" && value.trim() === "");
}

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
      groups: [],
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
      groups: [],
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
  if (missing.length) return { rows: [], errors, warnings, groups: [] };
  const index = Object.fromEntries(
    REQUIRED.map((name) => [name, headers.indexOf(name)]),
  ) as Record<string, number>;
  const groupNumbers = [
    ...new Set(
      headers.flatMap((header) => {
        const match = header.match(/^PRECIO (?:UNITARIO|TOTAL)_(\d+)$/);
        return match ? [match[1]] : [];
      }),
    ),
  ].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
  const groupData = new Map<
    string,
    { hasData: boolean; incomplete: Map<number, Set<string>> }
  >(
    groupNumbers.map((group) => [
      group,
      { hasData: false, incomplete: new Map<number, Set<string>>() },
    ]),
  );
  const headerIndex = (name: string) => headers.indexOf(name);
  const rows: ImportedBudgetRow[] = [];
  const identifiers = new Map<string, number[]>();
  for (let i = headerRow + 1; i < data.length; i++) {
    const source = data[i];
    if (
      !source ||
      source.every(isEmptyCell)
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
    const prices = groupNumbers.map((group) => {
      const unitCol = headerIndex(`PRECIO UNITARIO_${group}`);
      const totalCol = headerIndex(`PRECIO TOTAL_${group}`);
      const unitRaw = unitCol < 0 ? undefined : source[unitCol];
      const totalRaw = totalCol < 0 ? undefined : source[totalCol];
      const unitPrice = unitCol < 0 ? null : parseNumber(unitRaw);
      const totalPrice = totalCol < 0 ? null : parseNumber(totalRaw);
      const state = groupData.get(group)!;
      const hasUnit = !isEmptyCell(unitRaw);
      const hasTotal = !isEmptyCell(totalRaw);
      if (itemNumber && (hasUnit || hasTotal)) state.hasData = true;
      for (const [field, value] of [
        ["unit price", unitPrice],
        ["total price", totalPrice],
      ] as const) {
        if (value !== null && (Number.isNaN(value) || value < 0))
          errors.push(
            `${en ? label : `Fila ${rowNumber}`}: ${en ? `${field} for group ${group} must be a non-negative number.` : `${field === "unit price" ? "el precio unitario" : "el precio total"} del grupo ${group} debe ser un número no negativo.`}`,
          );
      }
      const completeQuote =
        unitCol >= 0 &&
        totalCol >= 0 &&
        unitPrice !== null &&
        Number.isFinite(unitPrice) &&
        unitPrice >= 0 &&
        totalPrice !== null &&
        Number.isFinite(totalPrice) &&
        totalPrice >= 0;
      if (itemNumber && !completeQuote) {
        const missing = new Set<string>();
        if (unitCol < 0 || unitPrice === null || !Number.isFinite(unitPrice) || unitPrice < 0)
          missing.add(`PRECIO UNITARIO_${group}`);
        if (totalCol < 0 || totalPrice === null || !Number.isFinite(totalPrice) || totalPrice < 0)
          missing.add(`PRECIO TOTAL_${group}`);
        if (missing.size) state.incomplete.set(rowNumber, missing);
      }
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
    if (itemNumber) {
      const normalizedItemNumber = itemNumber.toLocaleLowerCase();
      identifiers.set(normalizedItemNumber, [
        ...(identifiers.get(normalizedItemNumber) || []),
        rowNumber,
      ]);
    }
    if (quantity !== null && !Number.isNaN(quantity) && quantity >= 0)
      rows.push({
        itemNumber,
        description,
        quantity,
        unit,
        quotes: prices,
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
  const groups = groupNumbers.filter((group) => {
    const state = groupData.get(group)!;
    const unitExists = headerIndex(`PRECIO UNITARIO_${group}`) >= 0;
    const totalExists = headerIndex(`PRECIO TOTAL_${group}`) >= 0;
    // Header-only groups with no values are prepared columns, not supplier quotes.
    if (!state.hasData) return false;
    const complete =
      unitExists &&
      totalExists &&
      state.incomplete.size === 0 &&
      rows.length > 0;
    if (!complete) {
      const affected = [...state.incomplete.entries()]
        .map(([row, columns]) =>
          `${en ? "row" : "fila"} ${row} (${[...columns].join(", ")})`,
        )
        .join("; ");
      const missingHeaders = [
        unitExists ? "" : `PRECIO UNITARIO_${group}`,
        totalExists ? "" : `PRECIO TOTAL_${group}`,
      ].filter(Boolean);
      const details = [
        missingHeaders.length
          ? `${en ? "missing columns" : "faltan columnas"}: ${missingHeaders.join(", ")}`
          : "",
        affected ? `${en ? "incomplete values" : "valores incompletos"}: ${affected}` : "",
      ].filter(Boolean);
      warnings.push(
        en
          ? `Price group ${group} was ignored because it is incomplete${details.length ? ` (${details.join("; ")})` : ""}.`
          : `Se ignoró el grupo de precios ${group} porque está incompleto${details.length ? ` (${details.join("; ")})` : ""}.`,
      );
      return false;
    }
    return true;
  });
  const validGroupIndexes = groups.map((group) => groupNumbers.indexOf(group));
  for (const row of rows)
    row.quotes = validGroupIndexes.map((index) => row.quotes[index]);
  if (!groups.length)
    errors.push(
      en
        ? "No complete price groups with quotes were found. Expected valid PRICE UNIT_N and PRICE TOTAL_N values for every budget item."
        : "No se encontraron grupos de precios completos. Cada partida debe tener valores válidos en PRECIO UNITARIO_N y PRECIO TOTAL_N.",
    );
  if (!rows.length)
    errors.push(
      en
        ? "No importable budget rows were found."
        : "No se encontraron partidas importables.",
    );
  return { rows, errors, warnings, groups };
}
