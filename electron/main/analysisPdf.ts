import { z } from "zod";
import type { AnalysisPdfReportData } from "../preload/types";

const nonNegativeNumber = z.number().finite().nonnegative();
const nullableNumber = nonNegativeNumber.nullable();
const reportString = z.string().max(4000);

export const analysisPdfReportSchema: z.ZodType<AnalysisPdfReportData> =
  z.object({
    projectName: reportString,
    currency: z.string().regex(/^[A-Z]{3}$/),
    locale: z.enum(["es-EC", "en-US"]),
    generatedAt: z.string().datetime(),
    selectedSuppliers: z.array(reportString).max(500),
    selectedItemCount: z.number().int().nonnegative().max(100000),
    coveredItemCount: z.number().int().nonnegative().max(100000),
    optimizedTotal: nonNegativeNumber,
    lowestSupplierTotal: nullableNumber,
    lowestSupplierNames: z.array(reportString).max(500),
    highestSupplierTotal: nullableNumber,
    highestSupplierNames: z.array(reportString).max(500),
    supplierRows: z
      .array(
        z.object({
          name: reportString,
          total: nullableNumber,
          lowestWins: z.number().int().nonnegative(),
          ties: z.number().int().nonnegative(),
          differenceAmount: nullableNumber,
          differencePercent: z.number().finite().nullable(),
          participationPercent: z.number().finite().nullable(),
          totalQuotes: z.number().int().nonnegative(),
        }),
      )
      .max(500),
    itemComparisons: z
      .array(
        z.object({
          itemNumber: reportString,
          description: reportString,
          quantity: nonNegativeNumber,
          unit: reportString,
          lowestSupplierNames: z.array(reportString).max(100),
          spreadAmount: nullableNumber,
          spreadPercent: z.number().finite().nullable(),
          quotes: z
            .array(
              z.object({
                supplierName: reportString,
                hasQuote: z.boolean(),
                unitPrice: nullableNumber,
                totalPrice: nullableNumber,
              }),
            )
            .max(500),
        }),
      )
      .max(20000),
    labels: z.object({
      title: reportString,
      generatedAt: reportString,
      project: reportString,
      currency: reportString,
      selectedSuppliers: reportString,
      selectedItems: reportString,
      coverage: reportString,
      coveredItems: reportString,
      uncoveredItems: reportString,
      optimizedTotal: reportString,
      lowestTotal: reportString,
      highestTotal: reportString,
      supplierAnalysis: reportString,
      supplier: reportString,
      quotedTotal: reportString,
      lowestWins: reportString,
      ties: reportString,
      difference: reportString,
      differencePercent: reportString,
      participation: reportString,
      itemsQuoted: reportString,
      itemComparison: reportString,
      item: reportString,
      description: reportString,
      quantity: reportString,
      unit: reportString,
      unitPrice: reportString,
      totalPrice: reportString,
      lowestSupplier: reportString,
      spread: reportString,
      spreadPercent: reportString,
      tie: reportString,
      noQuote: reportString,
    }),
  });

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

