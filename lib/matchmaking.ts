import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

// Matchmaking queue type
export interface QueueEntry {
  userId: string
  joinedAt: string
  elo?: number
}

// Matchmaking class to handle the queue
export class MatchmakingQueue {
  private channel: RealtimeChannel | null = null
  private userId: string
  private onMatchCallback: (gameId: string) => void
  private onQueueUpdateCallback: (queueSize: number) => void
  private matchCheckInterval: NodeJS.Timeout | null = null
  private lastCheckTime = 0

  constructor(userId: string, onMatch: (gameId: string) => void, onQueueUpdate: (queueSize: number) => void) {
    this.userId = userId
    this.onMatchCallback = onMatch
    this.onQueueUpdateCallback = onQueueUpdate
  }

  // Join the matchmaking queue
  async join() {
    const supabase = getSupabaseBrowserClient()

    // Get user's Elo rating
    const { data: profile } = await supabase.from("profiles").select("elo_rating").eq("id", this.userId).single()

    // Subscribe to the matchmaking channel
    this.channel = supabase
      .channel("matchmaking")
      .on("presence", { event: "sync" }, () => {
        // Get all users in the queue
        const presenceState = this.channel?.presenceState() || {}
        const queueSize = Object.keys(presenceState).length

        this.onQueueUpdateCallback(queueSize)

        // Try to find a match if there are at least 2 players
        if (queueSize >= 2) {
          this.findMatch(presenceState)
        }
      })
      .on("broadcast", { event: "match_found" }, (payload) => {
        // Check if this user is part of the match
        if (payload.payload.player1Id === this.userId || payload.payload.player2Id === this.userId) {
          this.onMatchCallback(payload.payload.gameId)
          this.leave()
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Add user to the queue
          await this.channel?.track({
            userId: this.userId,
            joinedAt: new Date().toISOString(),
            elo: profile?.elo_rating || 1000,
          })

          // Start periodic match checking
          this.startMatchChecking()
        }
      })
  }

  // Leave the matchmaking queue
  leave() {
    if (this.channel) {
      this.channel.unsubscribe()
      this.channel = null
    }

    if (this.matchCheckInterval) {
      clearInterval(this.matchCheckInterval)
      this.matchCheckInterval = null
    }
  }

  // Start periodic match checking
  private startMatchChecking() {
    // Check for matches every 2 seconds
    this.matchCheckInterval = setInterval(() => {
      if (this.channel) {
        const presenceState = this.channel.presenceState() || {}
        const queueSize = Object.keys(presenceState).length

        if (queueSize >= 2) {
          this.findMatch(presenceState)
        }
      }
    }, 2000)
  }

  // Find a match based on Elo and time in queue
  private async findMatch(presenceState: Record<string, any>) {
    // Avoid multiple simultaneous match checks
    const now = Date.now()
    if (now - this.lastCheckTime < 1000) return
    this.lastCheckTime = now

    const supabase = getSupabaseBrowserClient()

    // Convert presence state to array of queue entries
    const queueEntries: QueueEntry[] = []

    Object.entries(presenceState).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        queueEntries.push(value[0] as QueueEntry)
      }
    })

    // Sort by join time (oldest first)
    queueEntries.sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime())

    // Find this user in the queue
    const currentUser = queueEntries.find((entry) => entry.userId === this.userId)

    if (!currentUser || queueEntries.length < 2) return

    // If this is the oldest user in the queue, try to find a match
    if (currentUser.userId === queueEntries[0].userId) {
      // Find the best match based on Elo (excluding self)
      const otherPlayers = queueEntries.filter((entry) => entry.userId !== this.userId)

      if (otherPlayers.length === 0) return

      // Sort other players by Elo similarity
      otherPlayers.sort((a, b) => {
        const aEloDiff = Math.abs((a.elo || 1000) - (currentUser.elo || 1000))
        const bEloDiff = Math.abs((b.elo || 1000) - (currentUser.elo || 1000))
        return aEloDiff - bEloDiff
      })

      // Match with the closest Elo player
      const opponent = otherPlayers[0]

      try {
        // Create a new game
        const { data: game, error } = await supabase
          .from("games")
          .insert({
            player1_id: this.userId,
            player2_id: opponent.userId,
            status: "waiting",
          })
          .select()
          .single()

        if (error || !game) {
          console.error("Error creating game:", error)
          return
        }

        // Broadcast the match to both players
        this.channel?.send({
          type: "broadcast",
          event: "match_found",
          payload: {
            gameId: game.id,
            player1Id: this.userId,
            player2Id: opponent.userId,
          },
        })
      } catch (error) {
        console.error("Error in matchmaking:", error)
      }
    }
  }
}
