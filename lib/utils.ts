import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate a random math problem
export function generateMathProblem(difficulty: "easy" | "medium" | "hard" = "medium"): {
  question: string
  answer: string
} {
  let num1: number, num2: number, operation: string, answer: number

  switch (difficulty) {
    case "easy":
      num1 = Math.floor(Math.random() * 10) + 1
      num2 = Math.floor(Math.random() * 10) + 1
      operation = ["+", "-", "*"][Math.floor(Math.random() * 3)]
      break
    case "medium":
      num1 = Math.floor(Math.random() * 20) + 1
      num2 = Math.floor(Math.random() * 20) + 1
      operation = ["+", "-", "*"][Math.floor(Math.random() * 3)]
      break
    case "hard":
    default:
      num1 = Math.floor(Math.random() * 50) + 1
      num2 = Math.floor(Math.random() * 30) + 1
      operation = ["+", "-", "*", "/"][Math.floor(Math.random() * 4)]
      // Ensure division results in whole numbers
      if (operation === "/") {
        answer = num2
        num1 = num2 * (Math.floor(Math.random() * 10) + 1)
      }
      break
  }

  switch (operation) {
    case "+":
      answer = num1 + num2
      break
    case "-":
      // Ensure positive result for subtraction
      if (num1 < num2) {
        ;[num1, num2] = [num2, num1]
      }
      answer = num1 - num2
      break
    case "*":
      answer = num1 * num2
      break
    case "/":
      answer = num1 / num2
      break
    default:
      answer = num1 + num2
  }

  return {
    question: `${num1} ${operation} ${num2}`,
    answer: answer.toString(),
  }
}

// Calculate new Elo ratings
export function calculateElo(
  winnerRating: number,
  loserRating: number,
  isDraw = false,
): { winnerNewRating: number; loserNewRating: number } {
  const K = 32 // K-factor

  // Calculate expected scores
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400))
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400))

  let winnerNewRating: number
  let loserNewRating: number

  if (isDraw) {
    // For a draw, both players get 0.5 points
    winnerNewRating = Math.round(winnerRating + K * (0.5 - expectedWinner))
    loserNewRating = Math.round(loserRating + K * (0.5 - expectedLoser))
  } else {
    // Winner gets 1 point, loser gets 0
    winnerNewRating = Math.round(winnerRating + K * (1 - expectedWinner))
    loserNewRating = Math.round(loserRating + K * (0 - expectedLoser))
  }

  return { winnerNewRating, loserNewRating }
}

// Format time in seconds to mm:ss format
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}
