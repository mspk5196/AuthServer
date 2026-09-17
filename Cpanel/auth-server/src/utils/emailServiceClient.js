'use strict';

const nodemailer = require('nodemailer');

let _clientInstance = null;

async function getSdkClient(config = {}) {
  if (_clientInstance) return _clientInstance;

  try {
    let EmailClientClass;
    try {
      const mod = await import('@mspkapps/email-client');
      EmailClientClass = mod.EmailClient || mod.default?.EmailClient;
    } catch {
      const mod = require('@mspkapps/email-client');
      EmailClientClass = mod.EmailClient;
    }

    if (EmailClientClass) {
      _clientInstance = new EmailClientClass({
        baseUrl:
          (config.baseUrl ||
            process.env.MSPK_EMAIL_SERVICE_URL ||
            process.env.MSPK_EMAIL_API_URL ||
            'http://admin-backend:8000').replace(/\/api\/email-service\/?$/, '').replace(/\/+$/, ''),
        serviceKeyId:
          config.serviceKeyId ||
          process.env.MSPK_EMAIL_SERVICE_KEY_ID ||
          process.env.MSPK_EMAIL_KEY_ID ||
          'esk_29de5615849b05ded54fb0b47911c620',
        serviceKeySecret:
          config.serviceKeySecret ||
          process.env.MSPK_EMAIL_SERVICE_KEY_SECRET ||
          process.env.MSPK_EMAIL_KEY_SECRET ||
          'esks_251dec90e8e9f85f4e23de515be42ade7afbb26a53a23dbd5f725a6eaf7a080e'
      });
    }
  } catch (err) {
    console.warn('[EmailServiceClient] Warning initializing @mspkapps/email-client SDK:', err.message);
  }

  return _clientInstance;
}

/**
 * Direct SMTP fallback if Central Email Service is unavailable
 */
async function fallbackDirectSmtp({ to, subject, html, fromName }) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"${fromName || 'MSPK™ Auth Server'}" <${process.env.FROM_EMAIL || process.env.PRODUCT_SUPPORT_EMAIL || 'authservices.mspk@mspkapps.in'}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, fallback: true, info };
  } catch (fallbackError) {
    console.error('[EmailClientFallback] Direct SMTP sending failed:', fallbackError.message || fallbackError);
    return { success: false, error: fallbackError.message || fallbackError };
  }
}

/**
 * Send email using @mspkapps/email-client SDK with SMTP fallback
 */
async function send({
  to,
  subject,
  html,
  fromName = 'MSPK™ Auth Server',
  smtpProfileName = 'default',
  parentRefId = null,
  threadId = null,
  metadata = {}
}) {
  const client = await getSdkClient();
  if (!client) {
    return fallbackDirectSmtp({ to, subject, html, fromName });
  }

  try {
    const resp = await client.send({
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      fromName,
      smtpProfileName: smtpProfileName || 'default',
      parentRefId,
      threadId,
      metadata
    });

    return {
      success: resp?.success !== false,
      data: resp,
      refId: resp?.refId,
      threadId: resp?.threadId
    };
  } catch (err) {
    console.warn('[EmailServiceClient] Central Email Service dispatch warning:', err.message);
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      return fallbackDirectSmtp({ to, subject, html, fromName });
    }
    return { success: false, error: err.message || err };
  }
}

/**
 * Send an email to a developer (Auth Server's direct user)
 */
async function sendDevEmail({ to, subject, html, fromName, metadata }) {
  return send({
    to,
    subject,
    html,
    fromName: fromName || 'MSPK™ Auth Server',
    smtpProfileName: 'support',
    metadata
  });
}

/**
 * Send an email to an end-user of a developer's app (indirect users)
 */
async function sendAppUserEmail({ to, subject, html, fromName, smtpProfileName, parentRefId, threadId, metadata }) {
  return send({
    to,
    subject,
    html,
    fromName: fromName || 'MSPK™ Auth Server',
    smtpProfileName: smtpProfileName || 'default',
    parentRefId,
    threadId,
    metadata
  });
}

/**
 * Developer-triggered custom email (POST /:apiKey/mail/send endpoint)
 */
async function sendAppMail({ to, subject, html, fromName, smtpProfileName, parentRefId, threadId, metadata }) {
  return send({
    to,
    subject,
    html,
    fromName: fromName || 'MSPK™ Auth Server',
    smtpProfileName: smtpProfileName || 'default',
    parentRefId,
    threadId,
    metadata
  });
}

module.exports = {
  send,
  sendDevEmail,
  sendAppUserEmail,
  sendAppMail
};
