# Group Settings Update - New Features

## Overview
Enhanced the group settings with confirmation dialogs, user filtering, and CSV export capabilities.

## New Features

### 1. Extra Fields Data Deletion with Confirmation
**What**: When disabling common extra fields, the system now shows a confirmation dialog warning about data deletion.

**How it works**:
- User attempts to disable common extra fields toggle
- A warning modal appears: "Disabling common extra fields will permanently delete ALL extra field data for users in this group. This action cannot be undone. Are you sure?"
- If confirmed, the system:
  - Calls DELETE `/api/developer/group-settings/:groupId/extra-field-data`
  - Removes all extra field data from `group_user_logins` table
  - Disables the common extra fields setting
- If canceled, the toggle remains enabled

**Backend**:
- **Endpoint**: `DELETE /api/developer/group-settings/:groupId/extra-field-data`
- **Controller**: `deleteExtraFieldData()` in `groupSettingsController.js`
- **Action**: Deletes rows where any extra_field_1 through extra_field_10 is not NULL

### 2. CSV Export of Users
**What**: Export all users (or filtered users) to a CSV file, excluding passwords.

**Features**:
- Exports current filtered results (respects all active filters)
- Includes: ID, Email, Name, Username, App, Login Method, Email Verified, Status, Last Login, Created At
- Excludes: Passwords and sensitive data
- Downloads as: `group_{groupId}_users_{date}.csv`

**How to use**:
- Click "📥 Export CSV" button in Users tab header
- System fetches all matching users (no pagination limit)
- CSV file downloads automatically
- Shows success message with count of exported users

### 3. Advanced User Filtering
**What**: Filter users by multiple criteria in the Users tab.

**Filter Options**:

1. **App** - Filter by specific app in the group
2. **Email Contains** - Search for users by email pattern
3. **Name Contains** - Search for users by name pattern
4. **Login Method** - Filter by:
   - Email/Password
   - Google OAuth
5. **Status** - Filter by:
   - Active (not blocked)
   - Blocked (group or app level)
   - Email Verified
   - Email Unverified
6. **Last Login From** - Filter users who logged in after this date
7. **Last Login To** - Filter users who logged in before this date

**Features**:
- All filters work together (AND logic)
- "Clear All" button to reset all filters
- Filters apply to both the table view and CSV export
- Real-time filtering with automatic page reset

**Backend Changes**:
- Enhanced `getGroupUsersWithStatus()` to accept query parameters
- Dynamic SQL query building based on provided filters
- Adds LEFT JOIN to `group_user_logins` for login method detection

## Technical Details

### Backend Changes

#### New Controller Function
```javascript
deleteExtraFieldData(req, res)
```
- Verifies group ownership
- Deletes all extra field data for users in the group
- Returns count of deleted records

#### Enhanced Controller Function
```javascript
getGroupUsersWithStatus(req, res)
```
- Now accepts query parameters: `appId`, `email`, `name`, `loginMethod`, `status`, `lastLoginFrom`, `lastLoginTo`
- Builds dynamic WHERE clause based on provided filters
- Includes `login_method` in response (google/email)

#### New Route
```javascript
router.delete('/:groupId/extra-field-data', deleteExtraFieldData);
```

### Frontend Changes

#### New State Variables
```javascript
// User filters
const [filters, setFilters] = useState({
  appId: '',
  email: '',
  name: '',
  loginMethod: '',
  status: '',
  lastLoginFrom: '',
  lastLoginTo: ''
});

// Confirmation modal
const [showConfirmModal, setShowConfirmModal] = useState(false);
const [confirmAction, setConfirmAction] = useState(null);
const [confirmMessage, setConfirmMessage] = useState('');
```

#### New Functions

1. **deleteExtraFieldData()** - Calls API to delete extra field data
2. **clearFilters()** - Resets all filters to empty state
3. **updateFilter(key, value)** - Updates a single filter value
4. **exportUsersToCSV()** - Fetches all users and generates CSV download
5. **handleConfirmAction()** - Executes confirmed action
6. **handleCancelAction()** - Cancels confirmation modal

#### UI Components

**Filters Panel**:
- Clean grid layout with 7 filter inputs
- Responsive design (2 columns on tablet, 1 on mobile)
- Light blue background (#f8fafc) with border

**Confirmation Modal**:
- Warning emoji and clear message
- Red "Yes, Delete Data" button
- Gray "Cancel" button
- Overlay with click-to-close

**Export Button**:
- Located in Users tab header
- Shows download icon (📥)
- Secondary button style

### CSS Additions

```css
.filters-panel { /* ... */ }
.filters-header { /* ... */ }
.filters-grid { /* ... */ }
.filter-item { /* ... */ }
.confirm-modal { /* ... */ }
.confirm-message { /* ... */ }
.btn-danger { /* ... */ }
```

## Testing Checklist

- [ ] Disable extra fields → Confirmation modal appears
- [ ] Confirm deletion → Data is deleted and success message shows
- [ ] Cancel deletion → Toggle remains enabled
- [ ] Apply each filter individually → Results update correctly
- [ ] Apply multiple filters together → Correct AND logic
- [ ] Clear filters → All filters reset and full list shows
- [ ] Export CSV with no filters → All users exported
- [ ] Export CSV with filters → Only matching users exported
- [ ] Check CSV content → No passwords included
- [ ] Test on mobile → Filters stack vertically

## Database Impact

**Affected Tables**:
- `group_user_logins` - Extra field data deleted when feature disabled

**Query Performance**:
- Added LEFT JOIN to group_user_logins for login method
- Indexed columns used in WHERE clauses (user_id, group_id, app_id)
- No performance concerns for typical group sizes (<10k users)

## Migration Notes

No database migration required - all changes are application-level only.

## API Changes Summary

| Method | Endpoint | New/Modified | Purpose |
|--------|----------|--------------|---------|
| DELETE | `/api/developer/group-settings/:groupId/extra-field-data` | **NEW** | Delete all extra field data |
| GET | `/api/developer/group-settings/:groupId/users` | **MODIFIED** | Now accepts filter query params |

## Security Considerations

1. **Authentication**: All endpoints require developer authentication
2. **Authorization**: Group ownership verified before data deletion
3. **Data Privacy**: Passwords excluded from CSV exports
4. **Confirmation**: Destructive action requires explicit user confirmation
5. **Audit Trail**: Consider logging extra field data deletions (future enhancement)

## Future Enhancements

1. Add "Export Filtered" vs "Export All" option
2. Allow custom CSV column selection
3. Add date range picker UI component
4. Include bulk operation history in CSV
5. Add undo functionality for accidental deletions
6. Log data deletion events for audit trail
