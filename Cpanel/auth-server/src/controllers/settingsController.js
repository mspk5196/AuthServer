const pool = require('../config/db');

/**
 * Get developer's plan information and usage statistics
 * GET /api/developer/settings/plan
 */
const getPlanInfo = async (req, res) => {
  try {
    const developerId = req.user.developerId;

    // Get developer's current plan with registration details
    const planQuery = `
      SELECT 
        dp.name as plan_name,
        dp.price,
        dp.duration_days,
        dp.features,
        dp.features_desc,
        dp.is_active as plan_is_active,
        dpr.start_date,
        dpr.end_date,
        dpr.is_active as subscription_is_active,
        dpr.auto_renew,
        dpr.renewal_count
      FROM developer_plan_registrations dpr
      INNER JOIN dev_plans dp ON dpr.plan_id = dp.id
      WHERE dpr.developer_id = $1 
        AND dpr.is_active = true
      ORDER BY dpr.start_date DESC
      LIMIT 1
    `;

    const planResult = await pool.query(planQuery, [developerId]);

    if (planResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No active plan found. Please select a plan from the developer portal.' 
      });
    }

    const planInfo = planResult.rows[0];

    // Determine plan type based on price
    const planType = planInfo.price === 0 || planInfo.price === null ? 'free' : 'paid';

    // Get apps count from dev_apps table
    const appsQuery = `
      SELECT COUNT(*) as apps_count
      FROM dev_apps
      WHERE developer_id = $1
    `;
    const appsResult = await pool.query(appsQuery, [developerId]);
    const appsUsed = parseInt(appsResult.rows[0]?.apps_count || 0);

    // Get API calls count for current month from user_login_history
    // This tracks logins to apps, which we can use as a proxy for API usage
    let apiCallsUsed = 0;
    try {
      const apiCallsQuery = `
        SELECT COUNT(*) as api_calls
        FROM user_login_history ulh
        INNER JOIN dev_apps da ON ulh.app_id = da.id
        WHERE da.developer_id = $1 
          AND DATE_TRUNC('month', ulh.login_time) = DATE_TRUNC('month', CURRENT_DATE)
      `;
      const apiCallsResult = await pool.query(apiCallsQuery, [developerId]);
      apiCallsUsed = parseInt(apiCallsResult.rows[0]?.api_calls || 0);
    } catch (error) {
      // console.log      console.log('API usage tracking error:', error.message);
    }

    // Extract limits from features JSONB (0 means unlimited)
    const features = planInfo.features || {};

    const parseLimit = (value, fallback) => {
      if (value === null || value === undefined) return fallback;
      if (typeof value === 'number') return value;
      const n = Number(value);
      return Number.isNaN(n) ? fallback : n;
    };

    let appsLimitRaw = features.max_apps ?? features.apps_limit;
    let apiCallsLimitRaw = features.max_api_calls ?? features.api_calls_limit;

    const appsLimit = parseLimit(appsLimitRaw, null); // 0 or null = unlimited
    const apiCallsLimit = parseLimit(apiCallsLimitRaw, null); // 0 or null = unlimited

    // New group-related limits
    const maxStandaloneApps = parseLimit(features.max_standalone_apps, null);
    const maxAppGroups = parseLimit(features.max_app_groups, null);
    const maxAppsPerGroup = parseLimit(features.max_apps_per_group, null);

    // Format features description array (prefer features_desc; fallback to features keys)
    let featuresDesc = planInfo.features_desc;
    if (!Array.isArray(featuresDesc) || featuresDesc.length === 0) {
      featuresDesc = [];

      if (features.support) {
        featuresDesc.push(
          typeof features.support === 'string' ? features.support : `Support: ${features.support}`
        );
      }

      if (appsLimit !== null && appsLimit !== 0) {
        featuresDesc.push(`Up to ${appsLimit} apps`);
      } else if (appsLimit === 0 || appsLimit === null) {
        featuresDesc.push('Unlimited apps');
      }

      if (apiCallsLimit !== null && apiCallsLimit !== 0) {
        featuresDesc.push(`Up to ${apiCallsLimit.toLocaleString()} API calls per month`);
      } else if (apiCallsLimit === 0 || apiCallsLimit === null) {
        featuresDesc.push('Unlimited API calls per month');
      }

      // Group / standalone app limits (only show when explicitly configured)
      if (maxStandaloneApps !== null) {
        if (maxStandaloneApps === 0) {
          featuresDesc.push('Unlimited standalone apps');
        } else {
          featuresDesc.push(`Up to ${maxStandaloneApps} standalone apps`);
        }
      }

      if (maxAppGroups !== null) {
        if (maxAppGroups === 0) {
          featuresDesc.push('Unlimited app groups');
        } else {
          featuresDesc.push(`Up to ${maxAppGroups} app groups`);
        }
      }

      if (maxAppsPerGroup !== null) {
        if (maxAppsPerGroup === 0) {
          featuresDesc.push('Unlimited apps per group');
        } else {
          featuresDesc.push(`Up to ${maxAppsPerGroup} apps per group`);
        }
      }
    }

    // Derive billing cycle text from plan duration
    let billingCycle = 'N/A';
    if (planType === 'free') {
      billingCycle = 'No Billing (Free plan)';
    } else if (!planInfo.duration_days) {
      billingCycle = 'Lifetime (no recurring billing)';
    } else if (planInfo.duration_days === 30) {
      billingCycle = 'Every 30 days (monthly)';
    } else if (planInfo.duration_days === 365) {
      billingCycle = 'Every 365 days (yearly)';
    } else {
      billingCycle = `Every ${planInfo.duration_days} days`;
    }

    // Format the response
    const response = {
      plan_name: planInfo.plan_name,
      plan_type: planType,
      expiry_date: planInfo.end_date,
      registration_date: planInfo.start_date,
      is_active: planInfo.subscription_is_active,
      auto_renew: planInfo.auto_renew,
      renewal_count: planInfo.renewal_count || 0,
      
      // Limits from plan features (null means unlimited)
      max_apps: appsLimit,
      max_api_calls: apiCallsLimit,

      // Current usage
      apps_used: appsUsed,
      api_calls_used: apiCallsUsed,
      
      // Features
      features: featuresDesc,
      
      // Billing info
      price_monthly: planInfo.price,
      billing_cycle: billingCycle,
      duration_days: planInfo.duration_days,
    };

    res.json(response);
  } catch (error) {
    console.error('Get plan info error:', error);
    res.status(500).json({ error: 'Failed to retrieve plan information' });
  }
};

