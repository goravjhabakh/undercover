"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { getSessionId } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

export default function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [hasRevealed, setHasRevealed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionId(getSessionId());
  }, []);

  const gameIdTyped = gameId as Id<"games">;

  const game = useQuery(api.games.get, { gameId: gameIdTyped });
  const players = useQuery(api.players.getByGame, { gameId: gameIdTyped });
  const currentRound = useQuery(api.rounds.getCurrentRound, {
    gameId: gameIdTyped,
  });

  // Redirect to lobby if game hasn't started
  useEffect(() => {
    if (game && game.status === "lobby") {
      router.push(`/game/${gameId}/lobby`);
    }
  }, [game, gameId, router]);

  if (game === undefined || players === undefined) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-white">
        Loading...
      </div>
    );
  }

  if (!game) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-white">
        Game not found
      </div>
    );
  }

  const myPlayer = players.find((p) => p.sessionId === sessionId);

  if (!myPlayer) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-white">
        You are not in this game
      </div>
    );
  }

  const copyRoomCode = () => {
    navigator.clipboard.writeText(game.code);
    toast.success("Copied!");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Bar */}
      <header className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-xl bg-clip-text text-transparent bg-linear-to-r from-purple-400 to-pink-400">
            Undercover
          </h1>
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded text-sm text-slate-300">
            <span className="font-mono">{game.code}</span>
            <Copy
              className="h-3 w-3 cursor-pointer hover:text-white"
              onClick={copyRoomCode}
            />
          </div>
        </div>
        <div>
          <span className="text-sm text-slate-400">
            Round {game.currentRound}
          </span>
        </div>
      </header>

      {/* Main Game Area */}
      <div className="flex-1 p-4 md:p-8 flex flex-col items-center">
        {/* Game Status debug (Temporary until Phase 4 components) */}
        <div className="w-full max-w-2xl space-y-4">
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
            <h2 className="text-lg font-semibold mb-2">
              Game Status: {game.status}
            </h2>
            {game.status === "playing" && (
              <div className="space-y-2">
                <p>
                  My Role:{" "}
                  <span className="font-bold text-purple-400">
                    {hasRevealed ? myPlayer.role : "???"}
                  </span>
                </p>
                {!hasRevealed && (
                  <Button
                    onClick={() => setHasRevealed(true)}
                    variant="secondary"
                  >
                    Reveal Role
                  </Button>
                )}
                {hasRevealed && (
                  <p>
                    My Word:{" "}
                    <span className="font-bold text-yellow-400">
                      {myPlayer.role === "civilian"
                        ? game.civilianWord
                        : game.undercoverWord}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Round Info */}
          {currentRound && (
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
              <h3 className="text-md font-semibold mb-2">
                Current Round: {currentRound.roundNumber}
              </h3>
              <p>Status: {currentRound.status}</p>

              <div className="mt-4">
                <h4 className="text-sm font-medium text-slate-400 mb-2">
                  Descriptions:
                </h4>
                <ul className="space-y-1">
                  {currentRound.descriptions.map((d, i) => {
                    const p = players.find((pl) => pl._id === d.playerId);
                    return (
                      <li key={i} className="text-sm">
                        <span className="font-bold text-slate-300">
                          {p?.name}:
                        </span>{" "}
                        {d.text}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
