# Component Usage Guide

## Navigation Components

### Navbar
**File:** `src/components/Navbar.jsx`

**Usage:**
```jsx
import Navbar from './components/Navbar';

// Automatically shows/hides based on authentication state
<Navbar />
```

**Features:**
- Responsive design
- Shows different links for authenticated/unauthenticated users
- Active route highlighting
- Mobile-optimized

---

## Layout Components

### PrivateRoute
**File:** `src/components/PrivateRoute.jsx`

**Usage:**
```jsx
import PrivateRoute from './components/PrivateRoute';

<Route
  path="/dashboard"
  element={
    <PrivateRoute>
      <Dashboard />
    </PrivateRoute>
  }
/>
```

**Features:**
- Protects routes from unauthorized access
- Shows loading state
- Redirects to login if not authenticated

---

## UI Components

### Modal
**File:** `src/components/Modal.jsx`

**Usage:**
```jsx
import Modal from './components/Modal';

const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  footer={
    <>
      <button onClick={() => setIsOpen(false)}>Cancel</button>
      <button onClick={handleSubmit}>Submit</button>
    </>
  }
>
  <p>Modal content goes here</p>
</Modal>
```

**Props:**
- `isOpen` (boolean) - Controls visibility
- `onClose` (function) - Called when modal should close
- `title` (string) - Modal header title
- `children` (node) - Modal body content
- `footer` (node) - Optional footer content

**Features:**
- Click outside to close
- Smooth animations
- Responsive
- Scrollable content

---

### AppCard
**File:** `src/components/AppCard.jsx`

**Usage:**
```jsx
import AppCard from './components/AppCard';

<AppCard
  app={appData}
  onUpdate={(updatedApp) => console.log(updatedApp)}
  onDelete={(appId) => console.log('Deleted:', appId)}
/>
```

**Props:**
- `app` (object) - App data object
  ```js
  {
    id: 1,
    name: "my-app",
    api_key: "app_key_here",
    google_client_id: "google-id",
    google_client_secret: "google-secret",
    developer_username: "johndoe",
    created_at: "2025-11-02T10:00:00Z"
  }
  ```
- `onUpdate` (function) - Called when app is updated
- `onDelete` (function) - Called when app is deleted

**Features:**
- Copy to clipboard for API key and URL
- Edit app name
- Configure Google Sign-In
- Delete with confirmation
- All modals built-in

---

## Utility Components

### Loading Spinner
**Usage:**
```jsx
{loading && (
  <div className="loading">
    <div className="spinner"></div>
  </div>
)}
```

---

### Empty State
**Usage:**
```jsx
<div className="empty-state">
  <div className="empty-icon">📱</div>
  <h3>No items found</h3>
  <p>Description text here</p>
  <button className="btn btn-primary">Action Button</button>
</div>
```

---

## Form Components

### Standard Form Group
**Usage:**
```jsx
<div className="form-group">
  <label htmlFor="fieldName">Field Label</label>
  <input
    type="text"
    id="fieldName"
    name="fieldName"
    value={value}
    onChange={handleChange}
    className={errors.fieldName ? 'error' : ''}
    placeholder="Enter value"
  />
  {errors.fieldName && (
    <span className="error-message">{errors.fieldName}</span>
  )}
  <span className="help-text">Helper text here</span>
</div>
```

---

## Button Variations

### Primary Button
```jsx
<button className="btn btn-primary">
  Primary Action
</button>
```

### Secondary Button
```jsx
<button className="btn btn-secondary">
  Secondary Action
</button>
```

### Outline Button
```jsx
<button className="btn btn-outline">
  Outline
</button>
```

### Danger Button
```jsx
<button className="btn btn-danger">
  Delete
</button>
```

### Size Variations
```jsx
<button className="btn btn-primary btn-sm">Small</button>
<button className="btn btn-primary">Normal</button>
<button className="btn btn-primary btn-lg">Large</button>
```

### Block Button
```jsx
<button className="btn btn-primary btn-block">
  Full Width Button
</button>
```

### Disabled State
```jsx
<button className="btn btn-primary" disabled>
  Loading...
</button>
```

---

## Alert Components

### Success Alert
```jsx
<div className="alert alert-success">
  Success message
</div>
```

### Error Alert
```jsx
<div className="alert alert-error">
  Error message
</div>
```

### Warning Alert
```jsx
<div className="alert alert-warning">
  Warning message
</div>
```

### Info Alert
```jsx
<div className="alert alert-info">
  Information message
</div>
```

---

## Badge Components

### Success Badge
```jsx
<span className="badge badge-success">Verified</span>
```

### Danger Badge
```jsx
<span className="badge badge-danger">Blocked</span>
```

### Warning Badge
```jsx
<span className="badge badge-warning">Pending</span>
```

### Info Badge
```jsx
<span className="badge badge-info">Google</span>
```

### Secondary Badge
```jsx
<span className="badge badge-secondary">Disabled</span>
```

---

## Context Usage

### AuthContext
**File:** `src/context/AuthContext.jsx`

**Usage:**
```jsx
import { useAuth } from '../context/AuthContext';

const MyComponent = () => {
  const {
    developer,        // Current developer object
    loading,          // Loading state
    initialized,      // Auth initialized
    isAuthenticated,  // Boolean
    login,           // Login function
    register,        // Register function
    logout,          // Logout function
    checkAuth,       // Refresh auth state
    updateDeveloper  // Update developer data
  } = useAuth();

  // Use in component
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {developer.name}!</p>
      ) : (
        <p>Please log in</p>
      )}
    </div>
  );
};
```

