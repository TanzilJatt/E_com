"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { sendEmailVerification, signOut } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function VerifyEmailPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const router = useRouter()

  useEffect(() => {
    // Get current user email
    if (auth?.currentUser) {
      setUserEmail(auth.currentUser.email || "")
    }
  }, [])

  const handleResendVerification = async () => {
    setIsLoading(true)
    setError("")
    setMessage("")

    try {
      if (!auth?.currentUser) {
        setError("No user logged in")
        return
      }

      await sendEmailVerification(auth.currentUser)
      setMessage("Verification email sent! Please check your inbox.")
    } catch (err: any) {
      if (err.code === "auth/too-many-requests") {
        setError("Too many requests. Please wait a few minutes before trying again.")
      } else {
        setError(err.message || "Failed to send verification email")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckVerification = async () => {
    setIsLoading(true)
    setError("")
    setMessage("")

    try {
      if (!auth?.currentUser) {
        setError("No user logged in")
        return
      }

      // Reload user data to get latest verification status
      await auth.currentUser.reload()

      if (auth.currentUser.emailVerified) {
        setMessage("Email verified! Redirecting to dashboard...")
        setTimeout(() => {
          router.push("/")
        }, 1500)
      } else {
        setError("Email not verified yet. Please check your inbox and click the verification link.")
      }
    } catch (err: any) {
      setError(err.message || "Failed to check verification status")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth)
        router.push("/login")
      }
    } catch (err) {
      console.error("Error signing out:", err)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <div className="p-6">
          {/* Icon */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-yellow-600 dark:text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>

          {/* Title and Description */}
          <h1 className="text-2xl font-bold text-center mb-2">Verify Your Email</h1>
          <p className="text-center text-muted-foreground mb-6">
            We've sent a verification email to:
          </p>
          <p className="text-center font-medium mb-6">{userEmail}</p>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
              <strong>Steps to verify:</strong>
            </p>
            <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
              <li>Check your email inbox (and spam folder)</li>
              <li>Click the verification link in the email</li>
              <li>Come back and click "I've Verified My Email"</li>
            </ol>
          </div>

          {/* Messages */}
          {message && (
            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-3 rounded-lg text-sm mb-4">
              {message}
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleCheckVerification}
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Checking..." : "I've Verified My Email"}
            </Button>

            <Button
              onClick={handleResendVerification}
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              Resend Verification Email
            </Button>

            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full"
              disabled={isLoading}
            >
              Sign Out
            </Button>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Didn't receive the email? Check your spam folder or click "Resend Verification Email"
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

