// helper for support contact line (app's support email must be passed)
const supportLine = (supportEmail) => supportEmail ? `<p>For support contact: <a href="mailto:${supportEmail}">${supportEmail}</a></p>` : '';

// User registration and verification
const buildWelcomeVerificationEmail = ({ appName, verificationUrl, supportEmail }) => `
  <h2>Welcome to ${appName}!</h2>
  <p>Please verify your email address by clicking the link below:</p>
  <a href="${verificationUrl}">${verificationUrl}</a>
  <p>This link will expire in 24 hours.</p>
  ${supportLine(supportEmail)}
`;

// Password reset request
const buildPasswordResetEmail = ({ name, resetUrl, supportEmail }) => `
  <h2>Password Reset Request</h2>
  <p>Hi ${name || 'there'},</p>
  <p>Click the link below to reset your password:</p>
  <a href="${resetUrl}">${resetUrl}</a>
  <p>This link will expire in 1 hour.</p>
  <p>If you didn't request this, please ignore this email.</p>
  ${supportLine(supportEmail)}
`;

// Change password link
const buildChangePasswordLinkEmail = ({ appName, name, verificationUrl, supportEmail }) => `
  <h2>Change your password on ${appName}</h2>
  <p>Hi ${name || 'there'},</p>
  <p>Click the link below to open the password change page:</p>
  <a href="${verificationUrl}">${verificationUrl}</a>
  <p>This link will expire in 24 hours.</p>
  <p>If you didn't request this, you can ignore this email.</p>
  ${supportLine(supportEmail)}
`;

// Password changed confirmation
const buildPasswordChangedEmail = ({ appName, changedAt, supportEmail }) => `
  <h2>Your account password was changed on ${appName} at ${changedAt}!</h2>
  <p>If you did not initiate this change, please contact support immediately.</p>
  <p>Authentication system powered by MSPK™ Apps (mspkapps.in).</p>
  ${supportLine(supportEmail)}
`;

// Email verification (general)
const buildEmailVerificationEmail = ({ name, verificationUrl, verifyPurpose, supportEmail }) => `
  <h2>Email Verification</h2>
  <p>Hi ${name || 'there'},</p>
  <p>Please verify your email address by clicking the link below:</p>
  <a href="${verificationUrl}">${verificationUrl}</a>
  <p>This link will expire in 24 hours.</p>
  <p>Purpose: ${verifyPurpose}</p>
  ${supportLine(supportEmail)}
`;

// Account deletion request
const buildDeleteAccountEmail = ({ appName, verificationUrl, supportEmail }) => `
  <h2>Reconsider deleting your account on ${appName}!</h2>
  <p>If you still want to proceed, please confirm your email address by clicking the link below:</p>
  <a href="${verificationUrl}">${verificationUrl}</a>
  <p style="color:blue;">This link will expire in 24 hours.</p>
  <p style="color:red;">All Data associated with your account will be permanently deleted upon confirmation.</p>
  <p style="color:red;">This action is irreversible.</p>
  ${supportLine(supportEmail)}
`;

// Account deleted confirmation
const buildAccountDeletedEmail = ({ appName, deletedAt, supportEmail }) => `
  <h2>Your account was deleted on ${appName} at ${deletedAt}!</h2>
  <p>All data associated with your account has been permanently deleted.</p>
  <p>Authentication system powered by MSPK™ Apps (mspkapps.in).</p>
  ${supportLine(supportEmail)}
`;

// Google user welcome email
const buildGoogleUserWelcomeEmail = ({ appName, email, verificationUrl, supportEmail }) => `
  <h2>Welcome to ${appName}!</h2>
  <p>Your account has been created with Google Sign-In: ${email}</p>
  <p>To enable traditional email/password login, you can optionally set a password:</p>
  <a href="${verificationUrl}">${verificationUrl}</a>
  <p>This link will expire in 24 hours.</p>
  <p>Authentication system powered by MSPK™ Apps (mspkapps.in).</p>
  ${supportLine(supportEmail)}
`;

