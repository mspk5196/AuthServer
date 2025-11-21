const crypto = require('crypto');
const pool = require('../config/db');

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
    const { app_name, base_url, allow_google_signin = false, allow_email_signin = true } = req.body;

    console.log('Create app request from developer:', developerId);
    console.log('Form data:', { app_name, base_url, allow_google_signin, allow_email_signin });

    // Validation
    if (!app_name || !base_url) {
      return res.status(400).json({
        success: false,
        message: 'App name and base URL are required'
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

    // Create app with hashed secret
    const result = await pool.query(`
      INSERT INTO dev_apps (
        id, developer_id, app_name, api_key, api_secret_hash, base_url,
        allow_google_signin, allow_email_signin,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      )
      RETURNING id, app_name, api_key, base_url, allow_google_signin, allow_email_signin, created_at
    `, [developerId, app_name, apiKey, hashedSecret, base_url, allow_google_signin, allow_email_signin]);

    const app = result.rows[0];
    console.log('App created successfully:', app.id);

    // Return response with plaintext secret (only time it's shown)
    res.status(201).json({
      success: true,
      message: 'App created successfully',
      data: {
        ...app,
        api_secret: apiSecret, // Only shown once at creation
        warning: 'Save your API secret securely. It will not be shown again!'
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
        a.base_url,
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
      base_url, 
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
    if (base_url) {
      updates.push(`base_url = $${paramCount++}`);
      values.push(base_url);
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
      SELECT a.id, a.app_name, a.base_url, a.allow_google_signin, a.allow_email_signin,
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
      INSERT INTO users (id, app_id, email, password_hash, name, username, email_verified, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
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
  getAppUsage
};