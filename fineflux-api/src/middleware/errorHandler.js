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
  // A malformed/missing :id (e.g. "undefined" from a stale frontend call) reaches
  // Mongoose as an invalid ObjectId — treat that as "not found", not a server crash.
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(404).json({ message: 'Resource not found', correlationId: req.correlationId });
  }

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
