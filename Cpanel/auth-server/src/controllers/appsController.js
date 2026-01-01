const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { sendMail } = require('../utils/mailer');
const { Parser } = require('json2csv');
const {
  buildAppSupportEmailVerificationEmail,
  buildAppSupportEmailUpdateEmail,
  buildAppDeleteConfirmationEmail,
} = require('../templates/emailTemplates');

/**
 * Generate a secure API key and secret
 */
function generateApiCredentials() {
  const apiKey = 'ak_' + crypto.randomBytes(32).toString('hex');
  const apiSecret = 'as_' + crypto.randomBytes(48).toString('hex');
  return { apiKey, apiSecret };
}

function generatePublicApiKey() {
  return 'pg_' + crypto.randomBytes(24).toString('hex');
}

/**
 * Safely parse numeric limits from plan features.
 * Returns a number, or null when unlimited/not set.
 */
function parsePlanLimit(raw) {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

/**
 * Create a new app
 */
const createApp = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { app_name, support_email, allow_google_signin = false, allow_email_signin = true, group_id = null } = req.body;

    console.log('Create app request from developer:', developerId);
    console.log('Form data:', { app_name, support_email, allow_google_signin, allow_email_signin });

    // Validation
    if (!app_name) {
      return res.status(400).json({
        success: false,
        message: 'App name is required'
      });
    }

    if (!support_email) {
      return res.status(400).json({
        success: false,
        message: 'Support email is required'
      });
    }

    // Check plan limits - FIXED: Handle both JSONB structures
    const planCheck = await pool.query(`
      SELECT 
        p.features,
        dpr.plan_id,
        p.name as plan_name
      FROM developer_plan_registrations dpr
      JOIN dev_plans p ON dpr.plan_id = p.id
      WHERE dpr.developer_id = $1 AND dpr.is_active = true
      LIMIT 1
    `, [developerId]);

    console.log('Plan check result:', planCheck.rows);

    if (planCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'No active plan found. Please subscribe to a plan first.'
      });
    }

    const planFeatures = planCheck.rows[0].features || {};
    console.log('Plan features:', planFeatures);
    
    // Extract app limits from features JSONB
    // 0 or null (or missing) means unlimited
    let maxApps = null; // total apps (standalone + in groups)
    if (planFeatures.apps_limit !== undefined && planFeatures.apps_limit !== null) {
      maxApps = parsePlanLimit(planFeatures.apps_limit);
    } else if (planFeatures.max_apps !== undefined && planFeatures.max_apps !== null) {
      maxApps = parsePlanLimit(planFeatures.max_apps);
    }

    const maxStandaloneApps = parsePlanLimit(planFeatures.max_standalone_apps);
    const maxAppsPerGroup = parsePlanLimit(planFeatures.max_apps_per_group);

    console.log('Max apps (total):', maxApps, 'Max standalone apps:', maxStandaloneApps, 'Max apps per group:', maxAppsPerGroup);

    // Count existing apps
    const appCount = await pool.query(
      'SELECT COUNT(*) as count FROM dev_apps WHERE developer_id = $1',
      [developerId]
    );

    const currentAppCount = parseInt(appCount.rows[0].count, 10);
    console.log('Current app count:', currentAppCount);

    // Check total apps limit (0 or null means unlimited)
    if (maxApps !== null && maxApps !== 0 && currentAppCount >= maxApps) {
      return res.status(403).json({
        success: false,
        message: `Plan limit reached. You can create maximum ${maxApps} apps in total. Please upgrade your plan.`
      });
    }

    // Optional: validate and attach app group (if provided)
    let resolvedGroupId = null;
    if (group_id !== null && group_id !== undefined && String(group_id).trim() !== '') {
      resolvedGroupId = String(group_id).trim();

      // Ensure the group belongs to this developer
      const groupCheck = await pool.query(
        'SELECT id FROM app_groups WHERE id = $1 AND developer_id = $2',
        [resolvedGroupId, developerId]
      );

      if (groupCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid app group selected. Please choose a group that belongs to your account.'
        });
      }

      // If there is a per-group app limit, enforce it
      if (maxAppsPerGroup !== null && maxAppsPerGroup !== 0) {
        const groupAppCountRes = await pool.query(
          'SELECT COUNT(*) as count FROM dev_apps WHERE group_id = $1',
          [resolvedGroupId]
        );
        const currentGroupApps = parseInt(groupAppCountRes.rows[0].count, 10);
        console.log('Current apps in group', resolvedGroupId, ':', currentGroupApps);
        if (currentGroupApps >= maxAppsPerGroup) {
          return res.status(403).json({
            success: false,
            message: `Plan limit reached for this group. Each group can have a maximum of ${maxAppsPerGroup} apps.`
          });
        }
      }
    } else {
      // Standalone app: enforce standalone app limit if configured
      if (maxStandaloneApps !== null && maxStandaloneApps !== 0) {
        const standaloneCountRes = await pool.query(
          'SELECT COUNT(*) as count FROM dev_apps WHERE developer_id = $1 AND group_id IS NULL',
          [developerId]
        );
        const currentStandaloneCount = parseInt(standaloneCountRes.rows[0].count, 10);
        console.log('Current standalone app count:', currentStandaloneCount);
        if (currentStandaloneCount >= maxStandaloneApps) {
          return res.status(403).json({
            success: false,
            message: `Plan limit reached. You can create a maximum of ${maxStandaloneApps} standalone apps. Please upgrade your plan or create apps inside groups.`
          });
        }
      }
    }

    // Generate credentials
    const { apiKey, apiSecret } = generateApiCredentials();
    
    // Hash the secret BEFORE storing
    const hashedSecret = crypto.createHash('sha256').update(apiSecret).digest('hex');

    console.log('Creating app with credentials...');

    // Create app with hashed secret and email pending verification
    const result = await pool.query(`
      INSERT INTO dev_apps (
        developer_id, app_name, support_email, api_key, api_secret_hash,
        allow_google_signin, allow_email_signin, support_email_verified,
        group_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, false, $8, NOW(), NOW()
      )
      RETURNING id, app_name, support_email, api_key, allow_google_signin, allow_email_signin, support_email_verified, group_id, created_at
    `, [developerId, app_name, support_email, apiKey, hashedSecret, allow_google_signin, allow_email_signin, resolvedGroupId]);

    const app = result.rows[0];
    console.log('App created successfully:', app.id);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await pool.query(`
      INSERT INTO dev_email_verifications (dev_id, token, expires_at, verify_type, created_at)
      VALUES ($1, $2, NOW() + INTERVAL '24 hours', 'App Support Email', NOW())
    `, [developerId, verificationToken]);

    // Send verification email
    const verificationUrl = `${process.env.BACKEND_URL}/api/developer/apps/verify-app-email/${verificationToken}`;
    sendMail({
      to: support_email,
      subject: `Verify Your App Support Email - ${app_name}`,
      html: buildAppSupportEmailVerificationEmail({ appName: app_name, verificationUrl, supportEmail: support_email }),
    }).catch(err => console.error('Send verification email error:', err));

    // Return response with plaintext secret and pending verification status
    res.status(201).json({
      success: true,
      message: 'App created! A verification email has been sent to your support email.',
      data: {
        ...app,
        api_secret: apiSecret, // Only shown once at creation
        support_email_verification_pending: true,
        warning: 'Save your API secret securely. It will not be shown again! You need to verify your support email before using the API.'
      }
    });

  } catch (error) {
    console.error('Create app error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create app',
      error: error.message
    });
  }
};

