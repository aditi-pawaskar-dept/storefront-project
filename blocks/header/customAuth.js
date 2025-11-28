/**
 * Custom Microsoft SSO Authentication Module
 * 
 * This module handles MS SSO login without modifying core auth code.
 * It integrates with the existing Adobe Commerce authentication system.
 */

import { events } from '@dropins/tools/event-bus.js';
import { getCookie } from '@dropins/tools/lib.js';

/**
 * MS SSO Configuration
 * In production, these would come from environment variables or config
 */
const MS_SSO_CONFIG = {
  clientId: '39b13792-0415-43d5-81c7-80962a7a3285',
  authority: 'https://login.microsoftonline.com/44a6c9d1-014f-4db6-8e72-af6ebeaac182/',
  redirectUri: window.location.origin,
  scopes: ['email', 'openid', 'profile'],
};

/**
 * Your backend GraphQL endpoint (Adobe API Mesh)
 * This is your actual backend that validates MS token and returns Commerce token
 */
const SSO_BACKEND_ENDPOINT = 'https://edge-graph.adobe.io/api/0c756910-cc99-4bc8-82c1-faa8fe4eec30/graphql';

/**
 * STEP 1: Initialize Microsoft Authentication Library (MSAL)
 * Uses the CDN-loaded MSAL library (window.msal)
 */
let msalInstance = null;

async function initializeMSAL() {
  // Load MSAL library from CDN
  const { loadScript } = await import('../../scripts/aem.js');
  
  try {
    await loadScript('https://alcdn.msauth.net/browser/2.38.2/js/msal-browser.min.js');
    
    // Wait for window.msal to be available
    if (window.msal && window.msal.PublicClientApplication) {
      msalInstance = new window.msal.PublicClientApplication({
        auth: {
          clientId: MS_SSO_CONFIG.clientId,
          authority: MS_SSO_CONFIG.authority,
          redirectUri: MS_SSO_CONFIG.redirectUri,
        },
        cache: {
          cacheLocation: 'localStorage',
          storeAuthStateInCookie: false,
        },
      });
      
      await msalInstance.initialize();
      console.log('✅ MSAL initialized from CDN');
    } else {
      console.warn('⚠️ MSAL library not loaded from CDN, using mock mode');
    }
  } catch (error) {
    console.warn('⚠️ Failed to load MSAL from CDN, using mock mode:', error);
  }
}

/**
 * STEP 2: Trigger Microsoft Login
 * Opens Microsoft login popup and gets user's MS token
 * 
 * @returns {Promise<Object>} Microsoft authentication response with idToken and user info
 */
async function loginWithMicrosoft() {
  // FOR LOCALHOST TESTING - Use hardcoded response
  if (window.location.hostname === 'localhost') {
    console.log('🧪 LOCALHOST MODE: Using mock MS SSO response');
    
    // Simulate async login delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return the mock data you provided
    return {
      authority: 'https://login.microsoftonline.com/44a6c9d1-014f-4db6-8e72-af6ebeaac182/',
      uniqueId: 'c931f4ab-1dcd-4110-9e90-16e3412e81c8',
      tenantId: '44a6c9d1-014f-4db6-8e72-af6ebeaac182',
      account: {
        username: 'jayesh.gupta@xzcsl.onmicrosoft.com',
        name: 'Jayesh Gupta',
        idTokenClaims: {
          given_name: 'Jayesh',
          family_name: 'Gupta',
          email: 'jayesh.gupta@xzcsl.onmicrosoft.com',
        },
      },
      idToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6InJ0c0ZULWItN0x1WTdEVlllU05LY0lKN1ZuYyJ9...',
      accessToken: 'eyJ0eXAiOiJKV1QiLCJub25jZSI6Il9raEgzWHNRSThYLWdxM3l1c3Z5YXZkRnJxM1JoNW95RHIxbGtuaXQxNFUi...',
    };
  }

  // FOR PRODUCTION - Use real MSAL from CDN
  if (msalInstance) {
    try {
      console.log('🔐 Opening Microsoft login popup...');
      
      const loginResponse = await msalInstance.loginPopup({
        scopes: MS_SSO_CONFIG.scopes,
        prompt: 'select_account',
      });
      
      console.log('✅ Microsoft login successful');
      return loginResponse;
    } catch (error) {
      console.error('❌ Microsoft login failed:', error);
      throw error;
    }
  } else {
    throw new Error('MSAL not initialized. Please check CDN loading.');
  }
}

