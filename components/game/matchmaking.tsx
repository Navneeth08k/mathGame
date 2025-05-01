"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, Users } from "lucide-react"
import { MatchmakingQueue } from "@/lib/matchmaking"
import { Progress } from "@/components/ui/progress"

interface MatchmakingProps {
  userId: string
}

export function Matchmaking({ userId }: MatchmakingProps) {
  const [isSearching, setIsSearching] = useState(false)
  const [searchTime, setSearchTime] = useState(0)
  const [queueSize, setQueueSize] = useState(0)
  const [matchmakingQueue, setMatchmakingQueue] = useState<MatchmakingQueue | null>(null)
  const [matchFound, setMatchFound] = useState(false)
  const router = useRouter()
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isSearching) {
      // Start search timer
      searchTimerRef.current = setInterval(() => {
        setSearchTime((prev) => prev + 1)
      }, 1000)

      // Create and join the matchmaking queue
      const queue = new MatchmakingQueue(
        userId,
        (gameId) => {
          // Match found!
          setMatchFound(true)

          // Short delay to show "Match found!" message before redirecting
          setTimeout(() => {
            router.push(`/game/${gameId}`)
          }, 1500)
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
      if (searchTimerRef.current) {
        clearInterval(searchTimerRef.current)
        searchTimerRef.current = null
      }

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

  const cancelSearch = () => {
    if (matchmakingQueue) {
      matchmakingQueue.leave()
      setMatchmakingQueue(null)
    }
    setIsSearching(false)
    setSearchTime(0)
    setQueueSize(0)
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-card rounded-lg shadow-md">
      <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mb-4">
        <Users className="h-6 w-6 text-accent-foreground" />
      </div>
      <h2 className="text-2xl font-bold mb-6">Quick Match</h2>

      {isSearching ? (
        <>
          {matchFound ? (
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="text-lg font-bold text-primary">Match found!</div>
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div className="text-sm text-muted-foreground">Redirecting to game...</div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-lg">Finding opponent... {formatTime(searchTime)}</span>
              </div>
              <div className="w-full mb-4">
                <Progress value={Math.min(searchTime * 2, 100)} className="h-2" />
              </div>
              <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>
                  {queueSize} {queueSize === 1 ? "player" : "players"} in queue
                </span>
              </div>
              <Button variant="outline" onClick={cancelSearch} className="px-6">
                Cancel
              </Button>
            </>
          )}
        </>
      ) : (
        <>
          <p className="text-muted-foreground mb-6 text-center">
            Play a quick match against a random opponent with similar skill level
          </p>
          <Button size="lg" onClick={() => setIsSearching(true)} className="px-8">
            Find Match
          </Button>
        </>
      )}
    </div>
  )
}
