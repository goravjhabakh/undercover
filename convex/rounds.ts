/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Start a new round
export const start = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    // Check if game exists and is active
    const game = await ctx.db.get(args.gameId);
    if (!game || game.status !== "playing") {
      throw new Error("Game not active");
    }

    // Create a new round
    const nextRoundNumber = game.currentRound + 1;
    await ctx.db.patch(args.gameId, { currentRound: nextRoundNumber });

    const roundId = await ctx.db.insert("rounds", {
      gameId: args.gameId,
      roundNumber: nextRoundNumber,
      status: "describing",
      descriptions: [],
      votes: [],
    });

    return roundId;
  },
});

// Submit a description
export const submitDescription = mutation({
  args: {
    gameId: v.id("games"),
    roundNumber: v.number(),
    playerId: v.id("players"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the current round
    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .filter((q) => q.eq(q.field("roundNumber"), args.roundNumber))
      .collect();

    const currentRound = rounds[0];

    if (!currentRound) {
      throw new Error("Round not found");
    }

    if (currentRound.status !== "describing") {
      throw new Error("Round is not in describing phase");
    }

    // Check if player already described
    const existingDesc = currentRound.descriptions.find(
      (d) => d.playerId === args.playerId
    );
    if (existingDesc) {
      throw new Error("Player already submitted description");
    }

    // Add description
    const newDescriptions = [...currentRound.descriptions, { 
      playerId: args.playerId, 
      text: args.text 
    }];

    await ctx.db.patch(currentRound._id, { descriptions: newDescriptions });

    // Check if all alive players have described
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .filter((q) => q.eq(q.field("isAlive"), true))
      .collect();

    if (newDescriptions.length === players.length) {
      // Advance to voting phase automatically
      await ctx.db.patch(currentRound._id, { status: "voting" });
    }
  },
});

// Submit a vote
export const vote = mutation({
  args: {
    gameId: v.id("games"),
    roundNumber: v.number(),
    voterId: v.id("players"),
    targetId: v.id("players"),
  },
  handler: async (ctx, args) => {
    // Get the current round
    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .filter((q) => q.eq(q.field("roundNumber"), args.roundNumber))
      .collect();

    const currentRound = rounds[0];

    if (!currentRound || currentRound.status !== "voting") {
      throw new Error("Voting is not active");
    }

    // Check if player already voted
    const existingVote = currentRound.votes.find(
      (v) => v.voterId === args.voterId
    );
    
    // If multiple votes allowed (changing vote), remove old one, otherwise throw error
    // For now, let's assume one vote per round, no changing
    if (existingVote) {
       throw new Error("Player already voted");
    }

    // Add vote
    const newVotes = [...currentRound.votes, {
      voterId: args.voterId,
      targetId: args.targetId,
    }];
    
    await ctx.db.patch(currentRound._id, { votes: newVotes });

    // Check if all alive players have voted
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .filter((q) => q.eq(q.field("isAlive"), true))
      .collect();

    // If everyone voted, we could trigger endVoting automatically, 
    // or wait for a manual trigger / timer. Let's return true if all voted.
    return newVotes.length === players.length;
  },
});

// End voting and eliminate player
export const endVoting = mutation({
  args: {
    gameId: v.id("games"),
    roundNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .filter((q) => q.eq(q.field("roundNumber"), args.roundNumber))
      .collect();

    const currentRound = rounds[0];
    if (!currentRound) throw new Error("Round not found");

    // Tally votes
    const voteCounts: Record<string, number> = {};
    currentRound.votes.forEach((vote) => {
      voteCounts[vote.targetId] = (voteCounts[vote.targetId] || 0) + 1;
    });

    // Find player with max votes
    let maxVotes = 0;
    let eliminatedPlayerId: string | null = null;
    let isTie = false;

    // TODO: Handle ties better (e.g., revote or random). For now, simple logic.
    Object.entries(voteCounts).forEach(([playerId, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        eliminatedPlayerId = playerId;
        isTie = false;
      } else if (count === maxVotes) {
        isTie = true;
      }
    });

    if (eliminatedPlayerId && !isTie) {
      await ctx.db.patch(currentRound._id, { 
        status: "completed",
        eliminatedPlayerId: eliminatedPlayerId as any 
      });
      
      // Mark player as eliminated
      await ctx.db.patch(eliminatedPlayerId as any, { isAlive: false });
      
      // Setup for next round
      await ctx.db.patch(args.gameId, { currentRound: args.roundNumber + 1 });
      
      // Create next round immediately? Or wait for "Next Round" click?
      // Let's create it immediately for now to keep flow simple.
      await ctx.db.insert("rounds", {
        gameId: args.gameId,
        roundNumber: args.roundNumber + 1,
        status: "describing",
        descriptions: [],
        votes: [],
      });
      
    } else {
        // If tie or no votes, maybe no one eliminated? Or revote?
        // Simple logic: no one eliminated, next round.
         await ctx.db.patch(currentRound._id, { 
            status: "completed"
          });
          
          await ctx.db.patch(args.gameId, { currentRound: args.roundNumber + 1 });
          
          await ctx.db.insert("rounds", {
            gameId: args.gameId,
            roundNumber: args.roundNumber + 1,
            status: "describing",
            descriptions: [],
            votes: [],
          });
    }
  },
});

// Get current active round
export const getCurrentRound = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) return null;

    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .filter((q) => q.eq(q.field("roundNumber"), game.currentRound))
      .collect();

    return rounds[0] || null;
  },
});
