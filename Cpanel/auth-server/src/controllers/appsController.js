const crypto = require('crypto');
const pool = require('../config/db');
const { sendMail } = require('../utils/mailer');
const { Parser } = require('json2csv');

/**
 * Generate a secure API key and secret
 */
function generateApiCredentials() {
  const apiKey = 'ak_' + crypto.randomBytes(32).toString('hex');
  const apiSecret = 'as_' + crypto.randomBytes(48).toString('hex');
  return { apiKey, apiSecret };
}

/**
 * Create a new app
 */
const createApp = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { app_name, support_email, allow_google_signin = false, allow_email_signin = true } = req.body;

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

    const planFeatures = planCheck.rows[0].features;
    console.log('Plan features:', planFeatures);

    // Extract max_apps from features (handle different JSONB structures)
    let maxApps = 0;
    
    if (planFeatures) {
      // Try different possible keys
      if (planFeatures.apps_limit) {
        maxApps = parseInt(planFeatures.apps_limit);
      } else if (planFeatures.max_apps) {
        // Handle if max_apps is a number
        if (typeof planFeatures.max_apps === 'number') {
          maxApps = planFeatures.max_apps;
        } 
        // Handle if max_apps is a string like "Maximum 2 apps can be created"
        else if (typeof planFeatures.max_apps === 'string') {
          const match = planFeatures.max_apps.match(/(\d+)/);
          if (match) {
            maxApps = parseInt(match[1]);
          }
        }
      }
    }

    console.log('Max apps allowed:', maxApps);

    if (maxApps === 0) {
      return res.status(403).json({
        success: false,
        message: 'Your plan does not allow creating apps. Please upgrade your plan.'
      });
    }

    // Count existing apps
    const appCount = await pool.query(
      'SELECT COUNT(*) as count FROM dev_apps WHERE developer_id = $1',
      [developerId]
    );

    const currentAppCount = parseInt(appCount.rows[0].count);
    console.log('Current app count:', currentAppCount);

    if (currentAppCount >= maxApps) {
      return res.status(403).json({
        success: false,
        message: `Plan limit reached. You can create maximum ${maxApps} apps. Please upgrade your plan.`
      });
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
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, false, NOW(), NOW()
      )
      RETURNING id, app_name, support_email, api_key, allow_google_signin, allow_email_signin, support_email_verified, created_at
    `, [developerId, app_name, support_email, apiKey, hashedSecret, allow_google_signin, allow_email_signin]);

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
      html: `
        <h2>Verify Your App Support Email</h2>
        <p>Hi Developer,</p>
        <p>Please verify the support email for your application <strong>${app_name}</strong> by clicking the link below:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create this app, you can ignore this email.</p>
      `
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
        a.created_at,
        a.updated_at,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE WHEN u.created_at >= NOW() - INTERVAL '30 days' THEN u.id END) as active_users
      FROM dev_apps a
      LEFT JOIN users u ON u.app_id = a.id
      WHERE a.developer_id = $1
      GROUP BY a.id
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
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE WHEN u.created_at >= NOW() - INTERVAL '30 days' THEN u.id END) as active_users,
        COUNT(DISTINCT CASE WHEN u.email_verified = true THEN u.id END) as verified_users
      FROM dev_apps a
      LEFT JOIN users u ON u.app_id = a.id
      WHERE a.id = $1 AND a.developer_id = $2
      GROUP BY a.id
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
      google_client_secret 
    } = req.body;

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
 * Delete an app
 */
const deleteApp = async (req, res) => {
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

    // Delete app (cascade will handle related records if set up)
    await pool.query('DELETE FROM dev_apps WHERE id = $1', [appId]);

    res.json({
      success: true,
      message: 'App deleted successfully'
    });
  } catch (error) {
    console.error('Delete app error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete app',
      error: error.message
    });
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
      SELECT a.id, a.app_name, a.allow_google_signin, a.allow_email_signin,
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

    // Get today's API calls
    const todayCallsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM dev_api_calls
      WHERE developer_id = $1 
      AND DATE(created_at) = CURRENT_DATE
    `, [developerId]);
    const todayApiCalls = parseInt(todayCallsResult.rows[0].count);

    // Get this month's API calls
    const monthCallsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM dev_api_calls
      WHERE developer_id = $1 
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
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

    const planInfo = planResult.rows.length > 0 ? {
      name: planResult.rows[0].plan_name,
      features: planResult.rows[0].features,
      isActive: planResult.rows[0].is_active,
      startDate: planResult.rows[0].start_date,
      endDate: planResult.rows[0].end_date
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
          monthApiCalls
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
      html: `
        <h2>Verify Updated Support Email</h2>
        <p>Hi Developer,</p>
        <p>You've updated the support email for your application <strong>${app.app_name}</strong>. Please verify this new email by clicking the link below:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
      `
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
        id, email, first_name, last_name, phone, 
        account_status, auth_method, is_email_verified,
        created_at, updated_at
      FROM public_users
      WHERE app_id = $1
      ORDER BY created_at DESC
    `, [appId]);

    if (usersResult.rows.length === 0) {
      return res.json({
        success: true,
        message: 'No users to export',
        data: []
      });
    }

    // Convert to CSV
    const parser = new Parser({
      fields: ['id', 'email', 'first_name', 'last_name', 'phone', 'account_status', 'auth_method', 'is_email_verified', 'created_at', 'updated_at']
    });

    const csv = parser.parse(usersResult.rows);

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

module.exports = {
  createApp,
  getMyApps,
  getAppDetails,
  updateApp,
  deleteApp,
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
  exportUsersCSV
};