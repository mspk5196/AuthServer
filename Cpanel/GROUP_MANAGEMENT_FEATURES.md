# Group Management Features - Implementation Guide

## 🎉 Overview

This implementation adds comprehensive group management features to your Auth Server, enabling developers to efficiently manage multiple apps as a cohesive unit.

## ✨ Features Implemented

### 1. **Group-Level User Blocking** 🚫
- Block users from all apps in a group with a single action
- Unblock users across the entire group
- View block status and reasons
- Automatically blocks user in all apps within the group

### 2. **Common Extra Fields** 📋
- Define custom user fields at the group level
- Automatically apply to all apps in the group
- Support for multiple field types (text, integer, boolean, date, JSON)
- Control whether fields are editable by users
- Maximum 10 custom fields per group

### 3. **Shared OAuth Credentials** 🔐
- Use same Google OAuth credentials for all apps in a group
- Smart detection of existing credentials across apps
- Choose which credentials to use when multiple exist
- Enable/disable at any time
- Automatically updates all apps in the group

### 4. **Bulk User Operations** ⚡
- Bulk block/unblock multiple users at once
- Select users with checkboxes
- Track bulk operation history
- Monitor operation status (pending, in_progress, completed, failed)

### 5. **User Management** 👥
- View all users across all apps in the group
- Search and filter users
- Add new users to the entire group
- See user status (active, blocked, app-blocked)
- View last login times and verification status

## 📁 Files Created/Modified

### Backend Files

#### New Files:
1. **`migrations/007_group_management_features.sql`**
   - Database schema for all new features
   - Helper functions for blocking/unblocking
   - Bulk operation tracking tables
   - Views for statistics

2. **`src/controllers/groupSettingsController.js`**
   - All group settings endpoints
   - User management logic
   - Bulk operations handlers

3. **`src/routes/groupSettingsRoutes.js`**
   - Route definitions for group settings APIs

#### Modified Files:
1. **`src/app.js`**
   - Added group settings routes

### Frontend Files

#### New Files:
1. **`src/pages/Groups/GroupSettings/GroupSettings.jsx`**
   - Complete group settings UI with tabs
   - OAuth configuration panel
   - Extra fields management
   - User management table
   - Bulk operations interface

2. **`src/pages/Groups/GroupSettings/GroupSettings.css`**
   - Comprehensive styling for all components
   - Responsive design
   - Modern UI with gradients and animations

#### Modified Files:
1. **`src/pages/Groups/Groups.jsx`**
   - Added "Settings" button for each group
   - Navigation to group settings

2. **`src/App.jsx`**
   - Added route for group settings page

## 🗄️ Database Schema

### New Tables

#### `group_blocked_users`
```sql
- id (UUID, PK)
- group_id (UUID, FK to app_groups)
- user_id (UUID, FK to users)
- blocked_by (UUID, FK to developers)
- reason (TEXT)
- blocked_at (TIMESTAMP)
```

#### `bulk_operations`
```sql
- id (UUID, PK)
- developer_id (UUID, FK)
- group_id (UUID, FK)
- app_id (UUID, FK)
- operation_type (VARCHAR)
- target_count (INTEGER)
- status (VARCHAR)
- error_message (TEXT)
- metadata (JSONB)
- created_at (TIMESTAMP)
- completed_at (TIMESTAMP)
```

### Modified Tables

#### `app_groups`
New columns:
- `common_extra_fields` (JSONB) - Common fields for all apps
- `use_common_extra_fields` (BOOLEAN) - Enable/disable common fields
- `use_common_google_oauth` (BOOLEAN) - Enable/disable shared OAuth
- `common_google_client_id` (VARCHAR) - Shared OAuth client ID
- `common_google_client_secret` (VARCHAR) - Shared OAuth secret

#### `group_user_logins`
New columns:
- `is_active` (BOOLEAN) - User active status
- `added_by` (UUID) - Developer who added the user
- `notes` (TEXT) - Optional notes

### Helper Functions

1. **`block_user_from_group(group_id, user_id, blocked_by, reason)`**
   - Blocks user from all apps in the group
   - Returns BOOLEAN

2. **`unblock_user_from_group(group_id, user_id)`**
   - Unblocks user from all apps in the group
   - Returns BOOLEAN

3. **`bulk_block_users_in_group(group_id, user_ids[], blocked_by, reason)`**
   - Bulk blocks multiple users
   - Returns count of blocked users

4. **`bulk_unblock_users_in_group(group_id, user_ids[])`**
   - Bulk unblocks multiple users
   - Returns count of unblocked users

## 🔌 API Endpoints

### Group Settings
- **GET** `/api/developer/group-settings/:groupId`
  - Get group settings and statistics

- **PUT** `/api/developer/group-settings/:groupId`
  - Update group settings (OAuth, extra fields)

### User Management
- **GET** `/api/developer/group-settings/:groupId/users`
  - Get all users in group with status
  - Query params: `page`, `limit`, `search`

- **POST** `/api/developer/group-settings/:groupId/users`
  - Add user to all apps in group
  - Body: `{ email, name, username, auto_apply_to_all_apps }`

