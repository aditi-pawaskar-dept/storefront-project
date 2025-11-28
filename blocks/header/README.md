# Header Block

## Overview
The header block provides the main navigation bar for the storefront, including cart, search, and user authentication functionality. It integrates with Adobe Commerce dropins for authentication and cart management.

## Features
- User authentication dropdown with sign-in/sign-out
- Microsoft SSO integration for enterprise authentication
- Shopping cart icon with item count
- Search functionality
- Mobile-responsive navigation

## Configuration

### Authentication
The header block supports two authentication methods:
1. **Standard Email/Password Login** - Adobe Commerce native authentication
2. **Microsoft SSO** - Enterprise single sign-on via Azure AD

### Microsoft SSO Configuration
MS SSO is configured in `customAuth.js` with the following parameters:
- **Client ID**: Azure AD application client ID
- **Tenant ID**: Azure AD tenant identifier
- **Redirect URI**: Application callback URL
- **Scopes**: `email`, `openid`, `profile`

## Integration Details

### Events
The header block listens to and emits the following events:
- `authenticated` - Emitted when user successfully logs in (via any method)
- `cart.initialized` - Triggered when cart data is loaded
- `user.logout` - Emitted when user signs out

### Cookies
Authentication state is maintained via cookies:
- `auth_dropin_user_token` - Adobe Commerce customer JWT token
- `auth_dropin_firstname` - User's first name for display

### URL Parameters
No specific URL parameters are required.

## Behavior Patterns

### Authentication Flow
1. User clicks account icon in header
2. Dropdown displays sign-in form or authenticated user menu
3. User can sign in via:
   - Email/password (standard)
   - MS SSO button (enterprise)
4. Upon successful login:
   - Cookies are set
   - `authenticated` event is emitted
   - UI updates to show "Hi, [FirstName]"
   - Dropdown shows "My Account" and "Logout" links

### MS SSO Flow
1. User clicks "MS SSO" button
2. On localhost: Mock authentication with test data
3. On production: Microsoft login popup appears
4. MS token is exchanged with backend for Commerce token
5. Authentication cookies are set
6. UI updates automatically

### Cart Integration
- Cart icon displays item count badge
- Cart data syncs with authenticated user session
- Guest cart merges with user cart on login

## Error Handling

### Missing Fragments
If header fragment fails to load (404 error), the header gracefully continues without the fragment content to prevent page crashes.

### MS SSO Errors
- **MSAL Load Failure**: Falls back to mock mode with console warning
- **Token Exchange Failure**: Displays user-friendly error alert
- **Network Errors**: Caught and logged, user notified via alert

### Authentication Failures
Standard Adobe Commerce error handling applies for email/password login failures.

## File Structure
```
blocks/header/
├── header.js           # Main header initialization
├── header.css          # Header styles including MS SSO button
├── renderAuthDropdown.js  # Authentication dropdown UI
├── customAuth.js       # MS SSO authentication module
└── README.md          # This file
```

## Dependencies
- `@dropins/storefront-auth` - Adobe Commerce authentication
- `@dropins/tools/event-bus` - Event system
- `@dropins/tools/lib` - Utility functions
- MSAL Browser (CDN) - Microsoft authentication library

## Development Notes

### Localhost Testing
MS SSO automatically uses mock data on localhost for development without requiring Azure AD configuration.

### Production Deployment
Ensure Azure AD application is configured with correct redirect URIs before deploying MS SSO to production.
