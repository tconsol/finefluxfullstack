class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const statusCode = err.statusCode || (err.name === 'ValidationError' ? 400 : 500);
  if (statusCode >= 500) {
    console.error(`[${req.correlationId}]`, err);
  }
  res.status(statusCode).json({
    message: err.message || 'Internal server error',
    correlationId: req.correlationId
  });
}

module.exports = { ApiError, notFoundHandler, errorHandler };
