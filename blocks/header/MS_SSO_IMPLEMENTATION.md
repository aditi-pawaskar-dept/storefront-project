# Microsoft SSO Implementation Guide

## 🎯 What We Built

A **completely separate** MS SSO authentication system that integrates seamlessly with Adobe Commerce without modifying any core authentication code.

---

## 📁 Files Modified/Created

### ✅ Created (New Custom Code)
- **`blocks/header/customAuth.js`** - Complete MS SSO logic (separate module)

### ✏️ Modified (Minimal Changes)
- **`blocks/header/renderAuthDropdown.js`** - Added 2 lines to import and call our custom module
- **`blocks/header/header.css`** - Added styling for MS SSO button

### 🔒 NOT Modified (Core Remains Untouched)
- Adobe Commerce dropins
- Standard email/password authentication
- Any backend Adobe Commerce code

---

## 🔄 How It Works

### For Localhost Testing (Current Setup)

```javascript
// In customAuth.js - Line 60-80
if (window.location.hostname === 'localhost') {
  // Uses your hardcoded MS response data
  // No actual Microsoft API calls
  // Simulates the complete flow
}
```

**Flow on Localhost:**
1. User clicks "MS SSO" button
2. Mock function returns your hardcoded MS data
3. Sends to your backend: `/graphql` mutation `ssoLogin`
4. Backend responds with: `{ commerce_customer_token, firstName, ... }`
5. Sets cookies: `auth_dropin_user_token` and `auth_dropin_firstname`
6. Emits event: `events.emit('authenticated', true)`
7. UI updates automatically - shows "Hi, Jayesh"

---

### For Production Deployment

```javascript
// In customAuth.js - Line 55-59
// Uncomment these lines and install @azure/msal-browser
import { PublicClientApplication } from '@azure/msal-browser';
msalInstance = new PublicClientApplication(MS_SSO_CONFIG);
const loginResponse = await msalInstance.loginPopup({...});
```

**Installation Required:**
```bash
npm install @azure/msal-browser
```

**Production Flow:**
1. User clicks "MS SSO" button
2. Real Microsoft login popup opens
3. User enters Microsoft credentials
4. Microsoft returns real tokens
5. Rest of flow same as localhost

---

## 🔧 Backend Requirements

Your backend must have this GraphQL mutation:

```graphql
mutation SsoLogin($idToken: String!, $email: String!, $firstName: String, $lastName: String) {
  ssoLogin(
    idToken: $idToken
    email: $email
    firstName: $firstName
    lastName: $lastName
  ) {
    commerce_customer_token  # Adobe Commerce token
    firstName
    email
    lastName
    is_customer_exists
  }
}
```

**Backend Must:**
1. Validate the Microsoft `idToken`
2. Check if customer exists in Adobe Commerce
3. Create customer account if needed
4. Generate Adobe Commerce customer token
5. Return the token in the response

**Expected Response Format:**
```json
{
  "data": {
    "ssoLogin": {
      "commerce_customer_token": "eyJraWQiOiIxIi...",
      "firstName": "Jayesh",
      "email": "jayesh.gupta@xzcsl.onmicrosoft.com",
      "lastName": "Gupta",
      "is_customer_exists": true
    }
  }
}
```

---

## 🎨 UI/UX

### Sign In Dropdown Structure

```
┌─────────────────────────────┐
│ [User Icon Button]          │ ← Click to open
└─────────────────────────────┘
         ↓ (Opens dropdown)
┌─────────────────────────────┐
│ Email: [_______________]    │
│ Password: [___________] 👁  │
│                             │
│ Forgot password?            │
│                             │
│ [     Sign in     ]         │ ← Standard login
│                             │
│ [      MS SSO      ]        │ ← OUR BUTTON (Microsoft blue)
└─────────────────────────────┘
```

### After Login (Either Method)

```
┌─────────────────────────────┐
│ Hi, Jayesh ▼                │ ← Shows user name
└─────────────────────────────┘
         ↓ (Opens menu)
┌─────────────────────────────┐
│ • My Account                │
│ • Logout                    │
└─────────────────────────────┘
```

**Key Point:** System can't tell if user logged in via:
- Standard email/password
- MS SSO

Both set the same cookies, emit the same events!

---

## 🔐 Authentication State Management

### Cookies Set (Same for Both Methods)

| Cookie Name | Value | Purpose |
|------------|-------|---------|
| `auth_dropin_user_token` | Adobe Commerce JWT | API authentication |
| `auth_dropin_firstname` | User's first name | UI display |

### Event Emitted

```javascript
events.emit('authenticated', true);
```

**This single event triggers:**
- Header shows "Hi, [Name]"
- Cart loads user's cart
- Checkout becomes available
- Account pages become accessible
- All GraphQL requests include auth header

---

## 🧪 Testing on Localhost

### Step 1: Start Dev Server
```bash
npm start
```

