function successResponse(res, message = "Success", data = {}, status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
}

function errorResponse(res, message = "Internal server error", status = 500, error = null) {
  const body = {
    success: false,
    message,
  };

  if (error) {
    body.error = typeof error === "string" ? error : error?.message || error;
  }

  return res.status(status).json(body);
}

module.exports = {
  successResponse,
  errorResponse,
};