/**
 * Get all apps for the developer
 */
const getMyApps = async (req, res) => {
  try {
    const developerId = req.user.developerId;

    const result = await pool.query(`
      SELECT 
        a.id,
        a.app_name,
        a.api_key,
        a.allow_google_signin,
        a.allow_email_signin,
        a.google_client_id,
        a.group_id,
        g.name as group_name,
        a.created_at,
        a.updated_at,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE WHEN u.created_at >= NOW() - INTERVAL '30 days' THEN u.id END) as active_users
      FROM dev_apps a
      LEFT JOIN users u ON u.app_id = a.id
      LEFT JOIN app_groups g ON a.group_id = g.id
      WHERE a.developer_id = $1
      GROUP BY 
        a.id,
        a.app_name,
        a.api_key,
        a.allow_google_signin,
        a.allow_email_signin,
        a.google_client_id,
        a.group_id,
        g.name,
        a.created_at,
        a.updated_at
      ORDER BY a.created_at DESC
    `, [developerId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get apps error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch apps',
      error: error.message
    });
  }
};

/**
 * Get all app groups for the developer
 */
const getAppGroups = async (req, res) => {
  try {
    const developerId = req.user.developerId;

    const result = await pool.query(`
      SELECT id, name, created_at, updated_at
      FROM app_groups
      WHERE developer_id = $1
      ORDER BY created_at DESC, name ASC
    `, [developerId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get app groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch app groups',
      error: error.message
    });
  }
};

/**
 * Delete an app group for the developer.
 * Business rule: groups that still have apps cannot be deleted.
 */
const deleteAppGroup = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: 'Group ID is required',
      });
    }

    // Ensure the group exists and belongs to this developer
    const groupRes = await pool.query(
      'SELECT id, name FROM app_groups WHERE id = $1 AND developer_id = $2',
      [groupId, developerId]
    );

    if (groupRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Enforce business rule: a group with apps cannot be removed
    const appCountRes = await pool.query(
      'SELECT COUNT(*) AS count FROM dev_apps WHERE group_id = $1',
      [groupId]
    );
    const appCount = parseInt(appCountRes.rows[0].count, 10);

    if (appCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'This group still has apps. Delete or re-create those apps before deleting the group.',
      });
    }

    await pool.query('DELETE FROM app_groups WHERE id = $1 AND developer_id = $2', [groupId, developerId]);

    return res.json({
      success: true,
      message: 'Group deleted successfully',
    });
  } catch (error) {
    console.error('Delete app group error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete app group',
      error: error.message,
    });
  }
};

/**
 * Create a new app group for the developer
 */
const createAppGroup = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required'
      });
    }

    // Check plan limits for app groups
    const planCheck = await pool.query(`
      SELECT 
        p.features,
        dpr.plan_id,
        p.name as plan_name
      FROM developer_plan_registrations dpr
      JOIN dev_plans p ON dpr.plan_id = p.id
      WHERE dpr.developer_id = $1 AND dpr.is_active = true
      LIMIT 1
    `, [developerId]);

    if (planCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'No active plan found. Please subscribe to a plan first.'
      });
    }

    const planFeatures = planCheck.rows[0].features || {};
    const maxAppGroups = parsePlanLimit(planFeatures.max_app_groups);

    if (maxAppGroups !== null && maxAppGroups !== 0) {
      const groupCountRes = await pool.query(
        'SELECT COUNT(*) as count FROM app_groups WHERE developer_id = $1',
        [developerId]
      );
      const currentGroups = parseInt(groupCountRes.rows[0].count, 10);
      if (currentGroups >= maxAppGroups) {
        return res.status(403).json({
          success: false,
          message: `Plan limit reached. You can create a maximum of ${maxAppGroups} app groups. Please upgrade your plan.`,
        });
      }
    }

    const publicApiKey = generatePublicApiKey();

    const insertRes = await pool.query(`
      INSERT INTO app_groups (developer_id, name, public_api_key, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING id, name, public_api_key, created_at, updated_at
    `, [developerId, name.trim(), publicApiKey]);

    return res.status(201).json({
      success: true,
      message: 'App group created successfully',
      data: insertRes.rows[0],
    });
  } catch (error) {
    console.error('Create app group error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create app group',
      error: error.message,
    });
  }
};

/**
 * Get single app details with stats
 */
