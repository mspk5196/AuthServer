const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@mspk.in';

const buildVerifyAccountEmail = ({ name, verifyLink }) => `
  <img src="https://mspk.in/logo.png" alt="MSPK™ Apps" style="height:40px;margin-bottom:16px;" />
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
  <img src="https://mspk.in/logo.png" alt="MSPK™ Apps" style="height:40px;margin-bottom:16px;" />
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
  <img src="https://mspk.in/logo.png" alt="MSPK™ Apps" style="height:40px;margin-bottom:16px;" />
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
  <img src="https://mspk.in/logo.png" alt="MSPK™ Apps" style="height:40px;margin-bottom:16px;" />
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
  <img src="https://mspk.in/logo.png" alt="MSPK™ Apps" style="height:40px;margin-bottom:16px;" />
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
  <img src="https://mspk.in/logo.png" alt="MSPK™ Apps" style="height:40px;margin-bottom:16px;" />
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
  <img src="https://mspk.in/logo.png" alt="MSPK™ Apps" style="height:40px;margin-bottom:16px;" />
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
  <img src="https://mspk.in/logo.png" alt="MSPK™ Apps" style="height:40px;margin-bottom:16px;" />
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
  <img src="https://mspk.in/logo.png" alt="MSPK™ Apps" style="height:40px;margin-bottom:16px;" />
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
  <img src="https://mspk.in/logo.png" alt="MSPK Apps" style="height:40px;margin-bottom:16px;" />
  <h2>Password Change Request</h2>
  <p>Hello ${name},</p>
  <p>You requested to change your password. Click the button below to proceed:</p>
  <p style="margin: 20px 0;">
    <a href="${changeUrl}" target="_blank" style="background-color: #1a73e8; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; font-size: 14px;">Change Password</a>
  </p>
  <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">
    If the button above doesn't work, copy and paste this link into your browser:<br>
    <a href="${changeUrl}" style="color: #1a73e8; word-break: break-all;">${changeUrl}</a>
  </p>
  <br />
  <p>This link will expire in 1 hour.</p>
  <p>If you didn't request this, please ignore this email.</p>
  <br />
  <p>Best regards,<br />MSPK Auth Platform Support</p>
  <p>Contact support at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
    <p>Powered by MSPK™ Apps</p>
`;

const buildPasswordResetEmail = ({ name, resetUrl }) => `
  <img src="https://mspk.in/logo.png" alt="MSPK Apps" style="height:40px;margin-bottom:16px;" />
  <h2>Reset Your Password</h2>
  <p>Hello ${name},</p>
  <p>You requested to reset your password. Click the button below to proceed:</p>
  <p style="margin: 20px 0;">
    <a href="${resetUrl}" target="_blank" style="background-color: #1a73e8; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; font-size: 14px;">Reset Password</a>
  </p>
  <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">
    If the button above doesn't work, copy and paste this link into your browser:<br>
    <a href="${resetUrl}" style="color: #1a73e8; word-break: break-all;">${resetUrl}</a>
  </p>
  <br />
  <p>This link will expire in 1 hour.</p>
  <p>If you didn't request this, please ignore this email.</p>
  <br />
  <p>Best regards,<br />MSPK Auth Platform Support</p>
  <p>Contact support at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
    <p>Powered by MSPK™ Apps</p>
`;

/**
 * Plan expiry warning — sent 7, 5, 2, 1 day(s) before end_date
 * @param {object} p
 * @param {string} p.name
 * @param {string} p.planName
 * @param {number} p.daysLeft
 * @param {Date}   p.endDate
 * @param {string} p.renewUrl
 */
