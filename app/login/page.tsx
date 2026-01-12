"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification 
} from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()

  // Password validation function
  const validatePassword = (pwd: string) => {
    return {
      minLength: pwd.length >= 8,
      hasUpperCase: /[A-Z]/.test(pwd),
      hasLowerCase: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\\/;'`~]/.test(pwd),
    }
  }

  const isPasswordValid = (pwd: string) => {
    const validation = validatePassword(pwd)
    return Object.values(validation).every(v => v === true)
  }

  const getPasswordValidation = () => validatePassword(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")
    setIsLoading(true)

    try {
      if (!auth) {
        setError("Firebase authentication is not available. Please check your configuration.")
        setIsLoading(false)
        return
      }

      if (isSignUp) {
        // Validate password strength
        if (!isPasswordValid(password)) {
          setError("Password does not meet the required criteria. Please check all requirements below.")
          setIsLoading(false)
          return
        }

        // Validate password confirmation
        if (password !== confirmPassword) {
          setError("Passwords do not match. Please make sure both passwords are the same.")
          setIsLoading(false)
          return
        }

        // Create new user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        
        // Update profile with display name
        if (displayName) {
          await updateProfile(userCredential.user, { displayName })
        }

        // Send verification email
        await sendEmailVerification(userCredential.user)
        
        // Sign out the user immediately after signup
        await auth.signOut()
        
        // Show success message
        setSuccessMessage("Account created! Please check your email to verify your account before signing in.")
        setEmail("")
        setPassword("")
        setConfirmPassword("")
        setDisplayName("")
        setIsSignUp(false)
        setShowPasswordRequirements(false)
        setShowPassword(false)
        setShowConfirmPassword(false)
        setIsLoading(false)
        
        // Don't redirect, stay on login page to show success message
        return
      } else {
        // Sign In - check if email is verified
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        
        if (!userCredential.user.emailVerified) {
          setError("Please verify your email before signing in. Check your inbox for the verification link.")
          await auth.signOut() // Sign out the user
          return
        }
        
        router.push("/")
      }
    } catch (err: any) {
      // Handle Firebase authentication errors with user-friendly messages
      const errorCode = err.code
      
      switch (errorCode) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          setError("Invalid email or password. Please check your credentials and try again.")
          break
        case 'auth/invalid-email':
          setError("Invalid email address. Please enter a valid email.")
          break
        case 'auth/user-disabled':
          setError("This account has been disabled. Please contact support.")
          break
        case 'auth/email-already-in-use':
          setError("This email is already registered. Please sign in or use a different email.")
          break
        case 'auth/weak-password':
          setError("Password is too weak. Please use a stronger password.")
          break
        case 'auth/operation-not-allowed':
          setError("Email/password sign-in is not enabled. Please contact support.")
          break
        case 'auth/too-many-requests':
          setError("Too many failed attempts. Please try again later or reset your password.")
          break
        case 'auth/network-request-failed':
          setError("Network error. Please check your internet connection and try again.")
          break
        case 'auth/popup-closed-by-user':
          setError("Sign-in cancelled. Please try again.")
          break
        default:
          setError("An error occurred. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError("")
    setIsLoading(true)

    try {
      if (!auth) {
        setError("Firebase authentication is not available. Please check your configuration.")
        setIsLoading(false)
        return
      }

      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      router.push("/")
    } catch (err: any) {
      // Log error for debugging
      console.error("Google Sign-In Error:", err)
      console.error("Error Code:", err.code)
      console.error("Error Message:", err.message)
      
      // Handle Google Sign-In errors with user-friendly messages
      const errorCode = err.code
      
      switch (errorCode) {
        case 'auth/popup-closed-by-user':
          setError("Sign-in cancelled. Please try again.")
          break
        case 'auth/popup-blocked':
          setError("Sign-in popup was blocked. Please allow popups for this site.")
          break
        case 'auth/cancelled-popup-request':
          setError("Sign-in cancelled. Please try again.")
          break
        case 'auth/account-exists-with-different-credential':
          setError("An account already exists with this email. Please sign in using your original method.")
          break
        case 'auth/network-request-failed':
          setError("Network error. Please check your internet connection and try again.")
          break
        case 'auth/user-disabled':
          setError("This account has been disabled. Please contact support.")
          break
        case 'auth/too-many-requests':
          setError("Too many failed attempts. Please try again later.")
          break
        case 'auth/configuration-not-found':
        case 'auth/operation-not-supported-in-this-environment':
        case 'auth/unauthorized-domain':
          setError("Google Sign-In is not properly configured. Please contact support or use email/password sign-in.")
          break
        default:
          // Show the error code for debugging
          setError(`Failed to sign in with Google. Error: ${errorCode || 'Unknown'}. Please try email/password sign-in or contact support.`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-center mb-8">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">T</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">{isSignUp ? "Create Account" : "Sign In"}</h1>
          <p className="text-center text-muted-foreground mb-6">
            {isSignUp ? "Get started with Inventory Management" : "Welcome back to Inventory Management"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required={isSignUp}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => isSignUp && setShowPasswordRequirements(true)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Password Requirements - Show only during signup */}
              {isSignUp && showPasswordRequirements && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">Password Requirements:</p>
                  <div className="space-y-1">
                    <PasswordRequirement 
                      met={getPasswordValidation().minLength} 
                      text="At least 8 characters" 
                    />
                    <PasswordRequirement 
                      met={getPasswordValidation().hasUpperCase} 
                      text="One uppercase letter (A-Z)" 
                    />
                    <PasswordRequirement 
                      met={getPasswordValidation().hasLowerCase} 
                      text="One lowercase letter (a-z)" 
                    />
                    <PasswordRequirement 
                      met={getPasswordValidation().hasNumber} 
                      text="One number (0-9)" 
                    />
                    <PasswordRequirement 
                      met={getPasswordValidation().hasSpecialChar} 
                      text="One special character (!@#$%^&* etc.)" 
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password - Show only during signup */}
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium mb-1">Confirm Password</label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={isSignUp}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Passwords do not match
                  </p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Passwords match ✓
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-3 rounded-lg text-sm">
                {successMessage}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
            </div>
          </div>

          {/* Google Sign In */}
          <Button 
            type="button"
            variant="outline" 
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>

          <div className="mt-6 text-center text-sm">
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary hover:underline">
              {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

// Helper component for password requirements
function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span className={`text-xs ${met ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
        {text}
      </span>
    </div>
  )
}