### Step 2: Open Browser
Navigate to: `http://localhost:3000`

### Step 3: Test MS SSO
1. Click user icon (top right)
2. Click "MS SSO" button (blue button at bottom)
3. Watch console for debug logs:
   - "🚀 Starting MS SSO login flow..."
   - "🧪 LOCALHOST MODE: Using mock MS SSO response"
   - "✅ Step 1: Microsoft authentication successful"
   - "📤 Sending MS token to backend for validation..."
   - "✅ Step 2: Token exchange successful"
   - "🍪 Authentication cookies set"
   - "📢 Authentication event emitted"
   - "🎉 MS SSO login complete!"

### Step 4: Verify
- Dropdown should close
- User icon should change to "Hi, Jayesh"
- Click icon again to see account menu

---

## 📊 Debug Console Logs

All steps log to console with emojis for easy tracking:

```
🚀 Starting MS SSO login flow...
🧪 LOCALHOST MODE: Using mock MS SSO response
✅ Step 1: Microsoft authentication successful
📤 Sending MS token to backend for validation...
✅ Step 2: Token exchange successful
🍪 Authentication cookies set
📢 Authentication event emitted - UI will update automatically
🎉 MS SSO login complete!
```

Errors show as:
```
❌ MS SSO login failed: [Error message]
```

---

## ⚙️ Configuration

### Update Backend URL
In `customAuth.js` line 22:
```javascript
const SSO_BACKEND_ENDPOINT = '/graphql'; // Change this to your backend
```

For different environments:
```javascript
const SSO_BACKEND_ENDPOINT = window.location.hostname === 'localhost' 
  ? 'http://localhost:4000/graphql'  // Local backend
  : '/graphql';                       // Production
```

### Update MS SSO Config
In `customAuth.js` lines 14-19:
```javascript
const MS_SSO_CONFIG = {
  clientId: 'YOUR_CLIENT_ID',
  authority: 'YOUR_AUTHORITY_URL',
  redirectUri: window.location.origin,
  scopes: ['email', 'openid', 'profile'],
};
```

---

## 🚀 Deploying to Production

### Step 1: Install MSAL
```bash
npm install @azure/msal-browser
```

### Step 2: Update customAuth.js
Uncomment lines 33-36:
```javascript
import { PublicClientApplication } from '@azure/msal-browser';
msalInstance = new PublicClientApplication(MS_SSO_CONFIG);
await msalInstance.initialize();
```

Uncomment lines 67-70:
```javascript
const loginResponse = await msalInstance.loginPopup({
  scopes: MS_SSO_CONFIG.scopes,
});
return loginResponse;
```

### Step 3: Remove Mock Code
Comment out or remove the localhost mock section (lines 47-79).

### Step 4: Test on Staging
Deploy to staging environment and test with real Microsoft accounts.

### Step 5: Production
Deploy to production!

---

## 🔍 Why This Approach is Better

### ✅ Advantages

1. **No Core Modifications**
   - Adobe Commerce dropins untouched
   - Standard auth still works
   - Easy to update boilerplate

2. **Separation of Concerns**
   - Custom code in separate file
   - Easy to find and modify
   - Clear ownership

3. **Testable**
   - Mock mode for localhost
   - Production mode for deployment
   - Console logs for debugging

4. **Maintainable**
   - All MS SSO logic in one file
   - Clear documentation
   - Easy to disable (remove import)

5. **Compatible**
   - Works with existing auth
   - Same cookie mechanism
   - Same event system

---

## 🐛 Troubleshooting

### Button Doesn't Appear
- Check browser console for errors
- Verify `customAuth.js` is loaded
- Check import in `renderAuthDropdown.js`

### Backend Error
- Verify backend endpoint URL
- Check GraphQL mutation exists
- Inspect network tab for request/response

### Cookies Not Set
- Check browser allows cookies
- Verify HTTPS in production
- Check cookie expiration logic

### UI Doesn't Update
- Verify event is emitted: `events.emit('authenticated', true)`
- Check cookies are actually set
- Look for console errors

---

## 📝 Next Steps

1. **Backend Implementation**
   - Create `ssoLogin` GraphQL mutation
   - Validate Microsoft tokens
   - Return Commerce tokens

2. **Production MSAL Setup**
   - Install `@azure/msal-browser`
   - Configure Microsoft App Registration
   - Update MS_SSO_CONFIG

3. **Error Handling**
   - Better error messages
   - User-friendly alerts
   - Retry logic

4. **Security**
   - Token validation
   - CORS configuration
   - CSP headers

---

## 🆘 Support

For issues:
1. Check console logs (look for 🚀 🧪 ✅ ❌ emojis)
2. Verify backend is responding
3. Check cookies in DevTools → Application → Cookies
4. Review network tab for failed requests

---

**Remember:** The beauty of this implementation is that it's **completely separate** from core auth. You can remove it by simply not importing it!
