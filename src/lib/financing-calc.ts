// Cálculo puro de financiamento imobiliário (Price/SAC).
// Sem IA, sem I/O — usado no servidor (para persistir o resultado) e no
// cliente (para o simulador responder em tempo real ao arrastar os campos).

export type AmortizationSystem = "price" | "sac";

export type FinancingInput = {
  propertyValue: number;
  downPaymentPct: number; // 0-100
  usedFgts: boolean;
  fgtsAmount: number;
  termMonths: number;
  annualRatePct: number; // ex.: 11.2
  system: AmortizationSystem;
};

export type FinancingResult = {
  downPayment: number;
  financedAmount: number;
  firstInstallment: number;
  lastInstallment: number;
  totalPaid: number;
  totalInterest: number;
  suggestedMinIncome: number;
  /** Série mensal de parcelas — usada para desenhar o gráfico de evolução. */
  installmentSeries: number[];
};

const MONTHLY_INCOME_COMMITMENT_LIMIT = 0.3; // regra de bolso do SFH: parcela ≤ 30% da renda

function monthlyRate(annualRatePct: number): number {
  return Math.pow(1 + annualRatePct / 100, 1 / 12) - 1;
}

export function calculateFinancing(input: FinancingInput): FinancingResult {
  const { propertyValue, downPaymentPct, usedFgts, fgtsAmount, termMonths, annualRatePct, system } = input;

  let downPayment = propertyValue * (downPaymentPct / 100);
  if (usedFgts) downPayment += fgtsAmount;
  downPayment = Math.min(downPayment, propertyValue * 0.9); // financiamento mínimo de 10%, regra usual SFH/SFI

  const financedAmount = Math.max(propertyValue - downPayment, 0);
  const i = monthlyRate(annualRatePct);
  const n = Math.max(termMonths, 1);

  const installmentSeries: number[] = [];
  let totalPaid = 0;

  if (system === "price") {
    const pmt = i === 0 ? financedAmount / n : (financedAmount * (i * Math.pow(1 + i, n))) / (Math.pow(1 + i, n) - 1);
    for (let k = 0; k < n; k++) installmentSeries.push(pmt);
    totalPaid = pmt * n;
  } else {
    const amort = financedAmount / n;
    let balance = financedAmount;
    for (let k = 0; k < n; k++) {
      const installment = amort + balance * i;
      installmentSeries.push(installment);
      totalPaid += installment;
      balance -= amort;
    }
  }

  const firstInstallment = installmentSeries[0] ?? 0;
  const lastInstallment = installmentSeries[installmentSeries.length - 1] ?? 0;
  const totalInterest = totalPaid - financedAmount;
  const suggestedMinIncome = firstInstallment / MONTHLY_INCOME_COMMITMENT_LIMIT;

  return {
    downPayment,
    financedAmount,
    firstInstallment,
    lastInstallment,
    totalPaid: totalPaid + downPayment,
    totalInterest,
    suggestedMinIncome,
    installmentSeries,
  };
}

// ---------------------------------------------------------------------------
// Qualificação da simulação — mesmo espírito de radar-scoring.ts, mas
// baseada em capacidade financeira demonstrada em vez de respostas de formulário.
// ---------------------------------------------------------------------------

export function calculateSimulationScore(input: FinancingInput, result: FinancingResult, hasContact: boolean): number {
  let score = 0;
  score += 20; // simulou = intenção demonstrada, sempre pontua

  if (input.downPaymentPct >= 30) score += 20;
  else if (input.downPaymentPct >= 20) score += 10;

  if (input.usedFgts) score += 10;

  // Prazo mais curto costuma indicar maior poder de compra.
  if (input.termMonths <= 180) score += 15;
  else if (input.termMonths <= 300) score += 5;

  // Parcela compatível (não no limite da simulação) é sinal de decisão mais próxima.
  if (result.firstInstallment > 0 && result.firstInstallment < input.propertyValue * 0.006) score += 10;

  if (hasContact) score += 25;

  return Math.max(0, Math.min(100, score));
}

export function calculateSimulationPriority(score: number): "high" | "medium" | "initial" {
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "initial";
}