const buildPlanExpiryWarningEmail = ({ name, planName, daysLeft, endDate, renewUrl }) => {
  const endDateText = endDate ? new Date(endDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Soon';
  const urgency = daysLeft === 1 ? '🚨 Last day!' : daysLeft <= 2 ? '⚠️ Expiring very soon' : '⏰ Expiring soon';
  return `
  <img src="https://mspkapps.in/logo.png" alt="MSPK™ Apps" style="height:40px;margin-bottom:16px;" />
  <h2>${urgency} — Your plan expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}</h2>
  <p>Hello ${name},</p>
  <p>Your plan <strong>${planName}</strong> will expire on <strong>${endDateText}</strong>.</p>
  <p>To keep uninterrupted access to your apps and APIs, please renew before the expiry date.</p>
  <p style="margin-top:20px;">
    <a href="${renewUrl || '#'}" target="_blank"
       style="background:#1a73e8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">
      Renew Now
    </a>
  </p>
  <br />
  <p>Best regards,<br />MSPK™ Auth Platform Support</p>
  <p>Contact support at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
  <p>Powered by MSPK™ Apps</p>
`;
};

/**
 * Post-expiry reminder — sent every 2 days after plan has expired
 * @param {object} p
 * @param {string} p.name
 * @param {string} p.planName
 * @param {Date}   p.endDate
 * @param {string} p.renewUrl
 */
const buildPostExpiryReminderEmail = ({ name, planName, endDate, renewUrl }) => {
  const endDateText = endDate ? new Date(endDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'expired';
  return `
  <img src="https://mspkapps.in/logo.png" alt="MSPK™ Apps" style="height:40px;margin-bottom:16px;" />
  <h2>Your plan has expired — API access is restricted</h2>
  <p>Hello ${name},</p>
  <p>Your plan <strong>${planName}</strong> expired on <strong>${endDateText}</strong>.</p>
  <p>All API requests from your apps are currently <strong>blocked</strong> until you renew or select a new plan.</p>
  <p style="margin-top:20px;">
    <a href="${renewUrl || '#'}" target="_blank"
       style="background:#d93025;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">
      Renew / Upgrade Plan
    </a>
  </p>
  <br />
  <p>Best regards,<br />MSPK™ Auth Platform Support</p>
  <p>Contact support at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
  <p>Powered by MSPK™ Apps</p>
`;
};

/**
 * Payment receipt email
 * @param {object} p
 * @param {string} p.name
 * @param {string} p.receiptNumber
 * @param {string} p.planName
 * @param {string} p.paymentType  — initial_purchase | renewal | upgrade
 * @param {number} p.amount
 * @param {string} p.currency
 * @param {string} p.paymentMethod
 * @param {string} p.paymentId
 * @param {string} p.orderId
 * @param {Date}   p.planStartDate
 * @param {Date}   p.planEndDate
 * @param {Date}   p.createdAt
 */
const buildReceiptEmail = ({
  name, receiptNumber, planName, paymentType, amount, currency,
  paymentMethod, paymentId, orderId, planStartDate, planEndDate, createdAt
}) => {
  const typeLabel = { initial_purchase: 'New Purchase', renewal: 'Renewal', upgrade: 'Upgrade' }[paymentType] || 'Payment';
  const startText = planStartDate ? new Date(planStartDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  const endText = planEndDate ? new Date(planEndDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'No expiry';
  const dateText = createdAt ? new Date(createdAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
    <div style="background:#1a73e8;padding:24px;text-align:center;">
      <img src="https://mspkapps.in/logo.png" alt="MSPK™ Apps" style="height:40px;margin-bottom:8px;" />
      <h2 style="color:#fff;margin:0;">Payment Receipt</h2>
    </div>
    <div style="padding:24px;">
      <p>Hello ${name},</p>
      <p>Thank you for your payment. Your receipt is below.</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        <tr style="background:#f5f5f5;">
          <td style="padding:8px 12px;font-weight:bold;width:45%;">Receipt No.</td>
          <td style="padding:8px 12px;">${receiptNumber}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:bold;">Transaction Type</td>
          <td style="padding:8px 12px;">${typeLabel}</td>
        </tr>
        <tr style="background:#f5f5f5;">
          <td style="padding:8px 12px;font-weight:bold;">Plan</td>
          <td style="padding:8px 12px;">${planName}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:bold;">Amount Paid</td>
          <td style="padding:8px 12px;font-size:18px;font-weight:bold;color:#1a73e8;">₹${parseFloat(amount).toFixed(2)} ${currency}</td>
        </tr>
        <tr style="background:#f5f5f5;">
          <td style="padding:8px 12px;font-weight:bold;">Payment Method</td>
          <td style="padding:8px 12px;">${paymentMethod || '—'}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:bold;">Payment ID</td>
          <td style="padding:8px 12px;font-size:12px;">${paymentId || '—'}</td>
        </tr>
        <tr style="background:#f5f5f5;">
          <td style="padding:8px 12px;font-weight:bold;">Order ID</td>
          <td style="padding:8px 12px;font-size:12px;">${orderId}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:bold;">Plan Active From</td>
          <td style="padding:8px 12px;">${startText}</td>
        </tr>
        <tr style="background:#f5f5f5;">
          <td style="padding:8px 12px;font-weight:bold;">Plan Valid Until</td>
          <td style="padding:8px 12px;">${endText}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:bold;">Date</td>
          <td style="padding:8px 12px;">${dateText}</td>
        </tr>
      </table>
      <br />
      <p>Please keep this email as your payment confirmation.</p>
      <p>Best regards,<br />MSPK™ Auth Platform Support</p>
      <p>Contact support at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
      <p style="color:#888;font-size:12px;">Powered by MSPK™ Apps</p>
    </div>
  </div>
`;
};

/**
 * Feedback acknowledgement email
 * @param {object} p
 * @param {string} p.name
 * @param {string} p.type  — feedback | issue
 * @param {string} p.title
 */
const buildFeedbackAckEmail = ({ name, type, title }) => `
  <img src="https://mspkapps.in/logo.png" alt="MSPK™ Apps" style="height:40px;margin-bottom:16px;" />
  <h2>We received your ${type === 'issue' ? 'Issue Report' : 'Feedback'}</h2>
  <p>Hello ${name},</p>
  <p>Thank you for submitting your ${type === 'issue' ? 'issue' : 'feedback'}${title ? `: <strong>${title}</strong>` : ''}.</p>
  <p>Our team will review it and get back to you if needed.</p>
  <br />
  <p>Best regards,<br />MSPK™ Auth Platform Support</p>
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
  buildPlanExpiryWarningEmail,
  buildPostExpiryReminderEmail,
  buildReceiptEmail,
  buildFeedbackAckEmail,
};
