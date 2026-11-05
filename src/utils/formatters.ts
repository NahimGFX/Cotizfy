import i18n from "../i18n";

/**
 * Format monetary amounts according to the current locale
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale?: string,
): string {
  const currentLocale = locale || (i18n.language === "en" ? "en-US" : "es-PE");
  try {
    return new Intl.NumberFormat(currentLocale, {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Format quantities or decimal numbers according to the current locale
 */
export function formatNumber(
  value: number,
  decimals: number = 2,
  locale?: string,
): string {
  const currentLocale = locale || (i18n.language === "en" ? "en-US" : "es-PE");
  return new Intl.NumberFormat(currentLocale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format percentages (e.g. 0.15 -> 15.0%)
 */
export function formatPercent(value: number, locale?: string): string {
  const currentLocale = locale || (i18n.language === "en" ? "en-US" : "es-PE");
  return new Intl.NumberFormat(currentLocale, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Format dates according to current locale
 */
export function formatDate(
  dateInput: string | Date | number,
  formatStyle: "short" | "medium" | "long" = "medium",
  locale?: string,
): string {
  const currentLocale = locale || (i18n.language === "en" ? "en-US" : "es-PE");
  const date =
    typeof dateInput === "string" || typeof dateInput === "number"
      ? new Date(dateInput)
      : dateInput;

  if (isNaN(date.getTime())) {
    return "-";
  }

  const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: { year: "numeric", month: "numeric", day: "numeric" },
    medium: {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
    long: {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  };

  return new Intl.DateTimeFormat(currentLocale, optionsMap[formatStyle]).format(
    date,
  );
}
