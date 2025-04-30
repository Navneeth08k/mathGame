"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { Database } from "@/types/supabase"
import { Award, TrendingUp, TrendingDown } from "lucide-react"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
type Game = Database["public"]["Tables"]["games"]["Row"]
type EloHistory = Database["public"]["Tables"]["elo_history"]["Row"]

interface UserStatsProps {
  userId: string
}

export function UserStats({ userId }: UserStatsProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [recentGames, setRecentGames] = useState<Game[]>([])
  const [eloHistory, setEloHistory] = useState<EloHistory[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    fetchUserData()
  }, [userId])

  const fetchUserData = async () => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (profileError) throw profileError

      setProfile(profileData)

      // Fetch recent games
      const { data: gamesData, error: gamesError } = await supabase
        .from("games")
        .select("*")
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(5)

      if (gamesError) throw gamesError

      setRecentGames(gamesData || [])

      // Fetch elo history
      const { data: eloData, error: eloError } = await supabase
        .from("elo_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10)

      if (eloError) throw eloError

      setEloHistory(eloData || [])
    } catch (error) {
      console.error("Error fetching user data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !profile) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6">Your Stats</h2>
        <div className="text-center py-8">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Your Stats</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Award className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-800">Elo Rating</h3>
          </div>
          <p className="text-3xl font-bold">{profile.elo_rating}</p>
        </div>

        <div className="p-4 bg-green-50 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">Games Played</h3>
          <p className="text-3xl font-bold">{profile.games_played}</p>
        </div>

        <div className="p-4 bg-purple-50 rounded-lg">
          <h3 className="font-semibold text-purple-800 mb-2">Win Rate</h3>
          <p className="text-3xl font-bold">
            {profile.games_played > 0 ? `${Math.round((profile.games_won / profile.games_played) * 100)}%` : "N/A"}
          </p>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Recent Games</h3>

        {recentGames.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No games played yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Result</th>
                  <th className="px-4 py-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {recentGames.map((game) => {
                  const isPlayer1 = game.player1_id === userId
                  const playerScore = isPlayer1 ? game.player1_score : game.player2_score
                  const opponentScore = isPlayer1 ? game.player2_score : game.player1_score
                  const isWinner = game.winner_id === userId

                  return (
                    <tr key={game.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{new Date(game.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {game.winner_id === null ? (
                          <span className="text-gray-600">Draw</span>
                        ) : isWinner ? (
                          <span className="text-green-600 font-medium">Win</span>
                        ) : (
                          <span className="text-red-600 font-medium">Loss</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {playerScore} - {opponentScore}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">Elo History</h3>

        {eloHistory.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No rating changes yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Old Rating</th>
                  <th className="px-4 py-2 text-left">New Rating</th>
                  <th className="px-4 py-2 text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                {eloHistory.map((entry) => {
                  const change = entry.new_rating - entry.old_rating

                  return (
                    <tr key={entry.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{new Date(entry.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{entry.old_rating}</td>
                      <td className="px-4 py-3">{entry.new_rating}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end">
                          {change > 0 ? (
                            <>
                              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                              <span className="text-green-600">+{change}</span>
                            </>
                          ) : change < 0 ? (
                            <>
                              <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                              <span className="text-red-600">{change}</span>
                            </>
                          ) : (
                            <span>0</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
