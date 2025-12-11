# 🔐 Google Sign-In for Auth Server

Complete Google OAuth integration for your authentication server.

## 📚 Quick Links

- **[Integration Guide](./GOOGLE_SIGNIN_GUIDE.md)** - Complete step-by-step guide
- **[Implementation Summary](./IMPLEMENTATION_SUMMARY.md)** - Technical details
- **[Test Page](./test/google-signin-test.html)** - Interactive testing tool
- **[SDK Example](./examples/auth-client-google.js)** - Client library code

## 🚀 Quick Start

### 1. Developer Setup (CPanel)

1. Login to your Developer Portal
2. Navigate to **Apps → Your App → Settings**
3. Toggle **"Google Sign-in"** to ON
4. Click **"⚙️ Configure OAuth"**
5. Enter your Google OAuth credentials:
   - Get credentials from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Enter Client ID and Client Secret
   - Save

### 2. User Authentication (Your App)

```javascript
// Install Google OAuth library
npm install @react-oauth/google

// Use in your React app
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

function App() {
  const handleSuccess = async (credentialResponse) => {
    const response = await fetch('YOUR_API/auth/google', {
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
      // User authenticated!
      console.log('User:', data.data.user);
      localStorage.setItem('token', data.data.access_token);
    }
  };

  return (
    <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
      <GoogleLogin onSuccess={handleSuccess} />
    </GoogleOAuthProvider>
  );
}
```

## 🔌 API Endpoint

```
POST /api/v1/:apiKey/auth/google
```

**Request:**
```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "name": "John Doe",
      "google_linked": true,
      "email_verified": true
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "token_type": "Bearer",
    "expires_in": 604800,
    "is_new_user": false
  }
}
```

## ✨ Features

- ✅ **One-Click Authentication** - Users sign in with Google
- ✅ **Auto Account Creation** - New users registered automatically
- ✅ **Account Linking** - Links Google with existing email accounts
- ✅ **Email Auto-Verification** - Google users verified instantly
- ✅ **Secure Token Validation** - Validates with Google's API
- ✅ **Login Tracking** - All authentications logged
- ✅ **JWT Access Tokens** - Standard bearer tokens for API calls

## 🛡️ Security

**Important:** Never expose your API Secret in client-side code!

### ✅ Recommended (Backend Proxy):
```javascript
// Your backend
app.post('/auth/google', async (req, res) => {
  const response = await fetch('AUTH_API/google', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.API_KEY,      // From env
      'X-API-Secret': process.env.API_SECRET  // From env
    },
    body: JSON.stringify(req.body)
  });
  res.json(await response.json());
});
```

### ❌ Not Recommended (Client Direct):
```javascript
// Don't do this - exposes API Secret!
fetch('AUTH_API/google', {
  headers: {
    'X-API-Secret': 'as_your_secret_here' // ❌ Exposed!
  }
});
```

## 🧪 Testing

Open the test page in your browser:
```bash
open test/google-signin-test.html
```

Or double-click the file to test:
1. Enter your Google Client ID
2. Enter your API credentials
3. Click "Sign in with Google"
4. Verify authentication works

## 📖 Documentation

### For Developers Using Your API:
Read [GOOGLE_SIGNIN_GUIDE.md](./GOOGLE_SIGNIN_GUIDE.md) for:
- Detailed API documentation
- Integration examples (React, Vanilla JS, Node.js)
- Error handling
- Security best practices

### For Your Development Team:
Read [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for:
- Technical implementation details
- Architecture decisions
- Backend/Frontend changes
- Testing procedures

## 🎯 How It Works

```
┌─────────────┐         ┌──────────┐         ┌──────────────┐
│   User's    │         │  Google  │         │   Your Auth  │
│   Browser   │         │   OAuth  │         │     API      │
└──────┬──────┘         └────┬─────┘         └──────┬───────┘
       │                     │                        │
       │  1. Click "Sign in"│                        │
       │─────────────────────>                       │
       │                     │                        │
       │  2. Authenticate    │                        │
       │<────────────────────│                        │
       │                     │                        │
       │  3. Get id_token    │                        │
       │<────────────────────│                        │
       │                     │                        │
       │  4. POST id_token   │                        │
       │─────────────────────────────────────────────>│
       │                     │                        │
       │                     │  5. Validate token     │
       │                     │<───────────────────────│
       │                     │                        │
       │                     │  6. Token valid        │
       │                     │────────────────────────>│
       │                     │                        │
       │  7. Return JWT & user data                  │
       │<─────────────────────────────────────────────│
       │                     │                        │
```

## 🆘 Troubleshooting

### Issue: "Invalid token"
- ✓ Check Client ID matches in Google Console and config
- ✓ Verify token hasn't expired
- ✓ Ensure token is for your application

### Issue: "Feature disabled"
- ✓ Enable Google Sign-In in App Settings
- ✓ Configure OAuth credentials
- ✓ Save changes

### Issue: "CORS error"
- ✓ Add your domain to CORS whitelist
- ✓ Use backend proxy instead of direct calls
- ✓ Check API URL is correct

## 📦 Files Structure

```
.
├── GOOGLE_SIGNIN_GUIDE.md          # Integration guide
├── IMPLEMENTATION_SUMMARY.md       # Technical docs
├── test/
│   └── google-signin-test.html     # Test page
├── examples/
│   └── auth-client-google.js       # SDK example
└── Cpanel/
    ├── auth-server/
    │   └── src/
    │       ├── controllers/
    │       │   └── publicApiController.js  # Backend logic
    │       └── routes/
    │           └── publicApiRoutes.js      # API routes
    └── CpanelWeb/
        └── src/pages/Apps/AppSettings/
            ├── AppSettings.jsx         # Config UI
            └── appSettingsSty.css      # Styles
```

## 🎓 Learn More

- [Google Identity Services](https://developers.google.com/identity/gsi/web/guides/overview)
- [OAuth 2.0 for Client-side Web Apps](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)
- [Google Cloud Console](https://console.cloud.google.com/)

## 💡 Support

Need help?
1. Check [GOOGLE_SIGNIN_GUIDE.md](./GOOGLE_SIGNIN_GUIDE.md)
2. Test with [google-signin-test.html](./test/google-signin-test.html)
3. Review examples in [examples/](./examples/)
4. Contact support team

---

**Ready to implement?** Start with the [Integration Guide](./GOOGLE_SIGNIN_GUIDE.md) 🚀
