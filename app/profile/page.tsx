"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { updateProfile, onAuthStateChanged } from "firebase/auth"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"

export default function ProfilePage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
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

  return (
    <div className="min-h-screen bg-background md:pl-64">
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
      </div>
    </div>
  )
}

