import { formatMoney } from "@/lib/admin/utils/format";

export function MoneyDisplay({
  amount,
  currency = "IQD",
  className = "",
}: {
  amount: number;
  currency?: "IQD" | "USD";
  className?: string;
}) {
  return <span className={`font-semibold tabular-nums ${className}`}>{formatMoney(amount, currency)}</span>;
}
