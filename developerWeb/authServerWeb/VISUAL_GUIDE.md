# Visual Page Guide

This document describes what each page looks like and its purpose.

## 🏠 Home Page (`/`)

**Route:** `/`  
**Access:** Public (anyone)

### Layout
```
┌────────────────────────────────────────┐
│  🔐 Auth Platform        Login | Sign Up│
├────────────────────────────────────────┤
│                                        │
│   Authentication Platform for          │
│        Developers                      │
│                                        │
│   Complete authentication solution...  │
│                                        │
│   [Get Started Free] [Sign In]        │
│                                        │
├────────────────────────────────────────┤
│             Features                   │
│                                        │
│  ┌──────┐  ┌──────┐  ┌──────┐        │
│  │  🔐  │  │  🚀  │  │  🔗  │        │
│  │Secure│  │Quick │  │Google│        │
│  └──────┘  └──────┘  └──────┘        │
│                                        │
│  ┌──────┐  ┌──────┐  ┌──────┐        │
│  │  👥  │  │  📧  │  │  🔄  │        │
│  │Users │  │Email │  │Link  │        │
│  └──────┘  └──────┘  └──────┘        │
│                                        │
├────────────────────────────────────────┤
│          How It Works                  │
│                                        │
│   1️⃣ → 2️⃣ → 3️⃣ → 4️⃣                    │
│                                        │
├────────────────────────────────────────┤
│      Ready to Get Started?            │
│   [Create Free Account]               │
└────────────────────────────────────────┘
```

### Sections
1. **Hero** - Purple gradient background with CTA buttons
2. **Features** - 6 feature cards in grid
3. **How It Works** - 4 step process
4. **CTA** - Final call to action

---

## 🔐 Login Page (`/login`)

**Route:** `/login`  
**Access:** Public (redirects if authenticated)

### Layout
```
┌────────────────────────────────────────┐
│  🔐 Auth Platform      Dashboard | Logout│
├────────────────────────────────────────┤
│                                        │
│         ┌──────────────────┐          │
│         │  Welcome Back    │          │
│         │                  │          │
│         │  Email: ______   │          │
│         │  Pass:  ______   │          │
│         │                  │          │
│         │  Forgot password?│          │
│         │                  │          │
│         │  [Sign In]       │          │
│         │                  │          │
│         │  Don't have an   │          │
│         │  account? Sign up│          │
│         └──────────────────┘          │
│                                        │
└────────────────────────────────────────┘
```

### Features
- Email and password fields
- Validation errors shown inline
- "Forgot password?" link
- Link to register
- Purple gradient background

---

## 📝 Register Page (`/register`)

**Route:** `/register`  
**Access:** Public (redirects if authenticated)

### Layout
```
┌────────────────────────────────────────┐
│  🔐 Auth Platform      Dashboard | Logout│
├────────────────────────────────────────┤
│                                        │
│         ┌──────────────────┐          │
│         │  Create Account  │          │
│         │                  │          │
│         │  Name:     ______│          │
│         │  Username: ______│          │
│         │  Email:    ______│          │
│         │  Password: ______│          │
│         │  Confirm:  ______│          │
│         │                  │          │
│         │  [Create Account]│          │
│         │                  │          │
│         │  Already have an │          │
│         │  account? Sign in│          │
│         └──────────────────┘          │
│                                        │
└────────────────────────────────────────┘
```

### Features
- 5 input fields with validation
- Real-time error display
- Password strength requirements
- Confirm password matching
- Link to login

---

## 📊 Dashboard Page (`/dashboard`)

**Route:** `/dashboard`  
**Access:** Protected (requires authentication)

### Layout
```
┌────────────────────────────────────────┐
│  🔐 Auth Platform  Dash│Apps│Users│Logout│
├────────────────────────────────────────┤
│  Dashboard                             │
│  Welcome back, John!                   │
│                                        │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐ │
│  │ 📱  │  │ 👥  │  │ ✅  │  │ 📊  │ │
│  │  3  │  │ 150 │  │ 120 │  │ 80% │ │
│  │Apps │  │Users│  │Verif│  │Rate │ │
│  └─────┘  └─────┘  └─────┘  └─────┘ │
│                                        │
│  ┌────────────────┐  ┌──────────────┐│
│  │Account Info    │  │Quick Actions ││
│  │                │  │              ││
│  │Name: John Doe  │  │➕ Create App ││
│  │User: @johndoe  │  │📋 View Apps  ││
│  │Email: john@... │  │👥 Manage User││
│  │Status: ✓Verified│  │              ││
│  └────────────────┘  └──────────────┘│
│                                        │
│  ⚠ Email verification pending!        │
└────────────────────────────────────────┘
```

### Sections
1. **Stats Grid** - 4 cards showing key metrics
2. **Account Info** - Developer profile details
3. **Quick Actions** - Navigation shortcuts
4. **Alerts** - Important notifications

---

## 📱 Apps Page (`/apps`)

**Route:** `/apps`  
**Access:** Protected (requires authentication)

