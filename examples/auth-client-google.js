/**
 * Auth Client SDK - Google Sign-In Extension
 * 
 * Add this method to your existing AuthClient class
 */

class AuthClient {
  constructor(apiKey, apiSecret, baseUrl) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = baseUrl || 'http://localhost:5000/api/v1';
    this.token = null;
  }

  /**
   * Authenticate user with Google OAuth token
   * @param {Object} params - Authentication parameters
   * @param {string} params.id_token - Google ID token (preferred)
   * @param {string} params.access_token - Google access token (alternative)
   * @returns {Promise<Object>} Authentication response with user data and access token
   */
  async googleAuth({ id_token, access_token }) {
    if (!id_token && !access_token) {
      throw new Error('Either id_token or access_token is required');
    }

    try {
      const response = await fetch(`${this.baseUrl}/${this.apiKey}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          'X-API-Secret': this.apiSecret
        },
        body: JSON.stringify({ id_token, access_token })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Google authentication failed');
      }

      // Store the access token
      if (data.data?.access_token) {
        this.setToken(data.data.access_token);
      }

      return data;
    } catch (error) {
      console.error('Google auth error:', error);
      throw error;
    }
  }

  /**
   * Set the authentication token
   * @param {string} token - JWT access token
   */
  setToken(token) {
    this.token = token;
    // Store in localStorage for persistence
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  /**
   * Get the current authentication token
   * @returns {string|null} Current token
   */
  getToken() {
    if (!this.token && typeof localStorage !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  /**
   * Clear the authentication token (logout)
   */
  clearToken() {
    this.token = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }
}

// Usage Example
export default AuthClient;

/**
 * USAGE IN YOUR APP:
 * 
 * import AuthClient from './AuthClient';
 * import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
 * 
 * const auth = new AuthClient(
 *   'YOUR_API_KEY',
 *   'YOUR_API_SECRET',
 *   'https://your-api.com/api/v1'
 * );
 * 
 * function LoginPage() {
 *   const handleGoogleSuccess = async (credentialResponse) => {
 *     try {
 *       const result = await auth.googleAuth({
 *         id_token: credentialResponse.credential
 *       });
 *       
 *       console.log('Logged in:', result.data.user);
 *       console.log('Is new user:', result.data.is_new_user);
 *       
 *       // Token is automatically stored
 *       // Redirect to dashboard
 *       window.location.href = '/dashboard';
 *       
 *     } catch (error) {
 *       console.error('Login failed:', error.message);
 *       alert('Login failed: ' + error.message);
 *     }
 *   };
 *   
 *   return (
 *     <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
 *       <div>
 *         <h1>Login</h1>
 *         <GoogleLogin
 *           onSuccess={handleGoogleSuccess}
 *           onError={() => console.error('Google Sign-In failed')}
 *         />
 *       </div>
 *     </GoogleOAuthProvider>
 *   );
 * }
 */