/**
 * STEP 3: Exchange MS token for Adobe Commerce token
 * Sends the entire MS token response to your backend as a JSON string
 * Your backend validates it and returns Commerce token
 * 
 * @param {Object} msAuthResponse - Microsoft authentication response (complete object)
 * @returns {Promise<Object>} Commerce authentication data
 */
async function exchangeTokenWithBackend(msAuthResponse) {
  console.log('📤 Sending MS token to backend for validation...');
  console.log('Token Response:', JSON.stringify(msAuthResponse, null, 2));

  try {
    // Convert entire tokenResponse to JSON string (as your backend expects)
    const ssoPayloadJsonString = JSON.stringify(msAuthResponse);

    // Your backend's GraphQL mutation
    const mutation = `
      mutation ssoLogin($ssoPayloadJsonString: String!) {
        ssoLogin(ssoPayloadJsonString: $ssoPayloadJsonString) {
          commerce_customer_token
          firstName
          email
          lastName
          is_customer_exists
        }
      }
    `;

    // Call Adobe API Mesh endpoint
    const response = await fetch(SSO_BACKEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Include MS access token in Authorization header
        'Authorization': `Bearer ${msAuthResponse.accessToken}`,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          ssoPayloadJsonString: ssoPayloadJsonString,
        },
      }),
    });

    const result = await response.json();
    console.log('SSO Login Result:', JSON.stringify(result, null, 2));

    // Check for errors in response
    if (result.errors) {
      throw new Error(result.errors[0]?.message || 'SSO backend error');
    }

    // Validate we got the expected data
    if (!result.data?.ssoLogin?.commerce_customer_token) {
      throw new Error('No commerce token received from backend');
    }

    console.log('✅ Received Commerce token from backend');
    console.log('📋 Token details:', {
      email: result.data.ssoLogin.email,
      firstName: result.data.ssoLogin.firstName,
      lastName: result.data.ssoLogin.lastName,
      is_customer_exists: result.data.ssoLogin.is_customer_exists,
      token_length: result.data.ssoLogin.commerce_customer_token.length,
      token_preview: result.data.ssoLogin.commerce_customer_token.substring(0, 50) + '...'
    });
    
    return result.data.ssoLogin;
  } catch (error) {
    console.error('❌ Backend token exchange failed:', error);
    throw error;
  }
}

/**
 * STEP 4: Set Authentication Cookies
 * Sets the same cookies that normal email/password login sets
 * This ensures the rest of the app works identically
 * 
 * @param {string} token - Adobe Commerce customer token
 * @param {string} firstName - User's first name
 */
function setAuthenticationCookies(token, firstName) {
  // Calculate cookie expiration (same as Adobe Commerce - typically 1 hour)
  const expirationDate = new Date();
  expirationDate.setTime(expirationDate.getTime() + (3600 * 1000)); // 1 hour
  const expires = `expires=${expirationDate.toUTCString()}`;

  // Determine if we're on localhost (HTTP) or production (HTTPS)
  const isLocalhost = window.location.hostname === 'localhost' || window.location.protocol === 'http:';
  const secureFlag = isLocalhost ? '' : 'Secure;';

  // Set the EXACT same cookies as normal login
  // These cookie names MUST match what Adobe Commerce auth uses
  document.cookie = `auth_dropin_user_token=${token}; path=/; ${expires}; ${secureFlag} SameSite=Lax`;
  document.cookie = `auth_dropin_firstname=${firstName}; path=/; ${expires}; ${secureFlag} SameSite=Lax`;

  console.log('🍪 Authentication cookies set');
  console.log('Token cookie:', document.cookie.includes('auth_dropin_user_token'));
  console.log('FirstName cookie:', document.cookie.includes('auth_dropin_firstname'));
  console.log('Token value (first 50 chars):', token.substring(0, 50) + '...');
}

/**
 * STEP 5: Update UI to Authenticated State
 * Emits the same event that normal login emits
 * This triggers all the UI updates automatically
 * 
 * Also sets the Authorization header globally for all future requests
 */
