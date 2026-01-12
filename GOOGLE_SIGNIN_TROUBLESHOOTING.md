# Google Sign-In Troubleshooting Guide

## 🔍 Issue: Google Sign-In Failed

If you're seeing "Failed to sign in with Google. Please try again." error, follow these steps to diagnose and fix the issue.

---

## 🎯 Step 1: Check Browser Console

### How to Open Console:
- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- **Firefox:** Press `F12` or `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)
- **Safari:** Enable Developer menu in Preferences, then `Cmd+Option+C`

### What to Look For:

I've added detailed error logging. After clicking "Sign in with Google", check the console for:

```javascript
Google Sign-In Error: [Full error object]
Error Code: auth/[error-code]
Error Message: [Detailed message]
```

**Common Error Codes and Solutions:**

---

## 🔥 Step 2: Most Common Issue - Google Sign-In Not Enabled

### Problem:
Google authentication is not enabled in Firebase Console (most common cause).

### Solution:

1. **Go to Firebase Console:**
   ```
   https://console.firebase.google.com/
   ```

2. **Select Your Project:**
   - Project name: `e-commerce-25134` (or your project)

3. **Navigate to Authentication:**
   - Left sidebar → Click "Build"
   - Click "Authentication"

4. **Enable Google Sign-In:**
   - Click "Sign-in method" tab
   - Find "Google" in the providers list
   - Click on "Google"
   - Toggle "Enable" switch to ON
   - Enter your support email (your email address)
   - Click "Save"

5. **Verify Setup:**
   - Go back to "Sign-in method" tab
   - You should see "Google" status as "Enabled" ✅

---

## 🌐 Step 3: Check Authorized Domains

### Problem:
Your domain is not authorized in Firebase.

### Solution:

1. **In Firebase Console → Authentication → Settings:**
   - Scroll to "Authorized domains" section

2. **Required Domains for Development:**
   - `localhost` ✅ (should already be there)
   - `127.0.0.1` ✅ (optional but recommended)

3. **For Production:**
   - Add your production domain (e.g., `yourdomain.com`)

4. **Add a Domain:**
   - Click "Add domain"
   - Enter domain name
   - Click "Add"

---

## 🔐 Step 4: Check OAuth Consent Screen (Google Cloud)

### Problem:
OAuth consent screen not configured properly.

### Solution:

1. **Go to Google Cloud Console:**
   ```
   https://console.cloud.google.com/
   ```

2. **Select Your Project:**
   - Same project as Firebase

3. **Navigate to OAuth Consent Screen:**
   - Left menu → "APIs & Services"
   - Click "OAuth consent screen"

4. **Configure:**
   - Choose "External" for testing
   - Fill in required fields:
     - App name
     - User support email
     - Developer contact email
   - Click "Save and Continue"

5. **Add Test Users (if External):**
   - Add your Google account email
   - Click "Save and Continue"

---

## 🔑 Step 5: Check OAuth Client ID

### Problem:
OAuth client not properly configured.

### Solution:

1. **In Google Cloud Console:**
   - APIs & Services → Credentials

2. **Check Web Application Client:**
   - Should see "Web client (auto created by Google Service)"
   - Created by Firebase

3. **Verify Authorized Origins:**
   - Should include:
     - `http://localhost`
     - `http://localhost:3000`
     - Your production domain

4. **Verify Redirect URIs:**
   - Should include:
     - `http://localhost`
     - `https://[project-id].firebaseapp.com/__/auth/handler`

---

## 🐛 Common Error Codes

### Error: `auth/unauthorized-domain`
**Problem:** Your domain is not authorized.
**Solution:** Add domain to Firebase → Authentication → Settings → Authorized domains

### Error: `auth/popup-blocked`
**Problem:** Browser blocked the popup.
**Solution:** Allow popups for your site in browser settings.

### Error: `auth/popup-closed-by-user`
**Problem:** User closed popup before completing sign-in.
**Solution:** Try again and complete the sign-in process.

### Error: `auth/operation-not-supported-in-this-environment`
**Problem:** Google Sign-In not supported in current environment.
**Solution:** Check if running on HTTP (use HTTPS or localhost).

### Error: `auth/configuration-not-found`
**Problem:** Google provider not properly configured.
**Solution:** Enable Google Sign-In in Firebase Console (Step 2).

### Error: `auth/account-exists-with-different-credential`
**Problem:** Email already registered with different method.
**Solution:** Sign in using original method (email/password).

