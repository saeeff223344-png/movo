export function formatMoney(amount: number, currency: "IQD" | "USD" = "IQD"): string {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
  return `${amount.toLocaleString("en-US")} ${currency}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toISOString().slice(0, 10);
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function daysRemaining(expiryIso: string): number {
  return daysBetween(new Date().toISOString(), expiryIso);
}
