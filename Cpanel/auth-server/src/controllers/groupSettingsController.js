const pool = require('../config/db');

/**
 * Get group settings including OAuth, extra fields, and statistics
 */
const getGroupSettings = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { groupId } = req.params;

    // Verify group ownership
    const groupResult = await pool.query(`
      SELECT 
        g.*,
        COUNT(DISTINCT da.id) as app_count,
        COUNT(DISTINCT u.id) as total_users,
        COALESCE(gbu_count.blocked_count, 0) as blocked_users_count
      FROM app_groups g
      LEFT JOIN dev_apps da ON da.group_id = g.id
      LEFT JOIN users u ON u.app_id = da.id
      LEFT JOIN (
        SELECT group_id, COUNT(*) as blocked_count 
        FROM group_blocked_users 
        GROUP BY group_id
      ) gbu_count ON gbu_count.group_id = g.id
      WHERE g.id = $1 AND g.developer_id = $2
      GROUP BY g.id, gbu_count.blocked_count
    `, [groupId, developerId]);

    if (groupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const group = groupResult.rows[0];

    // Get apps in this group with their OAuth settings
    const appsResult = await pool.query(`
      SELECT 
        id, 
        app_name, 
        google_client_id, 
        google_client_secret,
        allow_google_signin,
        extra_fields
      FROM dev_apps
      WHERE group_id = $1 AND developer_id = $2
      ORDER BY app_name
    `, [groupId, developerId]);

    res.json({
      success: true,
      data: {
        group,
        apps: appsResult.rows
      }
    });
  } catch (error) {
    console.error('Get group settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch group settings',
      error: error.message
    });
  }
};

/**
 * Update group settings (OAuth, extra fields, etc.)
 */
