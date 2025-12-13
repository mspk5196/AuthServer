// User registration and verification
const buildWelcomeVerificationEmail = ({ appName, verificationUrl }) => `
  <h2>Welcome to ${appName}!</h2>
  <p>Please verify your email address by clicking the link below:</p>
  <a href="${verificationUrl}">${verificationUrl}</a>
  <p>This link will expire in 24 hours.</p>
`;

// Password reset request
const buildPasswordResetEmail = ({ name, resetUrl }) => `
  <h2>Password Reset Request</h2>
  <p>Hi ${name || 'there'},</p>
  <p>Click the link below to reset your password:</p>
  <a href="${resetUrl}">${resetUrl}</a>
  <p>This link will expire in 1 hour.</p>
  <p>If you didn't request this, please ignore this email.</p>
`;

// Change password link
const buildChangePasswordLinkEmail = ({ appName, name, verificationUrl }) => `
  <h2>Change your password on ${appName}</h2>
  <p>Hi ${name || 'there'},</p>
  <p>Click the link below to open the password change page:</p>
  <a href="${verificationUrl}">${verificationUrl}</a>
  <p>This link will expire in 24 hours.</p>
  <p>If you didn't request this, you can ignore this email.</p>
`;

// Password changed confirmation
const buildPasswordChangedEmail = ({ appName, changedAt }) => `
  <h2>Your account password was changed on ${appName} at ${changedAt}!</h2>
  <p>If you did not initiate this change, please contact support immediately.</p>
  <p>Authentication system powered by MSPK Apps.</p>
`;

// Email verification (general)
const buildEmailVerificationEmail = ({ name, verificationUrl, verifyPurpose }) => `
  <h2>Email Verification</h2>
  <p>Hi ${name || 'there'},</p>
  <p>Please verify your email address by clicking the link below:</p>
  <a href="${verificationUrl}">${verificationUrl}</a>
  <p>This link will expire in 24 hours.</p>
  <p>Purpose: ${verifyPurpose}</p>
`;

// Account deletion request
const buildDeleteAccountEmail = ({ appName, verificationUrl }) => `
  <h2>Reconsider deleting your account on ${appName}!</h2>
  <p>If you still want to proceed, please confirm your email address by clicking the link below:</p>
  <a href="${verificationUrl}">${verificationUrl}</a>
  <p style="color:blue;">This link will expire in 24 hours.</p>
  <p style="color:red;">All Data associated with your account will be permanently deleted upon confirmation.</p>
  <p style="color:red;">This action is irreversible.</p>
`;

// Account deleted confirmation
const buildAccountDeletedEmail = ({ appName, deletedAt }) => `
  <h2>Your account was deleted on ${appName} at ${deletedAt}!</h2>
  <p>All data associated with your account has been permanently deleted.</p>
  <p>Authentication system powered by MSPK Apps.</p>
`;

// Google user welcome email
const buildGoogleUserWelcomeEmail = ({ appName, email, verificationUrl }) => `
  <h2>Welcome to ${appName}!</h2>
  <p>Your account has been created with Google Sign-In: ${email}</p>
  <p>To enable traditional email/password login, you can optionally set a password:</p>
  <a href="${verificationUrl}">${verificationUrl}</a>
  <p>This link will expire in 24 hours.</p>
  <p>Authentication system powered by MSPK Apps.</p>
`;

// Set password for Google user
const buildSetPasswordGoogleUserEmail = ({ appName, name, verificationUrl }) => `
  <h2>Here is your link requested to set password for ${appName}</h2>
  <p>Hi ${name || 'there'},</p>
  <p>Please set your password by clicking the link below:</p>
  <a href="${verificationUrl}">${verificationUrl}</a>
  <p>This link will expire in 24 hours.</p>
  <p>Purpose: Set Password - Google User</p>
  <p>Authentication system powered by MSPK Apps.</p>
`;

// Password set confirmation for Google user
const buildPasswordSetConfirmationEmail = ({ changedAt }) => `
  <h2>Your password was set on ${changedAt}!</h2>
  <p>You can now login with your email and password.</p>
  <p>Authentication system powered by MSPK Apps.</p>
`;

// App support email verification
const buildAppSupportEmailVerificationEmail = ({ appName, verificationUrl }) => `
  <h2>Verify Your App Support Email</h2>
  <p>Hi Developer,</p>
  <p>Please verify the support email for your application <strong>${appName}</strong> by clicking the link below:</p>
  <a href="${verificationUrl}">Verify Email</a>
  <p>This link will expire in 24 hours.</p>
  <p>If you didn't create this app, you can ignore this email.</p>
`;

// App support email update verification
const buildAppSupportEmailUpdateEmail = ({ appName, verificationUrl }) => `
  <h2>Verify Updated Support Email</h2>
  <p>Hi Developer,</p>
  <p>You've updated the support email for your application <strong>${appName}</strong>. Please verify this new email by clicking the link below:</p>
  <a href="${verificationUrl}">Verify Email</a>
  <p>This link will expire in 24 hours.</p>
`;

module.exports = {
  buildWelcomeVerificationEmail,
  buildPasswordResetEmail,
  buildChangePasswordLinkEmail,
  buildPasswordChangedEmail,
  buildEmailVerificationEmail,
  buildDeleteAccountEmail,
  buildAccountDeletedEmail,
  buildGoogleUserWelcomeEmail,
  buildSetPasswordGoogleUserEmail,
  buildPasswordSetConfirmationEmail,
  buildAppSupportEmailVerificationEmail,
  buildAppSupportEmailUpdateEmail,
};