// Set password for Google user
const buildSetPasswordGoogleUserEmail = ({ appName, name, verificationUrl, supportEmail }) => `
  <h2>Here is your link requested to set password for ${appName}</h2>
  <p>Hi ${name || 'there'},</p>
  <p>Please set your password by clicking the link below:</p>
  <a href="${verificationUrl}">${verificationUrl}</a>
  <p>This link will expire in 24 hours.</p>
  <p>Purpose: Set Password - Google User</p>
  <p>Authentication system powered by MSPK™ Apps (mspkapps.in).</p>
  ${supportLine(supportEmail)}
`;

// Password set confirmation for Google user
const buildPasswordSetConfirmationEmail = ({ changedAt, supportEmail }) => `
  <h2>Your password was set on ${changedAt}!</h2>
  <p>You can now login with your email and password.</p>
  <p>Authentication system powered by MSPK™ Apps (mspkapps.in).</p>
  ${supportLine(supportEmail)}
`;

// Profile update verification (sent when user updates profile and confirmation is required)
// Accepts optional `supportEmail` (app support email)
const buildProfileUpdateVerificationEmail = ({ name, verificationUrl, changesSummary, supportEmail }) => `
  <h2>Confirm your profile changes</h2>
  <p>Hi ${name || 'there'},</p>
  <p>We received a request to update your account. Please confirm the changes by clicking the link below:</p>
  <a href="${verificationUrl}">Confirm profile changes</a>
  <p>This link will expire in 24 hours.</p>
  ${changesSummary ? `<p>Changes: ${changesSummary}</p>` : ''}
  <p>If you did not request this change, please contact support immediately.</p>
  ${supportLine(supportEmail)}
`;

// App support email verification
const buildAppSupportEmailVerificationEmail = ({ appName, verificationUrl, supportEmail }) => `
  <h2>Verify Your App Support Email</h2>
  <p>Hi Developer,</p>
  <p>Please verify the support email for your application <strong>${appName}</strong> by clicking the link below:</p>
  <a href="${verificationUrl}">Verify Email</a>
  <p>This link will expire in 24 hours.</p>
  <p>If you didn't create this app, you can ignore this email.</p>
  ${supportLine(supportEmail)}
`;

// App support email update verification
const buildAppSupportEmailUpdateEmail = ({ appName, verificationUrl, supportEmail }) => `
  <h2>Verify Updated Support Email</h2>
  <p>Hi Developer,</p>
  <p>You've updated the support email for your application <strong>${appName}</strong>. Please verify this new email by clicking the link below:</p>
  <a href="${verificationUrl}">Verify Email</a>
  <p>This link will expire in 24 hours.</p>
  ${supportLine(supportEmail)}
`;

// App deletion confirmation (developer-initiated from cPanel)
const buildAppDeleteConfirmationEmail = ({ appName, developerName, confirmationUrl, supportEmail }) => `
  <h2>Confirm deletion of your app "${appName}"</h2>
  <p>Hi ${developerName || 'Developer'},</p>
  <p>
    You requested to <strong>permanently delete</strong> the application
    <strong>${appName}</strong> from the MSPK™ Auth Platform.
  </p>
  <p>
    Deleting this app will remove its configuration and may remove associated
    authentication data for users who sign in through this app. This action
    cannot be undone.
  </p>
  <p>
    If you are sure you want to proceed, please confirm by clicking the button below:
  </p>
  <p>
    <a href="${confirmationUrl}" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#111827;color:#ffffff;text-decoration:none;font-weight:500;">
      Yes, delete this app
    </a>
  </p>
  <p style="color:#b91c1c;font-size:13px;">
    Warning: This action is irreversible. If you did not initiate this request,
    please ignore this email or contact support.
  </p>
  ${supportLine(supportEmail)}
  <p style="margin-top:16px;font-size:12px;color:#6b7280;">
    Authentication system powered by MSPK™ Apps (mspkapps.in).
  </p>
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
  buildAppDeleteConfirmationEmail,
  buildProfileUpdateVerificationEmail,
};