export function buildAnalysisPdfHtml(report: AnalysisPdfReportData): string {
  const { labels, locale, currency } = report;
  const money = (value: number | null): string => {
    if (value === null) return "—";
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `${currency} ${value.toFixed(2)}`;
    }
  };
  const percent = (value: number | null): string =>
    value === null
      ? "—"
      : new Intl.NumberFormat(locale, {
          style: "percent",
          maximumFractionDigits: 1,
        }).format(value / 100);
  const percentRatio = (value: number | null): string =>
    value === null
      ? "—"
      : new Intl.NumberFormat(locale, {
          style: "percent",
          maximumFractionDigits: 1,
        }).format(value);
  const number = (value: number): string =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value);
  const text = (value: string): string => escapeHtml(value);
  const generatedDate = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(report.generatedAt));
  const supplierNames = (names: string[], empty: string) =>
    names.length ? names.map(text).join(", ") : text(empty);

  const supplierRows = report.supplierRows.length
    ? report.supplierRows
        .map(
          (row) => `<tr>
            <td>${text(row.name)}</td>
            <td class="numeric">${money(row.total)}</td>
            <td class="numeric">${row.lowestWins}</td>
            <td class="numeric">${row.ties}</td>
            <td class="numeric">${money(row.differenceAmount)}</td>
            <td class="numeric">${percent(row.differencePercent)}</td>
            <td class="numeric">${percent(row.participationPercent)}</td>
            <td class="numeric">${row.totalQuotes}</td>
          </tr>`,
        )
        .join("")
    : `<tr><td colspan="8" class="empty">${text(labels.noQuote)}</td></tr>`;

  const itemRows = report.itemComparisons.length
    ? report.itemComparisons
        .flatMap((item) => {
          const rowSpan = Math.max(item.quotes.length, 1);
          const lowestSupplier = item.lowestSupplierNames.length
            ? `${item.lowestSupplierNames.map(text).join(", ")}${item.lowestSupplierNames.length > 1 ? ` (${text(labels.tie)})` : ""}`
            : text(labels.noQuote);
          const itemCellsStart = (index: number) =>
            index === 0
              ? `<td rowspan="${rowSpan}">${text(item.itemNumber)}</td>
                <td rowspan="${rowSpan}">${text(item.description)}</td>
                <td rowspan="${rowSpan}" class="numeric">${number(item.quantity)}</td>
                <td rowspan="${rowSpan}">${text(item.unit)}</td>`
              : "";
          const itemCellsEnd = (index: number) =>
            index === 0
              ? `<td rowspan="${rowSpan}">${lowestSupplier}</td>
                <td rowspan="${rowSpan}" class="numeric">${money(item.spreadAmount)}</td>
                <td rowspan="${rowSpan}" class="numeric">${percentRatio(item.spreadPercent)}</td>`
              : "";
          if (!item.quotes.length) {
            return [
              `<tr class="group-start">${itemCellsStart(0)}<td>${text(labels.noQuote)}</td><td class="numeric">—</td><td class="numeric">—</td>${itemCellsEnd(0)}</tr>`,
            ];
          }
          return item.quotes.map(
            (quote, index) => `<tr class="${index === 0 ? "group-start" : ""}">
              ${itemCellsStart(index)}
              <td>${text(quote.supplierName)}</td>
              <td class="numeric">${quote.hasQuote ? money(quote.unitPrice) : text(labels.noQuote)}</td>
              <td class="numeric">${quote.hasQuote ? money(quote.totalPrice) : text(labels.noQuote)}</td>
              ${itemCellsEnd(index)}
            </tr>`,
          );
        })
        .join("")
    : `<tr><td colspan="10" class="empty">${text(labels.noQuote)}</td></tr>`;

  return `<!doctype html>
<html lang="${locale === "es-EC" ? "es" : "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${text(labels.title)} - ${text(report.projectName)}</title>
  <style>
    @page { size: A4 landscape; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #172033; font-family: "Segoe UI", Arial, sans-serif; font-size: 10px; }
    header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0d9488; padding-bottom:12px; margin-bottom:16px; }
    .brand { color:#0d9488; font-size:10px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; }
    h1 { margin:5px 0 0; font-size:22px; letter-spacing:-.03em; }
    .date { color:#64748b; text-align:right; font-size:9px; }
    h2 { margin:20px 0 8px; font-size:13px; }
    .meta { display:grid; grid-template-columns:1fr 1fr; gap:6px 20px; margin:0 0 14px; }
    .meta div { display:flex; gap:5px; }
    .meta dt { color:#64748b; font-weight:600; }
    .meta dd { margin:0; font-weight:600; }
    .cards { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
    .card { padding:12px; border:1px solid #dbe4ea; border-radius:9px; background:#f8fafc; break-inside:avoid; }
    .card.featured { border-color:#5eead4; background:#f0fdfa; }
    .card-label { color:#64748b; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
    .card-value { margin-top:6px; font-size:18px; font-weight:800; font-variant-numeric:tabular-nums; }
    .card-detail { margin-top:4px; color:#64748b; font-size:9px; }
    table { width:100%; border-collapse:collapse; font-size:9px; }
    thead { display:table-header-group; }
    th { padding:7px 6px; background:#f1f5f9; color:#475569; text-align:left; font-weight:700; }
    td { padding:6px; border-bottom:1px solid #e2e8f0; vertical-align:top; }
    tbody tr { break-inside:avoid; }
    .numeric { text-align:right; white-space:nowrap; font-variant-numeric:tabular-nums; }
    .group-start td { border-top:1.4px solid #94a3b8; }
    .empty { padding:18px; color:#64748b; text-align:center; }
    .notice { margin-top:8px; color:#92400e; font-size:9px; }
    footer { margin-top:20px; padding-top:8px; border-top:1px solid #e2e8f0; color:#94a3b8; font-size:8px; text-align:right; }
  </style>
</head>
<body>
  <header>
    <div><div class="brand">Cotizfy</div><h1>${text(labels.title)}</h1></div>
    <div class="date">${text(labels.generatedAt)}<br><strong>${text(generatedDate)}</strong></div>
  </header>
  <dl class="meta">
    <div><dt>${text(labels.project)}:</dt><dd>${text(report.projectName)}</dd></div>
    <div><dt>${text(labels.currency)}:</dt><dd>${text(currency)}</dd></div>
    <div><dt>${text(labels.selectedSuppliers)}:</dt><dd>${supplierNames(report.selectedSuppliers, labels.noQuote)}</dd></div>
    <div><dt>${text(labels.selectedItems)}:</dt><dd>${report.selectedItemCount}</dd></div>
    <div><dt>${text(labels.coverage)}:</dt><dd>${report.coveredItemCount} / ${report.selectedItemCount} · ${text(labels.coveredItems)}</dd></div>
    <div><dt>${text(labels.uncoveredItems)}:</dt><dd>${Math.max(0, report.selectedItemCount - report.coveredItemCount)}</dd></div>
    <div><dt>${text(labels.optimizedTotal)}:</dt><dd>${money(report.optimizedTotal)}</dd></div>
  </dl>
  <section class="cards">
    <article class="card featured"><div class="card-label">${text(labels.lowestTotal)}</div><div class="card-value">${money(report.lowestSupplierTotal)}</div><div class="card-detail">${supplierNames(report.lowestSupplierNames, labels.noQuote)}</div></article>
    <article class="card"><div class="card-label">${text(labels.highestTotal)}</div><div class="card-value">${money(report.highestSupplierTotal)}</div><div class="card-detail">${supplierNames(report.highestSupplierNames, labels.noQuote)}</div></article>
  </section>
  <section>
    <h2>${text(labels.supplierAnalysis)}</h2>
    <table><thead><tr>
      <th>${text(labels.supplier)}</th><th class="numeric">${text(labels.quotedTotal)}</th><th class="numeric">${text(labels.lowestWins)}</th><th class="numeric">${text(labels.ties)}</th><th class="numeric">${text(labels.difference)}</th><th class="numeric">${text(labels.differencePercent)}</th><th class="numeric">${text(labels.participation)}</th><th class="numeric">${text(labels.itemsQuoted)}</th>
    </tr></thead><tbody>${supplierRows}</tbody></table>
  </section>
  <section>
    <h2>${text(labels.itemComparison)}</h2>
    <table><thead><tr>
      <th>${text(labels.item)}</th><th>${text(labels.description)}</th><th class="numeric">${text(labels.quantity)}</th><th>${text(labels.unit)}</th><th>${text(labels.supplier)}</th><th class="numeric">${text(labels.unitPrice)}</th><th class="numeric">${text(labels.totalPrice)}</th><th>${text(labels.lowestSupplier)}</th><th class="numeric">${text(labels.spread)}</th><th class="numeric">${text(labels.spreadPercent)}</th>
    </tr></thead><tbody>${itemRows}</tbody></table>
  </section>
  <footer>Cotizfy · ${text(report.projectName)} · ${text(currency)}</footer>
</body>
</html>`;
}
