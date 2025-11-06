# cPanel Settings API Documentation

## Overview
Backend API endpoints for the cPanel settings page, providing plan information, usage statistics, and account details.

## Base URL
```
http://localhost:5001/api/developer
```

## Authentication
All settings endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### 1. Get Plan Information
Get the developer's current plan details, limits, and usage.

**Endpoint:** `GET /settings/plan`

**Response:**
```json
{
  "plan_name": "Free",
  "plan_type": "free",
  "expiry_date": null,
  "registration_date": "2025-01-15T10:30:00Z",
  "is_active": true,
  "apps_limit": 3,
  "api_calls_limit": 10000,
  "storage_limit": 100,
  "apps_used": 1,
  "api_calls_used": 245,
  "storage_used": 12.5,
  "features": [
    "Up to 3 apps",
    "10,000 API calls per month",
    "100 MB storage",
    "Community support"
  ],
  "price_monthly": 0,
  "billing_cycle": "No Billing"
}
```

**Error Responses:**
- `404` - No active plan found
- `500` - Server error

---

### 2. Get Account Information
Get the developer's account details.

**Endpoint:** `GET /settings/account`

**Response:**
```json
{
  "developer_id": 123,
  "username": "john_dev",
  "email": "john@example.com",
  "name": "John Doe",
  "email_verified": true,
  "is_verified": true,
  "created_at": "2025-01-10T08:00:00Z",
  "last_login": "2025-01-15T14:30:00Z"
}
```

**Error Responses:**
- `404` - Developer not found
- `500` - Server error

---

### 3. Get Usage Statistics
Get detailed usage statistics for apps, API calls, and storage.

**Endpoint:** `GET /settings/usage`

**Response:**
```json
{
  "apps_count": 1,
  "api_calls_this_month": 245,
  "api_calls_today": 12,
  "storage_used_mb": 12.5
}
```

**Error Responses:**
- `500` - Server error

---

## Database Tables

### Required Tables
The settings API uses the following database tables:

1. **developers** - Core developer accounts
2. **dev_plans** - Available subscription plans
3. **developer_plan_registrations** - Developer plan subscriptions
4. **dev_apps** - Developer applications
5. **dev_api_usage** - API call tracking (optional)
6. **dev_storage** - Storage usage tracking (optional)

### Migration
Run the migration file to create necessary tables:
```bash
psql -U your_user -d your_database -f migrations/002_cpanel_settings_tables.sql
```

---

## Features

### Plan Management
- Displays current plan name, type, and status
- Shows plan limits (apps, API calls, storage)
- Displays current usage against limits
- Lists plan features from JSONB field
- Shows expiry date for paid plans
- Displays billing cycle

### Usage Tracking
- Real-time apps count
- Monthly API calls counter
- Daily API calls counter
- Storage usage in MB
- Progress bars with color coding (warning at 75%, error at 90%)

### Account Information
- Email and verification status
- Name/username
- Account creation date
- Last login timestamp

---

## Frontend Integration

### Using the API in React
```javascript
import { api } from '../../services/api';
import { tokenService } from '../../services/tokenService';

// Fetch plan info
const fetchPlanInfo = async () => {
  try {
    const token = tokenService.get();
    const planData = await api.get('/settings/plan', token);
    setPlanInfo(planData);
  } catch (error) {
    console.error('Error:', error);
  }
};

// Fetch usage stats
const fetchUsageStats = async () => {
  try {
    const token = tokenService.get();
    const usageData = await api.get('/settings/usage', token);
    setUsageStats(usageData);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## Error Handling

### Common Error Scenarios

1. **No Active Plan**
   - Status: 404
   - Message: "No active plan found. Please select a plan from the developer portal."
   - Action: Redirect user to main portal to select a plan

2. **Invalid Token**
   - Status: 401
   - Message: "Invalid or expired token"
   - Action: Redirect to login

3. **Missing Tables**
   - Status: 500
   - Console: "API usage tracking not available" or "Storage tracking not available"
   - Action: Returns 0 for unavailable metrics, continues gracefully

---

## Future Enhancements

### Planned Features
- [ ] Plan upgrade/downgrade functionality
- [ ] Detailed API usage analytics (by endpoint, by date)
- [ ] Storage file management (list, delete files)
- [ ] Usage alerts and notifications
- [ ] Export usage reports (CSV, PDF)
- [ ] Billing history and invoices
- [ ] Payment method management
- [ ] Usage predictions and recommendations

### Database Optimizations
- [ ] Partition dev_api_usage table by month
- [ ] Add materialized views for usage aggregations
- [ ] Implement usage caching with Redis
- [ ] Add indexes for common query patterns

---

## Testing

### Manual Testing
```bash
# Get plan info
curl -X GET http://localhost:5001/api/developer/settings/plan \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get account info
curl -X GET http://localhost:5001/api/developer/settings/account \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get usage stats
curl -X GET http://localhost:5001/api/developer/settings/usage \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Sample Response Validation
Ensure responses include:
- ✅ All required fields
- ✅ Correct data types
- ✅ Valid date formats (ISO 8601)
- ✅ Proper JSONB array for features
- ✅ Numeric values for limits and usage

---

## Security Considerations

1. **Authentication Required** - All endpoints use `authenticateToken` middleware
2. **Developer Isolation** - Queries filter by `req.developer.id` to prevent cross-developer data access
3. **No Sensitive Data** - Passwords and secrets are excluded from responses
4. **Error Message Safety** - Generic error messages prevent information leakage
5. **SQL Injection Prevention** - Parameterized queries used throughout

---

## Monitoring

### Key Metrics to Track
- Average response time for settings endpoints
- Error rate (especially 404 for missing plans)
- API usage table growth rate
- Storage table size
- Cache hit rates (when implemented)

### Logging
All endpoints log errors to console:
```javascript
console.error('Get plan info error:', error);
```

Consider implementing structured logging for production:
- Request ID tracking
- User ID in logs
- Performance metrics
- Error details with stack traces

---

## Support

For issues or questions:
1. Check console logs for detailed error messages
2. Verify database tables exist and have correct schema
3. Ensure developer has an active plan in `developer_plan_registrations`
4. Confirm JWT token is valid and not expired
5. Check CORS settings allow requests from frontend origin
