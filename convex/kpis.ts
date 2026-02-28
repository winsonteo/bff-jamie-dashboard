import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const buckets = v.object({
  le30m: v.number(),
  m30_60: v.number(),
  h1_3: v.number(),
  gt3h: v.number(),
});

const unansweredItem = v.object({
  peer: v.string(),
  ageHours: v.number(),
  lastInboundTs: v.string(),
  snippet: v.string(),
});

export const upsert = mutation({
  args: {
    title: v.string(),
    kind: v.union(v.literal("daily"), v.literal("weekly")),
    key: v.string(),

    windowStart: v.string(),
    windowEnd: v.string(),
    unansweredAsOf: v.string(),

    dmInbound: v.number(),
    dmOutbound: v.number(),
    peers: v.number(),

    primaryEligible: v.number(),
    primaryReplied: v.number(),
    primaryReplyRate: v.number(),
    primaryMedianMin: v.number(),
    primaryBuckets: buckets,

    highEligible: v.number(),
    highReplied: v.number(),
    highReplyRate: v.number(),
    highMedianMin: v.number(),

    negCount: v.number(),
    urgentCount: v.number(),

    unansweredTop: v.array(unansweredItem),

    generatedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("kpis")
      .withIndex("by_kind_key", (q) => q.eq("kind", args.kind).eq("key", args.key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("kpis", args);
  },
});

export const removeByKindKey = mutation({
  args: { kind: v.union(v.literal("daily"), v.literal("weekly")), key: v.string() },
  handler: async (ctx, { kind, key }) => {
    const existing = await ctx.db
      .query("kpis")
      .withIndex("by_kind_key", (q) => q.eq("kind", kind).eq("key", key))
      .unique();
    if (!existing) return { ok: true, deleted: false };
    await ctx.db.delete(existing._id);
    return { ok: true, deleted: true };
  },
});

export const latest = query({
  args: { kind: v.union(v.literal("daily"), v.literal("weekly")) },
  handler: async (ctx, { kind }) => {
    // Most recent by generatedAt
    return await ctx.db
      .query("kpis")
      .withIndex("by_kind_generatedAt", (q) => q.eq("kind", kind))
      .order("desc")
      .first();
  },
});

export const list = query({
  args: { kind: v.union(v.literal("daily"), v.literal("weekly")), limit: v.optional(v.number()) },
  handler: async (ctx, { kind, limit }) => {
    const lim = Math.min(Math.max(limit ?? 30, 1), 200);
    return await ctx.db
      .query("kpis")
      .withIndex("by_kind_generatedAt", (q) => q.eq("kind", kind))
      .order("desc")
      .take(lim);
  },
});
