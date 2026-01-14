# 🎯 Quick Reference Guide - Group Management Features

## 📍 Navigation Path
```
CPanel Dashboard → Groups → [Select Group] → ⚙️ Settings
```

## 🗂️ Feature Locations

### 🚫 Block Users
**Tab**: Users  
**Actions**:
- Single Block: Click "Block" button → Enter reason
- Bulk Block: Select users → "🚫 Block Selected"
- Unblock: Click "Unblock" button on blocked users

### 🔐 OAuth Management
**Tab**: OAuth  
**Steps**:
1. Toggle "Use Common OAuth for All Apps"
2. If multiple credentials exist → Select which to keep
3. Enter Client ID and Secret
4. Click "Save & Apply to All Apps"

**Result**: All apps in group use same OAuth instantly

### 📋 Extra Fields
**Tab**: Extra Fields  
**Steps**:
1. Toggle "Use Common Extra Fields for All Apps"
2. Click "+ Add Field"
3. Configure: Name, Type, Editability
4. Click "Save & Apply to All Apps"

**Result**: Fields added to all apps in group

### 👥 User Management
**Tab**: Users  
**Features**:
- 🔍 Search users
- ✅ Select multiple
- ➕ Add new user
- 👁️ View status
- 📊 See statistics

### ⚡ Bulk Operations
**Tab**: Bulk Operations  
**View**:
- Operation history
- Success/failure status
- Timestamps
- Error messages

## 🎨 Status Badges

| Badge | Meaning |
|-------|---------|
| ✓ Active | User is active in group |
| 🚫 Blocked | User blocked at group level |
| ⚠️ App Blocked | User blocked in specific app only |

## ⌨️ Keyboard Shortcuts

- `Ctrl/Cmd + F` - Focus search (in Users tab)
- `Escape` - Close modals
- Click checkbox header - Select/deselect all

## 🔄 Common Workflows

### Workflow 1: Setup Group OAuth
```
1. Navigate to group settings
2. OAuth tab
3. Enable toggle
4. Choose/enter credentials
5. Save
✅ Done! All apps updated
```

### Workflow 2: Block Spam User
```
1. Users tab
2. Search for user
3. Click Block
4. Enter reason
5. Confirm
✅ Blocked from all apps
```

### Workflow 3: Add Custom Fields
```
1. Extra Fields tab
2. Enable toggle
3. Add field (e.g., "phone")
4. Choose type (text)
5. Save
✅ Field added to all apps
```

### Workflow 4: Bulk Remove Bad Actors
```
1. Users tab
2. Check user boxes
3. Click "Block Selected"
4. Confirm action
✅ All selected blocked
```

## 🛠️ Troubleshooting

### Issue: Can't see Settings button
**Fix**: Ensure you own the group

### Issue: OAuth not saving
**Fix**: Check Client ID is valid format

### Issue: Field name error
**Fix**: Use only letters, numbers, underscore

### Issue: Users not loading
**Fix**: Check apps exist in group

## 📊 Statistics Overview

**Group Stats Card Shows**:
- 📱 Total apps in group
- 👥 Total users across apps
- 🚫 Blocked users count

## 💡 Pro Tips

1. **Test OAuth First**: Enable on one app before group-wide
2. **Use Block Reasons**: Helps track why users were blocked
3. **Regular Review**: Check bulk operations for failures
4. **Search is Powerful**: Searches email, name, username, app name
5. **Fields Naming**: Use clear names like "membership_tier"

## 🎯 Best Practices

### DO ✅
- Provide reasons when blocking
- Test settings on one app first
- Use descriptive field names
- Regular monitoring of bulk ops
- Keep OAuth credentials secure

### DON'T ❌
- Block without reason
- Use special characters in field names
- Forget to save changes
- Enable common settings without testing
- Share OAuth credentials insecurely

## 📈 Metrics to Monitor

1. **Blocked Users** - Rising fast? Investigate
2. **Failed Operations** - Check error messages
3. **User Growth** - Track new users per app
4. **OAuth Usage** - Ensure all apps working

## 🔐 Security Notes

- All actions require group ownership
- Block actions are audited
- OAuth secrets encrypted
- Bulk operations logged
- User actions tracked

## 📞 Need Help?

1. Check `GROUP_MANAGEMENT_FEATURES.md` for detailed docs
2. Review browser console for errors
3. Check database logs
4. Verify migration ran successfully

## 🚀 Quick Setup Reminder

```bash
# Windows
cd Cpanel/auth-server
.\setup-group-features.ps1

# Linux/Mac
cd Cpanel/auth-server
./setup-group-features.sh

# Then restart backend
npm start
```

---

**Remember**: Changes apply to ALL apps in the group instantly!  
**Always test** with non-critical data first.

Happy managing! 🎉
