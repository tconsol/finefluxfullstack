const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');
const { ApiError } = require('../middleware/errorHandler');

exports.login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) throw new ApiError(400, 'username and password are required');
  res.json(await authService.authenticate(username, password));
});
