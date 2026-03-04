exports.convert = (amount, rate) => {
  return Math.round(amount * rate);
};