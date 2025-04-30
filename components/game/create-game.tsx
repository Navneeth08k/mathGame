"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

interface CreateGameProps {
  userId: string
}

export function CreateGame({ userId }: CreateGameProps) {
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const handleCreateGame = async () => {
    setIsCreating(true)

    try {
      const { data: game, error } = await supabase
        .from("games")
        .insert({
          player1_id: userId,
          status: "waiting",
        })
        .select()
        .single()

      if (error) throw error

      router.push(`/game/${game.id}`)
    } catch (error) {
      console.error("Error creating game:", error)
      setIsCreating(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Challenge a Friend</h2>
      <p className="text-gray-600 mb-6">Create a game and share the link with a friend</p>
      <Button size="lg" onClick={handleCreateGame} disabled={isCreating}>
        {isCreating ? "Creating..." : "Create Game"}
      </Button>
    </div>
  )
}
