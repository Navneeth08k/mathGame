import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function JoinGamePage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect(`/login?message=Please sign in to join the game&redirect=/game/join/${params.id}`)
  }

  // Check if game exists
  const { data: game } = await supabase.from("games").select("*").eq("id", params.id).single()

  if (!game) {
    redirect("/dashboard?message=Game not found")
  }

  // If user is already a player, redirect to game
  if (game.player1_id === session.user.id || game.player2_id === session.user.id) {
    redirect(`/game/${params.id}`)
  }

  // If game is waiting for player2, join as player2
  if (game.status === "waiting" && !game.player2_id) {
    await supabase.from("games").update({ player2_id: session.user.id }).eq("id", params.id)

    redirect(`/game/${params.id}`)
  } else {
    // Otherwise redirect to dashboard
    redirect("/dashboard?message=Game is already full or completed")
  }
}
