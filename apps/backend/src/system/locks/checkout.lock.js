const locks = new Map();

async function acquire(key) {

  if (locks.has(key))
    return null;

  locks.set(key, true);

  return async () => {
    locks.delete(key);
  };
}

module.exports = { acquire };