import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const INITIAL_PAIRS = [
  { civilianWord: "Coffee", undercoverWord: "Tea", category: "Food" },
  { civilianWord: "Car", undercoverWord: "Motorcycle", category: "Transport" },
  { civilianWord: "Beach", undercoverWord: "Pool", category: "Place" },
  { civilianWord: "Dog", undercoverWord: "Wolf", category: "Animal" },
  { civilianWord: "Sun", undercoverWord: "Moon", category: "Nature" },
  { civilianWord: "Apple", undercoverWord: "Orange", category: "Fruit" },
  { civilianWord: "Pen", undercoverWord: "Pencil", category: "Stationery" },
  { civilianWord: "Ship", undercoverWord: "Boat", category: "Transport" },
  { civilianWord: "Computer", undercoverWord: "Laptop", category: "Tech" },
  { civilianWord: "School", undercoverWord: "University", category: "Place" }
];

// Get all word pairs
export const getAll = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("wordPairs").collect();
    },
});

// Get a random word pair
export const getRandom = query({
  args: {},
  handler: async (ctx) => {
    const wordPairs = await ctx.db.query("wordPairs").collect();
    if (wordPairs.length === 0) {
      return null;
    }
    return wordPairs[Math.floor(Math.random() * wordPairs.length)];
  },
});

// Seed the database with initial word pairs (only if empty)
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existingPairs = await ctx.db.query("wordPairs").first();
    if (existingPairs) {
      return "Database already seeded";
    }

    for (const pair of INITIAL_PAIRS) {
      await ctx.db.insert("wordPairs", pair);
    }

    return "Seeded successfully";
  },
});

// Add a single word pair (admin/dev)
export const addPair = mutation({
  args: {
    civilianWord: v.string(),
    undercoverWord: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("wordPairs", args);
  },
});
