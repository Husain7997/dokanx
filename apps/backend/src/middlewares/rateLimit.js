const hits = new Map();

module.exports = (req, res, next) => {
  const key = req.ip;

  const count = hits.get(key) || 0;
  if (count > 30) {
    return res.status(429).json({ message: 'Too many requests' });
  }

  hits.set(key, count + 1);

  setTimeout(() => hits.delete(key), 60 * 1000);
  next();
};
