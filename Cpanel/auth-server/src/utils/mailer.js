const { emailClient } = require('../services/emailClient');

/**
 * Global Mailer Utility for Auth Server CPanel Backend
 * Dispatches all emails through the MSPK Central Email Client.
 */
const sendMail = async ({
  to,
  subject,
  html,
  from,
  fromName = 'MSPK™ Auth Server',
  smtpProfileName = 'default',
  parentRefId = null,
  threadId = null,
  metadata = {}
}) => {
  try {
    const result = await emailClient.send({
      to,
      subject,
      html,
      fromName: fromName || from || 'MSPK™ Auth Server',
      smtpProfileName,
      parentRefId,
      threadId,
      metadata
    });

    if (result.success) {
      return { success: true, info: result.data || result };
    }

    console.error('❌ Mail dispatch failed via Email Client:', result.message || result.error);
    return { success: false, error: result.message || result.error };
  } catch (error) {
    console.error('❌ Mail sending failed:', error);
    return { success: false, error };
  }
};

module.exports = { sendMail, emailClient };
