# Developer-Level API Authentication

## Overview

The system supports **two-tier authentication**:
1. **App-level authentication** (API Key + Secret) - For end-user operations within a specific app
2. **Developer-level authentication** (Developer ID) - For managing all resources across all apps

This document covers **developer-level authentication** for accessing developer data.

---

## Authentication Methods

### App-Level Authentication (Existing)
Used for end-user operations within a specific app:
```http
GET /api/v1/:apiKey/user/profile
Headers:
  X-API-Key: your-api-key
  X-API-Secret: your-api-secret
```

### Developer-Level Authentication (New)
Used for fetching all apps, groups, and users across your developer account:
```http
GET /api/v1/developer/groups
Headers:
  X-Developer-Id: your-dev-id-uuid
```

---

## Getting Your Developer ID

### Via Cpanel Settings
1. Log in to [Cpanel](https://cpanel.mspkapps.in)
2. Navigate to **Settings**
3. Find **Developer Credentials** section
4. Copy your `dev_id` (UUID format)

### Via API
```http
GET /api/developer/me
Headers:
  Authorization: Bearer your-cpanel-auth-token
```

Response:
```json
{
  "success": true,
  "developer": {
    "id": 123,
    "email": "dev@example.com",
    "name": "John Doe",
    "is_verified": true,
    "dev_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## Developer-Level API Endpoints

All developer-level endpoints require the `X-Developer-Id` header.

### 1. Get All Groups
```http
GET /api/v1/developer/groups
Headers:
  X-Developer-Id: your-dev-id-uuid
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Production Apps",
      "developer_id": 123,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. Get All Apps
```http
GET /api/v1/developer/apps
Headers:
  X-Developer-Id: your-dev-id-uuid

# Optional: Filter by group
GET /api/v1/developer/apps?group_id=1
GET /api/v1/developer/apps?group_id=null  # Apps without groups
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "My App",
      "api_key": "app-key",
      "group_id": 1,
      "developer_id": 123,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 3. Get App Users
```http
GET /api/v1/developer/users?app_id=1&page=1&limit=50
Headers:
  X-Developer-Id: your-dev-id-uuid
```

Response:
```json
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "totalPages": 2
    }
  }
}
```

### 4. Get Specific User Data
```http
GET /api/v1/developer/user/:user_id
Headers:
  X-Developer-Id: your-dev-id-uuid
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 456,
    "email": "user@example.com",
    "name": "Jane Smith",
    "app_id": 1,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

## Using with NPM Package (authclient)

### Installation
```bash
npm install authclient-mspkapps
```

### Setup with Developer ID
```javascript
import { init } from 'authclient-mspkapps';

// Initialize with developer credentials
const client = init({
  apiKey: 'your-api-key',        // Still required for app operations
  apiSecret: 'your-api-secret',  // Still required for app operations
  developerId: 'your-dev-id-uuid' // NEW: for developer operations
});

// Or set later
client.setDeveloperId('your-dev-id-uuid');
```

### Using Developer APIs
```javascript
// Get all groups
const groups = await client.getDeveloperGroups();

// Get all apps (or filtered by group)
const allApps = await client.getDeveloperApps();
const groupApps = await client.getDeveloperApps(1);
const ungroupedApps = await client.getDeveloperApps(null);

// Get app users
const users = await client.getAppUsers({ 
  appId: 1, 
  page: 1, 
  limit: 50 
});

// Get specific user
const user = await client.getUserData(456);
```

---

## Error Handling

### Missing Developer ID
```json
{
  "success": false,
  "error": "Missing developer credentials",
  "message": "X-Developer-Id header is required"
}
```
**Status Code**: 401

### Invalid Developer ID
```json
{
  "success": false,
  "error": "Invalid developer credentials",
  "message": "Developer ID is incorrect"
}
```
**Status Code**: 401

### Blocked Account
```json
{
  "success": false,
  "error": "Account blocked",
  "message": "Your account has been blocked. Contact support."
}
```
**Status Code**: 403

### Expired Plan
```json
{
  "success": false,
  "error": "Plan expired",
  "message": "Your plan has expired. Please renew."
}
```
**Status Code**: 403

---

## Security Considerations

### Developer ID Storage
- **DO NOT** expose your developer ID in client-side code
- Store in environment variables: `MSPK_DEVELOPER_ID`
- Use secure storage for server-side applications
- Rotate if compromised

### Header Aliases
Both headers are accepted:
- `X-Developer-Id` (recommended)
- `X-Dev-Id` (alias)

### Rate Limiting
Developer-level APIs are subject to rate limiting based on your plan:
- Free plan: 100 requests/minute
- Pro plan: 1000 requests/minute
- Enterprise: Unlimited

---

## Migration Guide

If you're currently using app credentials for developer operations:

### Before (❌ Wrong)
```javascript
// Using app credentials for developer data
const client = init({
  apiKey: 'app-1-key',
  apiSecret: 'app-1-secret'
});

// This only returns data for app-1
const groups = await client.getDeveloperGroups();
```

### After (✅ Correct)
```javascript
// Using developer credentials for developer data
const client = init({
  apiKey: 'any-app-key',        // Still needed for app operations
  apiSecret: 'any-app-secret',
  developerId: 'your-dev-id'    // NEW: for developer operations
});

// This returns ALL groups across all your apps
const groups = await client.getDeveloperGroups();
```

---

## Testing

### Manual Testing with cURL
```bash
# Get developer groups
curl -X GET 'https://cpanel-backend.mspkapps.in/api/v1/developer/groups' \
  -H 'X-Developer-Id: your-dev-id-uuid'

# Get all apps
curl -X GET 'https://cpanel-backend.mspkapps.in/api/v1/developer/apps' \
  -H 'X-Developer-Id: your-dev-id-uuid'
```

### Testing with Postman
1. Create new request
2. Add header: `X-Developer-Id: your-dev-id-uuid`
3. Set URL: `https://cpanel-backend.mspkapps.in/api/v1/developer/groups`
4. Send GET request

---

## Database Schema

### developers table
```sql
CREATE TABLE developers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  dev_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_developers_dev_id ON developers(dev_id);
```

---

## FAQ

**Q: Can I use the same developer ID across multiple servers?**  
A: Yes, developer ID is account-level and works across all your apps.

**Q: What's the difference between API Key and Developer ID?**  
A: API Key is app-specific (for end-user operations). Developer ID is account-level (for managing all your resources).

**Q: Can I regenerate my developer ID?**  
A: Not currently supported. Contact support if your ID is compromised.

**Q: Do I need both API credentials and Developer ID?**  
A: Yes. Use API credentials for app operations, Developer ID for developer operations.

---

## Support

For issues or questions:
- Email: support@mspkapps.in
- Documentation: https://cpanel.mspkapps.in/docs
- GitHub Issues: (your repo link)