---

## 🧪 Step 6: Test the Setup

### Test Process:

1. **Clear Browser Cache:**
   - Sometimes cached auth data causes issues
   - Clear cache or use Incognito/Private mode

2. **Try Google Sign-In:**
   - Go to login page
   - Click "Sign in with Google"
   - Select your Google account
   - Grant permissions

3. **Check Console:**
   - If error occurs, check browser console
   - Note the error code
   - Match with solutions above

---

## ✅ Step 7: Verify Configuration

### Checklist:

- [ ] Firebase project exists
- [ ] Authentication is enabled in Firebase
- [ ] Email/Password provider is enabled ✅
- [ ] **Google provider is enabled** ⚠️ (Most common issue!)
- [ ] Support email is configured
- [ ] Authorized domains include localhost
- [ ] OAuth consent screen is configured
- [ ] Test users are added (if External)
- [ ] Browser allows popups
- [ ] Internet connection is stable

---

## 🔄 Step 8: Alternative Workaround

### If Google Sign-In Still Doesn't Work:

**Use Email/Password Sign-In Instead:**
- Email/password authentication is already working
- Users can create accounts with email
- More reliable for development
- Google Sign-In can be fixed later for production

**To Sign Up:**
1. Click "Don't have an account? Sign Up"
2. Enter name, email, password
3. Verify email
4. Sign in

---

## 📊 Debugging Information

### Current Implementation:

The code now logs detailed error information to the console:

```typescript
console.error("Google Sign-In Error:", err)
console.error("Error Code:", err.code)
console.error("Error Message:", err.message)
```

### How to Use:

1. Open browser console (F12)
2. Click "Sign in with Google"
3. If error occurs, check console
4. Copy the error code
5. Search for it in this document
6. Follow the solution

---

## 🎯 Quick Fix Summary

### Most Likely Solutions (Try in Order):

1. **Enable Google Sign-In in Firebase Console** (90% of issues)
   - Firebase Console → Authentication → Sign-in method
   - Enable Google provider

2. **Add Authorized Domain**
   - Firebase Console → Authentication → Settings
   - Add `localhost` if missing

3. **Configure OAuth Consent Screen**
   - Google Cloud Console → OAuth consent screen
   - Complete setup wizard

4. **Allow Popups**
   - Browser settings → Allow popups for your site

5. **Use Incognito Mode**
   - Test in incognito/private window
   - Eliminates cache issues

---

## 📞 Support

### If Still Not Working:

**Provide this information:**
1. Error code from console (e.g., `auth/unauthorized-domain`)
2. Error message from console
3. Firebase project ID
4. Environment (localhost, production, etc.)
5. Browser (Chrome, Firefox, Safari, Edge)
6. Whether Email/Password sign-in works

### Alternative Sign-In:
- Use Email/Password sign-in while troubleshooting
- All features work the same with email/password
- Google Sign-In is just a convenience feature

---

## 🚀 Post-Fix Verification

### After Fixing:

1. **Clear browser cache**
2. **Restart development server** (if running)
3. **Try Google Sign-In again**
4. **Should see:**
   - Google account selection popup
   - Permission request screen
   - Successful redirect to dashboard

### Success Indicators:
- ✅ Google popup opens
- ✅ Can select Google account
- ✅ Grants permissions
- ✅ Redirects to dashboard
- ✅ User is logged in

---

## 📝 Quick Reference

### Firebase Console Links:

**Authentication Setup:**
```
https://console.firebase.google.com/project/[PROJECT_ID]/authentication/providers
```

**Authorized Domains:**
```
https://console.firebase.google.com/project/[PROJECT_ID]/authentication/settings
```

**Google Cloud OAuth:**
```
https://console.cloud.google.com/apis/credentials/consent
```

Replace `[PROJECT_ID]` with your Firebase project ID (e.g., `e-commerce-25134`).

---

## 💡 Prevention Tips

### For Future:

1. **Always enable all auth providers** you plan to use in Firebase Console
2. **Test in multiple browsers** (Chrome, Firefox, Safari)
3. **Use Incognito mode** for testing to avoid cache issues
4. **Keep console open** during development to catch errors early
5. **Add production domains** before deploying

---

**Status:** Enhanced error logging added ✅
**Console Logging:** Enabled for debugging ✅
**Error Messages:** More specific with error codes ✅
**Last Updated:** January 12, 2026

