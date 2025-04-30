"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, Users } from "lucide-react"
import { MatchmakingQueue } from "@/lib/matchmaking"

interface MatchmakingProps {
  userId: string
}

export function Matchmaking({ userId }: MatchmakingProps) {
  const [isSearching, setIsSearching] = useState(false)
  const [searchTime, setSearchTime] = useState(0)
  const [queueSize, setQueueSize] = useState(0)
  const [matchmakingQueue, setMatchmakingQueue] = useState<MatchmakingQueue | null>(null)
  const router = useRouter()

  useEffect(() => {
    let timer: NodeJS.Timeout

    if (isSearching) {
      timer = setInterval(() => {
        setSearchTime((prev) => prev + 1)
      }, 1000)

      // Create and join the matchmaking queue
      const queue = new MatchmakingQueue(
        userId,
        (gameId) => {
          // Redirect to the game when a match is found
          router.push(`/game/${gameId}`)
        },
        (size) => {
          // Update queue size
          setQueueSize(size)
        },
      )

      queue.join()
      setMatchmakingQueue(queue)
    }

    return () => {
      if (timer) clearInterval(timer)
      if (matchmakingQueue) {
        matchmakingQueue.leave()
      }
    }
  }, [isSearching, userId, router])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-card rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Quick Match</h2>

      {isSearching ? (
        <>
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-lg">Finding opponent... {formatTime(searchTime)}</span>
          </div>
          <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {queueSize} {queueSize === 1 ? "player" : "players"} in queue
            </span>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setIsSearching(false)
              if (matchmakingQueue) {
                matchmakingQueue.leave()
                setMatchmakingQueue(null)
              }
            }}
          >
            Cancel
          </Button>
        </>
      ) : (
        <>
          <p className="text-muted-foreground mb-6">Play a quick match against a random opponent</p>
          <Button size="lg" onClick={() => setIsSearching(true)}>
            Find Match
          </Button>
        </>
      )}
    </div>
  )
}
