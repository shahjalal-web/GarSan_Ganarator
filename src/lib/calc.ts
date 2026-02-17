export const INCLUDED_FOOTAGE = 15;

export type PackageType = 'value' | 'premium_underground';

export const PACKAGE_RULES = {
  value: {
    label: 'Value (Above Ground)',
    includedGasFt: 15,
    includedElecFt: 15,
    gasPerFt: 33.35,
    elecPerFt: 35.2,
  },
  premium_underground: {
    label: 'Premium Underground',
    includedGasFt: 15,
    includedElecFt: 15,
    gasPerFt: 48.35,
    elecPerFt: 50.2,
  },
} as const;

export const DEFAULT_LOAD_SHED_LADDER = [
  { min: 1, max: 1, price: 895 },
  { min: 2, max: 2, price: 1295 },
  { min: 3, max: 3, price: 1595 },
  { min: 4, max: 4, price: 1895 },
  { min: 5, max: 6, price: 2295 },
  { min: 7, max: Infinity, pricePerExtra: 350 },
];

export const DEFAULT_GENERATOR_PRICING = [
  // { kw: 7, price: 6000 },
  // { kw: 11, price: 8500 },
  // { kw: 16, price: 11500 },
  // { kw: 20, price: 14500 },
  { kw: 22, price: 16500 },
  { kw: 26, price: 19500 },
  { kw: 30, price: 22500 },
  { kw: 38, price: 30000 },
  { kw: 48, price: 40000 },
  { kw: 50, price: 42000 },
  { kw: 56, price: 52000 },
];

const STANDARD_KW = DEFAULT_GENERATOR_PRICING.map((p) => p.kw);

export function chooseGeneratorKw(totalWatts: number) {
  // conservative sizing: add 20% buffer then convert to kW
  const kwNeeded = Math.ceil((totalWatts * 1.2) / 1000);
  // pick the smallest standard KW >= kwNeeded
  const pick = STANDARD_KW.find((k) => k >= kwNeeded) ?? STANDARD_KW[STANDARD_KW.length - 1];
  return pick;
}

export function recommendBrandForKw(kw: number) {
  // simple mapping: smaller sizes -> Generac, larger -> Kohler
  if (kw <= 30) return 'Generac';
  return 'Kohler';
}

export function generatorBasePriceForKw(kw: number, pricing = DEFAULT_GENERATOR_PRICING) {
  const entry = pricing.find((p) => p.kw === kw);
  return entry ? entry.price : pricing[pricing.length - 1].price;
}

export function calcExtraFootage(packageType: PackageType, gasFt: number, elecFt: number) {
  const pkg = PACKAGE_RULES[packageType];
  const extraGas = Math.max(0, gasFt - pkg.includedGasFt);
  const extraElec = Math.max(0, elecFt - pkg.includedElecFt);
  return {
    extraGas,
    extraElec,
    gasCharge: parseFloat((extraGas * pkg.gasPerFt).toFixed(2)),
    elecCharge: parseFloat((extraElec * pkg.elecPerFt).toFixed(2)),
  };
}

export function calcLoadShedPrice(selectedLoadsCount: number, ladder = DEFAULT_LOAD_SHED_LADDER) {
  if (!selectedLoadsCount) return 0;
  for (const step of ladder) {
    if (selectedLoadsCount >= step.min && selectedLoadsCount <= (step.max ?? step.min)) {
      if (step.price) return step.price;
      if (step.pricePerExtra && step.min) {
        // fallback
        const extras = Math.max(0, selectedLoadsCount - 6);
        return 2295 + extras * step.pricePerExtra;
      }
    }
  }
  // over max (7+)
  const extras = Math.max(0, selectedLoadsCount - 6);
  return 2295 + extras * 350;
}

export function calcQuoteTotal({
  kw,
  generatorPricing,
  packageType,
  gasFt,
  elecFt,
  loadShedCount,
  loadShedLadder,
  miscFees = 0,
  labor = 0,
}: {
  kw: number;
  generatorPricing?: typeof DEFAULT_GENERATOR_PRICING;
  packageType: PackageType;
  gasFt: number;
  elecFt: number;
  loadShedCount: number;
  loadShedLadder?: typeof DEFAULT_LOAD_SHED_LADDER;
  miscFees?: number;
  labor?: number;
}) {
  const basePrice = generatorBasePriceForKw(kw, generatorPricing);
  const footage = calcExtraFootage(packageType, gasFt, elecFt);
  const loadShedPrice = calcLoadShedPrice(loadShedCount, loadShedLadder);
  const total = basePrice + footage.gasCharge + footage.elecCharge + loadShedPrice + miscFees + labor;
  return {
    basePrice,
    ...footage,
    loadShedPrice,
    miscFees,
    labor,
    total: parseFloat(total.toFixed(2)),
  };
}