const getAppDetails = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { appId } = req.params;

    // Get app info
    const appResult = await pool.query(`
      SELECT 
        a.*,
        g.name as group_name,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE WHEN u.created_at >= NOW() - INTERVAL '30 days' THEN u.id END) as active_users,
        COUNT(DISTINCT CASE WHEN u.email_verified = true THEN u.id END) as verified_users
      FROM dev_apps a
      LEFT JOIN users u ON u.app_id = a.id
      LEFT JOIN app_groups g ON a.group_id = g.id
      WHERE a.id = $1 AND a.developer_id = $2
      GROUP BY a.id, g.name
    `, [appId, developerId]);

    if (appResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'App not found'
      });
    }

    const app = appResult.rows[0];

    // Get recent users
    const usersResult = await pool.query(`
      SELECT 
        id, name, username, email, google_linked, email_verified, 
        is_blocked, last_login, created_at
      FROM users
      WHERE app_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [appId]);

    // Get API usage stats (last 30 days) - with fallback if table doesn't exist
    let apiUsageResult = { rows: [] };
    try {
      apiUsageResult = await pool.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as calls,
          COUNT(CASE WHEN status_code < 400 THEN 1 END) as successful_calls,
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed_calls
        FROM dev_api_calls
        WHERE app_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `, [appId]);
    } catch (err) {
      console.log('dev_api_calls table not found, skipping usage stats');
    }

    res.json({
      success: true,
      data: {
        app: {
          ...app,
          api_secret_hash: undefined // Don't send hash to frontend
        },
        recent_users: usersResult.rows,
        api_usage: apiUsageResult.rows
      }
    });
  } catch (error) {
    console.error('Get app details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch app details',
      error: error.message
    });
  }
};

/**
 * Update app settings
 */
