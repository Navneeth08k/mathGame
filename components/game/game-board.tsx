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
  const [playerAnswered, setPlayerAnswered] = useState(false)
  const [opponentAnswered, setOpponentAnswered] = useState(false)
  const [opponentAnswer, setOpponentAnswer] = useState<string | null>(null)

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
      .on("broadcast", { event: "player_answer" }, (payload) => {
        // Handle opponent's answer
        if (payload.payload.playerId !== userId) {
          setOpponentAnswered(true)
          setOpponentAnswer(payload.payload.answer)

          // Update opponent's score if answer is correct
          if (payload.payload.isCorrect) {
            const newScore = { ...score }
            if (isPlayer1) {
              newScore.player2 += 1
            } else {
              newScore.player1 += 1
            }
            setScore(newScore)
          }
        }
      })
      .on("broadcast", { event: "new_round" }, (payload) => {
        // Reset state for new round
        setPlayerAnswered(false)
        setOpponentAnswered(false)
        setOpponentAnswer(null)
        setAnswer("")

        if (payload.payload.round) {
          setCurrentRound(payload.payload.round)
          setRoundNumber(payload.payload.roundNumber)
          setStartTime(Date.now())
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
    if (gameStatus === "in_progress" && answerInputRef.current && !playerAnswered) {
      answerInputRef.current.focus()
    }
  }, [currentRound, gameStatus, playerAnswered])

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
          setStartTime(Date.now())

          // Check if player has already answered this round
          if (isPlayer1 && roundData.player1_answer) {
            setPlayerAnswered(true)
            setAnswer(roundData.player1_answer)
          } else if (!isPlayer1 && roundData.player2_answer) {
            setPlayerAnswered(true)
            setAnswer(roundData.player2_answer)
          }

          // Check if opponent has already answered this round
          if (isPlayer1 && roundData.player2_answer) {
            setOpponentAnswered(true)
            setOpponentAnswer(roundData.player2_answer)
          } else if (!isPlayer1 && roundData.player1_answer) {
            setOpponentAnswered(true)
            setOpponentAnswer(roundData.player1_answer)
          }
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

      // Reset player state for new round
      setPlayerAnswered(false)
      setOpponentAnswered(false)
      setOpponentAnswer(null)
      setAnswer("")

      setCurrentRound(roundData)
      setStartTime(Date.now())

      // Broadcast new round to all players
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "new_round",
          payload: { round: roundData, roundNumber },
        })
      }
    } catch (error) {
      console.error("Error creating new round:", error)
    }
  }

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentRound || !startTime || playerAnswered) return

    const timeTaken = (Date.now() - startTime) / 1000
    const isCorrect = answer === currentRound.correct_answer

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

      // Mark player as answered
      setPlayerAnswered(true)

      // Update score if answer is correct
      if (isCorrect) {
        const newScore = { ...score }
        if (isPlayer1) {
          newScore.player1 += 1
        } else {
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
      }

      // Broadcast player's answer to opponent
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "player_answer",
          payload: {
            playerId: userId,
            answer,
            isCorrect,
            timeTaken,
          },
        })
      }

      // If both players have answered, create a new round
      if (
        opponentAnswered ||
        (isPlayer1 && updatedRound.player2_answer) ||
        (!isPlayer1 && updatedRound.player1_answer)
      ) {
        // Wait a short delay to show the result
        setTimeout(() => {
          setRoundNumber(roundNumber + 1)
          createNewRound()
        }, 1000)
      }
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
      <div className="flex flex-col items-center justify-center h-96 p-6 bg-card rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Waiting for opponent...</h2>
        <p className="text-muted-foreground mb-6">Share this game link with a friend to start playing</p>
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
      <div className="flex flex-col items-center justify-center h-96 p-6 bg-card rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">{message}</h2>
        <div className="text-6xl font-bold text-primary">{countdown}</div>
      </div>
    )
  }

  if (gameStatus === "completed") {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-6 bg-card rounded-lg shadow-md">
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
    <div className="p-6 bg-card rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">Math Battle</h2>
          <p className="text-sm text-muted-foreground">vs. {opponent?.username || "Opponent"}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Time Left</div>
          <div className="text-xl font-bold text-destructive">{formatTime(timeLeft)}</div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">You</p>
          <p className="text-3xl font-bold">{isPlayer1 ? score.player1 : score.player2}</p>
        </div>
        <div className="px-4 py-2 bg-muted rounded-full text-sm">Round {roundNumber}</div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{opponent?.username || "Opponent"}</p>
          <p className="text-3xl font-bold">{isPlayer1 ? score.player2 : score.player1}</p>
        </div>
      </div>

      <div className="mb-8 p-8 bg-accent rounded-lg flex items-center justify-center">
        <div className="text-4xl font-bold text-accent-foreground">{currentRound?.question || "Loading..."}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">Your Answer</p>
          {playerAnswered ? (
            <div
              className={`text-xl font-bold ${answer === currentRound?.correct_answer ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
            >
              {answer} {answer === currentRound?.correct_answer ? "✓" : "✗"}
            </div>
          ) : (
            <form onSubmit={handleAnswerSubmit} className="flex gap-2">
              <Input
                ref={answerInputRef}
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Enter your answer"
                className="text-lg"
                autoComplete="off"
                disabled={playerAnswered}
              />
              <Button type="submit" disabled={playerAnswered}>
                Submit
              </Button>
            </form>
          )}
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">{opponent?.username || "Opponent"}'s Answer</p>
          {opponentAnswered ? (
            <div
              className={`text-xl font-bold ${opponentAnswer === currentRound?.correct_answer ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
            >
              {opponentAnswer} {opponentAnswer === currentRound?.correct_answer ? "✓" : "✗"}
            </div>
          ) : (
            <div className="text-muted-foreground italic">Waiting for opponent...</div>
          )}
        </div>
      </div>

      {currentRound && (playerAnswered || opponentAnswered) && (
        <div className="text-center p-2 bg-muted rounded-lg">
          <p className="text-sm">
            Correct answer: <span className="font-bold">{currentRound.correct_answer}</span>
          </p>
        </div>
      )}
    </div>
  )
}
