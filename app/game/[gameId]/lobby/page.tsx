"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Users, Play, Crown, Settings } from "lucide-react";
import { getSessionId } from "@/lib/session";

export default function LobbyPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionId(getSessionId());
  }, []);

  // Convex hooks need the ID, valid format.
  // gameId from params is string, we need to hope it's valid ID or handle error.
  // Convex IDs are strings at runtime but typed. using `as any` or generic ID type helps if strict.
  // api.games.get expects `v.id("games")`.

  const gameIdTyped = gameId as Id<"games">;

  const game = useQuery(api.games.get, { gameId: gameIdTyped });
  const players = useQuery(api.players.getByGame, { gameId: gameIdTyped });

  const startGame = useMutation(api.games.start);

  // Redirect if game started
  useEffect(() => {
    if (game && game.status !== "lobby") {
      router.push(`/game/${gameId}`);
    }
  }, [game, gameId, router]);

  const handleStartGame = async () => {
    try {
      await startGame({ gameId: gameIdTyped, sessionId });
      toast.success("Game starting!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to start game";
      toast.error(errorMessage);
    }
  };

  const copyRoomCode = () => {
    if (game?.code) {
      navigator.clipboard.writeText(game.code);
      toast.success("Room code copied!");
    }
  };

  if (game === undefined || players === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-slate-800"></div>
          <div className="h-4 w-32 bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (game === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Game not found</h1>
          <Button
            onClick={() => router.push("/")}
            variant="link"
            className="text-purple-400"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const isHost = game.hostId === sessionId;
  const canStart = players.length >= game.settings.minPlayers;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/50 p-6 rounded-xl border border-slate-800 backdrop-blur-sm">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-purple-400 to-pink-400">
              Lobby
            </h1>
            <p className="text-slate-400 text-sm">
              Waiting for players to join...
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
            <span className="text-sm text-slate-400 uppercase tracking-wider font-semibold">
              Code:
            </span>
            <span className="text-2xl font-mono tracking-widest text-purple-300 font-bold">
              {game.code}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-slate-400 hover:text-white"
              onClick={copyRoomCode}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Players List */}
          <Card className="md:col-span-2 border-slate-800 bg-slate-900/30">
            <CardHeader>
              <CardTitle className="flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-400" />
                  Players
                </div>
                <Badge
                  variant="secondary"
                  className="bg-slate-800 text-slate-300"
                >
                  {players.length} / {game.settings.maxPlayers}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {players.map((player) => (
                  <div
                    key={player._id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-slate-950/50 border border-slate-800/50"
                  >
                    <Avatar className="h-10 w-10 border border-slate-700">
                      <AvatarFallback className="bg-slate-800 text-slate-300">
                        {player.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate text-slate-200">
                          {player.name}
                        </span>
                        {player.isHost && (
                          <Crown className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        )}
                        {player.sessionId === sessionId && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1 py-0 h-4 border-slate-600 text-slate-500"
                          >
                            YOU
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {Array.from({
                  length: Math.max(
                    0,
                    game.settings.minPlayers - players.length,
                  ),
                }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center gap-3 p-2 rounded-lg border border-dashed border-slate-800 opacity-50"
                  >
                    <div className="h-10 w-10 rounded-full bg-slate-900"></div>
                    <span className="text-slate-600 italic text-sm">
                      Waiting...
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Game Settings & Actions */}
          <div className="space-y-6">
            <Card className="border-slate-800 bg-slate-900/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white text-lg">
                  <Settings className="h-4 w-4 text-slate-400" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span>Undercovers:</span>
                  <span className="font-mono text-white">
                    {game.settings.undercoverCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Description Time:</span>
                  <span className="font-mono text-white">
                    {game.settings.descriptionTime}s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Voting Time:</span>
                  <span className="font-mono text-white">
                    {game.settings.votingTime}s
                  </span>
                </div>
                <div className="pt-2 text-xs text-slate-500 text-center">
                  {isHost
                    ? "Settings can be adjusted (Coming Soon)"
                    : "Only host can change settings"}
                </div>
              </CardContent>
            </Card>

            {isHost ? (
              <Button
                onClick={handleStartGame}
                disabled={!canStart}
                className="w-full h-14 text-lg font-bold bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-emerald-900/20"
              >
                <Play className="mr-2 h-5 w-5" />
                Start Game
              </Button>
            ) : (
              <div className="bg-slate-900/50 rounded-xl p-4 text-center border border-slate-800">
                <p className="text-slate-400 text-sm animate-pulse">
                  Waiting for host to start...
                </p>
              </div>
            )}

            <Button
              variant="ghost"
              className="w-full text-slate-500 hover:text-red-400 hover:bg-red-950/30"
              onClick={() => router.push("/")}
            >
              Leave Lobby
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
