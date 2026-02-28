"use client";

import { ConvexProvider, ConvexReactClient, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function fmtPct(x?: number) {
  if (x === undefined || x === null || Number.isNaN(x)) return "—";
  return `${x.toFixed(1)}%`;
}

function fmtMin(x?: number) {
  if (x === undefined || x === null || Number.isNaN(x)) return "—";
  return `${x.toFixed(1)}m`;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

function KpiView({ kind }: { kind: "daily" | "weekly" }) {
  const kpi = useQuery(api.kpis.latest, { kind });

  if (kpi === undefined) return <div>Loading…</div>;
  if (kpi === null) return <div>No data yet.</div>;

  const rr = kpi.primaryReplyRate;
  const rrColor = rr >= 90 ? "#34A853" : rr >= 75 ? "#FBBC04" : "#DC2626";

  const bucket = kpi.primaryBuckets;
  const unanswered = kpi.unansweredTop ?? [];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{kpi.title}</h2>
        <div style={{ color: "#6B7280", fontSize: 12 }}>Updated {new Date(kpi.generatedAt).toLocaleString()}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        <Card title="DM Volume">
          <div style={{ fontSize: 28, fontWeight: 700 }}>{kpi.dmInbound}/{kpi.dmOutbound}</div>
          <div style={{ fontSize: 12, color: "#6B7280" }}>Inbound/Outbound DM events</div>
        </Card>
        <Card title="Primary Reply Rate">
          <div style={{ fontSize: 28, fontWeight: 700, color: rrColor }}>{fmtPct(rr)}</div>
          <div style={{ fontSize: 12, color: "#6B7280" }}>% replied (inbounds that arrived 9–6)</div>
        </Card>
        <Card title="Median Response">
          <div style={{ fontSize: 28, fontWeight: 700 }}>{fmtMin(kpi.primaryMedianMin)}</div>
          <div style={{ fontSize: 12, color: "#6B7280" }}>Median time to next reply</div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
        <Card title="Response Time Buckets (Primary)">
          <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
            <div>≤30m: <b>{bucket.le30m}</b></div>
            <div>30–60m: <b style={{ color: "#FBBC04" }}>{bucket.m30_60}</b></div>
            <div>1–3h: <b>{bucket.h1_3}</b></div>
            <div>&gt;3h: <b>{bucket.gt3h}</b></div>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#6B7280" }}>Distribution of reply times (wall clock)</div>
        </Card>
        {(kpi.negCount > 0 || kpi.urgentCount > 0) && (
          <Card title="Risk Signals (DM inbound)">
            <div style={{ fontSize: 13 }}>Negative sentiment: <b>{kpi.negCount}</b></div>
            <div style={{ fontSize: 13 }}>Urgent keywords: <b>{kpi.urgentCount}</b></div>
          </Card>
        )}
      </div>

      <Card title="High Priority (Unanswered)">
        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 10 }}>Oldest DMs with no reply yet</div>
        <div style={{ display: "grid", gap: 8 }}>
          {unanswered.slice(0, 10).map((u) => {
            const pill = u.ageHours >= 17 ? "#DC2626" : u.ageHours >= 6 ? "#FBBC04" : "#9CA3AF";
            return (
              <div key={u.peer} style={{ display: "grid", gridTemplateColumns: "72px 140px 72px 1fr", gap: 10, alignItems: "center" }}>
                <span style={{ background: pill, color: "#fff", borderRadius: 999, padding: "6px 10px", fontWeight: 700, fontSize: 12, textAlign: "center" }}>
                  {u.ageHours.toFixed(1)}h
                </span>
                <span style={{ fontWeight: 700 }}>{u.peer}</span>
                <span style={{ fontSize: 12, color: "#6B7280" }}>{new Date(u.lastInboundTs).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <span style={{ background: "#F3F4F6", borderRadius: 14, padding: "8px 10px", fontSize: 13 }}>{u.snippet}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export default function Home() {
  return (
    <ConvexProvider client={convex}>
      <main style={{ background: "#F8F9FA", minHeight: "100vh" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
            <h1 style={{ margin: 0, fontSize: 22 }}>BFF Climb — Jamie Dashboard</h1>
            <div style={{ fontSize: 12, color: "#6B7280" }}>Read-only KPI view</div>
          </div>

          <div style={{ display: "grid", gap: 28 }}>
            <KpiView kind="daily" />
            <KpiView kind="weekly" />
          </div>
        </div>
      </main>
    </ConvexProvider>
  );
}
