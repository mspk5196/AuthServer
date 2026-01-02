const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support.mspk@mspkapps.in';

const buildVerifyAccountEmail = ({ name, verifyLink }) => `
  <img src="https://mspkapps.in/logo.png" alt="MSPK™ Apps" style="height:40px;margin-bottom:16px;" />
  <h2>Verify your Developer Account</h2>
  <p>Hello ${name},</p>
  <p>Click the link below to verify your account (valid for <b>5 minutes</b>):</p>
  <a href="${verifyLink}" target="_blank" style="color:#1a73e8;">Verify My Account</a>
  <br /><br />
  <p>If you did not request this, please ignore this email.</p>
  <br />
  <p>Contact support at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
  <p>Powered by MSPK™ Apps</p>
`;

const buildEmailUpdateVerificationEmail = ({ name, verifyLink }) => `
  <img src="https://mspkapps.in/logo.png" alt="MSPK™ Apps" style="height:40px;margin-bottom:16px;" />
  <h2>Verify Your New Email Address</h2>
  <p>Hello ${name},</p>
  <p>You recently changed your email address. Please verify your new email by clicking the link below (valid for 5 minutes):</p>
  <a href="${verifyLink}" target="_blank" style="color:#1a73e8;">Verify New Email</a>
  <br /><br />
  <p>If you did not make this change, please contact support immediately.</p>
  <br />
  <p>Contact support at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
  <p>Powered by MSPK™ Apps</p>
`;

const buildPasswordChangedEmail = ({ name, changedAt }) => `
  <img src="https://mspkapps.in/logo.png" alt="MSPK™ Apps" style="height:40px;margin-bottom:16px;" />
  <h2>Password Changed Successfully</h2>
  <p>Hello ${name},</p>
  <p>Your password was recently changed for your developer account.</p>
  <p><strong>If you made this change</strong>, you can ignore this email.</p>
  <p><strong>If you did not make this change</strong>, please contact our support team immediately and reset your password.</p>
  <br />
  <p>Changed at: ${changedAt}</p>
  <br />
    <p>Best regards,<br />MSPK™ Auth Platform Support</p>
  <p>Contact support at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
  <p>Powered by MSPK™ Apps</p>
`;

const buildPlanSelectionEmail = ({ name, changedAt }) => `
  <img src="https://mspkapps.in/logo.png" alt="MSPK™ Apps" style="height:40px;margin-bottom:16px;" />
  <h2>Plan Selected Successfully</h2>
  <p>Hello ${name},</p>
  <p>Your plan has been successfully selected for your developer account.</p>
  <p><strong>If you made this change</strong>, you can ignore this email.</p>
  <p><strong>If you did not make this change</strong>, please contact our support team immediately.</p>
  <br />
  <p>Changed at: ${changedAt}</p>
  <br />
    <p>Best regards,<br />MSPK™ Auth Platform Support</p>
  <p>Contact support at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
  <p>Powered by MSPK™ Apps</p>
`;

const buildPlanChangeEmail = ({ name, planName, action, startDate, endDate, changedAt }) => {
  const actionLabel = {
    initial_selection: 'selected',
    upgrade: 'upgraded',
    renewal: 'renewed'
  }[action] || 'updated';

  const endDateText = endDate ? new Date(endDate).toLocaleString() : 'No expiry';
  const startDateText = startDate ? new Date(startDate).toLocaleString() : 'Now';

  return `
  <img src="https://mspkapps.in/logo.png" alt="MSPK™ Apps" style="height:40px;margin-bottom:16px;" />
  <h2>Plan ${actionLabel}</h2>
  <p>Hello ${name},</p>
  <p>Your plan has been ${actionLabel}: <strong>${planName}</strong>.</p>
  <ul>
    <li>Start Date: ${startDateText}</li>
    <li>End Date: ${endDateText}</li>
  </ul>
  <p><strong>If you made this change</strong>, no further action is required.</p>
  <p><strong>If you did not make this change</strong>, please contact our support team immediately.</p>
  <br />
  <p>Changed at: ${changedAt}</p>
  <br />
    <p>Best regards,<br />MSPK™ Auth Platform Support</p>
  <p>Contact support at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
  <p>Powered by MSPK™ Apps</p>
`;
};

const buildPlanCancelledEmail = ({ name, planName, cancelledAt, endDate }) => {
  const endDateText = endDate ? new Date(endDate).toLocaleString() : 'Immediately';

  return `
  <img src="https://mspkapps.in/logo.png" alt="MSPK™ Apps" style="height:40px;margin-bottom:16px;" />
  <h2>Plan Cancelled</h2>
  <p>Hello ${name},</p>
  <p>Your plan <strong>${planName}</strong> has been cancelled.</p>
  <ul>
    <li>Effective from: ${endDateText}</li>
  </ul>
  <p>Your account features may be limited based on your plan status.</p>
  <p>If you did not request this cancellation, please contact our support team immediately.</p>
  <br />
  <p>Cancelled at: ${cancelledAt}</p>
  <br />
    <p>Best regards,<br />MSPK™ Auth Platform Support</p>
  <p>Contact support at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
  <p>Powered by MSPK™ Apps</p>
`;
};