/**
 * Get developer's account information
 * GET /api/developer/settings/account
 */
const getAccountInfo = async (req, res) => {
  try {
    const developerId = req.user.developerId;

    const query = `
      SELECT 
        id as developer_id,
        username,
        email,
        name,
        email_verified,
        is_active,
        created_at,
        updated_at,
        is_blocked,
        activated_at
      FROM developers
      WHERE id = $1
    `;

    const result = await pool.query(query, [developerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Developer not found' });
    }

    const developer = result.rows[0];

    // Get last login from dev_login_history
    const lastLoginQuery = `
      SELECT login_at, login_ip
      FROM dev_login_history
      WHERE developer_id = $1
      ORDER BY login_at DESC
      LIMIT 1
    `;
    const lastLoginResult = await pool.query(lastLoginQuery, [developerId]);
    const lastLogin = lastLoginResult.rows[0];

    res.json({
      developer_id: developer.developer_id,
      username: developer.username,
      email: developer.email,
      name: developer.name,
      email_verified: developer.email_verified,
      is_active: developer.is_active,
      is_blocked: developer.is_blocked,
      created_at: developer.created_at,
      updated_at: developer.updated_at,
      activated_at: developer.activated_at,
      last_login: lastLogin?.login_at,
      last_login_ip: lastLogin?.login_ip,
    });
  } catch (error) {
    console.error('Get account info error:', error);
    res.status(500).json({ error: 'Failed to retrieve account information' });
  }
};

/**
 * Get usage statistics summary
 * GET /api/developer/settings/usage
 */
const getUsageStats = async (req, res) => {
  try {
    const developerId = req.user.developerId;

    // Get apps count
    const appsQuery = `
      SELECT COUNT(*) as count
      FROM dev_apps
      WHERE developer_id = $1
    `;
    const appsResult = await pool.query(appsQuery, [developerId]);

    // Get API calls for current month (user logins to apps)
    let apiCallsThisMonth = 0;
    let apiCallsToday = 0;
    try {
      const apiMonthQuery = `
        SELECT COUNT(*) as count
        FROM user_login_history ulh
        INNER JOIN dev_apps da ON ulh.app_id = da.id
        WHERE da.developer_id = $1 
          AND DATE_TRUNC('month', ulh.login_time) = DATE_TRUNC('month', CURRENT_DATE)
      `;
      const apiMonthResult = await pool.query(apiMonthQuery, [developerId]);
      apiCallsThisMonth = parseInt(apiMonthResult.rows[0]?.count || 0);

      const apiTodayQuery = `
        SELECT COUNT(*) as count
        FROM user_login_history ulh
        INNER JOIN dev_apps da ON ulh.app_id = da.id
        WHERE da.developer_id = $1 
          AND DATE_TRUNC('day', ulh.login_time) = DATE_TRUNC('day', CURRENT_DATE)
      `;
      const apiTodayResult = await pool.query(apiTodayQuery, [developerId]);
      apiCallsToday = parseInt(apiTodayResult.rows[0]?.count || 0);
    } catch (error) {
      // console.log      console.log('API usage tracking error:', error.message);
    }

    // Get total users across all apps
    let totalUsers = 0;
    try {
      const usersQuery = `
        SELECT COUNT(*) as count
        FROM users u
        INNER JOIN dev_apps da ON u.app_id = da.id
        WHERE da.developer_id = $1
      `;
      const usersResult = await pool.query(usersQuery, [developerId]);
      totalUsers = parseInt(usersResult.rows[0]?.count || 0);
    } catch (error) {
      // console.log      console.log('Users count error:', error.message);
    }

    res.json({
      apps_count: parseInt(appsResult.rows[0]?.count || 0),
      api_calls_this_month: apiCallsThisMonth,
      api_calls_today: apiCallsToday,
      total_users: totalUsers,
    });
  } catch (error) {
    console.error('Get usage stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve usage statistics' });
  }
};

module.exports = {
  getPlanInfo,
  getAccountInfo,
  getUsageStats,
};