const updateGroupSettings = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { groupId } = req.params;
    const { 
      use_common_google_oauth,
      common_google_client_id,
      common_google_client_secret,
      use_common_extra_fields,
      common_extra_fields
    } = req.body;

    // Verify group ownership
    const groupCheck = await pool.query(
      'SELECT id FROM app_groups WHERE id = $1 AND developer_id = $2',
      [groupId, developerId]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (use_common_google_oauth !== undefined) {
      updates.push(`use_common_google_oauth = $${paramCount++}`);
      values.push(use_common_google_oauth);
    }

    if (common_google_client_id !== undefined) {
      updates.push(`common_google_client_id = $${paramCount++}`);
      values.push(common_google_client_id);
    }

    if (common_google_client_secret !== undefined) {
      updates.push(`common_google_client_secret = $${paramCount++}`);
      values.push(common_google_client_secret);
    }

    if (use_common_extra_fields !== undefined) {
      updates.push(`use_common_extra_fields = $${paramCount++}`);
      values.push(use_common_extra_fields);
    }

    if (common_extra_fields !== undefined) {
      updates.push(`common_extra_fields = $${paramCount++}`);
      values.push(JSON.stringify(common_extra_fields));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No updates provided'
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(groupId, developerId);

    const query = `
      UPDATE app_groups 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount++} AND developer_id = $${paramCount++}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    // If enabling common OAuth, optionally apply to all apps in group
    if (use_common_google_oauth && common_google_client_id) {
      await pool.query(`
        UPDATE dev_apps
        SET 
          google_client_id = $1,
          google_client_secret = $2,
          updated_at = NOW()
        WHERE group_id = $3 AND developer_id = $4
      `, [common_google_client_id, common_google_client_secret, groupId, developerId]);
    }

    // If enabling common extra fields, merge with existing app fields
    if (use_common_extra_fields && common_extra_fields) {
      // Get all apps in the group
      const appsResult = await pool.query(
        'SELECT id, extra_fields FROM dev_apps WHERE group_id = $1 AND developer_id = $2',
        [groupId, developerId]
      );

      // Update each app by merging common fields with existing fields
      for (const app of appsResult.rows) {
        const existingFields = app.extra_fields || [];
        const commonFieldNames = common_extra_fields.map(f => f.name);
        
        // Keep existing app-specific fields that are not in common fields
        const appSpecificFields = existingFields.filter(
          f => !commonFieldNames.includes(f.name)
        );
        
        // Merge: app-specific fields + common fields
        const mergedFields = [...appSpecificFields, ...common_extra_fields];
        
        await pool.query(`
          UPDATE dev_apps
          SET extra_fields = $1, updated_at = NOW()
          WHERE id = $2
        `, [JSON.stringify(mergedFields), app.id]);
      }
    }

    // If disabling common extra fields, remove common fields from apps
    if (use_common_extra_fields === false) {
      // Get the current common fields before disabling
      const groupData = await pool.query(
        'SELECT common_extra_fields FROM app_groups WHERE id = $1',
        [groupId]
      );
      
      const currentCommonFields = groupData.rows[0]?.common_extra_fields || [];
      
      if (currentCommonFields.length > 0) {
        // Get all apps in the group
        const appsResult = await pool.query(
          'SELECT id, extra_fields FROM dev_apps WHERE group_id = $1 AND developer_id = $2',
          [groupId, developerId]
        );

        const commonFieldNames = currentCommonFields.map(f => f.name);

        // Remove common fields from each app, keeping only app-specific fields
        for (const app of appsResult.rows) {
          const existingFields = app.extra_fields || [];
          
          // Keep only fields that are NOT in common fields
          const appSpecificFields = existingFields.filter(
            f => !commonFieldNames.includes(f.name)
          );
          
          await pool.query(`
            UPDATE dev_apps
            SET extra_fields = $1, updated_at = NOW()
            WHERE id = $2
          `, [JSON.stringify(appSpecificFields), app.id]);
        }

        // Delete extra field data from users
        const commonFieldKeys = commonFieldNames.map(name => `'${name}'`).join(',');
        
        if (commonFieldKeys) {
          await pool.query(`
            UPDATE users u
            SET extra = (
              SELECT jsonb_object_agg(key, value)
              FROM jsonb_each(u.extra)
              WHERE key NOT IN (${commonFieldKeys})
            )
            FROM dev_apps da
            WHERE u.app_id = da.id
              AND da.group_id = $1
              AND u.extra IS NOT NULL
              AND u.extra != '{}'::jsonb
          `, [groupId]);
        }
      }
    }

    res.json({
      success: true,
      message: 'Group settings updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update group settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update group settings',
      error: error.message
    });
  }
};

/**
 * Get all users in a group with their block status
 */
const getGroupUsersWithStatus = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { groupId } = req.params;
    const { page = 1, limit = 50, search = '' } = req.query;

    // Verify group ownership
    const groupCheck = await pool.query(
      'SELECT id FROM app_groups WHERE id = $1 AND developer_id = $2',
      [groupId, developerId]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const offset = (page - 1) * limit;
    const searchPattern = `%${search}%`;

    // Build filter conditions
    const filters = [];
    const params = [groupId, developerId, searchPattern];
    let paramIndex = 4;

    // App filter
    if (req.query.appId) {
      filters.push(`u.app_id = $${paramIndex}`);
      params.push(req.query.appId);
      paramIndex++;
    }

    // Email filter
    if (req.query.email) {
      filters.push(`u.email ILIKE $${paramIndex}`);
      params.push(`%${req.query.email}%`);
      paramIndex++;
    }

    // Name filter
    if (req.query.name) {
      filters.push(`u.name ILIKE $${paramIndex}`);
      params.push(`%${req.query.name}%`);
      paramIndex++;
    }

    // Login method filter
    if (req.query.loginMethod) {
      const loginMethodMap = {
        'google': `u.google_id IS NOT NULL`,
        'email': `u.google_id IS NULL`
      };
      if (loginMethodMap[req.query.loginMethod]) {
        filters.push(loginMethodMap[req.query.loginMethod]);
      }
    }

    // Status filter
    if (req.query.status) {
      if (req.query.status === 'active') {
        filters.push(`u.is_blocked = false AND (gbu.id IS NULL)`);
      } else if (req.query.status === 'blocked') {
        filters.push(`(u.is_blocked = true OR gbu.id IS NOT NULL)`);
      } else if (req.query.status === 'verified') {
        filters.push(`u.email_verified = true`);
      } else if (req.query.status === 'unverified') {
        filters.push(`u.email_verified = false`);
      }
    }

    // Last login filter
    if (req.query.lastLoginFrom) {
      filters.push(`u.last_login >= $${paramIndex}`);
      params.push(req.query.lastLoginFrom);
      paramIndex++;
    }
    if (req.query.lastLoginTo) {
      filters.push(`u.last_login <= $${paramIndex}`);
      params.push(req.query.lastLoginTo);
      paramIndex++;
    }

    const filterClause = filters.length > 0 ? `AND ${filters.join(' AND ')}` : '';

    params.push(limit, offset);

    const usersResult = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.username,
        u.email_verified,
        u.is_blocked as app_blocked,
        u.last_login,
        u.created_at,
        u.app_id,
        da.app_name,
        gbu.id IS NOT NULL as group_blocked,
        gbu.reason as block_reason,
        gbu.blocked_at,
        gbu.blocked_by,
        u.google_id,
        CASE WHEN u.google_id IS NOT NULL THEN 'google' ELSE 'email' END as login_method
      FROM users u
      JOIN dev_apps da ON u.app_id = da.id
      LEFT JOIN group_blocked_users gbu ON gbu.group_id = da.group_id AND gbu.user_id = u.id
      LEFT JOIN group_user_logins gul ON gul.user_id = u.id AND gul.group_id = da.group_id
      WHERE da.group_id = $1 AND da.developer_id = $2
        AND (
          u.email ILIKE $3 OR 
          u.name ILIKE $3 OR 
          u.username ILIKE $3 OR
          da.app_name ILIKE $3
        )
        ${filterClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    // Get total count with same filters
    const countParams = params.slice(0, -2); // Remove limit and offset
    const countResult = await pool.query(`
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      JOIN dev_apps da ON u.app_id = da.id
      LEFT JOIN group_blocked_users gbu ON gbu.group_id = da.group_id AND gbu.user_id = u.id
      LEFT JOIN group_user_logins gul ON gul.user_id = u.id AND gul.group_id = da.group_id
      WHERE da.group_id = $1 AND da.developer_id = $2
        AND (
          u.email ILIKE $3 OR 
          u.name ILIKE $3 OR 
          u.username ILIKE $3 OR
          da.app_name ILIKE $3
        )
        ${filterClause}
    `, countParams);

    res.json({
      success: true,
      data: {
        users: usersResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total)
        }
      }
    });
  } catch (error) {
    console.error('Get group users with status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch group users',
      error: error.message
    });
  }
};

/**
 * Block a single user from group
 */
const blockUserFromGroup = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { groupId, userId } = req.params;
    const { reason } = req.body;

    // Verify group ownership
    const groupCheck = await pool.query(
      'SELECT id FROM app_groups WHERE id = $1 AND developer_id = $2',
      [groupId, developerId]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Use the database function to block user
    await pool.query(
      'SELECT block_user_from_group($1, $2, $3, $4)',
      [groupId, userId, developerId, reason || null]
    );

    res.json({
      success: true,
      message: 'User blocked from group successfully'
    });
  } catch (error) {
    console.error('Block user from group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to block user from group',
      error: error.message
    });
  }
};

/**
 * Unblock a single user from group
 */
const unblockUserFromGroup = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { groupId, userId } = req.params;

    // Verify group ownership
    const groupCheck = await pool.query(
      'SELECT id FROM app_groups WHERE id = $1 AND developer_id = $2',
      [groupId, developerId]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Use the database function to unblock user
    await pool.query(
      'SELECT unblock_user_from_group($1, $2)',
      [groupId, userId]
    );

    res.json({
      success: true,
      message: 'User unblocked from group successfully'
    });
  } catch (error) {
    console.error('Unblock user from group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unblock user from group',
      error: error.message
    });
  }
};

/**
 * Bulk block users from group
 */
const bulkBlockUsers = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { groupId } = req.params;
    const { user_ids, reason } = req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'user_ids array is required and must not be empty'
      });
    }

    // Verify group ownership
    const groupCheck = await pool.query(
      'SELECT id FROM app_groups WHERE id = $1 AND developer_id = $2',
      [groupId, developerId]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Create bulk operation record
    const bulkOpResult = await pool.query(`
      INSERT INTO bulk_operations (
        developer_id, group_id, operation_type, target_count, status
      ) VALUES ($1, $2, 'block_users', $3, 'in_progress')
      RETURNING id
    `, [developerId, groupId, user_ids.length]);

    const bulkOpId = bulkOpResult.rows[0].id;

    try {
      // Use the database function to bulk block users
      const result = await pool.query(
        'SELECT bulk_block_users_in_group($1, $2, $3, $4) as blocked_count',
        [groupId, user_ids, developerId, reason || null]
      );

      // Update bulk operation status
      await pool.query(`
        UPDATE bulk_operations 
        SET status = 'completed', completed_at = NOW()
        WHERE id = $1
      `, [bulkOpId]);

      res.json({
        success: true,
        message: `Successfully blocked ${result.rows[0].blocked_count} users from group`,
        data: {
          blocked_count: result.rows[0].blocked_count,
          bulk_operation_id: bulkOpId
        }
      });
    } catch (error) {
      // Update bulk operation status on error
      await pool.query(`
        UPDATE bulk_operations 
        SET status = 'failed', error_message = $1, completed_at = NOW()
        WHERE id = $2
      `, [error.message, bulkOpId]);
      throw error;
    }
  } catch (error) {
    console.error('Bulk block users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk block users',
      error: error.message
    });
  }
};

/**
 * Bulk unblock users from group
 */
const bulkUnblockUsers = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { groupId } = req.params;
    const { user_ids } = req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'user_ids array is required and must not be empty'
      });
    }

    // Verify group ownership
    const groupCheck = await pool.query(
      'SELECT id FROM app_groups WHERE id = $1 AND developer_id = $2',
      [groupId, developerId]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Create bulk operation record
    const bulkOpResult = await pool.query(`
      INSERT INTO bulk_operations (
        developer_id, group_id, operation_type, target_count, status
      ) VALUES ($1, $2, 'unblock_users', $3, 'in_progress')
      RETURNING id
    `, [developerId, groupId, user_ids.length]);

    const bulkOpId = bulkOpResult.rows[0].id;

    try {
      // Use the database function to bulk unblock users
      const result = await pool.query(
        'SELECT bulk_unblock_users_in_group($1, $2) as unblocked_count',
        [groupId, user_ids]
      );

      // Update bulk operation status
      await pool.query(`
        UPDATE bulk_operations 
        SET status = 'completed', completed_at = NOW()
        WHERE id = $1
      `, [bulkOpId]);

      res.json({
        success: true,
        message: `Successfully unblocked ${result.rows[0].unblocked_count} users from group`,
        data: {
          unblocked_count: result.rows[0].unblocked_count,
          bulk_operation_id: bulkOpId
        }
      });
    } catch (error) {
      // Update bulk operation status on error
      await pool.query(`
        UPDATE bulk_operations 
        SET status = 'failed', error_message = $1, completed_at = NOW()
        WHERE id = $2
      `, [error.message, bulkOpId]);
      throw error;
    }
  } catch (error) {
    console.error('Bulk unblock users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk unblock users',
      error: error.message
    });
  }
};

/**
 * Add user to group (creates user or links existing user to group apps)
 */
const addUserToGroup = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { groupId } = req.params;
    const { email, name, username, password, auto_apply_to_all_apps = true } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Verify group ownership
    const groupCheck = await pool.query(
      'SELECT id FROM app_groups WHERE id = $1 AND developer_id = $2',
      [groupId, developerId]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Get all apps in the group
    const appsResult = await pool.query(
      'SELECT id FROM dev_apps WHERE group_id = $1 AND developer_id = $2',
      [groupId, developerId]
    );

    if (appsResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No apps found in this group. Add apps first.'
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const createdUsers = [];

      // Create user in each app if auto_apply_to_all_apps is true
      if (auto_apply_to_all_apps) {
        for (const app of appsResult.rows) {
          // Check if user already exists in this app
          const existingUser = await client.query(
            'SELECT id FROM users WHERE app_id = $1 AND email = $2',
            [app.id, email]
          );

          let userId;
          if (existingUser.rows.length === 0) {
            // Create new user (simplified - adjust based on your auth logic)
            const userResult = await client.query(`
              INSERT INTO users (app_id, email, name, username, email_verified, created_at, updated_at)
              VALUES ($1, $2, $3, $4, false, NOW(), NOW())
              RETURNING id
            `, [app.id, email, name, username]);
            userId = userResult.rows[0].id;
          } else {
            userId = existingUser.rows[0].id;
          }

          // Add to group_user_logins
          await client.query(`
            INSERT INTO group_user_logins (group_id, user_id, app_id, added_by, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (group_id, user_id, app_id) DO NOTHING
          `, [groupId, userId, app.id, developerId]);

          createdUsers.push({ app_id: app.id, user_id: userId });
        }
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `User added to ${createdUsers.length} apps in the group`,
        data: { created_users: createdUsers }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Add user to group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add user to group',
      error: error.message
    });
  }
};

/**
 * Get bulk operations history for a group
 */
const getBulkOperations = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { groupId } = req.params;
    const { limit = 20 } = req.query;

    const result = await pool.query(`
      SELECT 
        id,
        operation_type,
        target_count,
        status,
        error_message,
        metadata,
        created_at,
        completed_at
      FROM bulk_operations
      WHERE developer_id = $1 AND group_id = $2
      ORDER BY created_at DESC
      LIMIT $3
    `, [developerId, groupId, limit]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get bulk operations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bulk operations',
      error: error.message
    });
  }
};

/**
 * Delete all extra field data for users in a group
 */
const deleteExtraFieldData = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { groupId } = req.params;

    // Verify group ownership
    const groupResult = await pool.query(
      'SELECT id FROM app_groups WHERE id = $1 AND developer_id = $2',
      [groupId, developerId]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Delete all extra field data for users in this group
    const deleteResult = await pool.query(`
      UPDATE users u
      SET extra = '{}'::jsonb
      FROM dev_apps da
      WHERE u.app_id = da.id
        AND da.group_id = $1
        AND u.extra IS NOT NULL
        AND u.extra != '{}'::jsonb
      RETURNING u.id
    `, [groupId]);

    res.json({
      success: true,
      message: `Deleted extra field data for ${deleteResult.rowCount} users`,
      data: {
        deletedCount: deleteResult.rowCount
      }
    });
  } catch (error) {
    console.error('Delete extra field data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete extra field data',
      error: error.message
    });
  }
};

/**
 * Detect conflicts when enabling common mode for username/name/password/extra_fields
 */
const detectCommonModeConflicts = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { groupId } = req.params;
    const { field } = req.query; // 'username', 'name', 'password', 'extra_fields'

    // Verify group ownership
    const groupCheck = await pool.query(
      'SELECT id, name FROM app_groups WHERE id = $1 AND developer_id = $2',
      [groupId, developerId]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const conflicts = [];

    if (field === 'username' || field === 'all') {
      // Find users with different usernames across apps in the group
      const usernameConflicts = await pool.query(`
        SELECT 
          u.email,
          ARRAY_AGG(DISTINCT u.username ORDER BY u.username) as usernames,
          ARRAY_AGG(DISTINCT da.app_name ORDER BY da.app_name) as apps,
          COUNT(DISTINCT u.username) as distinct_count
        FROM users u
        JOIN dev_apps da ON u.app_id = da.id
        WHERE da.group_id = $1 AND u.username IS NOT NULL
        GROUP BY u.email
        HAVING COUNT(DISTINCT u.username) > 1
      `, [groupId]);

      if (usernameConflicts.rows.length > 0) {
        conflicts.push({
          field: 'username',
          conflicts: usernameConflicts.rows
        });
      }
    }

    if (field === 'name' || field === 'all') {
      // Find users with different names across apps in the group
      const nameConflicts = await pool.query(`
        SELECT 
          u.email,
          ARRAY_AGG(DISTINCT u.name ORDER BY u.name) as names,
          ARRAY_AGG(DISTINCT da.app_name ORDER BY da.app_name) as apps,
          COUNT(DISTINCT u.name) as distinct_count
        FROM users u
        JOIN dev_apps da ON u.app_id = da.id
        WHERE da.group_id = $1 AND u.name IS NOT NULL
        GROUP BY u.email
        HAVING COUNT(DISTINCT u.name) > 1
      `, [groupId]);

      if (nameConflicts.rows.length > 0) {
        conflicts.push({
          field: 'name',
          conflicts: nameConflicts.rows
        });
      }
    }

    if (field === 'password' || field === 'all') {
      // For passwords, just check if user exists in multiple apps
      // (we'll need to send password reset emails)
      const passwordConflicts = await pool.query(`
        SELECT 
          u.email,
          COUNT(DISTINCT da.id) as app_count,
          ARRAY_AGG(DISTINCT da.app_name ORDER BY da.app_name) as apps
        FROM users u
        JOIN dev_apps da ON u.app_id = da.id
        WHERE da.group_id = $1
        GROUP BY u.email
        HAVING COUNT(DISTINCT da.id) > 1
      `, [groupId]);

      if (passwordConflicts.rows.length > 0) {
        conflicts.push({
          field: 'password',
          conflicts: passwordConflicts.rows,
          note: 'Users will receive email to set a common password'
        });
      }
    }

    res.json({
      success: true,
      data: {
        group_name: groupCheck.rows[0].name,
        conflicts,
        has_conflicts: conflicts.length > 0
      }
    });

  } catch (error) {
    console.error('Detect common mode conflicts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect conflicts',
      error: error.message
    });
  }
};

/**
 * Enable common mode for a field (username/name/password/extra_fields)
 */
const enableCommonMode = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { groupId } = req.params;
    const { field, resolutions } = req.body; // field: 'username', 'name', 'password', 'extra_fields_data'
                                              // resolutions: { email: selectedValue, ... }

    // Verify group ownership
    const groupCheck = await pool.query(
      'SELECT id FROM app_groups WHERE id = $1 AND developer_id = $2',
      [groupId, developerId]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update group setting
      const fieldColumn = `use_common_${field}`;
      await client.query(
        `UPDATE app_groups SET ${fieldColumn} = true WHERE id = $1`,
        [groupId]
      );

      // Apply resolutions and update group_user_logins
      if (resolutions && typeof resolutions === 'object') {
        for (const [email, value] of Object.entries(resolutions)) {
          // Get user IDs for this email in the group
          const userIds = await client.query(`
            SELECT u.id
            FROM users u
            JOIN dev_apps da ON u.app_id = da.id
            WHERE da.group_id = $1 AND u.email = $2
          `, [groupId, email]);

          if (userIds.rows.length > 0) {
            const userId = userIds.rows[0].id;

            // Check if group_user_logins entry exists
            const gulCheck = await client.query(
              'SELECT id FROM group_user_logins WHERE user_id = $1 AND group_id = $2',
              [userId, groupId]
            );

            if (field === 'username') {
              if (gulCheck.rows.length > 0) {
                await client.query(
                  'UPDATE group_user_logins SET common_username = $1 WHERE user_id = $2 AND group_id = $3',
                  [value, userId, groupId]
                );
              } else {
                await client.query(
                  'INSERT INTO group_user_logins (user_id, group_id, common_username) VALUES ($1, $2, $3)',
                  [userId, groupId, value]
                );
              }
            } else if (field === 'name') {
              if (gulCheck.rows.length > 0) {
                await client.query(
                  'UPDATE group_user_logins SET common_name = $1 WHERE user_id = $2 AND group_id = $3',
                  [value, userId, groupId]
                );
              } else {
                await client.query(
                  'INSERT INTO group_user_logins (user_id, group_id, common_name) VALUES ($1, $2, $3)',
                  [userId, groupId, value]
                );
              }
            }
          }
        }
      }

      // If enabling common password, create pending password resets
      if (field === 'password') {
        const usersNeedingReset = await client.query(`
          SELECT DISTINCT u.email
          FROM users u
          JOIN dev_apps da ON u.app_id = da.id
          WHERE da.group_id = $1
          GROUP BY u.email
          HAVING COUNT(DISTINCT da.id) > 1
        `, [groupId]);

        for (const user of usersNeedingReset.rows) {
          const resetToken = require('crypto').randomBytes(32).toString('hex');
          await client.query(`
            INSERT INTO pending_password_resets (
              user_email, group_id, reset_token, reason, expires_at
            ) VALUES ($1, $2, $3, 'common_mode_enabled', NOW() + INTERVAL '7 days')
          `, [user.email, groupId, resetToken]);

          // TODO: Send email to user with reset link
          // const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
          // sendMail({ to: user.email, subject: 'Set Your Password', ... });
        }
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Common ${field} mode enabled successfully`,
        data: {
          pending_password_resets: field === 'password' ? true : false
        }
      });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Enable common mode error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enable common mode',
      error: error.message
    });
  }
};

