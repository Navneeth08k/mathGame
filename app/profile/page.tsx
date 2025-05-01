import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { UserStats } from "@/components/profile/user-stats"
import { ProfileEditor } from "@/components/profile/profile-editor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function ProfilePage() {
  const supabase = getSupabaseServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={profile} />

      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Your Profile</h1>

        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="edit">Edit Profile</TabsTrigger>
          </TabsList>
          <TabsContent value="stats">
            <UserStats userId={session.user.id} />
          </TabsContent>
          <TabsContent value="edit">
            <div className="p-6 bg-card rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>
              <ProfileEditor profile={profile} />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