### User Blocking
- **POST** `/api/developer/group-settings/:groupId/users/:userId/block`
  - Block user from group
  - Body: `{ reason }`

- **POST** `/api/developer/group-settings/:groupId/users/:userId/unblock`
  - Unblock user from group

### Bulk Operations
- **POST** `/api/developer/group-settings/:groupId/users/bulk-block`
  - Bulk block users
  - Body: `{ user_ids: [uuid, ...], reason }`

- **POST** `/api/developer/group-settings/:groupId/users/bulk-unblock`
  - Bulk unblock users
  - Body: `{ user_ids: [uuid, ...] }`

- **GET** `/api/developer/group-settings/:groupId/bulk-operations`
  - Get bulk operations history
  - Query params: `limit`

## 🚀 Setup Instructions

### 1. Run Database Migration
```bash
psql -U your_user -d your_database -f Cpanel/auth-server/migrations/007_group_management_features.sql
```

### 2. Install Dependencies
```bash
# Backend (if any new dependencies were added)
cd Cpanel/auth-server
npm install

# Frontend
cd Cpanel/CpanelWeb
npm install
```

### 3. Restart Services
```bash
# Backend
cd Cpanel/auth-server
npm start

# Frontend
cd Cpanel/CpanelWeb
npm run dev
```

## 📖 User Guide

### Accessing Group Settings
1. Navigate to **Groups** page
2. Click **⚙️ Settings** button on any group card
3. Access different features through tabs

### Managing OAuth Credentials

#### Enable Shared OAuth:
1. Go to **OAuth** tab
2. Toggle **"Use Common OAuth for All Apps"**
3. If multiple credentials exist, select which one to use
4. Enter or update Client ID and Secret
5. Click **"Save & Apply to All Apps"**

#### Disable Shared OAuth:
1. Toggle off **"Use Common OAuth for All Apps"**
2. Individual app settings will be preserved

### Managing Extra Fields

#### Add Common Fields:
1. Go to **Extra Fields** tab
2. Toggle **"Use Common Extra Fields for All Apps"**
3. Click **"+ Add Field"**
4. Enter field name (letters, numbers, underscore only)
5. Choose field type and set editability
6. Click **"Save & Apply to All Apps"**

### Managing Users

#### View Users:
1. Go to **Users** tab
2. Use search box to filter
3. See status badges for each user

#### Block Individual User:
1. Click **Block** button next to user
2. Optionally enter a reason
3. User is blocked from all apps in group

#### Bulk Block Users:
1. Select multiple users with checkboxes
2. Click **"🚫 Block Selected"**
3. Confirm the action

#### Add User to Group:
1. Click **"+ Add User"**
2. Enter user details
3. User is added to all apps in group

### Viewing Bulk Operations
1. Go to **Bulk Operations** tab
2. See history of all bulk actions
3. Check status (completed, failed, in_progress)

## 🎨 UI Features

### Tabs
- **🏠 General** - Group info and apps list
- **🔐 OAuth** - Shared OAuth credentials
- **📋 Extra Fields** - Common custom fields
- **👥 Users** - User management and blocking
- **⚡ Bulk Operations** - Operation history

### Statistics Badges
- 📱 App Count
- 👥 Total Users
- 🚫 Blocked Users

### User Status Badges
- ✓ Active (green)
- 🚫 Blocked (red)
- ⚠️ App Blocked (orange)

## 🔒 Security Considerations

1. **Authorization**: All endpoints verify group ownership
2. **Validation**: Input validation on all fields
3. **Transactions**: Bulk operations use database transactions
4. **Audit Trail**: All blocking actions tracked with timestamp and reason
5. **Secure Credentials**: OAuth secrets handled securely

## ⚡ Performance Optimizations

1. **Indexed Queries**: All foreign keys and search fields indexed
2. **Pagination**: User list supports pagination
3. **Batch Operations**: Bulk actions use database functions
4. **Caching**: Group settings cached on frontend

## 🐛 Troubleshooting

### Issue: "Group not found"
- **Solution**: Ensure you own the group and it exists

### Issue: OAuth not applying to all apps
- **Solution**: Check that `use_common_google_oauth` is true and credentials are saved

### Issue: Bulk operation stuck in "in_progress"
- **Solution**: Check bulk_operations table for error_message

### Issue: Users not showing in list
- **Solution**: Ensure apps exist in the group and have users

## 📝 Best Practices

1. **Test OAuth First**: Test OAuth changes on one app before enabling for all
2. **Use Reasons**: Always provide reasons when blocking users
3. **Regular Cleanup**: Monitor bulk operations table size
4. **Field Naming**: Use clear, descriptive field names
5. **Backup**: Backup before enabling common settings

## 🔮 Future Enhancements

Potential additions:
- Export user lists to CSV
- Scheduled bulk operations
- User group roles and permissions
- Activity logs for all changes
- Email notifications for blocked users
- Group-level analytics dashboard

## 📞 Support

For issues or questions:
1. Check database logs for errors
2. Review browser console for frontend errors
3. Check bulk_operations table for failed operations
4. Verify all migrations were applied successfully

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Author**: MSP Kapps Development Team
