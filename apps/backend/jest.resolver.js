module.exports = (request, options) => {
  const normalizedRequest = request.startsWith("node:")
    ? request.slice(5)
    : request;

  return options.defaultResolver(normalizedRequest, options);
};