async function triggerAuthenticationEvent(token) {
  // Set the Authorization header globally for all GraphQL requests
  try {
    // Import the correct modules
    const { CORE_FETCH_GRAPHQL } = await import('../../scripts/commerce.js');
    
    // The FetchGraphQL instance has a setHeaders method (not setHeader)
    if (CORE_FETCH_GRAPHQL && typeof CORE_FETCH_GRAPHQL.setHeaders === 'function') {
      CORE_FETCH_GRAPHQL.setHeaders({
        'Authorization': `Bearer ${token}`
      });
      console.log('🔑 Authorization header set on CORE_FETCH_GRAPHQL');
    }
  } catch (error) {
    console.warn('⚠️ Could not set Authorization header:', error);
    // Continue anyway - cookies are working fine
  }

  // This is the CRITICAL part - emitting this event makes everything work
  // The header, cart, checkout - everything listens to this event
  events.emit('authenticated', true);
  
  console.log('📢 Authentication event emitted - UI will update automatically');
}

/**
 * MAIN FUNCTION: Handle MS SSO Login
 * This orchestrates all the steps above
 * 
 * @returns {Promise<boolean>} Success status
 */
export async function handleMsSsoLogin() {
  try {
    console.log('🚀 Starting MS SSO login flow...');

    // Step 1: Get MS token via popup/redirect
    const msAuthResponse = await loginWithMicrosoft();
    console.log('✅ Step 1: Microsoft authentication successful');

    // Step 2: Exchange MS token for Commerce token via your backend
    const commerceAuth = await exchangeTokenWithBackend(msAuthResponse);
    console.log('✅ Step 2: Token exchange successful');

    // Step 3: Set cookies (same as normal login)
    setAuthenticationCookies(
      commerceAuth.commerce_customer_token,
      commerceAuth.firstName
    );
    console.log('✅ Step 3: Cookies set');

    // Step 4: Set Authorization header and trigger authentication event (updates UI)
    await triggerAuthenticationEvent(commerceAuth.commerce_customer_token);
    console.log('✅ Step 4: UI updated');

    // Optional: Close the dropdown
    const authDropdown = document.querySelector('.nav-auth-menu-panel');
    if (authDropdown) {
      authDropdown.classList.remove('nav-tools-panel--show');
    }

    console.log('🎉 MS SSO login complete!');
    return true;
  } catch (error) {
    console.error('❌ MS SSO login failed:', error);
    
    // Show user-friendly error
    alert(`Login failed: ${error.message}`);
    return false;
  }
}

/**
 * Add MS SSO Button to the Sign In Form
 * This is called from renderAuthDropdown.js
 * 
 * @param {HTMLElement} container - The auth container element
 */
export function addMsSsoButton(container) {
  console.log('🔧 addMsSsoButton called');
  console.log('Container element:', container);
  
  // Check if button already exists
  if (container.querySelector('.ms-sso-button')) {
    console.log('⚠️ MS SSO button already exists, skipping');
    return;
  }

  // Verify container exists
  if (!container) {
    console.error('❌ Container element is null or undefined');
    return;
  }

  // Create button
  const msSsoButton = document.createElement('button');
  msSsoButton.type = 'button';
  msSsoButton.className = 'ms-sso-button';
  msSsoButton.textContent = 'MS SSO';
  
  // Add click handler
  msSsoButton.addEventListener('click', async () => {
    msSsoButton.disabled = true;
    msSsoButton.textContent = 'Signing in...';
    
    await handleMsSsoLogin();
    
    msSsoButton.disabled = false;
    msSsoButton.textContent = 'MS SSO';
  });

  // Add to container
  container.appendChild(msSsoButton);
  
  console.log('✅ MS SSO button added to auth container');
  console.log('Button element:', msSsoButton);
}

/**
 * Check if user is already authenticated via MS SSO
 * This runs on page load
 */
export function checkMsSsoAuth() {
  const token = getCookie('auth_dropin_user_token');
  const firstName = getCookie('auth_dropin_firstname');
  
  if (token && firstName) {
    console.log('User already authenticated via SSO');
    // User is already logged in, no action needed
    // The normal auth flow will handle this
  }
}

// Initialize MSAL on module load
initializeMSAL().catch(console.error);
