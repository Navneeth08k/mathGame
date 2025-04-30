"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface MatchmakingProps {
  userId: string
}

export function Matchmaking({ userId }: MatchmakingProps) {
  const [isSearching, setIsSearching] = useState(false)
  const [searchTime, setSearchTime] = useState(0)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    let timer: NodeJS.Timeout

    if (isSearching) {
      timer = setInterval(() => {
        setSearchTime((prev) => prev + 1)
      }, 1000)

      // Start matchmaking
      findMatch()
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isSearching])

  const findMatch = async () => {
    try {
      // First, check for available games
      const { data: availableGames, error: gamesError } = await supabase
        .from("games")
        .select("*")
        .eq("status", "waiting")
        .is("player2_id", null)
        .neq("player1_id", userId)
        .limit(1)

      if (gamesError) throw gamesError

      if (availableGames && availableGames.length > 0) {
        // Join existing game
        const gameId = availableGames[0].id

        const { error: updateError } = await supabase
          .from("games")
          .update({
            player2_id: userId,
            status: "waiting",
          })
          .eq("id", gameId)

        if (updateError) throw updateError

        // Redirect to game
        router.push(`/game/${gameId}`)
        return
      }

      // If no available games, create a new one
      const { data: newGame, error: createError } = await supabase
        .from("games")
        .insert({
          player1_id: userId,
          status: "waiting",
        })
        .select()
        .single()

      if (createError) throw createError

      // Redirect to new game
      router.push(`/game/${newGame.id}`)
    } catch (error) {
      console.error("Error during matchmaking:", error)
      setIsSearching(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Quick Match</h2>

      {isSearching ? (
        <>
          <div className="flex items-center gap-3 mb-6">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-lg">Finding opponent... {formatTime(searchTime)}</span>
          </div>
          <Button variant="outline" onClick={() => setIsSearching(false)}>
            Cancel
          </Button>
        </>
      ) : (
        <>
          <p className="text-gray-600 mb-6">Play a quick match against a random opponent</p>
          <Button size="lg" onClick={() => setIsSearching(true)}>
            Find Match
          </Button>
        </>
      )}
    </div>
  )
}
