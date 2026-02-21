module.exports = (req, res, next) => {

  req.requestId =
   Date.now() + "-" + Math.random();

  console.log(
    "REQ:",
    req.method,
    req.originalUrl,
    req.requestId
  );

  next();
};
