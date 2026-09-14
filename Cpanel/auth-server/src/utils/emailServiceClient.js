'use strict';

/**
 * emailServiceClient.js
 *
 * Auth Server wrapper around @mspkapps/email-client.
 *
 * Two routing helpers:
 *   - sendDevEmail()      → developer emails (registration, app management)
 *                          Uses SMTP profile "support" on the "Auth Server" Email Service product.
 *
 *   - sendAppUserEmail()  → end-user emails (welcome, password reset, etc.)
 *                          Uses the SMTP profile configured per dev_app (smtpProfileName param).
 *                          Falls back to "default" if not set.
 *
 *   - sendAppMail()       → developer-triggered custom emails to their users
 *                          Routes through Email Service but quota logic stays here in Auth Server.
 *
 * Required env vars (add to .env / docker env):
 *   MSPK_EMAIL_SERVICE_URL        Base URL of Admin Panel backend (e.g. https://admin-api.mspkapps.in)
 *   MSPK_EMAIL_SERVICE_KEY_ID     serviceKeyId for the "Auth Server" product in Email Service
 *   MSPK_EMAIL_SERVICE_KEY_SECRET serviceKeySecret for the "Auth Server" product in Email Service
 */

let _client = null;
let _initError = null;
let _initAttempted = false;

async function _getClient() {
  if (_client) return _client;
  if (_initError) throw _initError;
  if (_initAttempted) throw new Error('Email Service client failed to initialise (check env vars)');

  _initAttempted = true;

  const keyId = process.env.MSPK_EMAIL_SERVICE_KEY_ID;
  const keySecret = process.env.MSPK_EMAIL_SERVICE_KEY_SECRET;
  const baseUrl = process.env.MSPK_EMAIL_SERVICE_URL;

  if (!keyId || !keySecret || !baseUrl) {
    const err = new Error(
      'Missing Email Service config. Set MSPK_EMAIL_SERVICE_URL, MSPK_EMAIL_SERVICE_KEY_ID, MSPK_EMAIL_SERVICE_KEY_SECRET.'
    );
    _initError = err;
    throw err;
  }

  try {
    let emailClientPkg;
    try {
      emailClientPkg = require('@mspkapps/email-client');
    } catch {
      const path = require('path');
      emailClientPkg = require(path.resolve(__dirname, '../../../../../EmailServiceNpm/src/index.cjs.js'));
    }
    const { createEmailClient } = emailClientPkg;
    _client = await createEmailClient({ serviceKeyId: keyId, serviceKeySecret: keySecret, baseUrl });
    console.log('✅ Email Service client initialised');
    return _client;
  } catch (err) {
    _initError = err;
    throw err;
  }
}

/**
 * Send an email to a developer (Auth Server's own registered user).
 * Uses SMTP profile "support" → the support email configured in Admin Panel for the Auth Server product.
 *
 * @param {{ to: string, subject: string, html: string, fromName?: string, metadata?: object }} opts
 */
async function sendDevEmail({ to, subject, html, fromName, metadata }) {
  try {
    const client = await _getClient();
    return await client.send({
      to,
      subject,
      html,
      fromName,
      smtpProfileName: 'support',
      metadata
    });
  } catch (err) {
    console.error('❌ sendDevEmail failed:', err.message || err);
    // Non-blocking — do not crash the request
    return { success: false, error: err.message };
  }
}

/**
 * Send an email to an end-user of a developer's app.
 * Uses the named SMTP profile configured on the dev_app, falling back to "default".
 *
 * @param {{ to: string, subject: string, html: string, fromName?: string, smtpProfileName?: string|null, metadata?: object }} opts
 */
async function sendAppUserEmail({ to, subject, html, fromName, smtpProfileName, metadata }) {
  try {
    const client = await _getClient();
    return await client.send({
      to,
      subject,
      html,
      fromName,
      smtpProfileName: smtpProfileName || 'default',
      metadata
    });
  } catch (err) {
    console.error('❌ sendAppUserEmail failed:', err.message || err);
    return { success: false, error: err.message };
  }
}

/**
 * Developer-triggered custom email (POST /:apiKey/mail/send endpoint).
 * Routes through Email Service but Auth Server retains quota tracking logic.
 *
 * @param {{ to: string|string[], subject: string, html: string, fromName?: string, smtpProfileName?: string|null, metadata?: object }} opts
 * @returns {{ success: boolean, refId?: string, error?: string }}
 */
async function sendAppMail({ to, subject, html, fromName, smtpProfileName, metadata }) {
  try {
    const client = await _getClient();
    return await client.send({
      to,
      subject,
      html,
      fromName,
      smtpProfileName: smtpProfileName || 'default',
      metadata
    });
  } catch (err) {
    console.error('❌ sendAppMail failed:', err.message || err);
    return { success: false, error: err.message };
  }
}

module.exports = { sendDevEmail, sendAppUserEmail, sendAppMail };
