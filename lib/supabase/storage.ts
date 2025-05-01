import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { v4 as uuidv4 } from "uuid"

export async function uploadProfileImage(file: File, userId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseBrowserClient()

    // Create a unique file name
    const fileExt = file.name.split(".").pop()
    const fileName = `${userId}/${uuidv4()}.${fileExt}`

    // Upload the file
    const { data, error } = await supabase.storage.from("avatars").upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      console.error("Error uploading file:", error)
      return null
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(data.path)

    return publicUrl
  } catch (error) {
    console.error("Error in uploadProfileImage:", error)
    return null
  }
}

export async function deleteProfileImage(path: string): Promise<boolean> {
  try {
    const supabase = getSupabaseBrowserClient()

    // Extract the path from the URL
    const urlPath = path.split("avatars/")[1]

    if (!urlPath) return false

    const { error } = await supabase.storage.from("avatars").remove([urlPath])

    if (error) {
      console.error("Error deleting file:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deleteProfileImage:", error)
    return false
  }
}
