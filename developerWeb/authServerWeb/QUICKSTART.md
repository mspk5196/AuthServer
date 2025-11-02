# Quick Start Guide - Developer Dashboard

## 🚀 Running the Application

### Development Mode

1. **Navigate to the project directory:**
   ```bash
   cd "g:\MY PROJECTS\AUTH SERVER\authServerWeb"
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   - The app will be available at `http://localhost:5173/`
   - Hot Module Replacement (HMR) is enabled - changes will reflect immediately

### Production Build

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Preview the production build:**
   ```bash
   npm run preview
   ```

## 📱 Application Structure

### Public Pages (No Authentication Required)
- **Home** (`/`) - Landing page with features and benefits
- **Login** (`/login`) - Developer login page
- **Register** (`/register`) - Developer registration page

### Protected Pages (Authentication Required)
- **Dashboard** (`/dashboard`) - Overview with stats and account info
- **Apps** (`/apps`) - Manage your applications
- **Users** (`/users`) - View and manage users across all apps

## 🔑 Key Features

### 1. Developer Registration & Login
- Create account with name, username, email, and password
- Email verification required
- Secure password hashing (backend)
- JWT-based authentication with HTTP-only cookies

### 2. App Management
- Create unlimited apps
- Each app gets:
  - Unique API key
  - Custom base URL: `https://auth.mspkapps.in/{username}/{app_name}`
  - Google Sign-In configuration
- Edit app details
- Delete apps with confirmation
- Copy-to-clipboard for API keys and URLs

### 3. User Management
- View all users across apps
- Filter by app
- Search by name, email, or username
- See user details:
  - Authentication provider (Email/Google)
  - Verification status
  - Block status
  - Join date
- Block/Unblock users

### 4. Google Sign-In Configuration
- Enable per app
- Configure Google Client ID and Secret
- Toggle on/off anytime
- Visual status indicators

## 🎨 Design Features

### Mobile Responsive
- Fully responsive for all screen sizes
- Mobile: < 768px
- Tablet: 768px - 1023px
- Desktop: ≥ 1024px

### UI Components
- Modern card-based design
- Clean typography
- Intuitive navigation
- Loading states
- Error handling
- Success/Error alerts
- Modals for actions
- Empty states

### Color Scheme
- Primary: Purple (#6366f1)
- Secondary: Green (#10b981)
- Danger: Red (#ef4444)
- Background: Light gray (#f9fafb)

## 🔌 Backend Integration

### API Endpoints Expected

**Developer:**
- `POST /api/developer/register` - Register
- `POST /api/developer/login` - Login
- `POST /api/developer/logout` - Logout
- `GET /api/developer/me` - Get current developer
- `GET /api/developer/dashboard/stats` - Dashboard stats

**Apps:**
- `GET /api/developer/apps` - Get all apps
- `POST /api/developer/apps` - Create app
- `PUT /api/developer/apps/:id` - Update app
- `DELETE /api/developer/apps/:id` - Delete app
- `PUT /api/developer/apps/:id/google-config` - Update Google config

**Users:**
- `GET /api/developer/apps/:appId/users` - Get app users
- `PATCH /api/developer/apps/:appId/users/:userId/block` - Block user
- `PATCH /api/developer/apps/:appId/users/:userId/unblock` - Unblock user

### Environment Setup

Create `.env` file:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

For production:
```env
VITE_API_BASE_URL=https://auth.mspkapps.in/api
```

## 🧪 Testing Without Backend

The frontend is fully functional without a backend. You'll see:
- UI components working perfectly
- Form validation
- Navigation
- Responsive design
- All layouts and styles

API calls will fail gracefully with error messages.

## 📝 Form Validations

### Registration
- Name: Required, min 2 characters
- Username: 3-20 characters, alphanumeric + underscore
- Email: Valid email format
- Password: Minimum 8 characters
- Confirm Password: Must match password

### Login
- Email: Required, valid format
- Password: Required

### Create App
- App Name: 3-30 characters, alphanumeric + underscore + hyphen

### Google Configuration
- Client ID: Optional but validated if provided
- Client Secret: Required if Client ID provided

## 🎯 User Flow

### New Developer
1. Visit homepage
2. Click "Get Started Free" or "Sign Up"
3. Fill registration form
4. Receive verification email (backend)
5. Verify email
6. Login
7. View dashboard
8. Create first app
9. Get API key and base URL
10. Integrate into their application

### Existing Developer
1. Login
2. View dashboard with stats
3. Manage apps
4. Configure Google Sign-In
5. View/manage users
6. Block/unblock users as needed

## 🛠️ Development Tips

### Hot Reload
- Save any file to see instant updates
- SCSS changes reload automatically
- Component changes preserve state

### Debugging
- Open browser DevTools (F12)
- Check Console for errors
- Use React DevTools extension
- Network tab for API calls

### Component Structure
```
components/     - Reusable UI components
├── Navbar      - Top navigation
├── Modal       - Popup dialogs
├── AppCard     - App display card
└── PrivateRoute - Auth wrapper

pages/          - Full page components
├── Home        - Landing page
├── Login       - Login form
├── Register    - Registration form
├── Dashboard   - Stats overview
├── Apps        - App management
└── Users       - User management
```

## 🚨 Common Issues & Solutions

### Port Already in Use
```bash
# Kill the process on port 5173
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or use a different port:
npm run dev -- --port 3000
```

### Module Not Found
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Styles Not Loading
- Ensure SCSS files are imported
- Check file paths are correct
- Restart dev server

## 📚 Next Steps

1. **Backend Integration**
   - Implement all API endpoints
   - Set up PostgreSQL database
   - Configure email service (Brevo)
   - Add Google OAuth

2. **Enhancements**
   - Add password reset flow
   - Email verification resend
   - Profile editing
   - App analytics
   - Webhook configurations
   - API usage logs

3. **Deployment**
   - Build for production
   - Deploy to Vercel/Netlify
   - Configure custom domain
   - Set up SSL certificate

## 🎉 You're All Set!

The frontend is ready to use. Start the dev server and explore all features. When you're ready, integrate with the backend API to make it fully functional.

For questions, check:
- `README.md` - Full documentation
- `API_INTEGRATION.md` - Backend API specs
- Component files - Inline comments

Happy coding! 🚀
