export type FinanceCostConfig = {
  exchangeRateUsdToIqd: number;
  textAiCostPerRequestUsd: number;
  imageAiCostPerImageUsd: number;
  videoAiCostPerSecondUsd: number;
  voiceCostPerSecondUsd: number;
  renderCostPerMinuteUsd: number;
  storageCostPerGbUsd: number;
  bandwidthCostPerGbUsd: number;
  otherCostPerVideoUsd: number;
};

export type FinanceSummary = {
  revenueToday: number;
  revenueMonth: number;
  revenueYear: number;
  costMonth: number;
  grossProfitMonth: number;
  netProfitMonth: number;
  marginPercent: number;
  arpu: number;
  costPerUser: number;
  costPerVideo: number;
  byMonth: { month: string; revenue: number; cost: number; profit: number }[];
};
