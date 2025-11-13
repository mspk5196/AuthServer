import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Documentation.css';

const Documentation = () => {
  const { developer } = useAuth();
  const [activeTab, setActiveTab] = useState('quick-start');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');

  const apiBaseUrl = 'http://localhost:5001/api/v1';

  const codeExamples = {
    javascript: {
      setup: `// Install dependencies
npm install axios

// Create .env file
AUTH_API_KEY=ak_your_api_key_here
AUTH_API_SECRET=as_your_secret_here
AUTH_API_URL=http://localhost:5001/api/v1`,
      
      authService: `// authService.js
import axios from 'axios';

const API_URL = process.env.AUTH_API_URL;
const API_KEY = process.env.AUTH_API_KEY;
const API_SECRET = process.env.AUTH_API_SECRET;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    'X-API-Secret': API_SECRET
  }
});

// Register new user
export const register = async (userData) => {
  try {
    const response = await api.post('/register', userData);
    
    if (response.data.success) {
      localStorage.setItem('access_token', response.data.data.access_token);
      return { success: true, user: response.data.data.user };
    }
    
    return { success: false, error: response.data.message };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Registration failed' 
    };
  }
};

// Login user
export const login = async (credentials) => {
  try {
    const response = await api.post('/login', credentials);
    
    if (response.data.success) {
      localStorage.setItem('access_token', response.data.data.access_token);
      return { success: true, user: response.data.data.user };
    }
    
    return { success: false, error: response.data.message };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Login failed' 
    };
  }
};

// Get user profile
export const getProfile = async () => {
  try {
    const token = localStorage.getItem('access_token');
    
    const response = await api.get('/user/profile', {
      headers: {
        'Authorization': \`Bearer \${token}\`
      }
    });
    
    return { success: true, user: response.data.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to get profile' 
    };
  }
};

// Logout
export const logout = () => {
  localStorage.removeItem('access_token');
};`,

      register: `// Register Component
import React, { useState } from 'react';
import { register } from './authService';

function RegisterForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    username: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await register(formData);

    if (result.success) {
      // Registration successful
      alert('Registration successful! Please check your email to verify.');
      // Redirect to dashboard or profile
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Full Name"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        required
      />
      
      <input
        type="text"
        placeholder="Username"
        value={formData.username}
        onChange={(e) => setFormData({...formData, username: e.target.value})}
      />
      
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        required
      />
      
      <input
        type="password"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => setFormData({...formData, password: e.target.value})}
        required
      />

      {error && <div className="error">{error}</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
}`,

      login: `// Login Component
import React, { useState } from 'react';
import { login } from './authService';

function LoginForm() {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(credentials);

    if (result.success) {
      // Login successful
      window.location.href = '/dashboard';
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={credentials.email}
        onChange={(e) => setCredentials({...credentials, email: e.target.value})}
        required
      />
      
      <input
        type="password"
        placeholder="Password"
        value={credentials.password}
        onChange={(e) => setCredentials({...credentials, password: e.target.value})}
        required
      />

      {error && <div className="error">{error}</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}`
    },
    
    python: {
      setup: `# Install dependencies
pip install requests python-dotenv

# Create .env file
AUTH_API_KEY=ak_your_api_key_here
AUTH_API_SECRET=as_your_secret_here
AUTH_API_URL=http://localhost:5001/api/v1`,
      
      authService: `# auth_service.py
import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_URL = os.getenv('AUTH_API_URL')
API_KEY = os.getenv('AUTH_API_KEY')
API_SECRET = os.getenv('AUTH_API_SECRET')

headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    'X-API-Secret': API_SECRET
}

def register_user(email, password, name=None, username=None):
    """Register a new user"""
    try:
        response = requests.post(
            f'{API_URL}/register',
            headers=headers,
            json={
                'email': email,
                'password': password,
                'name': name,
                'username': username
            }
        )
        
        data = response.json()
        
        if data.get('success'):
            return {
                'success': True,
                'user': data['data']['user'],
                'access_token': data['data']['access_token']
            }
        
        return {'success': False, 'error': data.get('message')}
        
    except Exception as e:
        return {'success': False, 'error': str(e)}

def login_user(email, password):
    """Login user"""
    try:
        response = requests.post(
            f'{API_URL}/login',
            headers=headers,
            json={
                'email': email,
                'password': password
            }
        )
        
        data = response.json()
        
        if data.get('success'):
            return {
                'success': True,
                'user': data['data']['user'],
                'access_token': data['data']['access_token']
            }
        
        return {'success': False, 'error': data.get('message')}
        
    except Exception as e:
        return {'success': False, 'error': str(e)}

def get_user_profile(access_token):
    """Get user profile"""
    try:
        auth_headers = {
            **headers,
            'Authorization': f'Bearer {access_token}'
        }
        
        response = requests.get(
            f'{API_URL}/user/profile',
            headers=auth_headers
        )
        
        data = response.json()
        
        if data.get('success'):
            return {'success': True, 'user': data['data']}
        
        return {'success': False, 'error': data.get('message')}
        
    except Exception as e:
        return {'success': False, 'error': str(e)}`,

      usage: `# Example usage
from auth_service import register_user, login_user, get_user_profile

# Register a new user
result = register_user(
    email='user@example.com',
    password='SecurePassword123!',
    name='John Doe',
    username='johndoe'
)

if result['success']:
    print('Registration successful!')
    access_token = result['access_token']
    print(f"User: {result['user']}")
else:
    print(f"Error: {result['error']}")

# Login
result = login_user('user@example.com', 'SecurePassword123!')

if result['success']:
    print('Login successful!')
    access_token = result['access_token']
else:
    print(f"Error: {result['error']}")

# Get profile
result = get_user_profile(access_token)

if result['success']:
    print(f"User profile: {result['user']}")
else:
    print(f"Error: {result['error']}")`
    },

    php: {
      setup: `<?php
// config.php
define('AUTH_API_KEY', 'ak_your_api_key_here');
define('AUTH_API_SECRET', 'as_your_secret_here');
define('AUTH_API_URL', 'http://localhost:5001/api/v1');`,

      authService: `<?php
// AuthService.php
class AuthService {
    private $apiUrl;
    private $apiKey;
    private $apiSecret;
    
    public function __construct() {
        $this->apiUrl = AUTH_API_URL;
        $this->apiKey = AUTH_API_KEY;
        $this->apiSecret = AUTH_API_SECRET;
    }
    
    private function makeRequest($endpoint, $method = 'GET', $data = null) {
        $headers = [
            'Content-Type: application/json',
            'X-API-Key: ' . $this->apiKey,
            'X-API-Secret: ' . $this->apiSecret
        ];
        
        $ch = curl_init($this->apiUrl . $endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        return [
            'code' => $httpCode,
            'data' => json_decode($response, true)
        ];
    }
    
    public function register($email, $password, $name = null, $username = null) {
        $data = [
            'email' => $email,
            'password' => $password,
            'name' => $name,
            'username' => $username
        ];
        
        $result = $this->makeRequest('/register', 'POST', $data);
        
        if ($result['code'] === 201 && $result['data']['success']) {
            $_SESSION['access_token'] = $result['data']['data']['access_token'];
            return [
                'success' => true,
                'user' => $result['data']['data']['user']
            ];
        }
        
        return [
            'success' => false,
            'error' => $result['data']['message'] ?? 'Registration failed'
        ];
    }
    
    public function login($email, $password) {
        $data = [
            'email' => $email,
            'password' => $password
        ];
        
        $result = $this->makeRequest('/login', 'POST', $data);
        
        if ($result['code'] === 200 && $result['data']['success']) {
            $_SESSION['access_token'] = $result['data']['data']['access_token'];
            return [
                'success' => true,
                'user' => $result['data']['data']['user']
            ];
        }
        
        return [
            'success' => false,
            'error' => $result['data']['message'] ?? 'Login failed'
        ];
    }
    
    public function getProfile($accessToken) {
        $headers = [
            'Content-Type: application/json',
            'X-API-Key: ' . $this->apiKey,
            'X-API-Secret: ' . $this->apiSecret,
            'Authorization: Bearer ' . $accessToken
        ];
        
        $ch = curl_init($this->apiUrl . '/user/profile');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        $data = json_decode($response, true);
        
        if ($httpCode === 200 && $data['success']) {
            return [
                'success' => true,
                'user' => $data['data']
            ];
        }
        
        return [
            'success' => false,
            'error' => $data['message'] ?? 'Failed to get profile'
        ];
    }
}`,

      usage: `<?php
// Example usage
session_start();
require_once 'config.php';
require_once 'AuthService.php';

$auth = new AuthService();

// Register
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['register'])) {
    $result = $auth->register(
        $_POST['email'],
        $_POST['password'],
        $_POST['name'] ?? null,
        $_POST['username'] ?? null
    );
    
    if ($result['success']) {
        echo 'Registration successful!';
        header('Location: dashboard.php');
    } else {
        echo 'Error: ' . $result['error'];
    }
}

// Login
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login'])) {
    $result = $auth->login($_POST['email'], $_POST['password']);
    
    if ($result['success']) {
        header('Location: dashboard.php');
    } else {
        echo 'Error: ' . $result['error'];
    }
}

// Get profile
if (isset($_SESSION['access_token'])) {
    $result = $auth->getProfile($_SESSION['access_token']);
    
    if ($result['success']) {
        $user = $result['user'];
        echo 'Welcome, ' . $user['name'];
    }
}
?>`
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="documentation-page">
      <div className="doc-header">
        <h1>📚 Developer Documentation</h1>
        <p>Learn how to integrate authentication into your application</p>
      </div>

      <div className="doc-tabs">
        <button 
          className={`doc-tab ${activeTab === 'quick-start' ? 'active' : ''}`}
          onClick={() => setActiveTab('quick-start')}
        >
          Quick Start
        </button>
        <button 
          className={`doc-tab ${activeTab === 'authentication' ? 'active' : ''}`}
          onClick={() => setActiveTab('authentication')}
        >
          Authentication
        </button>
        <button 
          className={`doc-tab ${activeTab === 'api-reference' ? 'active' : ''}`}
          onClick={() => setActiveTab('api-reference')}
        >
          API Reference
        </button>
        <button 
          className={`doc-tab ${activeTab === 'code-examples' ? 'active' : ''}`}
          onClick={() => setActiveTab('code-examples')}
        >
          Code Examples
        </button>
        <button 
          className={`doc-tab ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Security
        </button>
      </div>

      <div className="doc-content">
        {activeTab === 'quick-start' && (
          <div className="doc-section">
            <h2>🚀 Quick Start Guide</h2>
            
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Create an Application</h3>
                <p>Go to the <strong>Apps</strong> page and create your first application. You'll receive:</p>
                <ul>
                  <li><strong>API Key</strong>: Used to identify your app</li>
                  <li><strong>API Secret</strong>: Used to authenticate your requests</li>
                </ul>
                <div className="warning-box">
                  <span className="warning-icon">⚠️</span>
                  <p>Save your API secret securely! It will only be shown once.</p>
                </div>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Store Your Credentials</h3>
                <p>Add your credentials to your environment variables:</p>
                <div className="code-block">
                  <pre>
AUTH_API_KEY=ak_your_api_key_here
AUTH_API_SECRET=as_your_secret_here
AUTH_API_URL={apiBaseUrl}
                  </pre>
                  <button 
                    className="copy-btn"
                    onClick={() => copyToClipboard(`AUTH_API_KEY=ak_your_api_key_here\nAUTH_API_SECRET=as_your_secret_here\nAUTH_API_URL=${apiBaseUrl}`)}
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Make Your First Request</h3>
                <p>Test your credentials with a simple registration request:</p>
                <div className="code-block">
                  <pre>
{`curl -X POST ${apiBaseUrl}/register \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key" \\
  -H "X-API-Secret: your_api_secret" \\
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "Test User"
  }'`}
                  </pre>
                  <button 
                    className="copy-btn"
                    onClick={() => copyToClipboard(`curl -X POST ${apiBaseUrl}/register \\\n  -H "Content-Type: application/json" \\\n  -H "X-API-Key: your_api_key" \\\n  -H "X-API-Secret: your_api_secret" \\\n  -d '{"email": "user@example.com", "password": "SecurePass123!", "name": "Test User"}'`)}
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Integrate Into Your App</h3>
                <p>Check out the <strong>Code Examples</strong> tab for integration guides in:</p>
                <div className="language-badges">
                  <span className="badge">JavaScript/React</span>
                  <span className="badge">Python</span>
                  <span className="badge">PHP</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'authentication' && (
          <div className="doc-section">
            <h2>🔐 Authentication Flow</h2>
            
            <div className="info-box">
              <h3>How It Works</h3>
              <p>All API requests must include your API credentials in the headers:</p>
              <div className="code-block">
                <pre>
{`X-API-Key: your_api_key
X-API-Secret: your_api_secret
Content-Type: application/json`}
                </pre>
              </div>
            </div>

            <div className="flow-diagram">
              <div className="flow-step">
                <div className="flow-icon">👤</div>
                <h4>User Registration</h4>
                <p>User submits email and password to your app</p>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <div className="flow-icon">🔑</div>
                <h4>Your Backend</h4>
                <p>Send request to auth API with your credentials</p>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <div className="flow-icon">✅</div>
                <h4>Auth Server</h4>
                <p>Creates user and returns access token</p>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <div className="flow-icon">💾</div>
                <h4>Store Token</h4>
                <p>Save token securely in your app</p>
              </div>
            </div>

            <h3>Access Token Usage</h3>
            <p>After successful registration/login, you receive an access token. Use it to access protected endpoints:</p>
            <div className="code-block">
              <pre>
{`Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-API-Key: your_api_key
X-API-Secret: your_api_secret`}
              </pre>
            </div>

            <div className="warning-box">
              <span className="warning-icon">🔒</span>
              <p><strong>Security Note:</strong> Never expose your API Secret in client-side code. Always make API calls from your backend server.</p>
            </div>
          </div>
        )}

        {activeTab === 'api-reference' && (
          <div className="doc-section">
            <h2>📖 API Reference</h2>

            <div className="endpoint-card">
              <div className="endpoint-header">
                <span className="method post">POST</span>
                <span className="endpoint-path">/api/v1/register</span>
              </div>
              <p className="endpoint-desc">Register a new user</p>
              
              <h4>Request Body:</h4>
              <div className="code-block">
                <pre>
{`{
  "email": "user@example.com",      // Required
  "password": "SecurePass123!",     // Required (min 8 chars)
  "name": "John Doe",               // Optional
  "username": "johndoe"             // Optional
}`}
                </pre>
              </div>

              <h4>Response (201 Created):</h4>
              <div className="code-block">
                <pre>
{`{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "username": "johndoe",
      "email_verified": false,
      "created_at": "2025-01-15T10:00:00Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 604800
  }
}`}
                </pre>
              </div>
            </div>

            <div className="endpoint-card">
              <div className="endpoint-header">
                <span className="method post">POST</span>
                <span className="endpoint-path">/api/v1/login</span>
              </div>
              <p className="endpoint-desc">Login with email and password</p>
              
              <h4>Request Body:</h4>
              <div className="code-block">
                <pre>
{`{
  "email": "user@example.com",
  "password": "SecurePass123!"
}`}
                </pre>
              </div>

              <h4>Response (200 OK):</h4>
              <div className="code-block">
                <pre>
{`{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "email_verified": true,
      "last_login": "2025-01-15T10:00:00Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 604800
  }
}`}
                </pre>
              </div>
            </div>

            <div className="endpoint-card">
              <div className="endpoint-header">
                <span className="method get">GET</span>
                <span className="endpoint-path">/api/v1/verify-email?token=xxx</span>
              </div>
              <p className="endpoint-desc">Verify user's email address</p>
              
              <h4>Query Parameters:</h4>
              <ul>
                <li><code>token</code> - Verification token from email</li>
              </ul>

              <h4>Response (200 OK):</h4>
              <div className="code-block">
                <pre>
{`{
  "success": true,
  "message": "Email verified successfully"
}`}
                </pre>
              </div>
            </div>

            <div className="endpoint-card">
              <div className="endpoint-header">
                <span className="method get">GET</span>
                <span className="endpoint-path">/api/v1/user/profile</span>
              </div>
              <p className="endpoint-desc">Get authenticated user's profile</p>
              
              <h4>Headers:</h4>
              <div className="code-block">
                <pre>
{`Authorization: Bearer {access_token}
X-API-Key: your_api_key
X-API-Secret: your_api_secret`}
                </pre>
              </div>

              <h4>Response (200 OK):</h4>
              <div className="code-block">
                <pre>
{`{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "username": "johndoe",
    "email_verified": true,
    "google_linked": false,
    "is_blocked": false,
    "last_login": "2025-01-15T10:00:00Z",
    "created_at": "2025-01-01T10:00:00Z"
  }
}`}
                </pre>
              </div>
            </div>

            <h3>Error Responses</h3>
            <div className="error-table">
              <table>
                <thead>
                  <tr>
                    <th>Status Code</th>
                    <th>Error Type</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>400</td>
                    <td>Validation Error</td>
                    <td>Missing or invalid request data</td>
                  </tr>
                  <tr>
                    <td>401</td>
                    <td>Unauthorized</td>
                    <td>Invalid API credentials or access token</td>
                  </tr>
                  <tr>
                    <td>403</td>
                    <td>Forbidden</td>
                    <td>Feature disabled or account blocked</td>
                  </tr>
                  <tr>
                    <td>404</td>
                    <td>Not Found</td>
                    <td>Resource does not exist</td>
                  </tr>
                  <tr>
                    <td>409</td>
                    <td>Conflict</td>
                    <td>Email already exists</td>
                  </tr>
                  <tr>
                    <td>429</td>
                    <td>Rate Limit</td>
                    <td>API limit exceeded</td>
                  </tr>
                  <tr>
                    <td>500</td>
                    <td>Server Error</td>
                    <td>Internal server error</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4>Error Response Format:</h4>
            <div className="code-block">
              <pre>
{`{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message"
}`}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'code-examples' && (
          <div className="doc-section">
            <h2>💻 Code Examples</h2>

            <div className="language-selector">
              <button 
                className={`lang-btn ${selectedLanguage === 'javascript' ? 'active' : ''}`}
                onClick={() => setSelectedLanguage('javascript')}
              >
                JavaScript
              </button>
              <button 
                className={`lang-btn ${selectedLanguage === 'python' ? 'active' : ''}`}
                onClick={() => setSelectedLanguage('python')}
              >
                Python
              </button>
              <button 
                className={`lang-btn ${selectedLanguage === 'php' ? 'active' : ''}`}
                onClick={() => setSelectedLanguage('php')}
              >
                PHP
              </button>
            </div>

            {selectedLanguage === 'javascript' && (
              <>
                <h3>Setup</h3>
                <div className="code-block">
                  <pre>{codeExamples.javascript.setup}</pre>
                  <button className="copy-btn" onClick={() => copyToClipboard(codeExamples.javascript.setup)}>📋 Copy</button>
                </div>

                <h3>Auth Service</h3>
                <div className="code-block">
                  <pre>{codeExamples.javascript.authService}</pre>
                  <button className="copy-btn" onClick={() => copyToClipboard(codeExamples.javascript.authService)}>📋 Copy</button>
                </div>

                <h3>Register Component</h3>
                <div className="code-block">
                  <pre>{codeExamples.javascript.register}</pre>
                  <button className="copy-btn" onClick={() => copyToClipboard(codeExamples.javascript.register)}>📋 Copy</button>
                </div>

                <h3>Login Component</h3>
                <div className="code-block">
                  <pre>{codeExamples.javascript.login}</pre>
                  <button className="copy-btn" onClick={() => copyToClipboard(codeExamples.javascript.login)}>📋 Copy</button>
                </div>
              </>
            )}

            {selectedLanguage === 'python' && (
              <>
                <h3>Setup</h3>
                <div className="code-block">
                  <pre>{codeExamples.python.setup}</pre>
                  <button className="copy-btn" onClick={() => copyToClipboard(codeExamples.python.setup)}>📋 Copy</button>
                </div>

                <h3>Auth Service</h3>
                <div className="code-block">
                  <pre>{codeExamples.python.authService}</pre>
                  <button className="copy-btn" onClick={() => copyToClipboard(codeExamples.python.authService)}>📋 Copy</button>
                </div>

                <h3>Usage Example</h3>
                <div className="code-block">
                  <pre>{codeExamples.python.usage}</pre>
                  <button className="copy-btn" onClick={() => copyToClipboard(codeExamples.python.usage)}>📋 Copy</button>
                </div>
              </>
            )}

            {selectedLanguage === 'php' && (
              <>
                <h3>Configuration</h3>
                <div className="code-block">
                  <pre>{codeExamples.php.setup}</pre>
                  <button className="copy-btn" onClick={() => copyToClipboard(codeExamples.php.setup)}>📋 Copy</button>
                </div>

                <h3>Auth Service Class</h3>
                <div className="code-block">
                  <pre>{codeExamples.php.authService}</pre>
                  <button className="copy-btn" onClick={() => copyToClipboard(codeExamples.php.authService)}>📋 Copy</button>
                </div>

                <h3>Usage Example</h3>
                <div className="code-block">
                  <pre>{codeExamples.php.usage}</pre>
                  <button className="copy-btn" onClick={() => copyToClipboard(codeExamples.php.usage)}>📋 Copy</button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'security' && (
          <div className="doc-section">
            <h2>🔒 Security Best Practices</h2>

            <div className="security-card">
              <div className="security-icon">🔐</div>
              <h3>Never Expose API Credentials</h3>
              <p>Your API Secret should <strong>never</strong> be included in:</p>
              <ul>
                <li>Client-side JavaScript code</li>
                <li>Mobile app source code</li>
                <li>Version control (Git repositories)</li>
                <li>Browser console or network requests</li>
              </ul>
              <div className="tip-box">
                <strong>✅ Best Practice:</strong> Always make authentication requests from your backend server.
              </div>
            </div>

            <div className="security-card">
              <div className="security-icon">🌐</div>
              <h3>Use HTTPS in Production</h3>
              <p>Always use HTTPS to encrypt data in transit:</p>
              <div className="code-block">
                <pre>
{`// ✅ Good
const API_URL = 'https://auth.yourdomain.com/api/v1';

// ❌ Bad (only for development)
const API_URL = 'http://auth.yourdomain.com/api/v1';`}
                </pre>
              </div>
            </div>

            <div className="security-card">
              <div className="security-icon">💾</div>
              <h3>Secure Token Storage</h3>
              <p>Store access tokens securely based on your platform:</p>
              <table className="storage-table">
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Recommended Storage</th>
                    <th>Avoid</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Web (SPA)</td>
                    <td>HttpOnly Cookies</td>
                    <td>LocalStorage, SessionStorage</td>
                  </tr>
                  <tr>
                    <td>Web (SSR)</td>
                    <td>Server-side sessions</td>
                    <td>Client-side storage</td>
                  </tr>
                  <tr>
                    <td>Mobile</td>
                    <td>Secure storage (Keychain/KeyStore)</td>
                    <td>Shared preferences</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="security-card">
              <div className="security-icon">✅</div>
              <h3>Input Validation</h3>
              <p>Always validate user input on both client and server:</p>
              <div className="code-block">
                <pre>
{`// Email validation
const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
if (!emailRegex.test(email)) {
  throw new Error('Invalid email format');
}

// Password strength
if (password.length < 8) {
  throw new Error('Password must be at least 8 characters');
}`}
                </pre>
              </div>
            </div>

            <div className="security-card">
              <div className="security-icon">⚡</div>
              <h3>Rate Limiting</h3>
              <p>Your API requests are monitored and limited based on your plan:</p>
              <ul>
                <li><strong>Free Plan:</strong> 10,000 API calls per month</li>
                <li><strong>Pro Plan:</strong> 100,000 API calls per month</li>
                <li><strong>Enterprise:</strong> Unlimited</li>
              </ul>
              <p>Implement client-side throttling to avoid hitting limits:</p>
              <div className="code-block">
                <pre>
{`// Debounce login attempts
const debouncedLogin = debounce(loginFunction, 1000);`}
                </pre>
              </div>
            </div>

            <div className="security-card">
              <div className="security-icon">🔄</div>
              <h3>Token Refresh</h3>
              <p>Access tokens expire after 7 days. Implement token refresh logic:</p>
              <div className="code-block">
                <pre>
{`// Check if token is expired
const isTokenExpired = (token) => {
  const decoded = jwt_decode(token);
  return decoded.exp < Date.now() / 1000;
};

// Refresh token if needed
if (isTokenExpired(accessToken)) {
  // Re-authenticate user
  await login(email, password);
}`}
                </pre>
              </div>
            </div>

            <div className="warning-box">
              <span className="warning-icon">⚠️</span>
              <div>
                <h4>Security Checklist</h4>
                <ul>
                  <li>✅ Store API credentials in environment variables</li>
                  <li>✅ Use HTTPS in production</li>
                  <li>✅ Validate all user inputs</li>
                  <li>✅ Store tokens securely (HttpOnly cookies recommended)</li>
                  <li>✅ Implement proper error handling</li>
                  <li>✅ Never log sensitive data</li>
                  <li>✅ Use prepared statements/parameterized queries</li>
                  <li>✅ Implement CSRF protection</li>
                  <li>✅ Keep dependencies updated</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Documentation;
