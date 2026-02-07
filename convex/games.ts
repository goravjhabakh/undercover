import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate a random 6-character room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars: I, O, 0, 1
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new game room
export const create = mutation({
  args: {
    hostSessionId: v.string(),
    hostName: v.string(),
  },
  handler: async (ctx, args) => {
    // Generate unique room code
    let code = generateRoomCode();
    let existingGame = await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    // Regenerate if code already exists
    while (existingGame) {
      code = generateRoomCode();
      existingGame = await ctx.db
        .query("games")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
    }

    // Create the game
    const gameId = await ctx.db.insert("games", {
      code,
      hostId: args.hostSessionId,
      status: "lobby",
      currentRound: 0,
      settings: {
        minPlayers: 4,
        maxPlayers: 12,
        undercoverCount: 1,
        descriptionTime: 60,
        votingTime: 30,
      },
    });

    // Create the host player
    await ctx.db.insert("players", {
      gameId,
      name: args.hostName,
      sessionId: args.hostSessionId,
      isAlive: true,
      isHost: true,
    });

    return { gameId, code };
  },
});

// Get game by ID
export const get = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.gameId);
  },
});

// Get game by room code
export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();
    return game;
  },
});

// Join an existing game
export const join = mutation({
  args: {
    code: v.string(),
    playerName: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the game
    const game = await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!game) {
      throw new Error("Game not found");
    }

    if (game.status !== "lobby") {
      throw new Error("Game has already started");
    }

    // Check if player already in game
    const existingPlayer = await ctx.db
      .query("players")
      .withIndex("by_game_and_session", (q) =>
        q.eq("gameId", game._id).eq("sessionId", args.sessionId)
      )
      .first();

    if (existingPlayer) {
      return { gameId: game._id, playerId: existingPlayer._id };
    }

    // Check player count
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", game._id))
      .collect();

    if (players.length >= game.settings.maxPlayers) {
      throw new Error("Game is full");
    }

    // Create new player
    const playerId = await ctx.db.insert("players", {
      gameId: game._id,
      name: args.playerName,
      sessionId: args.sessionId,
      isAlive: true,
      isHost: false,
    });

    return { gameId: game._id, playerId };
  },
});

// Start the game (host only)
export const start = mutation({
  args: {
    gameId: v.id("games"),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    if (game.hostId !== args.sessionId) {
      throw new Error("Only the host can start the game");
    }

    if (game.status !== "lobby") {
      throw new Error("Game has already started");
    }

    // Get all players
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    if (players.length < game.settings.minPlayers) {
      throw new Error(
        `Need at least ${game.settings.minPlayers} players to start`
      );
    }

    // Get a random word pair
    const wordPairs = await ctx.db.query("wordPairs").collect();
    if (wordPairs.length === 0) {
      throw new Error("No word pairs available. Please seed the database.");
    }
    const randomPair = wordPairs[Math.floor(Math.random() * wordPairs.length)];

    // Assign roles randomly
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const undercoverCount = Math.min(
      game.settings.undercoverCount,
      Math.floor(players.length / 3) // Max 1/3 can be undercover
    );

    for (let i = 0; i < shuffledPlayers.length; i++) {
      const role = i < undercoverCount ? "undercover" : "civilian";
      await ctx.db.patch(shuffledPlayers[i]._id, { role });
    }

    // Update game with words and status
    await ctx.db.patch(args.gameId, {
      status: "playing",
      civilianWord: randomPair.civilianWord,
      undercoverWord: randomPair.undercoverWord,
      currentRound: 1,
    });

    // Create first round
    await ctx.db.insert("rounds", {
      gameId: args.gameId,
      roundNumber: 1,
      status: "describing",
      descriptions: [],
      votes: [],
    });

    return { success: true };
  },
});

// Update game settings (host only)
export const updateSettings = mutation({
  args: {
    gameId: v.id("games"),
    sessionId: v.string(),
    settings: v.object({
      minPlayers: v.optional(v.number()),
      maxPlayers: v.optional(v.number()),
      undercoverCount: v.optional(v.number()),
      descriptionTime: v.optional(v.number()),
      votingTime: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    if (game.hostId !== args.sessionId) {
      throw new Error("Only the host can update settings");
    }

    if (game.status !== "lobby") {
      throw new Error("Cannot change settings after game has started");
    }

    const newSettings = {
      ...game.settings,
      ...args.settings,
    };

    await ctx.db.patch(args.gameId, { settings: newSettings });
    return { success: true };
  },
});
