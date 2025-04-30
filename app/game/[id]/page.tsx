import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { GameBoard } from "@/components/game/game-board"

export default async function GamePage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

  const { data: game } = await supabase.from("games").select("*").eq("id", params.id).single()

  if (!game) {
    redirect("/dashboard")
  }

  // Check if user is a player in this game
  if (game.player1_id !== session.user.id && game.player2_id !== session.user.id) {
    // If game is waiting for player2, join as player2
    if (game.status === "waiting" && !game.player2_id) {
      await supabase.from("games").update({ player2_id: session.user.id }).eq("id", params.id)
    } else {
      // Otherwise redirect to dashboard
      redirect("/dashboard")
    }
  }

  const isPlayer1 = game.player1_id === session.user.id

  // Get opponent profile
  const opponentId = isPlayer1 ? game.player2_id : game.player1_id

  let opponent = null
  if (opponentId) {
    const { data: opponentData } = await supabase.from("profiles").select("*").eq("id", opponentId).single()

    opponent = opponentData
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={profile} />

      <main className="flex-1 container mx-auto px-4 py-8">
        <GameBoard gameId={params.id} userId={session.user.id} isPlayer1={isPlayer1} opponent={opponent} />
      </main>
    </div>
  )
}
