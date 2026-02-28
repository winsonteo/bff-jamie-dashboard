import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// Token-protected ingestion endpoint.
// Caller sets header: Authorization: Bearer <INGEST_TOKEN>
http.route({
  path: "/ingest/kpi",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const auth = req.headers.get("authorization") || "";
    const expected = process.env.INGEST_TOKEN;
    if (!expected) {
      return new Response("INGEST_TOKEN not configured", { status: 500 });
    }
    if (auth !== `Bearer ${expected}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const id = await ctx.runMutation(api.kpis.upsert, body);
    return Response.json({ ok: true, id });
  }),
});

export default http;
