import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/layout/navbar"
import { Leaderboard } from "@/components/leaderboard/leaderboard"

export default async function LeaderboardPage() {
  const supabase = getSupabaseServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  let profile = null
  if (session) {
    const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

    profile = data
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={profile} />

      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Leaderboard</h1>

        <Leaderboard />
      </main>
    </div>
  )
}
