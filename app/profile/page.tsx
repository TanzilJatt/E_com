"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { updateProfile, updateEmail, updatePassword, onAuthStateChanged } from "firebase/auth"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"

export default function ProfilePage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isGoogleUser, setIsGoogleUser] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setDisplayName(user.displayName || "")
        setEmail(user.email || "")
        
        // Check if user signed in with Google
        const isGoogle = user.providerData.some(provider => provider.providerId === "google.com")
        setIsGoogleUser(isGoogle)
      } else {
        router.push("/login")
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")
    setIsLoading(true)

    try {
      const user = auth.currentUser
      if (!user) {
        setError("No user is currently signed in.")
        setIsLoading(false)
        return
      }

      // Validate display name
      if (!displayName.trim()) {
        setError("Display name cannot be empty.")
        setIsLoading(false)
        return
      }

      // Validate name: Only alphabets and spaces, max 30 characters
      const nameRegex = /^[a-zA-Z\s]+$/
      if (!nameRegex.test(displayName)) {
        setError("Name can only contain letters and spaces.")
        setIsLoading(false)
        return
      }

      if (displayName.length > 30) {
        setError("Name cannot exceed 30 characters.")
        setIsLoading(false)
        return
      }

      // Update display name
      await updateProfile(user, { displayName: displayName.trim() })
      
      setSuccessMessage("Profile updated successfully!")
    } catch (err: any) {
      console.error("Profile update error:", err)
      setError(err.message || "Failed to update profile. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")
    setIsLoading(true)

    try {
      const user = auth.currentUser
      if (!user) {
        setError("No user is currently signed in.")
        setIsLoading(false)
        return
      }

      // Validate passwords
      if (!newPassword || !confirmNewPassword) {
        setError("Please fill in all password fields.")
        setIsLoading(false)
        return
      }

      if (newPassword !== confirmNewPassword) {
        setError("New passwords do not match.")
        setIsLoading(false)
        return
      }

      if (newPassword.length < 6) {
        setError("Password must be at least 6 characters long.")
        setIsLoading(false)
        return
      }

      // Update password
      await updatePassword(user, newPassword)
      
      setSuccessMessage("Password updated successfully!")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmNewPassword("")
    } catch (err: any) {
      console.error("Password update error:", err)
      
      if (err.code === "auth/requires-recent-login") {
        setError("For security reasons, please log out and log in again before changing your password.")
      } else {
        setError(err.message || "Failed to update password. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your account settings</p>
          </div>
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-lg text-sm">
            {successMessage}
          </div>
        )}

        {/* Profile Information */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Display Name</label>
                <Input
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => {
                    const value = e.target.value
                    // Only allow letters and spaces, max 30 characters
                    if (value === "" || (/^[a-zA-Z\s]*$/.test(value) && value.length <= 30)) {
                      setDisplayName(value)
                    }
                  }}
                  required
                  maxLength={30}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {displayName.length}/30 characters (letters and spaces only)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {isGoogleUser 
                    ? "Email cannot be changed for Google accounts" 
                    : "Email cannot be changed at this time"}
                </p>
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Profile"}
              </Button>
            </form>
          </div>
        </Card>

        {/* Change Password - Only for non-Google users */}
        {!isGoogleUser && (
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Change Password</h2>
              
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">New Password</label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {showNewPassword ? (
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Must be at least 6 characters long
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
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
                  {confirmNewPassword && newPassword !== confirmNewPassword && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Passwords do not match
                    </p>
                  )}
                  {confirmNewPassword && newPassword === confirmNewPassword && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Passwords match ✓
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={isLoading || newPassword !== confirmNewPassword}>
                  {isLoading ? "Updating..." : "Change Password"}
                </Button>
              </form>

              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> If you've recently signed in, you may need to log out and log back in before changing your password for security reasons.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Account Information */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Account Information</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Account Type</span>
                <span className="text-sm font-medium">
                  {isGoogleUser ? "Google Account" : "Email/Password"}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Email Verified</span>
                <span className="text-sm font-medium">
                  {auth.currentUser?.emailVerified ? (
                    <span className="text-green-600 dark:text-green-400">✓ Verified</span>
                  ) : (
                    <span className="text-yellow-600 dark:text-yellow-400">⚠ Not Verified</span>
                  )}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Account Created</span>
                <span className="text-sm font-medium">
                  {auth.currentUser?.metadata.creationTime 
                    ? new Date(auth.currentUser.metadata.creationTime).toLocaleDateString()
                    : "Unknown"}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

