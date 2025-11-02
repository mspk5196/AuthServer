# API Integration Documentation

This document describes the expected API endpoints and data structures for backend integration.

## Base URL

```
http://localhost:5000/api
```

## Authentication

All authenticated requests should include HTTP-only cookies. The frontend sends `credentials: 'include'` with all requests.

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description"
}
```

## Endpoints

### Developer Authentication

#### Register Developer
```
POST /developer/register

Request Body:
{
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123"
}

Response:
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "developer": {
    "id": 1,
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "is_verified": false,
    "created_at": "2025-11-02T10:00:00Z"
  }
}
```

#### Login Developer
```
POST /developer/login

Request Body:
{
  "email": "john@example.com",
  "password": "SecurePass123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "developer": {
    "id": 1,
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "is_verified": true,
    "created_at": "2025-11-02T10:00:00Z"
  }
}

Sets HTTP-only cookie with JWT token
```

#### Logout Developer
```
POST /developer/logout

Response:
{
  "success": true,
  "message": "Logged out successfully"
}

Clears authentication cookie
```

#### Get Current Developer
```
GET /developer/me

Response:
{
  "success": true,
  "developer": {
    "id": 1,
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "is_verified": true,
    "created_at": "2025-11-02T10:00:00Z"
  }
}
```

#### Verify Email
```
GET /developer/verify?token={verification_token}

Response:
{
  "success": true,
  "message": "Email verified successfully"
}
```

### Dashboard

#### Get Dashboard Stats
```
GET /developer/dashboard/stats

Response:
{
  "success": true,
  "totalApps": 3,
  "totalUsers": 150,
  "verifiedUsers": 120,
  "recentActivity": []
}
```

### App Management

#### Get All Apps
```
GET /developer/apps

Response:
{
  "success": true,
  "apps": [
    {
      "id": 1,
      "developer_id": 1,
      "developer_username": "johndoe",
      "name": "my-app",
      "api_key": "app_1234567890abcdef",
      "google_client_id": "google-client-id.apps.googleusercontent.com",
      "google_client_secret": "GOCSPX-xxxxx",
      "created_at": "2025-11-02T10:00:00Z",
      "updated_at": "2025-11-02T10:00:00Z"
    }
  ]
}
```

#### Create App
```
POST /developer/apps

Request Body:
{
  "name": "my-new-app"
}

Response:
{
  "success": true,
  "message": "App created successfully",
  "app": {
    "id": 2,
    "developer_id": 1,
    "developer_username": "johndoe",
    "name": "my-new-app",
    "api_key": "app_0987654321fedcba",
    "google_client_id": null,
    "google_client_secret": null,
    "created_at": "2025-11-02T11:00:00Z",
    "updated_at": "2025-11-02T11:00:00Z"
  }
}
```

#### Update App
```
PUT /developer/apps/:id

Request Body:
{
  "name": "updated-app-name"
}

Response:
{
  "success": true,
  "message": "App updated successfully",
  "app": {
    "id": 1,
    "developer_id": 1,
    "developer_username": "johndoe",
    "name": "updated-app-name",
    "api_key": "app_1234567890abcdef",
    "google_client_id": "google-client-id.apps.googleusercontent.com",
    "google_client_secret": "GOCSPX-xxxxx",
    "created_at": "2025-11-02T10:00:00Z",
    "updated_at": "2025-11-02T12:00:00Z"
  }
}
```

#### Update Google Configuration
```
PUT /developer/apps/:id/google-config

Request Body:
{
  "googleClientId": "new-client-id.apps.googleusercontent.com",
  "googleClientSecret": "GOCSPX-newSecret"
}

// To disable Google Sign-In, send null values:
{
  "googleClientId": null,
  "googleClientSecret": null
}

Response:
{
  "success": true,
  "message": "Google configuration updated successfully",
  "app": {
    "id": 1,
    "developer_id": 1,
    "developer_username": "johndoe",
    "name": "my-app",
    "api_key": "app_1234567890abcdef",
    "google_client_id": "new-client-id.apps.googleusercontent.com",
    "google_client_secret": "GOCSPX-newSecret",
    "created_at": "2025-11-02T10:00:00Z",
    "updated_at": "2025-11-02T12:30:00Z"
  }
}
```

#### Delete App
```
DELETE /developer/apps/:id

Response:
{
  "success": true,
  "message": "App deleted successfully"
}
```

## Validation Rules

### Developer Registration
- **name**: Required, min 2 characters
- **username**: Required, 3-20 characters, alphanumeric and underscore only, unique
- **email**: Required, valid email format, unique
- **password**: Required, minimum 8 characters

### App Creation
- **name**: Required, 3-30 characters, alphanumeric, underscore, and hyphen only, unique per developer

### Google Configuration
- **googleClientId**: Optional, valid Google Client ID format
- **googleClientSecret**: Optional, required if googleClientId is provided

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Validation error |
| 401 | Unauthorized - Not authenticated |
| 403 | Forbidden - Not authorized |
| 404 | Not Found |
| 409 | Conflict - Duplicate resource |
| 500 | Internal Server Error |

## CORS Configuration

Backend must allow requests from frontend origin:

```javascript
// Example CORS config
{
  origin: 'http://localhost:5173', // Vite dev server
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

## Cookie Configuration

```javascript
// Example cookie settings
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
}
```

## Security Recommendations

1. **Password Hashing**: Use bcrypt with at least 10 rounds
2. **JWT Tokens**: Store in HTTP-only cookies
3. **Email Verification**: Required before full access
4. **Rate Limiting**: Implement on auth endpoints
5. **Input Validation**: Sanitize all inputs
6. **CSRF Protection**: Implement CSRF tokens
7. **SQL Injection**: Use parameterized queries
8. **XSS Prevention**: Sanitize user-generated content

## Database Schema Reference

### developers table
```sql
id              SERIAL PRIMARY KEY
name            VARCHAR(255) NOT NULL
username        VARCHAR(50) UNIQUE NOT NULL
email           VARCHAR(255) UNIQUE NOT NULL
password_hash   VARCHAR(255) NOT NULL
is_verified     BOOLEAN DEFAULT FALSE
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

### apps table
```sql
id                      SERIAL PRIMARY KEY
developer_id            INTEGER REFERENCES developers(id) ON DELETE CASCADE
name                    VARCHAR(100) NOT NULL
api_key                 VARCHAR(255) UNIQUE NOT NULL
google_client_id        VARCHAR(255)
google_client_secret    VARCHAR(255)
created_at              TIMESTAMP DEFAULT NOW()
updated_at              TIMESTAMP DEFAULT NOW()
UNIQUE(developer_id, name)
```

## Testing

Use tools like:
- **Postman** or **Insomnia** for API testing
- **Thunder Client** VS Code extension
- **curl** for command-line testing

Example curl request:
```bash
curl -X POST http://localhost:5000/api/developer/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPass123"
  }'
```

## Next Steps for Backend Implementation

1. Set up Express.js server
2. Configure PostgreSQL database
3. Implement authentication middleware
4. Create all API endpoints
5. Set up email service (Brevo SMTP)
6. Implement Google OAuth
7. Add rate limiting
8. Set up logging
9. Write tests
10. Deploy to production

---

For any questions or issues, refer to the main project documentation.
