const crypto = require('crypto');
const nodemailer = require('nodemailer');

/**
 * Central Email Service Client for Auth Server (CPanel Backend)
 * Dispatches all product emails via MSPK Central Email Service with HMAC-SHA256 request signing.
 */
class EmailClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.MSPK_EMAIL_SERVICE_URL || 'http://admin-backend:8000/api/email-service';
    this.serviceKeyId = config.serviceKeyId || process.env.MSPK_EMAIL_SERVICE_KEY_ID || process.env.MSPK_EMAIL_KEY_ID || 'esk_29de5615849b05ded54fb0b47911c620';
    this.serviceKeySecret = config.serviceKeySecret || process.env.MSPK_EMAIL_SERVICE_KEY_SECRET || process.env.MSPK_EMAIL_KEY_SECRET || 'esks_251dec90e8e9f85f4e23de515be42ade7afbb26a53a23dbd5f725a6eaf7a080e';
    this.supportEmail = config.supportEmail || process.env.PRODUCT_SUPPORT_EMAIL || 'authservices.mspk@mspkapps.in';
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
   * Send email via Central Email Service with HMAC-SHA256 signature
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
    if (!this.serviceKeyId || !this.serviceKeySecret) {
      console.warn('[EmailClient] MSPK Email Service credentials missing. Falling back to direct SMTP.');
      return this._fallbackDirectSmtp({ to, subject, html, fromName });
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const payload = {
        to,
        subject,
        html,
        fromName,
        smtpProfileName,
        parentRefId,
        threadId,
        metadata
      };

      const bodyStr = JSON.stringify(payload);
      const bodyHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
      const pathname = '/api/email-service/send';
      const message = `POST:${pathname}:${timestamp}:${bodyHash}`;
      const signature = crypto.createHmac('sha256', this.serviceKeySecret).update(message).digest('hex');

      const endpoint = `${this.baseUrl.replace(/\/+$/, '')}/send`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Key': this.serviceKeyId,
          'X-Timestamp': timestamp,
          'X-Signature': signature
        },
        body: bodyStr
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        console.warn('[EmailClient] Central Email Service returned error:', data.message || res.statusText);
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
          return this._fallbackDirectSmtp({ to, subject, html, fromName });
        }
      }

      return { success: data.success !== false, data };
    } catch (err) {
      console.error('[EmailClient] Central email service dispatch error:', err.message);
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        return this._fallbackDirectSmtp({ to, subject, html, fromName });
      }
      return { success: false, error: err.message };
    }
  }
}

const emailClient = new EmailClient();

module.exports = {
  EmailClient,
  emailClient
};

