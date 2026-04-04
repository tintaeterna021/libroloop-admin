export function roundDecena(value: number): number {
  if (!value) return 0;
  const rem = value % 10;
  // Regla: Si la terminación (el remanente de 10) es mayor a 2.5, se sube a la siguiente decena.
  if (rem > 2.5) {
    return value - rem + 10;
  }
  return value - rem;
}

export function round5(value: number): number {
  if (!value) return 0;
  // Redondeo al múltiplo de 5 más cercano. Ej: 78 -> 80, 76 -> 75
  return Math.round(value / 5) * 5;
}

export function calculatePrices(originalPrice: number) {
  const salePrice = roundDecena(originalPrice * 0.55);
  const sellerOption1 = round5(salePrice * 0.60); // Nosotros almacenamos (60%)
  const sellerOption2 = round5(salePrice * 0.50); // Vendedor almacena (50%)
  
  return {
    salePrice,
    sellerOption1,
    sellerOption2,
    profitOption1: salePrice - sellerOption1,
    profitOption2: salePrice - sellerOption2
  };
}