const updateApp = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { appId } = req.params;
    const { 
      app_name, 
      allow_google_signin, 
      allow_email_signin,
      google_client_id,
      google_client_secret,
      extra_fields
    } = req.body;
    const { user_edit_permissions } = req.body;

    // Verify ownership
    const checkOwner = await pool.query(
      'SELECT id FROM dev_apps WHERE id = $1 AND developer_id = $2',
      [appId, developerId]
    );

    if (checkOwner.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'App not found'
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (app_name) {
      updates.push(`app_name = $${paramCount++}`);
      values.push(app_name);
    }
    if (typeof allow_google_signin === 'boolean') {
      updates.push(`allow_google_signin = $${paramCount++}`);
      values.push(allow_google_signin);
    }
    if (typeof allow_email_signin === 'boolean') {
      updates.push(`allow_email_signin = $${paramCount++}`);
      values.push(allow_email_signin);
    }
    if (google_client_id !== undefined) {
      updates.push(`google_client_id = $${paramCount++}`);
      values.push(google_client_id);
    }
    if (google_client_secret !== undefined) {
      updates.push(`google_client_secret = $${paramCount++}`);
      values.push(google_client_secret);
    }

    // Handle extra custom fields configuration (array of { name, label, type })
    if (extra_fields !== undefined) {
      // Validate basic shape
      if (!Array.isArray(extra_fields)) {
        return res.status(400).json({ success: false, message: 'extra_fields must be an array' });
      }
      if (extra_fields.length > 10) {
        return res.status(400).json({ success: false, message: 'Maximum 10 custom fields allowed' });
      }

      // Validate each field
      for (const f of extra_fields) {
        if (!f || typeof f !== 'object') {
          return res.status(400).json({ success: false, message: 'Each custom field must be an object' });
        }
        if (!f.name || typeof f.name !== 'string') {
          return res.status(400).json({ success: false, message: 'Each custom field must have a name' });
        }
        // name must be alphanumeric + underscores
        if (!/^[a-zA-Z0-9_]+$/.test(f.name)) {
          return res.status(400).json({ success: false, message: 'Field name may only contain letters, numbers and underscores' });
        }
        if (!f.type || typeof f.type !== 'string') {
          return res.status(400).json({ success: false, message: 'Each custom field must have a type' });
        }
        // Optional label
        if (f.label !== undefined && typeof f.label !== 'string') {
          return res.status(400).json({ success: false, message: 'Field label must be a string' });
        }
      }

      updates.push(`extra_fields = $${paramCount++}::jsonb`);
      // store as JSONB (Postgres). Pass stringified JSON to be safe.
      values.push(JSON.stringify(extra_fields));
    }

    if (user_edit_permissions !== undefined) {
      // basic validation: must be an object with boolean values for name, username, email
      if (typeof user_edit_permissions !== 'object' || Array.isArray(user_edit_permissions) || user_edit_permissions === null) {
        return res.status(400).json({ success: false, message: 'user_edit_permissions must be an object' });
      }
      const allowedKeys = ['name', 'username', 'email'];
      const sanitized = {};
      for (const k of allowedKeys) {
        if (user_edit_permissions[k] !== undefined) sanitized[k] = !!user_edit_permissions[k];
      }
      updates.push(`user_edit_permissions = $${paramCount++}::jsonb`);
      values.push(JSON.stringify(sanitized));
    }

    // Access token TTL (in seconds) per app
    if (req.body.access_token_expires_seconds !== undefined) {
      const ttl = parseInt(req.body.access_token_expires_seconds, 10);
      if (Number.isNaN(ttl) || ttl < 60) {
        return res.status(400).json({ success: false, message: 'access_token_expires_seconds must be a number (seconds), minimum 60' });
      }
      updates.push(`access_token_expires_seconds = $${paramCount++}`);
      values.push(ttl);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(appId, developerId);

    const query = `
      UPDATE dev_apps 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount++} AND developer_id = $${paramCount++}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'App updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update app error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update app',
      error: error.message
    });
  }
};

/**
 * Delete an app (internal helper used by confirmation flow)
 */
const deleteApp = async (developerId, appId) => {
  // Verify ownership first
  const checkOwner = await pool.query(
    'SELECT id FROM dev_apps WHERE id = $1 AND developer_id = $2',
    [appId, developerId]
  );

  if (checkOwner.rows.length === 0) {
    const error = new Error('App not found');
    error.statusCode = 404;
    throw error;
  }

  // Clean up dependent records that reference this app but do NOT have
  // ON DELETE CASCADE configured at the database level.
  // This avoids foreign key violations during app deletion.
  try {
    await pool.query('DELETE FROM user_deletion_history WHERE app_id = $1', [appId]);
  } catch (err) {
    console.error('Error cleaning up user_deletion_history for app deletion:', err);
    // Let the main delete continue; if this fails due to FK, the error will surface.
  }

  // Delete app (cascade will handle related records if configured)
  await pool.query('DELETE FROM dev_apps WHERE id = $1', [appId]);
};

/**
 * Request app deletion: sends a confirmation link to the developer's email
 */
const requestAppDeletion = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { appId } = req.params;

    // Fetch app and developer email
    const result = await pool.query(
      `SELECT a.app_name, a.support_email as app_support_email, d.email, d.name
       FROM dev_apps a
       JOIN developers d ON a.developer_id = d.id
       WHERE a.id = $1 AND a.developer_id = $2`,
      [appId, developerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'App not found',
      });
    }

    const { app_name, app_support_email, email, name } = result.rows[0];

    // Create a short-lived JWT for deletion confirmation
    const token = jwt.sign(
      {
        developerId,
        appId,
        action: 'delete-app',
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '24h',
        issuer: 'mspk-apps-auth',
        audience: 'mspk-apps-auth-developers',
      }
    );

    const baseUrl = process.env.BACKEND_URL || '';
    const confirmationUrl = `${baseUrl}/api/developer/apps/confirm-delete/${token}`;

    // Send confirmation email
    sendMail({
      to: email,
      subject: `Confirm deletion of app - ${app_name}`,
      html: buildAppDeleteConfirmationEmail({
        appName: app_name,
        developerName: name,
        confirmationUrl,
        supportEmail: app_support_email
      }),
    }).catch((err) => console.error('Send app delete confirmation email error:', err));

    return res.json({
      success: true,
      message: 'Deletion link sent to your email. Please confirm from your inbox to permanently delete this app.',
    });
  } catch (error) {
    console.error('Request app deletion error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate app deletion',
      error: error.message,
    });
  }
};

/**
 * Confirm app deletion via email link
 * This endpoint is public and does not require authentication.
 */
const confirmAppDeletion = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).send('Invalid deletion link');
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'mspk-apps-auth',
        audience: 'mspk-apps-auth-developers',
      });
    } catch (err) {
      console.error('Invalid or expired delete token:', err.message);
      return res.status(400).send('This deletion link is invalid or has expired.');
    }

    if (!payload || payload.action !== 'delete-app') {
      return res.status(400).send('Invalid deletion token.');
    }

    const { developerId, appId } = payload;

    try {
      await deleteApp(developerId, appId);
    } catch (err) {
      if (err.statusCode === 404) {
        return res.status(404).send('The app was not found or has already been deleted.');
      }
      console.error('Error during confirmed app deletion:', err);
      return res.status(500).send('Failed to delete the app. Please try again later.');
    }

    return res.send(`
      <html>
        <head>
          <title>App Deleted</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f5f5f7; margin:0; padding:0; }
            .wrap { max-width:600px; margin:60px auto; background:#fff; border-radius:12px; padding:32px 28px; box-shadow:0 10px 30px rgba(15,23,42,0.08); }
            h1 { font-size:24px; margin-bottom:12px; color:#111827; }
            p { margin:8px 0; color:#4b5563; line-height:1.6; }
            .highlight { color:#b91c1c; font-weight:600; }
            .footer { margin-top:24px; font-size:13px; color:#9ca3af; }
            a.button { display:inline-block; margin-top:16px; padding:10px 18px; background:#111827; color:#fff; text-decoration:none; border-radius:999px; font-size:14px; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <h1>Application deleted successfully</h1>
            <p>Your app and its related authentication data have been <span class="highlight">permanently deleted</span>.</p>
            <p>If you did not perform this action, please contact support immediately at <a href="mailto:${process.env.SUPPORT_EMAIL}">${process.env.SUPPORT_EMAIL}</a>.</p>
            <a class="button" href="https://authservices.mspkapps.in/">Return to MSPK Auth Portal</a>
            <div class="footer">
              MSPK Apps Authentication Platform (mspkapps.in)
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Confirm app deletion error:', error);
    return res.status(500).send('Unexpected error while confirming deletion.');
  }
};

/**
 * Regenerate API key (in case of compromise)
 */
const regenerateApiKey = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { appId } = req.params;

    // Verify ownership
    const checkOwner = await pool.query(
      'SELECT id FROM dev_apps WHERE id = $1 AND developer_id = $2',
      [appId, developerId]
    );

    if (checkOwner.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'App not found'
      });
    }

    // Generate new credentials
    const { apiKey, apiSecret } = generateApiCredentials();
    const hashedSecret = crypto.createHash('sha256').update(apiSecret).digest('hex');

    // Update credentials
    await pool.query(
      'UPDATE dev_apps SET api_key = $1, api_secret_hash = $2, updated_at = NOW() WHERE id = $3',
      [apiKey, hashedSecret, appId]
    );

    res.json({
      success: true,
      message: 'API credentials regenerated successfully',
      data: {
        api_key: apiKey,
        api_secret: apiSecret,
        warning: 'Save your new API secret securely. The old credentials are now invalid!'
      }
    });
  } catch (error) {
    console.error('Regenerate API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate API key',
      error: error.message
    });
  }
};

// exports moved to bottom after all functions are defined

/**
 * App summary (quick stats)
 */
