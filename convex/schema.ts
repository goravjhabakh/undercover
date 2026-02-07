import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Game rooms
  games: defineTable({
    code: v.string(), // 6-char room code
    hostId: v.string(), // Host player session ID
    status: v.union(
      v.literal("lobby"),
      v.literal("playing"),
      v.literal("voting"),
      v.literal("finished")
    ),
    civilianWord: v.optional(v.string()),
    undercoverWord: v.optional(v.string()),
    currentRound: v.number(),
    settings: v.object({
      minPlayers: v.number(),
      maxPlayers: v.number(),
      undercoverCount: v.number(),
      descriptionTime: v.number(), // seconds
      votingTime: v.number(), // seconds
    }),
    winner: v.optional(v.union(v.literal("civilian"), v.literal("undercover"))),
  }).index("by_code", ["code"]),

  // Players in games
  players: defineTable({
    gameId: v.id("games"),
    name: v.string(),
    sessionId: v.string(), // Browser session identifier
    role: v.optional(v.union(v.literal("civilian"), v.literal("undercover"))),
    isAlive: v.boolean(),
    isHost: v.boolean(),
  })
    .index("by_game", ["gameId"])
    .index("by_session", ["sessionId"])
    .index("by_game_and_session", ["gameId", "sessionId"]),

  // Rounds within games
  rounds: defineTable({
    gameId: v.id("games"),
    roundNumber: v.number(),
    status: v.union(
      v.literal("describing"),
      v.literal("voting"),
      v.literal("completed")
    ),
    descriptions: v.array(
      v.object({
        playerId: v.id("players"),
        text: v.string(),
      })
    ),
    votes: v.array(
      v.object({
        voterId: v.id("players"),
        targetId: v.id("players"),
      })
    ),
    eliminatedPlayerId: v.optional(v.id("players")),
  }).index("by_game", ["gameId"]),

  // Word pairs for the game
  wordPairs: defineTable({
    civilianWord: v.string(),
    undercoverWord: v.string(),
    category: v.string(),
  }).index("by_category", ["category"]),
});
