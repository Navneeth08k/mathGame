"use client"

import type React from "react"

import { useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { FileUpload } from "@/components/ui/file-upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { uploadProfileImage, deleteProfileImage } from "@/lib/supabase/storage"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2 } from "lucide-react"
import type { Database } from "@/types/supabase"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

interface ProfileEditorProps {
  profile: Profile
}

export function ProfileEditor({ profile }: ProfileEditorProps) {
  const [username, setUsername] = useState(profile.username)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      let avatarUrl = profile.avatar_url

      // Upload new profile image if selected
      if (selectedFile) {
        // Delete old image if exists
        if (profile.avatar_url) {
          await deleteProfileImage(profile.avatar_url)
        }

        // Upload new image
        const newAvatarUrl = await uploadProfileImage(selectedFile, profile.id)
        if (newAvatarUrl) {
          avatarUrl = newAvatarUrl
        }
      }

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          username,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)

      if (error) throw error

      setSuccess(true)
      router.refresh()
    } catch (err: any) {
      setError(err.message || "An error occurred while updating your profile")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="max-w-md"
        />
      </div>

      <div className="space-y-2">
        <Label>Profile Picture</Label>
        <FileUpload onFileSelect={handleFileSelect} currentImageUrl={profile.avatar_url} className="max-w-md" />
        <p className="text-xs text-muted-foreground">Recommended: Square image, at least 200x200 pixels</p>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded">
          Profile updated successfully!
        </div>
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Changes"
        )}
      </Button>
    </form>
  )
}
