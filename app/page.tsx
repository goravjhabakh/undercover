"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { getSessionId } from "@/lib/session";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");

  const createGame = useMutation(api.games.create);
  const joinGame = useMutation(api.games.join);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionId(getSessionId());
    // Restore name if saved
    const savedName = localStorage.getItem("undercover_player_name");
    if (savedName) setName(savedName);
  }, []);

  const handleCreateGame = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name first");
      return;
    }

    setIsLoading(true);
    try {
      localStorage.setItem("undercover_player_name", name);
      const { gameId, code } = await createGame({
        hostName: name,
        hostSessionId: sessionId,
      });
      router.push(`/game/${gameId}/lobby`);
      toast.success("Game created!", { description: `Room Code: ${code}` });
    } catch (error) {
      toast.error("Failed to create game");
      console.error(error);
      setIsLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name first");
      return;
    }
    if (!roomCode.trim() || roomCode.length !== 6) {
      toast.error("Please enter a valid 6-character room code");
      return;
    }

    setIsLoading(true);
    try {
      localStorage.setItem("undercover_player_name", name);
      const result = await joinGame({
        code: roomCode,
        playerName: name,
        sessionId: sessionId,
      });
      router.push(`/game/${result.gameId}/lobby`);
      toast.success("Joined game successfully!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to join game";
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <h1 className="text-6xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-linear-to-r from-pink-500 via-red-500 to-yellow-500 drop-shadow-lg">
            UNDERCOVER
          </h1>
          <p className="text-slate-300 font-medium">
            Find the spy before it&apos;s too late.
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-950/50 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl text-white">Get Started</CardTitle>
            <CardDescription className="text-slate-400">
              Enter your name to play
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-slate-200"
              >
                Your Name
              </label>
              <Input
                id="name"
                placeholder="Enter your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-purple-500"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-950 px-2 text-slate-500">Or</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={handleCreateGame}
                disabled={isLoading}
                className="w-full bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-6 shadow-lg shadow-purple-900/20"
              >
                Create Game
              </Button>
              <div className="space-y-2">
                <Input
                  placeholder="Room Code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="bg-slate-900/50 border-slate-700 text-center uppercase tracking-widest text-white placeholder:text-slate-500 focus-visible:ring-purple-500 font-mono"
                />
                <Button
                  onClick={handleJoinGame}
                  disabled={isLoading || roomCode.length !== 6}
                  variant="secondary"
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  Join Game
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-center pt-2 pb-6">
            <p className="text-xs text-slate-600 text-center">
              By playing, you agree to fulfill your role as a civilian or spy.
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
