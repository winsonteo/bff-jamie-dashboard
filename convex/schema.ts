import { defineSchema, defineTable } from "convex/server";
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
  lastInboundTs: v.string(), // ISO
  snippet: v.string(),
});

const kpiBase = {
  title: v.string(),
  kind: v.union(v.literal("daily"), v.literal("weekly")),
  // for daily: date = YYYY-MM-DD. for weekly: YYYY-MM-DD_to_YYYY-MM-DD
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
};

export default defineSchema({
  kpis: defineTable(kpiBase)
    .index("by_kind_key", ["kind", "key"])
    .index("by_kind_generatedAt", ["kind", "generatedAt"]),
});
