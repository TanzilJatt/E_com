# Firebase Setup Guide for E-Commerce System

## Current Status
Your Firebase project ID: `e-commerce-25134`

## Issue
Firestore Database is **NOT ENABLED** yet. That's why you're seeing connection errors.

---

## Step 1: Enable Firestore Database

### Option A: Quick Enable (Recommended)
1. Click this direct link:
   https://console.firebase.google.com/project/e-commerce-25134/firestore

2. You'll see "Cloud Firestore" page
3. Click **"Create database"** button
4. Select **"Start in test mode"** (for development)
5. Choose location (select closest to you):
   - `us-central` (United States)
   - `europe-west` (Europe)
   - `asia-southeast` (Asia)
6. Click **"Enable"**
7. Wait 1-2 minutes for activation

### Test Mode Rules (Temporary - for development)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **WARNING**: Test mode allows anyone to read/write. Change before production!

---

## Step 2: Enable Firebase Authentication

1. Go to: https://console.firebase.google.com/project/e-commerce-25134/authentication
2. Click **"Get started"**
3. Enable **"Email/Password"** provider:
   - Click on "Email/Password"
   - Toggle "Enable"
   - Click "Save"

---

## Step 3: Create Firestore Collections

After enabling Firestore, create these collections:

### In Firebase Console → Firestore Database → Data tab:

1. **items** collection (for inventory)
   - Click "Start collection"
   - Collection ID: `items`
   - Add a test document:
     ```
     name: "Test Item"
     sku: "TEST-001"
     price: 10.99
     quantity: 100
     description: "Test item"
     ```

2. **sales** collection (for transactions)
   - Create empty collection for now

3. **expenses** collection (for business expenses)
   - Create empty collection for now

4. **activityLogs** collection (for audit trail)
   - Create empty collection for now

---

## Step 4: Production Security Rules (IMPORTANT!)

Before deploying, update Firestore rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // Items collection - authenticated users can read/write
    match /items/{itemId} {
      allow read: if isSignedIn();
      allow create, update, delete: if isSignedIn();
    }
    
    // Sales collection - authenticated users can read/write
    match /sales/{saleId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update, delete: if isSignedIn();
    }
    
    // Expenses collection - authenticated users only
    match /expenses/{expenseId} {
      allow read: if isSignedIn();
      allow create, update, delete: if isSignedIn();
    }
    
    // Activity logs - authenticated users can read/write
    match /activityLogs/{logId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update, delete: if false; // Logs should not be modified
    }
  }
}
```

---

## Step 5: Verify Your Setup

Run this checklist:

- [ ] Firestore Database is enabled
- [ ] Authentication (Email/Password) is enabled
- [ ] Security rules are set (test mode for now)
- [ ] Collections are created (or will be created automatically)
- [ ] `.env` file has correct credentials
- [ ] Dev server is restarted

---

## Step 6: Create Your First User

1. Go to http://localhost:3000/login
2. Click "Sign Up"
3. Enter:
   - Display Name: Your Name
   - Email: your@email.com
   - Password: (at least 6 characters)
4. Click "Sign Up"

---

## Troubleshooting

### Error: "Cloud Firestore API has not been used"
- **Solution**: Enable Firestore Database (Step 1)

### Error: "Could not reach Cloud Firestore backend"
- **Causes**:
  1. Firestore not enabled yet
  2. Waiting for API to activate (wait 1-2 minutes)
  3. Firewall/antivirus blocking connection
- **Solution**: 
  - Wait 2-3 minutes after enabling
  - Check firewall settings
  - Restart dev server

### Error: "Permission denied"
- **Solution**: Check Firestore security rules (Step 4)

### Can't sign in/up
- **Solution**: Enable Authentication (Step 2)

---

## Quick Test After Setup

1. Restart dev server:
   ```bash
   npm run dev
   ```

2. Open browser console (F12)

3. Look for: `✅ Firebase initialized successfully`

4. Go to Items page and try adding an item

5. Check Firebase Console → Firestore to see the data

---

## Current Configuration

Your `.env` file:
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDa9rTeNxreEQ9Owr0dKP3VJwHE22CiiQA
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=e-commerce-25134.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=e-commerce-25134
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=e-commerce-25134.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=970304701400
NEXT_PUBLIC_FIREBASE_APP_ID=1:970304701400:web:96b2d076f580622a87e8ad
```

✅ Credentials are correct - just need to enable Firestore!

---

## Next Steps

1. **RIGHT NOW**: Enable Firestore (Step 1) - takes 2 minutes
2. **Then**: Enable Authentication (Step 2) - takes 1 minute  
3. **Finally**: Restart dev server and test

Once Firestore is enabled, everything will work!

