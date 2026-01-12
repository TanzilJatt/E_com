# Enable Google Sign-In - Quick Guide

## 🎯 Most Common Issue

**Problem:** Google Sign-In is not enabled in Firebase Console

**Fix:** Follow these 5 simple steps (takes 2 minutes)

---

## ✅ Step-by-Step Solution

### Step 1: Open Firebase Console

```
https://console.firebase.google.com/
```

### Step 2: Select Your Project

- Look for: **e-commerce-25134** (or your project name)
- Click on it

### Step 3: Go to Authentication

- In left sidebar, click **"Build"**
- Click **"Authentication"**

### Step 4: Enable Google Sign-In

1. Click the **"Sign-in method"** tab at the top
2. Scroll down to find **"Google"** in the providers list
3. Click on **"Google"**
4. You'll see a toggle switch - turn it **ON** (blue)
5. Enter **"Project support email"** - use your email address
6. Click **"Save"**

### Step 5: Verify

- Go back to "Sign-in method" tab
- Look for "Google" in the list
- Status should show **"Enabled"** ✅

---

## 🧪 Test It

1. Go back to your login page
2. Open browser console (F12)
3. Click "Sign in with Google"
4. Check console for error code
5. If still error, check console output

---

## 🔍 Check Console for Error Details

I've added detailed logging. After clicking "Sign in with Google", check the console (F12) for:

```
Google Sign-In Error: [error details]
Error Code: auth/[specific-code]
Error Message: [description]
```

**Copy the error code and check the troubleshooting guide!**

---

## 📊 Visual Guide

```
Firebase Console
    ↓
Authentication
    ↓
Sign-in method tab
    ↓
Find "Google"
    ↓
Click on it
    ↓
Toggle Enable ON
    ↓
Add support email
    ↓
Click Save
    ↓
Done! ✅
```

---

## ⚠️ Other Possible Issues

If Google Sign-In still fails after enabling:

### Issue 2: Authorized Domains
- Firebase Console → Authentication → Settings
- Check "Authorized domains" section
- Make sure `localhost` is in the list
- If not, click "Add domain" and add `localhost`

### Issue 3: Popup Blocked
- Browser may be blocking popups
- Look for popup blocker icon in address bar
- Click "Always allow popups from this site"

### Issue 4: OAuth Consent Screen
- May need to configure in Google Cloud Console
- See GOOGLE_SIGNIN_TROUBLESHOOTING.md for details

---

## 🔄 Alternative: Use Email/Password

While troubleshooting Google Sign-In, you can use:

**Email/Password Sign-In:**
- Already working and fully functional ✅
- Click "Sign Up" to create account
- Enter email and password
- Verify email
- Sign in

**All features work the same!**

---

## 📞 Need More Help?

**See detailed guide:**
- Read: `GOOGLE_SIGNIN_TROUBLESHOOTING.md`
- Complete troubleshooting steps
- Check all error codes
- Solutions for every scenario

---

## ✅ Success Checklist

After fixing, you should see:

- [ ] Click "Sign in with Google" → Popup opens
- [ ] Select Google account → Works
- [ ] Grant permissions → Accepted
- [ ] Redirected to dashboard → Success! 🎉
- [ ] User is logged in → ✅

---

**Quick Fix:** Enable Google Sign-In in Firebase Console → Authentication → Sign-in method → Google → Enable → Save

**Time Required:** 2 minutes ⏱️

