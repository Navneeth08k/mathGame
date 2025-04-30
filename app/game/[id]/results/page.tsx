import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { calculateElo } from "@/lib/utils"

export default async function GameResultsPage({ params }: { params: { id: string } }) {
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
    redirect("/dashboard")
  }

  // Check if game is completed
  if (game.status !== "completed") {
    redirect(`/game/${params.id}`)
  }

  const isPlayer1 = game.player1_id === session.user.id

  // Get opponent profile
  const opponentId = isPlayer1 ? game.player2_id : game.player1_id

  let opponent = null
  if (opponentId) {
    const { data: opponentData } = await supabase.from("profiles").select("*").eq("id", opponentId).single()

    opponent = opponentData
  }

  // Check if Elo has been updated
  const { data: eloHistory } = await supabase
    .from("elo_history")
    .select("*")
    .eq("game_id", params.id)
    .eq("user_id", session.user.id)

  // If Elo hasn't been updated yet, update it
  if (!eloHistory || eloHistory.length === 0) {
    await updateEloRatings(supabase, game, profile, opponent)
  }

  // Get updated profiles
  const { data: updatedProfile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

  let updatedOpponent = null
  if (opponentId) {
    const { data: updatedOpponentData } = await supabase.from("profiles").select("*").eq("id", opponentId).single()

    updatedOpponent = updatedOpponentData
  }

  // Get Elo change
  const { data: userEloHistory } = await supabase
    .from("elo_history")
    .select("*")
    .eq("game_id", params.id)
    .eq("user_id", session.user.id)
    .single()

  const eloChange = userEloHistory ? userEloHistory.new_rating - userEloHistory.old_rating : 0

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={profile} />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-3xl font-bold mb-6 text-center">Game Results</h1>

          <div className="flex justify-between items-center mb-8">
            <div className="text-center">
              <p className="text-lg font-semibold">{updatedProfile?.username || "You"}</p>
              <p className="text-3xl font-bold">{isPlayer1 ? game.player1_score : game.player2_score}</p>
              <p className="text-sm text-gray-600">
                Elo: {updatedProfile?.elo_rating}
                {eloChange > 0 ? (
                  <span className="text-green-600 ml-1">+{eloChange}</span>
                ) : eloChange < 0 ? (
                  <span className="text-red-600 ml-1">{eloChange}</span>
                ) : null}
              </p>
            </div>

            <div className="text-center">
              <p className="text-xl font-bold">VS</p>
            </div>

            <div className="text-center">
              <p className="text-lg font-semibold">{updatedOpponent?.username || "Opponent"}</p>
              <p className="text-3xl font-bold">{isPlayer1 ? game.player2_score : game.player1_score}</p>
              <p className="text-sm text-gray-600">Elo: {updatedOpponent?.elo_rating}</p>
            </div>
          </div>

          <div className="text-center mb-8">
            <p className="text-xl font-bold">
              {game.player1_score === game.player2_score
                ? "It's a tie!"
                : game.winner_id === session.user.id
                  ? "You won!"
                  : "You lost!"}
            </p>
          </div>

          <div className="flex justify-center gap-4">
            <Button asChild>
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/leaderboard">View Leaderboard</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

async function updateEloRatings(supabase, game, player1Profile, player2Profile) {
  if (!game || !player1Profile || !player2Profile) return

  const isDraw = game.player1_score === game.player2_score

  // Determine winner and loser
  let winnerId, loserId, winnerProfile, loserProfile

  if (isDraw) {
    // For draws, we'll still need to calculate Elo changes
    winnerId = game.player1_id
    loserId = game.player2_id
    winnerProfile = player1Profile
    loserProfile = player2Profile
  } else {
    winnerId = game.winner_id
    loserId = winnerId === game.player1_id ? game.player2_id : game.player1_id
    winnerProfile = winnerId === game.player1_id ? player1Profile : player2Profile
    loserProfile = loserId === game.player1_id ? player1Profile : player2Profile
  }

  // Calculate new Elo ratings
  const { winnerNewRating, loserNewRating } = calculateElo(winnerProfile.elo_rating, loserProfile.elo_rating, isDraw)

  // Update winner's profile
  await supabase
    .from("profiles")
    .update({
      elo_rating: winnerNewRating,
      games_played: winnerProfile.games_played + 1,
      games_won: isDraw ? winnerProfile.games_won : winnerProfile.games_won + 1,
    })
    .eq("id", winnerId)

  // Update loser's profile
  await supabase
    .from("profiles")
    .update({
      elo_rating: loserNewRating,
      games_played: loserProfile.games_played + 1,
      games_won: loserProfile.games_won,
    })
    .eq("id", loserId)

  // Record Elo history for winner
  await supabase.from("elo_history").insert({
    user_id: winnerId,
    game_id: game.id,
    old_rating: winnerProfile.elo_rating,
    new_rating: winnerNewRating,
  })

  // Record Elo history for loser
  await supabase.from("elo_history").insert({
    user_id: loserId,
    game_id: game.id,
    old_rating: loserProfile.elo_rating,
    new_rating: loserNewRating,
  })
}
