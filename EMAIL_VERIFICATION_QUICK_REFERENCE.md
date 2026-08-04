# Email Verification - Quick Reference

## 🎯 How It Works

### Signup Process:
1. User fills signup form → Account created
2. Verification email sent automatically
3. User signed out immediately
4. Success message shown on login page
5. User must verify email before signing in

### Sign In Process:
1. User enters credentials
2. System checks `emailVerified` status
3. If `false` → Error message + signed out
4. If `true` → Access granted ✅

### Verification Process:
1. User clicks link in email
2. Email marked as verified by Firebase
3. User signs in successfully
4. Access granted to application

---

## 📁 Files Changed

| File | Changes |
|------|---------|
| `app/login/page.tsx` | Added verification email on signup + verification check on signin |
| `components/auth-guard.tsx` | Added verification check + redirect to `/verify-email` |
| `app/verify-email/page.tsx` | **NEW** - Verification management page |

---

## 🔑 Key Functions

### Send Verification Email:
```typescript
import { sendEmailVerification } from "firebase/auth"

await sendEmailVerification(user)
```

### Check Verification Status:
```typescript
const user = auth.currentUser
if (user.emailVerified) {
  // Verified ✅
} else {
  // Not verified ❌
}
```

### Reload User Data:
```typescript
await auth.currentUser.reload()
// Updates emailVerified status
```

---

## 🚦 User Flow Diagram

```
┌─────────────┐
│   Sign Up   │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Create Account      │
│ Send Verify Email   │
│ Sign Out User       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Show Success Msg    │
│ Stay on Login Page  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ User Checks Email   │
│ Clicks Verify Link  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   Try Sign In       │
└──────┬──────────────┘
       │
       ▼
  ┌────┴────┐
  │Verified?│
  └────┬────┘
       │
   ┌───┴───┐
   │       │
  Yes     No
   │       │
   ▼       ▼
 ✅🏠   ❌📧
Dashboard  Verify
          Email
          Page
```

---

## 💬 Error Messages

| Scenario | Message |
|----------|---------|
| Sign in without verification | "Please verify your email before signing in. Check your inbox for the verification link." |
| Email not verified yet | "Email not verified yet. Please check your inbox and click the verification link." |
| Too many resend requests | "Too many requests. Please wait a few minutes before trying again." |

---

## ✅ Success Messages

| Scenario | Message |
|----------|---------|
| Account created | "Account created! Please check your email to verify your account before signing in." |
| Verification email sent | "Verification email sent! Please check your inbox." |
| Email verified | "Email verified! Redirecting to dashboard..." |

---

## 🔒 Routes

| Route | Access | Purpose |
|-------|--------|---------|
| `/login` | Public | Sign in / Sign up |
| `/verify-email` | Public (logged in only) | Manage email verification |
| `/` (Dashboard) | Protected (verified users only) | Main application |
| All other routes | Protected (verified users only) | Application features |

---

## 🎛️ Configuration

### Firebase Settings:
- **Location:** Firebase Console → Authentication → Settings
- **Provider:** Email/Password (must be enabled)
- **Email Templates:** Can be customized in Firebase Console

### Email Template Customization:
1. Go to Firebase Console
2. Authentication → Templates
3. Select "Email address verification"
4. Customize subject, body, and sender name

---

## 🧪 Testing Checklist

- [ ] Create account
- [ ] Receive verification email
- [ ] Click verification link
- [ ] Sign in successfully
- [ ] Try sign in before verification (should fail)
- [ ] Resend verification email
- [ ] Check verification status
- [ ] Sign out from verification page

---

## 🐞 Common Issues & Fixes

### "Not receiving email"
- Check spam folder
- Wait 2-3 minutes
- Click "Resend Verification Email"

### "Link doesn't work"
- Link expires in 1 hour
- Request new verification email

### "Still can't sign in"
- Click "I've Verified My Email" on `/verify-email`
- Try signing out and back in
- Clear browser cache

---

## 📊 Firebase Auth Status Properties

```typescript
user.emailVerified  // boolean - is email verified?
user.email          // string - user's email address
user.uid            // string - unique user ID
user.displayName    // string - user's display name
```

---

## 🔄 Re-verification (if needed)

To require re-verification (e.g., after email change):

```typescript
// After updating email
await updateEmail(user, newEmail)
await sendEmailVerification(user)
await signOut(auth)
```

---

## 📧 Email Provider Testing

| Provider | Typical Delivery Time | Notes |
|----------|----------------------|-------|
| Gmail | Instant - 30 seconds | Most reliable |
| Outlook/Hotmail | 1-2 minutes | Usually good |
| Yahoo | 1-3 minutes | Check spam |
| Corporate | Variable | May be blocked |

---

**Quick Start:** Users sign up → Check email → Click link → Sign in ✅

