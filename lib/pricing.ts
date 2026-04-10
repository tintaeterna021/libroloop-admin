export function roundDecena(value: number): number {
  if (!value) return 0;
  return Math.round(value / 10) * 10;
}

export function floor5(value: number): number {
  if (!value) return 0;
  // Redondeo de 4 para abajo 0 y de 9 para abajo 5: ej 74 -> 70, 79 -> 75
  return Math.floor(value / 5) * 5;
}

export function calculatePrices(originalPrice: number) {
  let salePrice = roundDecena(originalPrice * 0.55);
  if (salePrice < 100) {
    salePrice = 100;
  }
  
  // Opción 1:
  let sellerOption1;
  if (salePrice === 100) {
    sellerOption1 = 50;
  } else if (salePrice === 110) {
    sellerOption1 = 60;
  } else {
    sellerOption1 = floor5(salePrice * 0.60); // Math.floor al múltiplo de 5
  }
  
  // Opción 2:
  const sellerOption2 = salePrice / 2; 
  
  return {
    salePrice,
    sellerOption1,
    sellerOption2,
    profitOption1: salePrice - sellerOption1,
    profitOption2: salePrice - sellerOption2
  };
}