const getAppSummary = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { appId } = req.params;

    // verify ownership
    const owner = await pool.query('SELECT id FROM dev_apps WHERE id = $1 AND developer_id = $2', [appId, developerId]);
    if (!owner.rows.length) return res.status(404).json({ success: false, message: 'App not found' });

    const q = await pool.query(`
      SELECT a.id, a.app_name, a.allow_google_signin, a.allow_email_signin, a.support_email, a.support_email_verified,
        COUNT(u.id) FILTER (WHERE u.id IS NOT NULL) AS total_users,
        COUNT(u.id) FILTER (WHERE u.created_at >= NOW() - INTERVAL '30 days') AS new_users_30d
      FROM dev_apps a
      LEFT JOIN users u ON u.app_id = a.id
      WHERE a.id = $1
      GROUP BY a.id
    `, [appId]);

    // usage this month
    const usage = await pool.query(`
      SELECT count(*) AS calls_this_month
      FROM dev_api_calls
      WHERE app_id = $1 AND date_trunc('month', created_at) = date_trunc('month', now())
    `, [appId]);

    // plan limits for developer
    const plan = await pool.query(`
      SELECT p.features
      FROM developer_plan_registrations dpr
      JOIN dev_plans p ON dpr.plan_id = p.id
      WHERE dpr.developer_id = $1 AND dpr.is_active = true
      LIMIT 1
    `, [developerId]);

    res.json({ success: true, data: { app: q.rows[0], usage: usage.rows[0], plan: plan.rows[0] ? plan.rows[0].features : null } });
  } catch (err) {
    console.error('getAppSummary error', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * List app users (paginated, filters)
 */
const listAppUsers = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { appId } = req.params;
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '25', 10), 200);
    const q = (req.query.q || '').trim();
    const blocked = req.query.blocked;
    const verified = req.query.verified;
    const offset = (page - 1) * limit;

    // verify ownership
    const owner = await pool.query('SELECT id FROM dev_apps WHERE id = $1 AND developer_id = $2', [appId, developerId]);
    if (!owner.rows.length) return res.status(404).json({ success: false, message: 'App not found' });

    const filters = ['app_id = $1'];
    const params = [appId];
    let idx = 2;

    if (q) {
      filters.push(`(email ILIKE $${idx} OR username ILIKE $${idx} OR name ILIKE $${idx})`);
      params.push(`%${q}%`);
      idx++;
    }
    if (blocked !== undefined) {
      filters.push(`is_blocked = $${idx}`);
      params.push(blocked === 'true');
      idx++;
    }
    if (verified !== undefined) {
      filters.push(`email_verified = $${idx}`);
      params.push(verified === 'true');
      idx++;
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const users = await pool.query(`
      SELECT id, name, username, email, email_verified, google_linked, is_blocked, last_login, created_at
      FROM users
      ${where}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, params.concat([limit, offset]));

    const totalQ = await pool.query(`SELECT COUNT(*) AS total FROM users ${where}`, params);

    res.json({ success: true, data: users.rows, meta: { total: parseInt(totalQ.rows[0].total, 10), page, limit } });
  } catch (err) {
    console.error('listAppUsers error', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get single user's login history
 */
const getUserLoginHistory = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { appId, userId } = req.params;

    const owner = await pool.query('SELECT id FROM dev_apps WHERE id = $1 AND developer_id = $2', [appId, developerId]);
    if (!owner.rows.length) return res.status(404).json({ success: false, message: 'App not found' });

    const logs = await pool.query(`
      SELECT id, ip_address, user_agent, login_method, created_at as login_time
      FROM user_login_history
      WHERE app_id = $1 AND user_id = $2
      ORDER BY created_at DESC
      LIMIT 200
    `, [appId, userId]);

    res.json({ success: true, data: logs.rows });
  } catch (err) {
    console.error('getUserLoginHistory error', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Create a user for an app (developer action)
 */
const createAppUser = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { appId } = req.params;
    const { email, password, name, username, email_verified = false } = req.body;

    const owner = await pool.query('SELECT id, allow_email_signin FROM dev_apps WHERE id = $1 AND developer_id = $2', [appId, developerId]);
    if (!owner.rows.length) return res.status(404).json({ success: false, message: 'App not found' });
    if (!owner.rows[0].allow_email_signin) return res.status(403).json({ success: false, message: 'Email signup disabled for this app' });

    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const insert = await pool.query(`
      INSERT INTO users (app_id, email, password_hash, name, username, email_verified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, email, name, username, email_verified, created_at
    `, [appId, email.toLowerCase(), hash, name, username, email_verified]);

    res.status(201).json({ success: true, data: insert.rows[0] });
  } catch (err) {
    console.error('createAppUser error', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Block or unblock a user
 */
const setUserBlocked = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { appId, userId } = req.params;
    const { block } = req.body; // boolean

    const owner = await pool.query('SELECT id FROM dev_apps WHERE id = $1 AND developer_id = $2', [appId, developerId]);
    if (!owner.rows.length) return res.status(404).json({ success: false, message: 'App not found' });

    await pool.query('UPDATE users SET is_blocked = $1, updated_at = NOW() WHERE id = $2 AND app_id = $3', [block === true, userId, appId]);

    res.json({ success: true, message: block ? 'User blocked' : 'User unblocked' });
  } catch (err) {
    console.error('setUserBlocked error', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get app API usage and per-endpoint breakdown
 */
const getAppUsage = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { appId } = req.params;

    const owner = await pool.query('SELECT id FROM dev_apps WHERE id = $1 AND developer_id = $2', [appId, developerId]);
    if (!owner.rows.length) return res.status(404).json({ success: false, message: 'App not found' });

    const total = await pool.query('SELECT count(*) as total_calls FROM dev_api_calls WHERE app_id = $1', [appId]);
    const perEndpoint = await pool.query(`
      SELECT endpoint, count(*) as calls
      FROM dev_api_calls
      WHERE app_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY endpoint ORDER BY calls DESC LIMIT 50
    `, [appId]);

    res.json({ success: true, data: { total_calls: parseInt(total.rows[0].total_calls, 10), per_endpoint: perEndpoint.rows } });
  } catch (err) {
    console.error('getAppUsage error', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get dashboard statistics
 */
const getDashboard = async (req, res) => {
  try {
    const developerId = req.user.developerId;

    // Get total apps count
    const appsResult = await pool.query(
      'SELECT COUNT(*) as count FROM dev_apps WHERE developer_id = $1',
      [developerId]
    );
    const totalApps = parseInt(appsResult.rows[0].count);

    // Get recent apps (last 3)
    const recentAppsResult = await pool.query(`
      SELECT 
        id,
        app_name as name,
        created_at,
        allow_google_signin,
        allow_email_signin,
        api_key
      FROM dev_apps 
      WHERE developer_id = $1 
      ORDER BY created_at DESC 
      LIMIT 3
    `, [developerId]);

    // Get total users across all apps
    const usersResult = await pool.query(`
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      JOIN dev_apps a ON u.app_id = a.id
      WHERE a.developer_id = $1
    `, [developerId]);
    const totalUsers = parseInt(usersResult.rows[0].count);

    // Get today's API calls (across all apps for this developer)
    const todayCallsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM dev_api_calls dac
      JOIN dev_apps a ON dac.app_id = a.id
      WHERE a.developer_id = $1 
      AND DATE(dac.created_at) = CURRENT_DATE
    `, [developerId]);
    const todayApiCalls = parseInt(todayCallsResult.rows[0].count);

    // Get this month's API calls (across all apps for this developer)
    const monthCallsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM dev_api_calls dac
      JOIN dev_apps a ON dac.app_id = a.id
      WHERE a.developer_id = $1 
      AND DATE_TRUNC('month', dac.created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `, [developerId]);
    const monthApiCalls = parseInt(monthCallsResult.rows[0].count);

    // Get plan info
    const planResult = await pool.query(`
      SELECT 
        p.name as plan_name,
        p.features,
        dpr.is_active,
        dpr.start_date,
        dpr.end_date
      FROM developer_plan_registrations dpr
      JOIN dev_plans p ON dpr.plan_id = p.id
      WHERE dpr.developer_id = $1 AND dpr.is_active = true
      LIMIT 1
    `, [developerId]);
    // Compute group usage and limits
    const groupCountRes = await pool.query('SELECT COUNT(*) AS count FROM app_groups WHERE developer_id = $1', [developerId]);
    const groupsUsed = parseInt(groupCountRes.rows[0].count || 0);

    const planFeatures = planResult.rows[0] ? planResult.rows[0].features || {} : {};
    const parseLimit = (value, fallback) => {
      if (value === null || value === undefined) return fallback;
      if (typeof value === 'number') return value;
      const n = Number(value);
      return Number.isNaN(n) ? fallback : n;
    };
    const maxAppGroups = parseLimit(planFeatures.max_app_groups, null);
    const maxAppsPerGroup = parseLimit(planFeatures.max_apps_per_group, null);
    const maxStandaloneApps = parseLimit(planFeatures.max_standalone_apps, null);

    const planInfo = planResult.rows.length > 0 ? {
      name: planResult.rows[0].plan_name,
      features: planResult.rows[0].features,
      isActive: planResult.rows[0].is_active,
      startDate: planResult.rows[0].start_date,
      endDate: planResult.rows[0].end_date,
      max_app_groups: maxAppGroups,
      app_groups_used: groupsUsed,
      max_apps_per_group: maxAppsPerGroup,
      max_standalone_apps: maxStandaloneApps
    } : null;

    // Format recent apps with status
    const recentApps = recentAppsResult.rows.map(app => ({
      id: app.id,
      name: app.name,
      created_at: app.created_at,
      status: 'active', // All apps are active by default
      allow_google_signin: app.allow_google_signin,
      allow_email_signin: app.allow_email_signin,
      api_key: app.api_key
    }));

    res.json({
      success: true,
      data: {
        stats: {
          totalApps,
          totalUsers,
          todayApiCalls,
          monthApiCalls,
          groupsUsed
        },
        recentApps,
        planInfo
      }
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
};

/**
 * Verify app support email
 */
const verifyAppEmail = async (req, res) => {
  try {
    const { token } = req.params;

    console.log('Verifying app email with token:', token);

    // Find the verification record
    const tokenResult = await pool.query(
      `SELECT dev_id, expires_at FROM dev_email_verifications 
       WHERE token = $1 AND used = false AND verify_type = 'App Support Email'`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or already verified token'
      });
    }

    const { dev_id, expires_at } = tokenResult.rows[0];

    // Check if token is expired
    if (new Date(expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Verification link has expired. Please create a new app.'
      });
    }

    // Update the verification record
    await pool.query(
      `UPDATE dev_email_verifications 
       SET used = true, updated_at = NOW()
       WHERE token = $1`,
      [token]
    );

    // Update the app as verified
    await pool.query(
      `UPDATE dev_apps 
       SET support_email_verified = true, updated_at = NOW()
       WHERE developer_id = $1`,
      [dev_id]
    );

    res.json({
      success: true,
      message: 'Email verified successfully! Your API credentials are now active.',
      devId: dev_id
    });

  } catch (error) {
    console.error('Verify app email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify email',
      error: error.message
    });
  }
};

/**
 * Update app support email
 */
const updateAppSupportEmail = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { appId } = req.params;
    const { support_email } = req.body;

    if (!support_email) {
      return res.status(400).json({
        success: false,
        message: 'Support email is required'
      });
    }

    // Verify app belongs to developer
    const appCheck = await pool.query(
      'SELECT * FROM dev_apps WHERE id = $1 AND developer_id = $2',
      [appId, developerId]
    );

    if (appCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'App not found'
      });
    }

    const app = appCheck.rows[0];

    // Update the email
    await pool.query(
      `UPDATE dev_apps 
       SET support_email = $1, support_email_verified = false, updated_at = NOW()
       WHERE id = $2`,
      [support_email, appId]
    );

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await pool.query(`
      INSERT INTO dev_email_verifications (dev_id, token, expires_at, verify_type, created_at)
      VALUES ($1, $2, NOW() + INTERVAL '24 hours', 'App Support Email', NOW())
    `, [developerId, verificationToken]);

    // Send verification email
    const verificationUrl = `${process.env.BACKEND_URL}/api/developer/apps/verify-app-email/${verificationToken}`;
    sendMail({
      to: support_email,
      subject: `Verify Updated Support Email - ${app.app_name}`,
      html: buildAppSupportEmailUpdateEmail({ appName: app.app_name, verificationUrl, supportEmail: support_email }),
    }).catch(err => console.error('Send verification email error:', err));

    res.json({
      success: true,
      message: 'Support email updated! A verification email has been sent to the new email address.'
    });

  } catch (error) {
    console.error('Update support email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update support email',
      error: error.message
    });
  }
};

/**
 * Export app users as CSV
 */
const exportUsersCSV = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { appId } = req.params;

    // Verify app belongs to developer
    const appCheck = await pool.query(
      'SELECT app_name FROM dev_apps WHERE id = $1 AND developer_id = $2',
      [appId, developerId]
    );

    if (appCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'App not found'
      });
    }

    const appName = appCheck.rows[0].app_name;

    // Get all users for this app (exclude password_hash)
    const usersResult = await pool.query(`
      SELECT 
        id,
        email,
        name,
        username,
        email_verified,
        is_blocked,
        last_login,
        created_at
      FROM users
      WHERE app_id = $1
      ORDER BY created_at DESC
    `, [appId]);

    const fields = [
      'id',
      'email',
      'name',
      'username',
      'email_verified',
      'is_blocked',
      'last_login',
      'created_at',
    ];

    let csv;
    if (usersResult.rows.length === 0) {
      // No users: send header-only CSV so Excel still opens a valid sheet
      csv = fields.join(',') + '\n';
    } else {
      const parser = new Parser({ fields });
      csv = parser.parse(usersResult.rows);
    }

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="users_${appName}_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);

  } catch (error) {
    console.error('Export users CSV error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export users',
      error: error.message
    });
  }
};

// module.exports moved to bottom after additional functions are defined

/**
 * List all users across all apps for the authenticated developer.
 * Returns users, duplicate groups by email, and username conflicts.
 */
const listAllUsersAcrossApps = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    // Get app ids for this developer
    const appsRes = await pool.query('SELECT id, app_name FROM dev_apps WHERE developer_id = $1', [developerId]);
    const appIds = appsRes.rows.map(r => r.id);
    if (appIds.length === 0) return res.json({ success: true, data: { users: [], groupsByEmail: [], usernameConflicts: [] } });

    // Fetch users for these apps
    const usersRes = await pool.query(`
      SELECT u.id, u.email, u.username, u.name, u.app_id, u.email_verified, u.created_at, a.app_name
      FROM users u
      JOIN dev_apps a ON a.id = u.app_id
      WHERE u.app_id = ANY($1::uuid[])
      ORDER BY u.email NULLS LAST, u.created_at DESC
    `, [appIds]);

    const users = usersRes.rows;

    // Group by email to find duplicates
    const groupsByEmailMap = {};
    for (const u of users) {
      const e = (u.email || '').toLowerCase();
      if (!e) continue;
      groupsByEmailMap[e] = groupsByEmailMap[e] || [];
      groupsByEmailMap[e].push(u);
    }
    const groupsByEmail = Object.values(groupsByEmailMap).filter(g => g.length > 1);

    // Find username conflicts (same username, different email)
    const usernameMap = {};
    for (const u of users) {
      if (!u.username) continue;
      const key = u.username.toLowerCase();
      usernameMap[key] = usernameMap[key] || [];
      usernameMap[key].push(u);
    }
    const usernameConflicts = Object.values(usernameMap).filter(g => {
      const emails = new Set(g.map(x => (x.email || '').toLowerCase()));
      return emails.size > 1;
    });

    // Also include developer-level flag
    const devRes = await pool.query('SELECT combine_users_across_apps FROM developers WHERE id = $1', [developerId]);
    const combineFlag = devRes.rows[0] ? devRes.rows[0].combine_users_across_apps : false;

    res.json({ success: true, data: { users, groupsByEmail, usernameConflicts, combineUsersAcrossApps: combineFlag } });
  } catch (err) {
    console.error('listAllUsersAcrossApps error', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Toggle developer-level combine users flag
 */
const setCombineUsersFlag = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') return res.status(400).json({ success: false, message: 'enabled must be boolean' });
    await pool.query('UPDATE developers SET combine_users_across_apps = $1 WHERE id = $2', [enabled, developerId]);
    res.json({ success: true, message: 'Setting updated' });
  } catch (err) {
    console.error('setCombineUsersFlag error', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Merge users across apps according to developer decisions.
 * Payload: { merges: [ { email, keepUserId, otherUserIds: [...], usernameChanges: { userId: newUsername } } ] }
 */
const mergeUsersAcrossApps = async (req, res) => {
  const client = await pool.connect();
  try {
    const developerId = req.user.developerId;
    const { merges } = req.body;
    if (!Array.isArray(merges)) return res.status(400).json({ success: false, message: 'merges must be an array' });

    // Validate that all referenced user IDs belong to apps owned by this developer
    const referencedIdsSet = new Set();
    for (const m of merges) {
      const { keepUserId, otherUserIds = [], usernameChanges = {} } = m;
      if (keepUserId) referencedIdsSet.add(keepUserId);
      for (const oid of otherUserIds || []) if (oid) referencedIdsSet.add(oid);
      for (const uid of Object.keys(usernameChanges || {})) if (uid) referencedIdsSet.add(uid);
    }
    const referencedIds = Array.from(referencedIdsSet);
    if (referencedIds.length > 0) {
      const check = await client.query(`
        SELECT u.id FROM users u
        JOIN dev_apps a ON a.id = u.app_id
        WHERE u.id = ANY($1::uuid[]) AND a.developer_id = $2
      `, [referencedIds, developerId]);
      if (check.rows.length !== referencedIds.length) {
        return res.status(400).json({ success: false, message: 'One or more provided user IDs do not belong to your apps' });
      }
    }

    await client.query('BEGIN');

    for (const m of merges) {
      const { keepUserId, otherUserIds = [], usernameChanges = {} } = m;
      const copyFromUserId = m.copyFromUserId || null;
      if (!keepUserId) continue;

      // If developer requested copying fields from a particular user record into the kept user, do that first
      if (copyFromUserId) {
        // Only allow copying from IDs that were validated earlier as belonging to this developer
        const copyRes = await client.query(`SELECT id, name, username, extra, password_hash, google_linked, google_id, email_verified, last_login FROM users WHERE id = $1`, [copyFromUserId]);
        if (copyRes.rows.length) {
          const src = copyRes.rows[0];
          // Update kept user with selected fields (merge extras: prefer existing keys on kept user)
          const keptResNow = await client.query('SELECT extra FROM users WHERE id = $1', [keepUserId]);
          const keptExtra = (keptResNow.rows[0] && keptResNow.rows[0].extra) || {};
          const newExtra = Object.assign({}, src.extra || {}, keptExtra);
          await client.query(`UPDATE users SET name = $1, username = $2, extra = $3::jsonb, password_hash = $4, google_linked = $5, google_id = $6, email_verified = $7, last_login = $8, updated_at = NOW() WHERE id = $9`, [src.name, src.username, JSON.stringify(newExtra), src.password_hash, src.google_linked, src.google_id, src.email_verified, src.last_login, keepUserId]);
        }
      }

      // Transfer references from otherUserIds to keepUserId
      if (otherUserIds.length) {
        await client.query(`UPDATE user_login_history SET user_id = $1 WHERE user_id = ANY($2::uuid[])`, [keepUserId, otherUserIds]);
        await client.query(`UPDATE user_email_verifications SET user_id = $1 WHERE user_id = ANY($2::uuid[])`, [keepUserId, otherUserIds]);
        // Record merges and delete old user rows
        for (const oldId of otherUserIds) {
          await client.query(`INSERT INTO user_merges (developer_id, kept_user_id, merged_user_id) VALUES ($1, $2, $3)`, [developerId, keepUserId, oldId]);
          await client.query(`DELETE FROM users WHERE id = $1`, [oldId]);
        }
      }

      // Apply username changes
      for (const [uid, newUsername] of Object.entries(usernameChanges || {})) {
        const sanitized = ('' + newUsername).trim();
        if (!sanitized) continue;
        // Ensure uniqueness across all users of this developer
        const exists = await client.query(`
          SELECT 1 FROM users u JOIN dev_apps a ON a.id = u.app_id WHERE a.developer_id = $1 AND LOWER(u.username) = LOWER($2) LIMIT 1
        `, [developerId, sanitized]);
        if (exists.rows.length) {
          // append suffix
          const suffix = Math.floor(Math.random() * 9000) + 1000;
          const newName = `${sanitized}_${suffix}`;
          await client.query(`UPDATE users SET username = $1 WHERE id = $2`, [newName, uid]);
          // notify user
          const userRes = await client.query('SELECT email FROM users WHERE id = $1', [uid]);
          if (userRes.rows[0] && userRes.rows[0].email) {
            sendMail({ to: userRes.rows[0].email, subject: 'Your username was updated', html: `<p>Your username has been changed to <strong>${newName}</strong> by the application owner.</p>` }).catch(e => console.error('sendMail error', e));
          }
        } else {
          await client.query(`UPDATE users SET username = $1 WHERE id = $2`, [sanitized, uid]);
          const userRes = await client.query('SELECT email FROM users WHERE id = $1', [uid]);
          if (userRes.rows[0] && userRes.rows[0].email) {
            sendMail({ to: userRes.rows[0].email, subject: 'Your username was updated', html: `<p>Your username has been changed to <strong>${sanitized}</strong> by the application owner.</p>` }).catch(e => console.error('sendMail error', e));
          }
        }
      }

      // Notify kept user about merge
      const keptRes = await client.query('SELECT email FROM users WHERE id = $1', [keepUserId]);
      if (keptRes.rows[0] && keptRes.rows[0].email) {
        sendMail({ to: keptRes.rows[0].email, subject: 'Accounts merged', html: `<p>Your accounts across multiple applications owned by the same developer have been consolidated. If you have questions, contact support.</p>` }).catch(e => console.error('sendMail error', e));
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Merges applied' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('mergeUsersAcrossApps error', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

/**
 * Get all users across all apps within a group (developer-owned)
 */
const getGroupUsers = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { groupId } = req.params;

    if (!groupId) return res.status(400).json({ success: false, message: 'Group ID required' });

    // Verify group ownership
    const groupCheck = await pool.query('SELECT id FROM app_groups WHERE id = $1 AND developer_id = $2', [groupId, developerId]);
    if (groupCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Group not found' });

    const usersRes = await pool.query(`
      SELECT u.id, u.email, u.name, u.username, u.email_verified, u.is_blocked, u.last_login, u.app_id, a.app_name
      FROM users u
      JOIN dev_apps a ON u.app_id = a.id
      WHERE a.group_id = $1
      ORDER BY LOWER(u.email) NULLS LAST, a.app_name
    `, [groupId]);

    res.json({ success: true, data: usersRes.rows });
  } catch (err) {
    console.error('getGroupUsers error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch group users', error: err.message });
  }
};

/**
 * Get apps in which a user (by user id) has login records within the group
 */
const getGroupUserLogins = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { groupId, userId } = req.params;

    if (!groupId || !userId) return res.status(400).json({ success: false, message: 'Group ID and User ID required' });

    // Verify group ownership
    const groupCheck = await pool.query('SELECT id FROM app_groups WHERE id = $1 AND developer_id = $2', [groupId, developerId]);
    if (groupCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Group not found' });

    const loginsRes = await pool.query(`
      SELECT gul.app_id, a.app_name, gul.last_login
      FROM group_user_logins gul
      JOIN dev_apps a ON a.id = gul.app_id
      WHERE gul.group_id = $1 AND gul.user_id = $2
      ORDER BY gul.last_login DESC
    `, [groupId, userId]);

    res.json({ success: true, data: loginsRes.rows });
  } catch (err) {
    console.error('getGroupUserLogins error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user logins for group', error: err.message });
  }
};



module.exports = {
  createApp,
  getMyApps,
  getAppGroups,
  createAppGroup,
  deleteAppGroup,
  getGroupUsers,
  getGroupUserLogins,
  getAppDetails,
  updateApp,
  regenerateApiKey,
  getAppSummary,
  listAppUsers,
  getUserLoginHistory,
  createAppUser,
  setUserBlocked,
  getAppUsage,
  getDashboard,
  verifyAppEmail,
  updateAppSupportEmail,
  exportUsersCSV,
  requestAppDeletion,
  confirmAppDeletion,
  // new developer-level functions
  listAllUsersAcrossApps,
  mergeUsersAcrossApps,
  setCombineUsersFlag,
};