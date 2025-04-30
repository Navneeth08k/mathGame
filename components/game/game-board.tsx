"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { generateMathProblem, formatTime } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { Database } from "@/types/supabase"
import type { RealtimeChannel } from "@supabase/supabase-js"

type GameRound = Database["public"]["Tables"]["game_rounds"]["Row"]
type Game = Database["public"]["Tables"]["games"]["Row"]
type Profile = Database["public"]["Tables"]["profiles"]["Row"]

interface GameBoardProps {
  gameId: string
  userId: string
  isPlayer1: boolean
  opponent: Profile | null
}

export function GameBoard({ gameId, userId, isPlayer1, opponent }: GameBoardProps) {
  const [game, setGame] = useState<Game | null>(null)
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null)
  const [answer, setAnswer] = useState("")
  const [timeLeft, setTimeLeft] = useState(60)
  const [gameStatus, setGameStatus] = useState<"waiting" | "starting" | "in_progress" | "completed" | "abandoned">(
    "waiting",
  )
  const [roundNumber, setRoundNumber] = useState(1)
  const [score, setScore] = useState({ player1: 0, player2: 0 })
  const [startTime, setStartTime] = useState<number | null>(null)
  const [countdown, setCountdown] = useState(3)
  const [message, setMessage] = useState("")

  const answerInputRef = useRef<HTMLInputElement>(null)
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Subscribe to game updates
  useEffect(() => {
    const channel = supabase
      .channel(`game:${gameId}`)
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState()
        const players = Object.keys(presenceState).length

        if (players === 2 && gameStatus === "waiting") {
          setGameStatus("starting")
          startCountdown()
        }
      })
      .on("broadcast", { event: "game_update" }, (payload) => {
        if (payload.payload.game) {
          setGame(payload.payload.game)
        }
        if (payload.payload.round) {
          setCurrentRound(payload.payload.round)
        }
        if (payload.payload.score) {
          setScore(payload.payload.score)
        }
        if (payload.payload.status) {
          setGameStatus(payload.payload.status)
        }
        if (payload.payload.roundNumber) {
          setRoundNumber(payload.payload.roundNumber)
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user: userId,
            online_at: new Date().toISOString(),
          })
        }
      })

    channelRef.current = channel

    // Fetch initial game data
    fetchGameData()

    return () => {
      channel.unsubscribe()
    }
  }, [gameId, userId])

  // Handle countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (gameStatus === "starting" && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
    } else if (gameStatus === "starting" && countdown === 0) {
      startGame()
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [gameStatus, countdown])

  // Handle game timer
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (gameStatus === "in_progress" && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
    } else if (gameStatus === "in_progress" && timeLeft === 0) {
      endGame()
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [gameStatus, timeLeft])

  // Focus on input when round changes
  useEffect(() => {
    if (gameStatus === "in_progress" && answerInputRef.current) {
      answerInputRef.current.focus()
    }
  }, [currentRound, gameStatus])

  const fetchGameData = async () => {
    try {
      // Fetch game
      const { data: gameData, error: gameError } = await supabase.from("games").select("*").eq("id", gameId).single()

      if (gameError) throw gameError

      setGame(gameData)

      if (gameData.status === "in_progress") {
        setGameStatus("in_progress")

        // Fetch current round
        const { data: roundData, error: roundError } = await supabase
          .from("game_rounds")
          .select("*")
          .eq("game_id", gameId)
          .order("round_number", { ascending: false })
          .limit(1)
          .single()

        if (!roundError && roundData) {
          setCurrentRound(roundData)
          setRoundNumber(roundData.round_number)
        }
      } else if (gameData.status === "completed") {
        setGameStatus("completed")
      }
    } catch (error) {
      console.error("Error fetching game data:", error)
    }
  }

  const startCountdown = () => {
    setMessage("Game starting in...")
    setCountdown(3)
  }

  const startGame = async () => {
    try {
      // Update game status
      const { error: updateError } = await supabase.from("games").update({ status: "in_progress" }).eq("id", gameId)

      if (updateError) throw updateError

      setGameStatus("in_progress")
      setMessage("")

      // Create first round
      await createNewRound()

      // Start timer
      setTimeLeft(60)
    } catch (error) {
      console.error("Error starting game:", error)
    }
  }

  const createNewRound = async () => {
    try {
      const problem = generateMathProblem()

      // Create new round
      const { data: roundData, error: roundError } = await supabase
        .from("game_rounds")
        .insert({
          game_id: gameId,
          question: problem.question,
          correct_answer: problem.answer,
          round_number: roundNumber,
        })
        .select()
        .single()

      if (roundError) throw roundError

      setCurrentRound(roundData)
      setStartTime(Date.now())
      setAnswer("")

      // Broadcast round update
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "game_update",
          payload: { round: roundData, roundNumber },
        })
      }
    } catch (error) {
      console.error("Error creating new round:", error)
    }
  }

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentRound || !startTime) return

    const timeTaken = (Date.now() - startTime) / 1000

    try {
      // Update round with player's answer
      const updateData = isPlayer1
        ? { player1_answer: answer, player1_time_taken: timeTaken }
        : { player2_answer: answer, player2_time_taken: timeTaken }

      const { data: updatedRound, error: updateError } = await supabase
        .from("game_rounds")
        .update(updateData)
        .eq("id", currentRound.id)
        .select()
        .single()

      if (updateError) throw updateError

      // Check if answer is correct
      const isCorrect = answer === currentRound.correct_answer

      // Update score
      const newScore = { ...score }
      if (isPlayer1 && isCorrect) {
        newScore.player1 += 1
      } else if (!isPlayer1 && isCorrect) {
        newScore.player2 += 1
      }

      setScore(newScore)

      // Broadcast score update
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "game_update",
          payload: { score: newScore },
        })
      }

      // Move to next round
      setRoundNumber(roundNumber + 1)
      await createNewRound()
    } catch (error) {
      console.error("Error submitting answer:", error)
    }
  }

  const endGame = async () => {
    try {
      // Determine winner
      let winnerId = null
      if (score.player1 > score.player2) {
        winnerId = game?.player1_id
      } else if (score.player2 > score.player1) {
        winnerId = game?.player2_id
      }

      // Update game
      const { error: updateError } = await supabase
        .from("games")
        .update({
          status: "completed",
          player1_score: score.player1,
          player2_score: score.player2,
          winner_id: winnerId,
          ended_at: new Date().toISOString(),
          game_duration: 60 - timeLeft,
        })
        .eq("id", gameId)

      if (updateError) throw updateError

      setGameStatus("completed")

      // Broadcast game end
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "game_update",
          payload: { status: "completed" },
        })
      }

      // Redirect to results page
      router.push(`/game/${gameId}/results`)
    } catch (error) {
      console.error("Error ending game:", error)
    }
  }

  if (gameStatus === "waiting") {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Waiting for opponent...</h2>
        <p className="text-gray-600 mb-6">Share this game link with a friend to start playing</p>
        <div className="flex items-center gap-2">
          <Input value={`${window.location.origin}/game/join/${gameId}`} readOnly className="w-64" />
          <Button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/game/join/${gameId}`)
              setMessage("Link copied!")
              setTimeout(() => setMessage(""), 2000)
            }}
          >
            Copy
          </Button>
        </div>
        {message && <p className="mt-4 text-green-600">{message}</p>}
      </div>
    )
  }

  if (gameStatus === "starting") {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">{message}</h2>
        <div className="text-6xl font-bold text-blue-600">{countdown}</div>
      </div>
    )
  }

  if (gameStatus === "completed") {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
        <p className="text-xl mb-6">
          {score.player1 === score.player2
            ? "It's a tie!"
            : isPlayer1
              ? score.player1 > score.player2
                ? "You won!"
                : "You lost!"
              : score.player2 > score.player1
                ? "You won!"
                : "You lost!"}
        </p>
        <div className="flex gap-8 mb-6">
          <div className="text-center">
            <p className="font-semibold">You</p>
            <p className="text-3xl font-bold">{isPlayer1 ? score.player1 : score.player2}</p>
          </div>
          <div className="text-center">
            <p className="font-semibold">{opponent?.username || "Opponent"}</p>
            <p className="text-3xl font-bold">{isPlayer1 ? score.player2 : score.player1}</p>
          </div>
        </div>
        <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">Math Battle</h2>
          <p className="text-sm text-gray-600">vs. {opponent?.username || "Opponent"}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Time Left</div>
          <div className="text-xl font-bold text-red-600">{formatTime(timeLeft)}</div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="text-center">
          <p className="text-sm text-gray-600">You</p>
          <p className="text-3xl font-bold">{isPlayer1 ? score.player1 : score.player2}</p>
        </div>
        <div className="px-4 py-2 bg-gray-100 rounded-full text-sm">Round {roundNumber}</div>
        <div className="text-center">
          <p className="text-sm text-gray-600">{opponent?.username || "Opponent"}</p>
          <p className="text-3xl font-bold">{isPlayer1 ? score.player2 : score.player1}</p>
        </div>
      </div>

      <div className="mb-8 p-8 bg-blue-50 rounded-lg flex items-center justify-center">
        <div className="text-4xl font-bold text-blue-800">{currentRound?.question || "Loading..."}</div>
      </div>

      <form onSubmit={handleAnswerSubmit} className="flex gap-2">
        <Input
          ref={answerInputRef}
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter your answer"
          className="text-lg"
          autoComplete="off"
        />
        <Button type="submit">Submit</Button>
      </form>
    </div>
  )
}
