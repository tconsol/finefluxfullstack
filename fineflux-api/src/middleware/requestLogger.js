const morgan = require('morgan');

morgan.token('correlation-id', (req) => req.correlationId);

module.exports = morgan(':method :url :status :res[content-length] - :response-time ms cid=:correlation-id');
