const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const corsConfig = require('./config/cors');
const correlationId = require('./middleware/correlationId');
const requestLogger = require('./middleware/requestLogger');
const employeeHeader = require('./middleware/employeeHeader');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const orgScopedRoutes = require('./routes/orgScopedRoutes');
const meterSalesRoutes = require('./routes/meterSalesRoutes');

const app = express();

app.use(helmet());
app.use(cors(corsConfig));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(correlationId);
app.use(requestLogger);
app.use(employeeHeader);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/meter-sales', meterSalesRoutes);

// Order matters: the org-scoped router (extra path segment) must be tried
// before the plain organization CRUD router so /:orgId/employees etc. resolve
// correctly and requests without a sub-resource fall through to organizationRoutes.
app.use('/api/organizations/:orgId', orgScopedRoutes);
app.use('/api/organizations', organizationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
