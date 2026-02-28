"use client";

import { useEffect, useMemo, useState } from "react";
import { ConvexProvider, ConvexReactClient, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

type Kind = "daily" | "weekly";

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

function KpiDetails({ kpi }: { kpi: any }) {
  const rr = kpi.primaryReplyRate;
  const rrColor = rr >= 90 ? "#34A853" : rr >= 75 ? "#FBBC04" : "#DC2626";

  const bucket = kpi.primaryBuckets;
  const bucketRows = [
    { label: "≤30m", value: bucket.le30m, color: "#34A853" },
    { label: "30–60m", value: bucket.m30_60, color: "#FBBC04" },
    { label: "1–3h", value: bucket.h1_3, color: "#9CA3AF" },
    { label: ">3h", value: bucket.gt3h, color: "#DC2626" },
  ];
  const maxBucket = Math.max(...bucketRows.map((b) => b.value), 1);
  const unanswered = kpi.unansweredTop ?? [];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{kpi.title}</h2>
        <div style={{ color: "#6B7280", fontSize: 12, whiteSpace: "nowrap" }}>
          Updated {new Date(kpi.generatedAt).toLocaleString()}
        </div>
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
          <div style={{ display: "grid", gap: 10 }}>
            {bucketRows.map((row) => (
              <div key={row.label} style={{ display: "grid", gridTemplateColumns: "56px minmax(0, 1fr) 30px", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#6B7280" }}>{row.label}</span>
                <div style={{ background: "#F3F4F6", borderRadius: 999, height: 10, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.max((row.value / maxBucket) * 100, row.value > 0 ? 4 : 0)}%`,
                      height: "100%",
                      background: row.color,
                      borderRadius: 999,
                    }}
                  />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, textAlign: "right" }}>{row.value}</span>
              </div>
            ))}
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
          {unanswered.slice(0, 10).map((u: any) => {
            const pill = u.ageHours >= 17 ? "#DC2626" : u.ageHours >= 6 ? "#FBBC04" : "#9CA3AF";
            return (
              <div key={u.peer} style={{ display: "grid", gridTemplateColumns: "72px 140px 72px 1fr", gap: 10, alignItems: "center" }}>
                <span style={{ background: pill, color: "#fff", borderRadius: 999, padding: "6px 10px", fontWeight: 700, fontSize: 12, textAlign: "center" }}>
                  {u.ageHours.toFixed(1)}h
                </span>
                <span style={{ fontWeight: 700 }}>{u.peer}</span>
                <span style={{ fontSize: 12, color: "#6B7280" }}>
                  {new Date(u.lastInboundTs).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span style={{ background: "#F3F4F6", borderRadius: 14, padding: "8px 10px", fontSize: 13 }}>{u.snippet}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function KpiHistoryView({ kind }: { kind: Kind }) {
  const kpis = useQuery(api.kpis.list, { kind, limit: 90 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!kpis || kpis.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !kpis.some((k: any) => String(k._id) === selectedId)) {
      setSelectedId(String(kpis[0]._id));
    }
  }, [kind, kpis, selectedId]);

  const selected = useMemo(() => {
    if (!kpis || kpis.length === 0) return null;
    return kpis.find((k: any) => String(k._id) === selectedId) ?? kpis[0];
  }, [kpis, selectedId]);

  if (kpis === undefined) return <div>Loading…</div>;
  if (kpis.length === 0) return <div>No {kind} data yet.</div>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "250px minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 10, boxShadow: "0 1px 2px rgba(0,0,0,0.06)", maxHeight: "70vh", overflow: "auto" }}>
        <div style={{ fontSize: 12, color: "#6B7280", margin: "4px 8px 8px" }}>
          {kind === "daily" ? "Day history" : "Week history"}
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {kpis.map((k: any) => {
            const isActive = String(k._id) === String(selected?._id);
            return (
              <button
                key={String(k._id)}
                onClick={() => setSelectedId(String(k._id))}
                style={{
                  textAlign: "left",
                  border: "1px solid #E5E7EB",
                  borderRadius: 12,
                  padding: "10px 12px",
                  background: isActive ? "#EEF2FF" : "#fff",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{k.title}</div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                  {new Date(k.generatedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected ? <KpiDetails kpi={selected} /> : <div>No selection.</div>}
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Kind>("daily");

  return (
    <ConvexProvider client={convex}>
      <main style={{ background: "#F8F9FA", minHeight: "100vh" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
            <h1 style={{ margin: 0, fontSize: 22 }}>BFF Climb — Jamie Dashboard</h1>
            <div style={{ fontSize: 12, color: "#6B7280" }}>Read-only KPI view</div>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {(["daily", "weekly"] as Kind[]).map((tab) => {
              const active = tab === activeTab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    border: "1px solid #D1D5DB",
                    background: active ? "#111827" : "#fff",
                    color: active ? "#fff" : "#111827",
                    borderRadius: 999,
                    padding: "8px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {tab === "daily" ? "Daily" : "Weekly"}
                </button>
              );
            })}
          </div>

          <KpiHistoryView kind={activeTab} />
        </div>
      </main>
    </ConvexProvider>
  );
}
