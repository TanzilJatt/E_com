import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
}

// Validate Firebase configuration - check for actual values (not placeholders)
const hasPlaceholderValues = 
  (firebaseConfig.apiKey && firebaseConfig.apiKey.includes("your-")) ||
  (firebaseConfig.authDomain && firebaseConfig.authDomain.includes("your-")) ||
  (firebaseConfig.projectId && firebaseConfig.projectId.includes("your-")) ||
  (firebaseConfig.storageBucket && firebaseConfig.storageBucket.includes("your-")) ||
  (firebaseConfig.messagingSenderId && firebaseConfig.messagingSenderId.includes("your-")) ||
  (firebaseConfig.appId && firebaseConfig.appId.includes("your-"))

const isConfigValid = 
  firebaseConfig.apiKey && 
  firebaseConfig.authDomain && 
  firebaseConfig.projectId && 
  firebaseConfig.storageBucket && 
  firebaseConfig.messagingSenderId && 
  firebaseConfig.appId &&
  !hasPlaceholderValues

// Log configuration issues only in development and use console.warn (less aggressive)
if (!isConfigValid && typeof window !== 'undefined') {
  try {
    if (hasPlaceholderValues) {
      console.warn("⚠️ Firebase Configuration: Your .env file contains placeholder values.")
      console.warn("Please replace them with actual Firebase credentials from https://console.firebase.google.com/")
    } else {
      console.warn("⚠️ Firebase Configuration: Missing required environment variables.")
      console.warn("Please check your .env or .env.local file.")
    }
    console.warn("Required variables: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, NEXT_PUBLIC_FIREBASE_APP_ID")
  } catch (e) {
    // Silently fail if console is not available
  }
}

// Initialize Firebase - will fail gracefully if config is invalid
let app: any = null
let db: any = null
let auth: any = null

// Only initialize if we have valid config
if (isConfigValid) {
  try {
    // Initialize Firebase with the config
    console.log("🔧 Initializing Firebase with project:", firebaseConfig.projectId)
    app = initializeApp(firebaseConfig)
    db = getFirestore(app)
    auth = getAuth(app)

    // Verify that db and auth were created successfully
    if (!db || !auth) {
      throw new Error("Failed to initialize Firestore or Auth")
    }

    console.log("✅ Firebase App initialized")
    console.log("✅ Firestore DB created:", !!db)
    console.log("✅ Auth service created:", !!auth)
    console.log("📍 Project ID:", firebaseConfig.projectId)
    console.log("📍 Auth Domain:", firebaseConfig.authDomain)

    if (typeof window !== 'undefined') {
      try {
        auth.onAuthStateChanged((user: any) => {
          if (user) {
            console.log("✅ Firebase Auth State: Logged in as", user.email)
            console.log("   User ID:", user.uid)
          } else {
            console.log("⚠️  Firebase Auth State: No user logged in")
            console.log("   You may need to sign up/login at /login")
          }
        })
        console.log("✅ Firebase initialized successfully")
        console.log("📝 Ready to read/write data to Firestore")
        console.log("⚠️  If you see 'PERMISSION_DENIED' errors, enable Firestore at:")
        console.log(`   👉 https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`)
      } catch (e) {
        // Silently fail if auth state listener fails
      }
    }
  } catch (error: any) {
    // Firebase initialization failed
    if (typeof window !== 'undefined') {
      try {
        console.error("❌ Firebase initialization failed:", error?.message || error)
        console.error("Error code:", error?.code)
        console.error("Please check your Firebase credentials in .env file")
        console.error("Make sure you've restarted the dev server after updating .env")
        
        if (error?.message?.includes("PERMISSION_DENIED") || error?.message?.includes("not been used")) {
          console.error("\n🚨 FIRESTORE IS NOT ENABLED!")
          console.error(`   👉 Enable it here: https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`)
          console.error("   1. Click 'Create database'")
          console.error("   2. Select 'Start in test mode'")
          console.error("   3. Choose a location")
          console.error("   4. Click 'Enable'")
        }
      } catch (e) {
        // Silently fail if console is not available
      }
    }
    // Reset to null on failure
    app = null
    db = null
    auth = null
  }
} else {
  // Config is invalid - log warning
  if (typeof window !== 'undefined') {
    try {
      console.warn("⚠️ Firebase not initialized: Invalid or missing configuration")
      console.warn("Current config values:")
      console.warn("  - apiKey:", firebaseConfig.apiKey ? "✓ Set" : "✗ Missing")
      console.warn("  - projectId:", firebaseConfig.projectId || "✗ Missing")
      console.warn("  - authDomain:", firebaseConfig.authDomain ? "✓ Set" : "✗ Missing")
    } catch (e) {
      // Silently fail if console is not available
      // abcdef
    }
  }
}
  
export { db, auth }
