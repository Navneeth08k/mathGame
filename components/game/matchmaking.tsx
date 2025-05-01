"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Users } from "lucide-react";
import { MatchmakingQueue } from "@/lib/matchmaking";
import { Progress } from "@/components/ui/progress";

interface MatchmakingProps {
  userId: string;
}

export function Matchmaking({ userId }: MatchmakingProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [queueSize, setQueueSize] = useState(0);
  const [matchFound, setMatchFound] = useState(false);
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log("[Matchmaking] useEffect", { isSearching, userId });
    if (!isSearching) return;

    // 1) Start the on-screen timer
    timerRef.current = setInterval(() => {
      setSearchTime((t) => t + 1);
    }, 1000);

    // 2) Instantiate & join
    console.log("[Matchmaking] launching queue.join()", userId);
    const queue = new MatchmakingQueue(
      userId,
      (gameId) => {
        console.log("[Client] matched with game:", gameId);
        setMatchFound(true);
        setTimeout(() => {
          router.push(`/game/${gameId}`);
        }, 1500);
      },
      (size) => {
        console.log("[Client] queue size:", size);
        setQueueSize(size);
      }
    );
    queue.join();


    // 3) Cleanup the *exact* queue instance + timer
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      queue.leave();
      setSearchTime(0);
      setQueueSize(0);
    };
  }, [isSearching, userId, router]);

  const cancelSearch = () => {
    setIsSearching(false);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-card rounded-lg shadow-md">
      <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mb-4">
        <Users className="h-6 w-6 text-accent-foreground" />
      </div>
      <h2 className="text-2xl font-bold mb-6">Quick Match</h2>

      {isSearching ? (
        matchFound ? (
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="text-lg font-bold text-primary">Match found!</div>
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <div className="text-sm text-muted-foreground">
              Redirecting to game…
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-lg">
                Finding opponent… {formatTime(searchTime)}
              </span>
            </div>
            <Progress
              value={Math.min(searchTime * 2, 100)}
              className="w-full mb-4 h-2"
            />
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
        )
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
  );
}
