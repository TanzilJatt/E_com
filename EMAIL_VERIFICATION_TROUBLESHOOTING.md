# 📧 Email Verification Not Received - Troubleshooting Guide

## ✅ Quick Checklist

### 1. **Check Your Spam/Junk Folder**
   - Verification emails often end up in spam
   - Check your spam folder thoroughly
   - Mark the email as "Not Spam" if found

### 2. **Check Your Inbox (Wait Time)**
   - Email delivery can take 1-10 minutes
   - Sometimes up to 30 minutes in rare cases
   - Be patient and refresh your inbox

### 3. **Verify Email Address**
   - Make sure you entered the correct email address
   - Check for typos in the email field
   - Try a different email address if needed

---

## 🔧 Firebase Console Configuration

### **Step 1: Enable Email/Password Sign-In**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **e-commerce-25134**
3. Navigate to: **Build** → **Authentication** → **Sign-in method**
4. Find **Email/Password** provider
5. Click **Enable** if not already enabled
6. Click **Save**

### **Step 2: Configure Email Templates (Optional)**

1. In Firebase Console → **Authentication**
2. Click **Templates** tab (next to "Sign-in method")
3. Click **Email address verification**
4. Customize the email template if needed:
   - Change the subject line
   - Modify the email body
   - Add your app logo
5. Click **Save**

### **Step 3: Verify Authorized Domains**

1. In Firebase Console → **Authentication** → **Settings**
2. Scroll to **Authorized domains**
3. Make sure your domain is listed:
   - `localhost` (for development)
   - Your production domain (if deployed)

---

## 🧪 Test the Email Verification

### **Option 1: Create New Account and Monitor Console**

1. Open your app in the browser
2. Open Developer Tools (F12)
3. Go to **Console** tab
4. Try signing up with a new email
5. Watch the console for these messages:

**Expected Success Logs:**
```
Creating user account...
User account created successfully: your@email.com
Updating display name...
Display name updated successfully
Sending verification email to: your@email.com
Verification email sent successfully!
```

**If You See Errors:**
- Check the error code and message in the console
- Copy the error and search for solutions

### **Option 2: Test with a Different Email Provider**

Try signing up with different email providers:
- ✅ **Gmail** (most reliable)
- ✅ **Outlook/Hotmail**
- ✅ **Yahoo Mail**
- ⚠️ Custom domain emails (might have stricter spam filters)

---

## 🐛 Common Issues and Solutions

### **Issue 1: "Failed to send verification email"**

**Cause:** Email/Password provider not enabled in Firebase

**Solution:**
1. Go to Firebase Console
2. Authentication → Sign-in method
3. Enable **Email/Password** provider
4. Click **Save**

---

### **Issue 2: "auth/too-many-requests"**

**Cause:** Too many verification emails sent in a short time

**Solution:**
1. Wait 15-30 minutes
2. Try signing in again
3. Firebase will prompt to resend verification email

---

### **Issue 3: Email Never Arrives (Even After 30 Minutes)**

**Possible Causes:**
1. Email blocked by recipient's email provider
2. Firebase quota exceeded (unlikely for new projects)
3. Email/Password provider not properly configured

**Solution:**
1. Check Firebase Console → Usage tab for any quota issues
2. Try with a Gmail account (most reliable)
3. Contact Firebase Support if issue persists

---

### **Issue 4: Email Goes to Spam**

**Cause:** Firebase emails are sometimes flagged as spam

**Solution:**
1. Check spam/junk folder
2. Add `noreply@<your-project-id>.firebaseapp.com` to contacts
3. Mark as "Not Spam"
4. In Firebase Console, customize email template to make it more personal

---

## 🔄 How to Resend Verification Email

If you created an account but didn't receive the email, you can resend it:

### **Method 1: Sign In (Recommended)**

1. Try signing in with your email and password
2. You'll see: "Please verify your email before signing in"
3. Go to `/verify-email` page
4. Click **"Resend Verification Email"**

### **Method 2: Create a Manual Resend Function**

We can add a "Resend Email" button on the login page if needed.

---

## 📋 Verification Status Check

### **Check if Email is Verified:**

1. Open Browser Developer Tools (F12)
2. Go to **Console** tab
3. Type and press Enter:

```javascript
firebase.auth().currentUser?.emailVerified
```

**Expected Output:**
- `true` - Email is verified ✅
- `false` - Email is NOT verified ❌
- `null` - No user signed in

---

## 🧑‍💻 Debug Steps

### **Step 1: Check Browser Console**

After signing up, check the console for:
```
✅ Creating user account...
✅ User account created successfully: your@email.com
✅ Sending verification email to: your@email.com
✅ Verification email sent successfully!
```

### **Step 2: Check Firebase Console Logs**

1. Go to Firebase Console
2. Navigate to **Authentication** → **Users**
3. Find your newly created user
4. Check if user exists in the list
5. If user exists, email was sent (check spam)

### **Step 3: Check Firebase Usage/Quota**

1. Firebase Console → **Usage and billing** (or **Spark Plan** if on free tier)
2. Check if email quota is exceeded
3. Free tier: 100 emails/day (should be enough)

---

## 💡 Alternative Solutions

### **Option 1: Temporarily Disable Email Verification (NOT Recommended for Production)**

If you need to test other features:
1. Comment out email verification check in `app/login/page.tsx`
2. Users can sign in without verifying email
3. **Remember to re-enable before deploying to production**

### **Option 2: Use a Different Email Provider**

Try these email providers known to work well with Firebase:
- Gmail
- Outlook
- ProtonMail
- Zoho Mail

### **Option 3: Use Google Sign-In Instead**

Google Sign-In doesn't require email verification:
1. Click "Sign in with Google"
2. Select your Google account
3. Instant access (no email verification needed)

---

## 📞 Still Having Issues?

### **Collect This Information:**

1. **Browser Console Logs:**
   - Copy any errors from console
   
2. **Email Address Used:**
   - What email provider? (Gmail, Outlook, etc.)
   
3. **Firebase Project Details:**
   - Project ID: `e-commerce-25134`
   - Email/Password enabled: Yes/No?
   
4. **Timing:**
   - How long ago did you sign up?
   - Checked spam folder?

### **Next Steps:**

1. Share the console logs
2. Try with a Gmail account
3. Verify Email/Password provider is enabled in Firebase Console

---

## 📚 Additional Resources

- [Firebase Email Verification Docs](https://firebase.google.com/docs/auth/web/manage-users#send_a_user_a_verification_email)
- [Firebase Email Templates](https://firebase.google.com/docs/auth/admin/email-action-links)
- [Firebase Authentication Troubleshooting](https://firebase.google.com/docs/auth/admin/errors)

---

## ✅ Success Checklist

Before contacting support, verify:

- [ ] Email/Password provider is **enabled** in Firebase Console
- [ ] Checked **spam/junk** folder thoroughly
- [ ] Waited at least **10 minutes** for email to arrive
- [ ] Tried with a **Gmail account**
- [ ] Checked browser **console** for error messages
- [ ] Verified **authorized domains** include `localhost`
- [ ] Checked Firebase **Users** list to confirm account was created

---

**Last Updated:** Jan 13, 2026

