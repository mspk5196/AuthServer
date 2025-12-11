# Google Sign-In Integration Guide

## Overview
This guide shows how to integrate Google Sign-In for your application's end users.

## Setup (Developer Portal)

1. **Enable Google Sign-In**
   - Go to your app's Settings page
   - Toggle "Google Sign-in" to ON
   - Click "⚙️ Configure OAuth"

2. **Get Google OAuth Credentials**
   - Visit [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create a new OAuth 2.0 Client ID (or use existing)
   - Add authorized redirect URIs for your application
   - Copy the Client ID and Client Secret

3. **Configure in Developer Portal**
   - Paste Client ID and Client Secret
   - Click "Save Credentials"

## API Endpoint

### POST `/api/v1/:apiKey/auth/google`

Authenticate users with Google OAuth tokens.

**Headers:**
```
X-API-Key: your_api_key
X-API-Secret: your_api_secret
Content-Type: application/json
```

**Request Body:**
```json
{
  "id_token": "google_id_token_here"
}
```
OR
```json
{
  "access_token": "google_access_token_here"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "name": "John Doe",
      "username": null,
      "google_linked": true,
      "email_verified": true,
      "last_login": "2025-12-11T10:30:00Z"
    },
    "access_token": "jwt_token_here",
    "token_type": "Bearer",
    "expires_in": 604800,
    "is_new_user": false
  }
}
```

## Client Integration Examples

### React with @react-oauth/google

```bash
npm install @react-oauth/google
```

```jsx
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

function App() {
  return (
    <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
      <LoginPage />
    </GoogleOAuthProvider>
  );
}

function LoginPage() {
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await fetch('https://your-api.com/api/v1/YOUR_API_KEY/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'YOUR_API_KEY',
          'X-API-Secret': 'YOUR_API_SECRET'
        },
        body: JSON.stringify({
          id_token: credentialResponse.credential
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Store the access token
        localStorage.setItem('token', data.data.access_token);
        
        // Handle new user onboarding
        if (data.data.is_new_user) {
          console.log('Welcome, new user!');
        }
        
        // Redirect to dashboard
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Google login failed:', error);
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={() => console.error('Google login failed')}
      />
    </div>
  );
}
```

### Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
</head>
<body>
  <div id="g_id_onload"
       data-client_id="YOUR_GOOGLE_CLIENT_ID"
       data-callback="handleGoogleCallback">
  </div>
  <div class="g_id_signin" data-type="standard"></div>

  <script>
    async function handleGoogleCallback(response) {
      try {
        const res = await fetch('https://your-api.com/api/v1/YOUR_API_KEY/auth/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'YOUR_API_KEY',
            'X-API-Secret': 'YOUR_API_SECRET'
          },
          body: JSON.stringify({
            id_token: response.credential
          })
        });

        const data = await res.json();
        
        if (data.success) {
          localStorage.setItem('token', data.data.access_token);
          window.location.href = '/dashboard';
        }
      } catch (error) {
        console.error('Login failed:', error);
      }
    }
  </script>
</body>
</html>
```

### Node.js/Express Backend Proxy (Recommended)

```javascript
import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

app.post('/auth/google', async (req, res) => {
  try {
    const response = await fetch('https://your-api.com/api/v1/YOUR_API_KEY/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.AUTH_API_KEY,
        'X-API-Secret': process.env.AUTH_API_SECRET
      },
      body: JSON.stringify({
        id_token: req.body.id_token
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
});
```

## Features

- ✅ **Auto Account Creation**: New users are automatically registered
- ✅ **Account Linking**: Existing email accounts are linked with Google
- ✅ **Email Verification**: Google users are auto-verified
- ✅ **Login Tracking**: Google logins logged with method 'google'
- ✅ **Secure**: Validates token with Google's API
- ✅ **Client ID Verification**: Ensures token belongs to your app

## Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Validation error",
  "message": "Google token is required (id_token or access_token)"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Invalid token",
  "message": "Failed to validate Google token"
}
```

**403 Forbidden (Feature Disabled):**
```json
{
  "success": false,
  "error": "Feature disabled",
  "message": "Google sign-in is not enabled for this app"
}
```

**403 Forbidden (User Blocked):**
```json
{
  "success": false,
  "error": "Account blocked",
  "message": "Your account has been blocked. Please contact support."
}
```

## Security Notes

1. **Never expose API Secret in client-side code**
   - Use a backend proxy to call the auth API
   - Keep API credentials in environment variables

2. **Validate tokens server-side**
   - The API validates tokens with Google's tokeninfo endpoint
   - Client ID verification ensures tokens are for your app

3. **Use HTTPS in production**
   - All API calls should use HTTPS
   - Configure authorized redirect URIs in Google Cloud Console

## Testing

Use Google's OAuth Playground for testing:
https://developers.google.com/oauthplayground/

1. Select "Google OAuth2 API v2"
2. Authorize APIs
3. Exchange authorization code for tokens
4. Use the `id_token` with the API

## Support

For issues or questions:
- Check your Google Cloud Console configuration
- Verify API credentials are correct
- Ensure Google Sign-In is enabled in app settings
- Contact support if users are unable to authenticate
