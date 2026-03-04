const flags = {
  NEW_CHECKOUT: true,
};

function enabled(flag) {
  return !!flags[flag];
}

module.exports = { enabled };