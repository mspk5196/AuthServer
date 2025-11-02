# Auth Platform - Developer Dashboard (Frontend)

A modern, responsive developer dashboard for managing authentication services. Built with React + Vite and SCSS.

## Features

- 🔐 **Developer Authentication** - Register, login, and email verification
- 📱 **App Management** - Create, edit, and delete applications
- 🔑 **API Key Management** - Unique API keys for each app
- 🔗 **Google Sign-In Configuration** - Enable/disable Google OAuth per app
- 👥 **User Management** - View and manage end users across all apps
- 📊 **Dashboard Analytics** - View stats and metrics
- 📱 **Mobile Responsive** - Fully responsive design for all devices
- 🎨 **Modern UI** - Clean, professional interface with SCSS styling

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **SCSS** - Styling with variables and mixins
- **Fetch API** - HTTP requests (no axios)

## Project Structure

```
authServerWeb/
├── src/
│   ├── components/         # Reusable components
│   │   ├── Navbar.jsx
│   │   ├── Modal.jsx
│   │   ├── AppCard.jsx
│   │   └── PrivateRoute.jsx
│   ├── pages/             # Page components
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   └── Apps.jsx
│   ├── context/           # React context
│   │   └── AuthContext.jsx
│   ├── utils/             # Utility functions
│   │   ├── api.js
│   │   └── validators.js
│   ├── styles/            # Global styles
│   │   ├── _variables.scss
│   │   └── global.scss
│   ├── App.jsx            # Main app component
│   └── main.jsx          # Entry point
├── public/                # Static assets
├── .env                   # Environment variables
├── index.html            # HTML template
├── package.json
└── vite.config.js

```

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   - Copy `.env.example` to `.env`
   - Update `VITE_API_BASE_URL` to your backend API URL

   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Preview production build:**
   ```bash
   npm run preview
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Features Overview

### Authentication
- Developer registration with email verification
- Secure login with password validation
- Protected routes for authenticated users
- Persistent authentication with cookies

### App Management
- Create new applications with unique names
- Each app gets:
  - Unique API key
  - Base URL: `https://auth.mspkapps.in/{username}/{app_name}`
  - Google Sign-In configuration options
- Edit app details
- Delete apps (with confirmation)
- Copy-to-clipboard for API keys and URLs

### Google Sign-In Configuration
- Enable/disable per app
- Configure Google Client ID and Secret
- Visual status indicators

### Dashboard
- Overview statistics
  - Total apps
  - Total users
  - Verified users
  - Verification rate
- Account information
- Quick action shortcuts

### Mobile Responsive Design
- Optimized layouts for mobile, tablet, and desktop
- Touch-friendly interface
- Adaptive navigation
- Responsive grids and cards

## Styling

The app uses SCSS with a modular approach:

- **Variables** (`_variables.scss`) - Colors, breakpoints, and common values
- **Global styles** (`global.scss`) - Base styles, utilities, and components
- **Component styles** - Each component has its own SCSS file
- **Mobile-first approach** - Responsive breakpoints for all screen sizes

### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1023px
- Desktop: ≥ 1024px

## API Integration

The frontend communicates with the backend via REST API. All requests include credentials (cookies) for authentication.

### API Endpoints Used

**Developer:**
- `POST /api/developer/register` - Register new developer
- `POST /api/developer/login` - Login developer
- `POST /api/developer/logout` - Logout developer
- `GET /api/developer/me` - Get current developer
- `GET /api/developer/dashboard/stats` - Get dashboard stats

**Apps:**
- `GET /api/developer/apps` - Get all apps
- `POST /api/developer/apps` - Create new app
- `PUT /api/developer/apps/:id` - Update app
- `DELETE /api/developer/apps/:id` - Delete app
- `PUT /api/developer/apps/:id/google-config` - Update Google config

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:5000/api` |

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security Features

- Client-side validation
- Secure password requirements
- HTTP-only cookies for authentication
- CSRF protection ready
- XSS prevention

## Next Steps (Backend Integration)

When integrating with the backend:

1. Ensure CORS is configured to allow requests from frontend origin
2. Set up cookie-based authentication with HTTP-only flags
3. Implement all API endpoints listed above
4. Configure email verification flow
5. Set up Google OAuth endpoints

## Development Tips

- Use React DevTools for debugging
- Check browser console for API errors
- Use network tab to inspect API requests
- Test on different screen sizes using browser dev tools

## License

This project is part of the Auth Platform system.

---

Built with ❤️ using React + Vite


## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
