import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new player (Internal use mostly, as join game handles this)
export const create = mutation({
  args: {
    gameId: v.id("games"),
    name: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const playerId = await ctx.db.insert("players", {
      gameId: args.gameId,
      name: args.name,
      sessionId: args.sessionId,
      isAlive: true,
      isHost: false,
    });
    return playerId;
  },
});

// Get all players in a game
export const getByGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();
    return players;
  },
});

// Eliminate a player
export const eliminate = mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.playerId, { isAlive: false });
  },
});
