"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { Database } from "@/types/supabase"
import { Trophy } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export function Leaderboard() {
  const [players, setPlayers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("elo_rating", { ascending: false })
        .limit(10)

      if (error) throw error

      setPlayers(data || [])
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 bg-card rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6">Leaderboard</h2>
        <div className="text-center py-8">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-card rounded-lg shadow-md text-foreground">
      <h2 className="text-2xl font-bold mb-6">Leaderboard</h2>

      {players.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No players found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left">Rank</th>
                <th className="px-4 py-2 text-left">Player</th>
                <th className="px-4 py-2 text-right">Elo Rating</th>
                <th className="px-4 py-2 text-right">Games</th>
                <th className="px-4 py-2 text-right">Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => {
                const initials = player.username
                  .split(" ")
                  .map((name) => name[0])
                  .join("")
                  .toUpperCase()
                  .substring(0, 2)

                return (
                  <tr key={player.id} className="border-b border-border hover:bg-accent/50">
                    <td className="px-4 py-3">
                      {index === 0 ? (
                        <div className="flex items-center">
                          <Trophy className="h-5 w-5 text-yellow-500 dark:text-yellow-400 mr-1" />
                          <span>{index + 1}</span>
                        </div>
                      ) : (
                        index + 1
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {player.avatar_url ? (
                            <AvatarImage src={player.avatar_url || "/placeholder.svg"} alt={player.username} />
                          ) : (
                            <AvatarFallback>{initials}</AvatarFallback>
                          )}
                        </Avatar>
                        <span className="font-medium">{player.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{player.elo_rating}</td>
                    <td className="px-4 py-3 text-right">{player.games_played}</td>
                    <td className="px-4 py-3 text-right">
                      {player.games_played > 0
                        ? `${Math.round((player.games_won / player.games_played) * 100)}%`
                        : "N/A"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
