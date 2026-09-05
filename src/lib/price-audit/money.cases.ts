export type MoneyCase = {
  entrada: string;
  esperado: number | null;
  ambiguo: boolean;
  motivo?: string | null;
};

export const MONEY_CASES: MoneyCase[] = [
  { entrada: "R$ 4.668.000,00", esperado: 4668000.0, ambiguo: false },
  { entrada: "R$ 2.400.000,00", esperado: 2400000.0, ambiguo: false },
  { entrada: "R$ 1.900,00", esperado: 1900.0, ambiguo: false },
  { entrada: "R$ 600,00", esperado: 600.0, ambiguo: false },
  { entrada: "R$ 12.500,50", esperado: 12500.5, ambiguo: false },
  { entrada: "R$ 45.000", esperado: 45000.0, ambiguo: false },
  { entrada: "R$1.000,00", esperado: 1000.0, ambiguo: false },
  { entrada: "4 x R$ 781,00", esperado: null, ambiguo: true, motivo: "parcelado" },
  { entrada: "12x R$ 300,00", esperado: null, ambiguo: true, motivo: "parcelado" },
  { entrada: "R$ 30,00/m²", esperado: null, ambiguo: true, motivo: "por m2" },
  { entrada: "A partir de R$ 800.000,00", esperado: null, ambiguo: true, motivo: "faixa" },
  { entrada: "R$ 800.000,00 a R$ 1.200.000,00", esperado: null, ambiguo: true, motivo: "faixa" },
  { entrada: "Sob consulta", esperado: null, ambiguo: true, motivo: "sem valor" },
  { entrada: "Consulte-nos", esperado: null, ambiguo: true, motivo: "sem valor" },
  { entrada: "", esperado: null, ambiguo: true, motivo: "sem valor" },
];
