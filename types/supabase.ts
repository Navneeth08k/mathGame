export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          elo_rating: number
          games_played: number
          games_won: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          elo_rating?: number
          games_played?: number
          games_won?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          avatar_url?: string | null
          elo_rating?: number
          games_played?: number
          games_won?: number
          created_at?: string
          updated_at?: string
        }
      }
      games: {
        Row: {
          id: string
          status: "waiting" | "in_progress" | "completed" | "abandoned"
          player1_id: string
          player2_id: string | null
          winner_id: string | null
          player1_score: number | null
          player2_score: number | null
          game_duration: number | null
          created_at: string
          updated_at: string
          ended_at: string | null
        }
        Insert: {
          id?: string
          status?: "waiting" | "in_progress" | "completed" | "abandoned"
          player1_id: string
          player2_id?: string | null
          winner_id?: string | null
          player1_score?: number | null
          player2_score?: number | null
          game_duration?: number | null
          created_at?: string
          updated_at?: string
          ended_at?: string | null
        }
        Update: {
          id?: string
          status?: "waiting" | "in_progress" | "completed" | "abandoned"
          player1_id?: string
          player2_id?: string | null
          winner_id?: string | null
          player1_score?: number | null
          player2_score?: number | null
          game_duration?: number | null
          created_at?: string
          updated_at?: string
          ended_at?: string | null
        }
      }
      game_rounds: {
        Row: {
          id: string
          game_id: string
          question: string
          correct_answer: string
          player1_answer: string | null
          player2_answer: string | null
          player1_time_taken: number | null
          player2_time_taken: number | null
          round_number: number
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          question: string
          correct_answer: string
          player1_answer?: string | null
          player2_answer?: string | null
          player1_time_taken?: number | null
          player2_time_taken?: number | null
          round_number: number
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          question?: string
          correct_answer?: string
          player1_answer?: string | null
          player2_answer?: string | null
          player1_time_taken?: number | null
          player2_time_taken?: number | null
          round_number?: number
          created_at?: string
        }
      }
      elo_history: {
        Row: {
          id: string
          user_id: string
          game_id: string
          old_rating: number
          new_rating: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          game_id: string
          old_rating: number
          new_rating: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          game_id?: string
          old_rating?: number
          new_rating?: number
          created_at?: string
        }
      }
    }
  }
}
