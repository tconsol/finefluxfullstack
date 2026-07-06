module.exports = function employeeHeader(req, res, next) {
  req.employeeId = req.headers['x-employee-id'] || null;
  next();
};