/**
 * Disable common mode for a field
 */
const disableCommonMode = async (req, res) => {
  try {
    const developerId = req.user.developerId;
    const { groupId } = req.params;
    const { field } = req.body; // 'username', 'name', 'password', 'extra_fields_data'

    // Verify group ownership
    const groupCheck = await pool.query(
      'SELECT id FROM app_groups WHERE id = $1 AND developer_id = $2',
      [groupId, developerId]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Copy common data to each app's user record
      if (field === 'username') {
        await client.query(`
          UPDATE users u
          SET username = gul.common_username
          FROM group_user_logins gul, dev_apps da
          WHERE u.id = gul.user_id
            AND u.app_id = da.id
            AND da.group_id = $1
            AND gul.common_username IS NOT NULL
        `, [groupId]);
      } else if (field === 'name') {
        await client.query(`
          UPDATE users u
          SET name = gul.common_name
          FROM group_user_logins gul, dev_apps da
          WHERE u.id = gul.user_id
            AND u.app_id = da.id
            AND da.group_id = $1
            AND gul.common_name IS NOT NULL
        `, [groupId]);
      } else if (field === 'password') {
        await client.query(`
          UPDATE users u
          SET password_hash = gul.common_password_hash
          FROM group_user_logins gul, dev_apps da
          WHERE u.id = gul.user_id
            AND u.app_id = da.id
            AND da.group_id = $1
            AND gul.common_password_hash IS NOT NULL
        `, [groupId]);
      }

      // Update group setting
      const fieldColumn = `use_common_${field}`;
      await client.query(
        `UPDATE app_groups SET ${fieldColumn} = false WHERE id = $1`,
        [groupId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Common ${field} mode disabled. Data copied to each app.`
      });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Disable common mode error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable common mode',
      error: error.message
    });
  }
};

module.exports = {
  getGroupSettings,
  updateGroupSettings,
  getGroupUsersWithStatus,
  blockUserFromGroup,
  unblockUserFromGroup,
  bulkBlockUsers,
  bulkUnblockUsers,
  addUserToGroup,
  getBulkOperations,
  deleteExtraFieldData,
  detectCommonModeConflicts,
  enableCommonMode,
  disableCommonMode
};