const buildPlanExpiredEmail = ({ name, planName, endDate }) => {
  const endDateText = endDate ? new Date(endDate).toLocaleString() : 'Already expired';
  return `
  <img src="https://mspkapps.in/logo.png" alt="MSPK™ Apps" style="height:40px;margin-bottom:16px;" />
  <h2>Your plan has expired</h2>
  <p>Hello ${name},</p>
  <p>Your plan <strong>${planName}</strong> has expired.</p>
  <ul>
    <li>Ended on: ${endDateText}</li>
  </ul>
  <p>Your account features may be limited until you renew or choose a new plan.</p>
  <p>Please log in to renew or upgrade your plan.</p>
  <br />
      <p>Best regards,<br />MSPK™ Auth Platform Support</p>
  <p>Contact support at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
  <p>Powered by MSPK™ Apps</p>
`;
};

const buildPlanInactiveEmail = ({ name, planName }) => `
  <img src="https://mspkapps.in/logo.png" alt="MSPK™ Apps" style="height:40px;margin-bottom:16px;" />
  <h2>Your plan was deactivated</h2>
  <p>Hello ${name},</p>
  <p>Your plan <strong>${planName}</strong> has been deactivated because it is no longer available.</p>
  <p>Please choose another active plan to continue using premium features.</p>
  <br />
    <p>Best regards,<br />MSPK™ Auth Platform Support</p>
  <p>Contact support at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
  <p>Powered by MSPK™ Apps</p>
`;

const buildUsageReminderEmail = ({
  name,
  planName,
  maxApps,
  appsUsed,
  appsRemaining,
  maxApiCalls,
  apiCallsUsed,
  apiCallsRemaining,
}) => {
  const appsLimitText =
    maxApps === null || maxApps === undefined || Number.isNaN(maxApps)
      ? 'Unlimited apps'
      : `${maxApps} apps`;

  const apiLimitText =
    maxApiCalls === null || maxApiCalls === undefined || Number.isNaN(maxApiCalls)
      ? 'Unlimited API calls per month'
      : `${maxApiCalls.toLocaleString()} API calls per month`;

  const appsRemainingText =
    appsRemaining === null || appsRemaining === undefined
      ? 'Unlimited'
      : `${appsRemaining}`;

  const apiRemainingText =
    apiCallsRemaining === null || apiCallsRemaining === undefined
      ? 'Unlimited'
      : `${apiCallsRemaining.toLocaleString()}`;

  return `
  <img src="https://mspkapps.in/logo.png" alt="MSPK™ Apps" style="height:40px;margin-bottom:16px;" />
  <h2>Monthly Usage Summary</h2>
  <p>Hello ${name},</p>
  <p>Here is your current usage summary for plan <strong>${planName}</strong>:</p>
  <ul>
    <li><strong>Apps in use:</strong> ${appsUsed} / ${appsLimitText} (Remaining: ${appsRemainingText})</li>
    <li><strong>API calls used this month:</strong> ${apiCallsUsed.toLocaleString()} / ${apiLimitText} (Remaining: ${apiRemainingText})</li>
  </ul>
  <p>This email is sent to help you track your usage and avoid hitting plan limits.</p>
  <p>You can upgrade your plan at any time from the developer portal.</p>
  <br />
  <p>Best regards,<br />MSPK™ Auth Platform Support</p>
  <p>Contact support at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
  <p>Powered by MSPK™ Apps</p>
`;
};

const buildPasswordChangeRequestEmail = ({ name, changeUrl }) => `
  <img src="https://mspkapps.in/logo.png" alt="MSPK Apps" style="height:40px;margin-bottom:16px;" />
  <h2>Password Change Request</h2>
  <p>Hello ${name},</p>
  <p>You requested to change your password. Click the link below to proceed:</p>
  <a href="${changeUrl}" target="_blank" style="color:#1a73e8;">Change Password</a>
  <br /><br />
  <p>This link will expire in 1 hour.</p>
  <p>If you didn't request this, please ignore this email.</p>
  <br />
  <p>Best regards,<br />MSPK Auth Platform Support</p>
  <p>Contact support at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
    <p>Powered by MSPK™ Apps</p>
`;

const buildPasswordResetEmail = ({ name, resetUrl }) => `
  <img src="https://mspkapps.in/logo.png" alt="MSPK Apps" style="height:40px;margin-bottom:16px;" />
  <h2>Reset Your Password</h2>
  <p>Hello ${name},</p>
  <p>You requested to reset your password. Click the link below to proceed:</p>
  <a href="${resetUrl}" target="_blank" style="color:#1a73e8;">Reset Password</a>
  <br /><br />
  <p>This link will expire in 1 hour.</p>
  <p>If you didn't request this, please ignore this email.</p>
  <br />
  <p>Best regards,<br />MSPK Auth Platform Support</p>
  <p>Contact support at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
    <p>Powered by MSPK™ Apps</p>
`;

module.exports = {
  buildVerifyAccountEmail,
  buildEmailUpdateVerificationEmail,
  buildPasswordChangedEmail,
  buildPlanSelectionEmail,
  buildPlanChangeEmail,
  buildPlanExpiredEmail,
  buildPlanInactiveEmail,
  buildPasswordChangeRequestEmail,
  buildPasswordResetEmail,
  buildPlanCancelledEmail,
  buildUsageReminderEmail,
};
