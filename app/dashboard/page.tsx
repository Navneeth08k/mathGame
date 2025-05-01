import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Matchmaking } from "@/components/game/matchmaking"
import { CreateGame } from "@/components/game/create-game"
import { Leaderboard } from "@/components/leaderboard/leaderboard"

export default async function DashboardPage() {
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

      <main className="flex-1 container mx-auto px-4 py-8 text-foreground">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Matchmaking userId={session.user.id} />
          <CreateGame userId={session.user.id} />
        </div>

        <Leaderboard />
      </main>
    </div>
  )
}