**Available Data:**
```js
developer = {
  id: 1,
  name: "John Doe",
  username: "johndoe",
  email: "john@example.com",
  is_verified: true,
  created_at: "2025-11-02T10:00:00Z"
}
```

---

## API Utility

### Making API Calls
**File:** `src/utils/api.js`

**Usage:**
```jsx
import { api } from '../utils/api';

// GET request
const fetchData = async () => {
  try {
    const data = await api.get('/endpoint');
    console.log(data);
  } catch (error) {
    console.error(error.message);
  }
};

// POST request
const createItem = async () => {
  try {
    const data = await api.post('/endpoint', {
      name: 'Item name',
      value: 123
    });
    console.log(data);
  } catch (error) {
    console.error(error.message);
  }
};

// PUT request
const updateItem = async (id) => {
  try {
    const data = await api.put(`/endpoint/${id}`, {
      name: 'Updated name'
    });
    console.log(data);
  } catch (error) {
    console.error(error.message);
  }
};

// DELETE request
const deleteItem = async (id) => {
  try {
    await api.delete(`/endpoint/${id}`);
    console.log('Deleted');
  } catch (error) {
    console.error(error.message);
  }
};
```

**Error Handling:**
```jsx
try {
  const data = await api.get('/endpoint');
} catch (error) {
  // error.message - User-friendly message
  // error.status - HTTP status code
  // error.data - Full error response
  
  if (error.status === 401) {
    // Handle unauthorized
  } else if (error.status === 404) {
    // Handle not found
  }
}
```

---

## Validation Utilities

### Form Validators
**File:** `src/utils/validators.js`

**Usage:**
```jsx
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateAppName,
  validateRequired
} from '../utils/validators';

// Email validation
if (!validateEmail(email)) {
  setError('Invalid email format');
}

// Password validation (min 8 chars)
if (!validatePassword(password)) {
  setError('Password must be at least 8 characters');
}

// Username validation (3-20 chars, alphanumeric + underscore)
if (!validateUsername(username)) {
  setError('Invalid username format');
}

// App name validation (3-30 chars, alphanumeric + underscore + hyphen)
if (!validateAppName(appName)) {
  setError('Invalid app name format');
}

// Required field
if (!validateRequired(value)) {
  setError('This field is required');
}
```

---

## Layout Utilities

### Container
```jsx
<div className="container">
  {/* Content automatically centered with max-width */}
</div>
```

### Page Header
```jsx
<div className="page-header">
  <h1>Page Title</h1>
  <p>Page description</p>
</div>
```

### Card
```jsx
<div className="card">
  {/* Content with padding, border, shadow */}
</div>
```

---

## Common Patterns

### Protected Page Template
```jsx
import { useState, useEffect } from 'react';
import { api } from '../utils/api';

const MyPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get('/endpoint');
      setData(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="my-page">
      <div className="container">
        <div className="page-header">
          <h1>Page Title</h1>
          <p>Description</p>
        </div>

        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        {/* Content */}
      </div>
    </div>
  );
};

export default MyPage;
```

### Form with Validation Template
```jsx
import { useState } from 'react';
import { validateEmail, validateRequired } from '../utils/validators';

const MyForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    name: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!validateRequired(formData.name)) {
      newErrors.name = 'Name is required';
    }
    
    if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setLoading(true);
    try {
      // Submit logic
    } catch (error) {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="name">Name</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={errors.name ? 'error' : ''}
        />
        {errors.name && (
          <span className="error-message">{errors.name}</span>
        )}
      </div>

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
};

export default MyForm;
```

---

## SCSS Variables Reference

**File:** `src/styles/_variables.scss`

### Colors
```scss
$primary-color: #6366f1;
$primary-dark: #4f46e5;
$primary-light: #818cf8;
$secondary-color: #10b981;
$danger-color: #ef4444;
$warning-color: #f59e0b;
$dark-bg: #1f2937;
$light-bg: #f9fafb;
$card-bg: #ffffff;
$border-color: #e5e7eb;
$text-primary: #111827;
$text-secondary: #6b7280;
$text-light: #9ca3af;
```

### Breakpoints
```scss
$mobile: 480px;
$tablet: 768px;
$desktop: 1024px;
$wide: 1280px;
```

### Mixins
```scss
@include mobile { /* styles */ }
@include tablet { /* styles */ }
@include desktop { /* styles */ }
@include flex-center { /* styles */ }
@include flex-between { /* styles */ }
@include card { /* styles */ }
@include button-base { /* styles */ }
```

---

## Tips

1. **Always wrap pages in container:**
   ```jsx
   <div className="container">
     {/* content */}
   </div>
   ```

2. **Use page-header for consistency:**
   ```jsx
   <div className="page-header">
     <h1>Title</h1>
     <p>Description</p>
   </div>
   ```

3. **Handle loading states:**
   ```jsx
   {loading ? <Spinner /> : <Content />}
   ```

4. **Show errors clearly:**
   ```jsx
   {error && <div className="alert alert-error">{error}</div>}
   ```

5. **Validate before submit:**
   ```jsx
   const handleSubmit = (e) => {
     e.preventDefault();
     if (!validate()) return;
     // proceed
   };
   ```

---

This guide covers all the components and utilities available in the application. Use these patterns for consistency across the codebase.
