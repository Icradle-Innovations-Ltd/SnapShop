function createOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `SNAP-${datePart}-${randomPart}`;
}

function calculateCartTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const serviceFee = items.length > 0 ? 5000 : 0;
  const total = subtotal + serviceFee;

  return {
    subtotal,
    serviceFee,
    total
  };
}

module.exports = {
  createOrderNumber,
  calculateCartTotals
};