### Layout
```
┌────────────────────────────────────────┐
│  🔐 Auth Platform  Dash│Apps│Users│Logout│
├────────────────────────────────────────┤
│  My Applications          [➕ Create New]│
│  Manage your apps...                   │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ my-app              [Edit][Delete]│ │
│  │ Created Nov 2, 2025               │ │
│  │                                   │ │
│  │ Base URL:                         │ │
│  │ auth.mspkapps.in/john/my-app [📋]│ │
│  │                                   │ │
│  │ API Key:                          │ │
│  │ app_1234567890abcdef          [📋]│ │
│  │                                   │ │
│  │ Google Sign-In: ✓Enabled          │ │
│  │                    [Configure]    │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ another-app         [Edit][Delete]│ │
│  │ ...                               │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘
```

### Features
- List of all apps in grid
- Each card shows:
  - App name and creation date
  - Base URL with copy button
  - API key with copy button
  - Google Sign-In status
  - Edit and Delete buttons
- Click "Edit" → Modal to rename app
- Click "Configure" → Modal for Google credentials
- Click "Delete" → Confirmation modal
- Empty state when no apps

---

## 👥 Users Page (`/users`)

**Route:** `/users`  
**Access:** Protected (requires authentication)

### Layout
```
┌────────────────────────────────────────┐
│  🔐 Auth Platform  Dash│Apps│Users│Logout│
├────────────────────────────────────────┤
│  User Management                       │
│  View and manage users...              │
│                                        │
│  App: [my-app ▼]  Search: [________]  │
│                                        │
│  ┌────────────────────────────────────┐│
│  │ my-app          150 users  ✓Google ││
│  └────────────────────────────────────┘│
│                                        │
│  ┌─────────────────────────────────────┐│
│  │Name│User│Email│Prov│Status│Date│Act││
│  ├─────────────────────────────────────┤│
│  │John│@jd │jd@..│📧 │✓Ver  │Nov2│[Blk││
│  │Jane│@ja │ja@..│🔗 │✓Ver  │Nov1│[Blk││
│  │Bob │@bob│bo@..│📧 │⚠Pen  │Oct│[Blk]││
│  └─────────────────────────────────────┘│
│                                        │
│  Showing 3 of 150 users                │
└────────────────────────────────────────┘
```

### Features
- App selector dropdown
- Search box (filters by name, email, username)
- App info banner with stats
- Users table with columns:
  - Name
  - Username
  - Email
  - Provider (Email 📧 / Google 🔗)
  - Status (Verified ✓ / Unverified ⚠ / Blocked 🚫)
  - Join date
  - Actions (Block/Unblock button)
- Blocked users shown with red background
- Mobile: Hides email and date columns
- Empty state when no users

---

## 📱 Mobile Views

### All pages adapt to mobile:

**Home:**
- Stacked hero section
- Single column features
- Vertical steps
- Full-width buttons

**Login/Register:**
- Full-width forms
- Larger touch targets
- Simplified layout

**Dashboard:**
- 2-column stats grid
- Stacked cards
- Full-width quick actions

**Apps:**
- Single column app cards
- Full-width buttons
- Stacked copy buttons

**Users:**
- Vertical filters
- Simplified table (fewer columns)
- Full-width search
- Stacked action buttons

---

## 🎨 Color Indicators

### Badges
- **Green (Success)** - Verified, Enabled, Active
- **Red (Danger)** - Blocked, Error, Delete
- **Yellow (Warning)** - Unverified, Pending
- **Blue (Info)** - Google provider, Information
- **Gray (Secondary)** - Disabled, Neutral

### Buttons
- **Purple (Primary)** - Main actions (Login, Create, Save)
- **Green (Secondary)** - Positive actions
- **Red (Danger)** - Destructive actions (Delete, Block)
- **White (Outline)** - Secondary actions (Cancel, Edit)

### Alerts
- **Green** - Success messages
- **Red** - Error messages
- **Yellow** - Warning messages
- **Blue** - Information messages

---

## 🔄 Interactive Elements

### Copy Buttons (📋)
- Click to copy to clipboard
- Changes to ✓ when copied
- Resets after 2 seconds

### Action Buttons
- Edit → Opens modal
- Delete → Shows confirmation
- Configure → Opens config modal
- Block/Unblock → Toggles user access

### Forms
- Real-time validation
- Error messages below fields
- Helper text for guidance
- Disabled state during submission

### Modals
- Smooth slide-up animation
- Click outside to close
- X button to close
- Footer with action buttons

---

## 📐 Responsive Breakpoints

### Desktop (≥ 1024px)
- Multi-column grids
- Full navigation
- Wide cards
- All table columns visible

### Tablet (768px - 1023px)
- Adjusted grid columns
- Optimized spacing
- Most features visible

### Mobile (< 768px)
- Single column layouts
- Simplified navigation
- Hidden non-essential info
- Touch-optimized buttons
- Stacked forms

---

## 🎯 User Flows

### New Developer Journey
```
Home → Register → Email Sent → 
Login → Dashboard → Create App → 
Configure → Copy API Key → Done
```

### Manage Users Journey
```
Login → Users → Select App → 
Search User → Block User → Done
```

### Google Config Journey
```
Login → Apps → Select App → 
Configure → Enter Credentials → 
Save → Google Enabled
```

---

This visual guide helps understand the layout and functionality of each page. All pages follow consistent design patterns and are fully responsive.
