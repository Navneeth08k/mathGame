// lib/matchmaking.ts
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface QueueEntry {
  userId: string;
  joinedAt: string;
  elo?: number;
}

export class MatchmakingQueue {
  private channel: RealtimeChannel | null = null;
  private hasMatch = false;          // ← only broadcast once
  private lastCheckTime = 0;
  
  constructor(
    private userId: string,
    private onMatch: (gameId: string) => void,
    private onQueueUpdate: (size: number) => void
  ) {}

  async join() {
    console.log("[Matchmaking] join() called for", this.userId);
    const supabase = getSupabaseBrowserClient();

    // get this user's Elo
    const { data: profile } = await supabase
      .from("profiles")
      .select("elo_rating")
      .eq("id", this.userId)
      .single();

    // presence‐enabled channel
    this.channel = supabase
      .channel("matchmaking", {
        config: { presence: { key: this.userId } },
      })
      .on("presence", { event: "sync" }, () => {
        const state = this.channel!.presenceState();
        const queueSize = Object.keys(state).length;
        console.log("[Matchmaking] Presence sync:", state, queueSize);
        this.onQueueUpdate(queueSize);

        if (queueSize >= 2) {
          this.findMatch(state);
        }
      })
      .on("broadcast", { event: "match_found" }, (msg) => {
        console.log("[Matchmaking] received match_found broadcast:", msg);
        const { gameId, player1Id, player2Id } = msg.payload;
        if (player1Id === this.userId || player2Id === this.userId) {
          this.onMatch(gameId);
          this.leave();
        }
      })
      .subscribe(async (status) => {
        console.log("[Matchmaking] subscribe status:", status);
        if (status === "SUBSCRIBED") {
          console.log("[Matchmaking] tracking presence for", this.userId);
          await this.channel!.track({
            userId: this.userId,
            joinedAt: new Date().toISOString(),
            elo: profile?.elo_rating ?? 1000,
          });
          this.startPolling();
        }
      });
  }

  leave() {
    console.log("[Matchmaking] leave() called");
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    this.hasMatch = true; // prevent further findMatch calls
  }

  private startPolling() {
    // fallback every 2s
    setInterval(() => {
      if (!this.channel || this.hasMatch) return;
      const state = this.channel.presenceState();
      if (Object.keys(state).length >= 2) {
        this.findMatch(state);
      }
    }, 2000);
  }

  private async findMatch(state: Record<string, any>) {
    if (this.hasMatch) return;
    const now = Date.now();
    if (now - this.lastCheckTime < 1000) return;
    this.lastCheckTime = now;
  
    console.log("[Matchmaking] findMatch triggered", state);
  
    // 1) build & sort entries
    const entries: QueueEntry[] = Object.values(state)
      .filter(Array.isArray)
      .map((arr: any[]) => arr[0]);
    console.log("[Matchmaking] entries:", entries.map(e => e.userId));
    if (entries.length < 2) return;
  
    entries.sort(
      (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
    );
  
    const me = entries[0];
    if (me.userId !== this.userId) {
      console.log("[Matchmaking] skipping, not earliest:", this.userId);
      return;
    }
    console.log("[Matchmaking] I am earliest:", this.userId);
  
    // 2) pick closest‐Elo opponent
    const opponent = entries
      .slice(1)
      .sort(
        (a, b) =>
          Math.abs((a.elo ?? 1000) - (me.elo ?? 1000)) -
          Math.abs((b.elo ?? 1000) - (me.elo ?? 1000))
      )[0];
    console.log("[Matchmaking] opponent:", opponent.userId);
  
    const supabase = getSupabaseBrowserClient();
  
    // 3) clear stale waiting games
    await supabase
      .from("games")
      .delete()
      .or(
        `and(player1_id.eq.${me.userId},player2_id.eq.${opponent.userId}),and(player1_id.eq.${opponent.userId},player2_id.eq.${me.userId})`
      )
      .eq("status", "waiting");
    console.log("[Matchmaking] cleared old waiting games");
  
    // 4) create new game
    const { data: game, error: createErr } = await supabase
      .from("games")
      .insert({
        player1_id: me.userId,
        player2_id: opponent.userId,
        status: "waiting",
      })
      .select()
      .single();
    if (createErr || !game) {
      console.error("[Matchmaking] error creating game:", createErr);
      return;
    }
    console.log("[Matchmaking] game created:", game.id);
  
    // 5) broadcast to both
    this.hasMatch = true;
    this.channel?.send({
      type: "broadcast",
      event: "match_found",
      payload: { gameId: game.id, player1Id: me.userId, player2Id: opponent.userId },
    });
    console.log("[Matchmaking] broadcast sent:", game.id);
  
    // 6) manually redirect the initiator
    console.log("[Matchmaking] redirecting self to game:", game.id);
    this.onMatch(game.id);
    this.leave();
  }
  
  
  
}
