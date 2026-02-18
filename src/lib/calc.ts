/* eslint-disable @typescript-eslint/no-explicit-any */
export const INCLUDED_FOOTAGE = 15;

export type PackageType = "value" | "premium_underground";
export type GeneratorBrand = "Generac" | "Kohler";

/**
 * ১. ডাইনামিক ফুটেজ ক্যালকুলেশন (অ্যাডমিন রেট অনুযায়ী)
 */
export function calcExtraFootage(
  packageType: PackageType,
  gasFt: number,
  elecFt: number,
  settings: any, // অ্যাডমিন থেকে আসা settings অবজেক্ট
) {
  // যদি সেটিংস না থাকে বা ফুটেজ রেট না থাকে তবে ডিফল্ট রেট ব্যবহার হবে
  const rates = settings?.footageRates || {
    valueGas: 33.35,
    valueElec: 35.2,
    premiumGas: 48.35,
    premiumElec: 50.2,
  };

  const extraGas = Math.max(0, gasFt - INCLUDED_FOOTAGE);
  const extraElec = Math.max(0, elecFt - INCLUDED_FOOTAGE);

  let gasPerFt = rates.valueGas;
  let elecPerFt = rates.valueElec;

  if (packageType === "premium_underground") {
    gasPerFt = rates.premiumGas;
    elecPerFt = rates.premiumElec;
  }

  return {
    extraGas,
    extraElec,
    gasCharge: parseFloat((extraGas * gasPerFt).toFixed(2)),
    elecCharge: parseFloat((extraElec * elecPerFt).toFixed(2)),
  };
}

/**
 * ২. ডাইনামিক লোড শেড প্রাইস (অ্যাডমিন ল্যাডার অনুযায়ী)
 */
export function calcLoadShedPrice(selectedLoadsCount: number, settings: any) {
  if (!selectedLoadsCount) return 0;

  // অ্যাডমিন থেকে ল্যাডার না থাকলে ডিফল্ট ল্যাডার
  const ladder = settings?.loadShedLadder || [];

  for (const step of ladder) {
    if (
      selectedLoadsCount >= step.min &&
      selectedLoadsCount <= (step.max || Infinity)
    ) {
      if (step.price) return step.price;

      // ৭+ লোডের জন্য স্পেশাল ক্যালকুলেশন
      if (step.pricePerExtra) {
        const extras = Math.max(0, selectedLoadsCount - 6);
        return 2295 + extras * step.pricePerExtra;
      }
    }
  }
  return 0;
}

/**
 * ৩. টোটাল কোট ক্যালকুলেশন (সম্পূর্ণ ডাইনামিক)
 */
export function calcQuoteTotal({
  brand,
  kw,
  packageType,
  gasFt,
  elecFt,
  loadShedCount,
  settings,
}: {
  brand: GeneratorBrand;
  kw: number;
  packageType: PackageType;
  gasFt: number;
  elecFt: number;
  loadShedCount: number;
  settings: any;
}) {
  const pricingList = settings?.generatorPricing || [];

  // ১. সঠিক জেনারেটর কনফিগ খুঁজে বের করা
  const selectedConfig = pricingList.find((p: any) => {
    const kwMatch = Number(p.kw) === Number(kw);
    // যদি ডাটাতে ব্র্যান্ড থাকে তবে চেক করবে, না থাকলে শুধু কিলোওয়াট দিয়ে খুঁজবে
    const brandMatch = p.brand
      ? String(p.brand).toLowerCase() === String(brand).toLowerCase()
      : true;
    return kwMatch && brandMatch;
  });

  // ২. বেইস প্রাইস নির্ধারণ (basePrice + installPrice)
  // আপনার মডেল অনুযায়ী: ৪২০০ + ১৫০০ = ৫৭০০ (যেমন ১০ কিলোওয়াটের জন্য)
  const generatorBase = Number(selectedConfig?.basePrice || 0);
  const generatorInstall = Number(selectedConfig?.installPrice || 0);
  const totalBaseValue = generatorBase + generatorInstall;
  console.log(generatorBase, generatorInstall);

  // ৩. প্রিমিয়াম আপগ্রেড সংগ্রহ
  let premiumUpgradeAmount = 0;
  if (packageType === "premium_underground") {
    premiumUpgradeAmount = Number(selectedConfig?.premiumUpgradeAmount || 0);
  }

  // ৪. ফুটেজ এবং লোড শেড চার্জ ক্যালকুলেশন
  const footage = calcExtraFootage(packageType, gasFt, elecFt, settings);
  const loadShedPrice = calcLoadShedPrice(loadShedCount, settings);

  // ৫. ফাইনাল টোটাল ক্যালকুলেশন
  // TOTAL = (Base + Install) + Premium Upgrade + Extra Footage + Load Management
  const total =
    totalBaseValue +
    premiumUpgradeAmount +
    footage.gasCharge +
    footage.elecCharge +
    loadShedPrice;

  return {
    basePrice: totalBaseValue, // এটি এখন জেনারেটরের সম্মিলিত বেইস প্রাইস
    premiumUpgradeAmount,
    ...footage,
    loadShedPrice,
    total: parseFloat(total.toFixed(2)),
  };
}

/**
 * ৪. জেনারেটর সাইজ রিকমেন্ডেশন (আগের মতোই থাকবে)
 */
export function chooseGeneratorKw(
  acCount: number,
  points: number,
  brand: GeneratorBrand,
  settings: any,
): number {
  let recommendedKw = 18;

  if (acCount === 1) recommendedKw = 22;
  else if (acCount === 2) recommendedKw = 24;
  else if (acCount >= 3) recommendedKw = 30;

  if (points >= 2 && points <= 3) recommendedKw += 2;
  else if (points >= 4 && points <= 5) recommendedKw += 4;
  else if (points >= 6) recommendedKw += 6;

  const pricingList = settings?.generatorPricing || [];
  const availableSizes = pricingList
    .filter((p: any) => p.brand === brand)
    .map((p: any) => Number(p.kw))
    .sort((a: number, b: number) => a - b);

  const finalSize =
    availableSizes.find((size: number) => size >= recommendedKw) ||
    availableSizes[availableSizes.length - 1];

  return finalSize || 18;
}
