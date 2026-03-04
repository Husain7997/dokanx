function randomFailure(rate = 0.01) {

  if (Math.random() < rate)
    throw new Error("Chaos failure");
}

module.exports = { randomFailure };