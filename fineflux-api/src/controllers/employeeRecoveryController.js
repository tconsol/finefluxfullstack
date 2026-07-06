const asyncHandler = require('../utils/asyncHandler');
const recoveryService = require('../services/employeeRecoveryService');

exports.forgotPassword = asyncHandler(async (req, res) => {
  await recoveryService.requestPasswordReset(req.params.orgId, req.body.usernameOrEmail);
  res.status(200).json({ message: 'If the account exists, a reset link has been sent.' });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  await recoveryService.resetPassword(req.params.orgId, req.body.token, req.body.newPassword);
  res.status(200).json({ message: 'Password has been reset.' });
});

exports.forgotUsername = asyncHandler(async (req, res) => {
  await recoveryService.sendUsernameByEmail(req.params.orgId, req.body.email);
  res.status(200).json({ message: 'If the account exists, the username has been sent.' });
});
