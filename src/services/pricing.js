export function americanToImpliedProbability(price) {
  if (!Number.isFinite(price) || price === 0) throw new Error("American odds must be a non-zero number.");
  return price > 0 ? 100 / (price + 100) : Math.abs(price) / (Math.abs(price) + 100);
}

export function removeTwoWayVig(firstPrice, secondPrice) {
  const first = americanToImpliedProbability(firstPrice);
  const second = americanToImpliedProbability(secondPrice);
  const total = first + second;
  return { first: first / total, second: second / total, hold: total - 1 };
}

export function expectedValue(modelProbability, price) {
  const profit = price > 0 ? price / 100 : 100 / Math.abs(price);
  return modelProbability * profit - (1 - modelProbability);
}
