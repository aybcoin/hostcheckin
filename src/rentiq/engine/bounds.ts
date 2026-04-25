export function clampPrice(price: number, minPrice: number, maxPrice: number): number {
  if (price < minPrice) return minPrice;
  if (price > maxPrice) return maxPrice;
  return Math.round(price);
}
