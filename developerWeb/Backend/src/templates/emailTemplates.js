const buildVerifyAccountEmail = ({ name, verifyLink }) => `
  <h2>Verify your Developer Account</h2>
  <p>Hello ${name},</p>
  <p>Click the link below to verify your account (valid for <b>5 minutes</b>):</p>
  <a href="${verifyLink}" target="_blank" style="color:#1a73e8;">Verify My Account</a>
  <br /><br />
  <p>If you did not request this, please ignore this email.</p>
`;

const buildEmailUpdateVerificationEmail = ({ name, verifyLink }) => `
  <h2>Verify Your New Email Address</h2>
  <p>Hello ${name},</p>
  <p>You recently changed your email address. Please verify your new email by clicking the link below (valid for 5 minutes):</p>
  <a href="${verifyLink}" target="_blank" style="color:#1a73e8;">Verify New Email</a>
  <br /><br />
  <p>If you did not make this change, please contact support immediately.</p>
`;

const buildPasswordChangedEmail = ({ name, changedAt }) => `
  <h2>Password Changed Successfully</h2>
  <p>Hello ${name},</p>
  <p>Your password was recently changed for your developer account.</p>
  <p><strong>If you made this change</strong>, you can ignore this email.</p>
  <p><strong>If you did not make this change</strong>, please contact our support team immediately and reset your password.</p>
  <br />
  <p>Changed at: ${changedAt}</p>
  <br />
  <p>Best regards,<br />MSPK Auth Platform Support</p>
`;

const buildPlanSelectionEmail = ({ name, changedAt }) => `
  <h2>Plan Selected Successfully</h2>
  <p>Hello ${name},</p>
  <p>Your plan has been successfully selected for your developer account.</p>
  <p><strong>If you made this change</strong>, you can ignore this email.</p>
  <p><strong>If you did not make this change</strong>, please contact our support team immediately.</p>
  <br />
  <p>Changed at: ${changedAt}</p>
  <br />
  <p>Best regards,<br />MSPK Auth Platform Support</p>
`;

const buildPasswordChangeRequestEmail = ({ name, changeUrl }) => `
  <h2>Password Change Request</h2>
  <p>Hello ${name},</p>
  <p>You requested to change your password. Click the link below to proceed:</p>
  <a href="${changeUrl}" target="_blank" style="color:#1a73e8;">Change Password</a>
  <br /><br />
  <p>This link will expire in 1 hour.</p>
  <p>If you didn't request this, please ignore this email.</p>
  <br />
  <p>Best regards,<br />MSPK Auth Platform Support</p>
`;

const buildPasswordResetEmail = ({ name, resetUrl }) => `
  <h2>Reset Your Password</h2>
  <p>Hello ${name},</p>
  <p>You requested to reset your password. Click the link below to proceed:</p>
  <a href="${resetUrl}" target="_blank" style="color:#1a73e8;">Reset Password</a>
  <br /><br />
  <p>This link will expire in 1 hour.</p>
  <p>If you didn't request this, please ignore this email.</p>
  <br />
  <p>Best regards,<br />MSPK Auth Platform Support</p>
`;

module.exports = {
  buildVerifyAccountEmail,
  buildEmailUpdateVerificationEmail,
  buildPasswordChangedEmail,
  buildPlanSelectionEmail,
  buildPasswordChangeRequestEmail,
  buildPasswordResetEmail,
};
