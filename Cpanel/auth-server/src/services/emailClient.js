const nodemailer = require('nodemailer');

let EmailClientPackage;
try {
  EmailClientPackage = require('@mspkapps/email-client');
} catch (e) {
  const path = require('path');
  EmailClientPackage = require(path.resolve(__dirname, '../../../../../EmailServiceNpm/src/index.cjs'));
}

const { EmailClient: MspkEmailClient } = EmailClientPackage;

/**
 * Central Email Service Client for Auth Server (CPanel Backend)
 * Built on top of the official @mspkapps/email-client SDK.
 */
class EmailClient {
  constructor(config = {}) {
    this.baseUrl =
      config.baseUrl ||
      process.env.MSPK_EMAIL_SERVICE_URL ||
      process.env.MSPK_EMAIL_API_URL ||
      'http://admin-backend:8000/api/email-service';
    this.serviceKeyId =
      config.serviceKeyId ||
      process.env.MSPK_EMAIL_SERVICE_KEY_ID ||
      process.env.MSPK_EMAIL_KEY_ID ||
      'esk_29de5615849b05ded54fb0b47911c620';
    this.serviceKeySecret =
      config.serviceKeySecret ||
      process.env.MSPK_EMAIL_SERVICE_KEY_SECRET ||
      process.env.MSPK_EMAIL_KEY_SECRET ||
      'esks_251dec90e8e9f85f4e23de515be42ade7afbb26a53a23dbd5f725a6eaf7a080e';
    this.supportEmail =
      config.supportEmail ||
      process.env.PRODUCT_SUPPORT_EMAIL ||
      'authservices.mspk@mspkapps.in';

    try {
      this.client = new MspkEmailClient({
        baseUrl: this.baseUrl,
        serviceKeyId: this.serviceKeyId,
        serviceKeySecret: this.serviceKeySecret
      });
    } catch (err) {
      console.warn('[EmailClient] @mspkapps/email-client init warning:', err.message);
      this.client = null;
    }
  }

  /**
   * Direct SMTP fallback if email service is unavailable
   */
  async _fallbackDirectSmtp({ to, subject, html, fromName }) {
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
        from: `"${fromName || 'MSPK™ Auth Server'}" <${process.env.FROM_EMAIL || this.supportEmail}>`,
        to,
        subject,
        html,
      };

      const info = await transporter.sendMail(mailOptions);
      return { success: true, fallback: true, info };
    } catch (fallbackError) {
      console.error('[EmailClientFallback] Direct SMTP sending failed:', fallbackError);
      return { success: false, error: fallbackError };
    }
  }

  /**
   * Send email via @mspkapps/email-client SDK
   */
  async send({
    to,
    subject,
    html,
    fromName = 'MSPK™ Auth Server',
    smtpProfileName = 'default',
    parentRefId = null,
    threadId = null,
    metadata = {}
  }) {
    if (!this.client) {
      return this._fallbackDirectSmtp({ to, subject, html, fromName });
    }

    try {
      const resp = await this.client.send({
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        fromName,
        smtpProfileName,
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
      console.warn('[EmailClient] Central Email Service dispatch warning:', err.message);
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        return this._fallbackDirectSmtp({ to, subject, html, fromName });
      }
      return { success: false, error: err.message || err };
    }
  }
}

const emailClient = new EmailClient();

module.exports = {
  EmailClient,
  emailClient
};
