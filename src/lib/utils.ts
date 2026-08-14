import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind + conditional class names safely.
 * Used by every shadcn/ui component and most custom components.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency. Defaults to Kenyan Shillings (KES)
 * since Fonsi POS initially targets Kenyan SMEs, but the currency
 * is configurable per business (see business settings).
 */
export function formatCurrency(
  amount: number,
  currency: string = "KES",
  locale: string = "en-KE"
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Format a date consistently across the app. */
export function formatDate(date: Date | string, withTime = false) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: withTime ? "short" : undefined,
  }).format(d);
}

/** Generate a human-friendly receipt/reference number. */
export function generateReference(prefix: string = "RCPT") {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/** Turn a business name into a URL-safe slug, with a short random suffix
 * to avoid collisions (e.g. "Acme Traders Ltd" -> "acme-traders-ltd-4f2a"). */
export function slugify(input: string) {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}
