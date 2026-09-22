"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface Card {
  status: string;
  name?: string;
  image?: string | null;
  price?: number | null;
  mcap?: number | null;
  vol24h?: number | null;
  change24h?: number | null;
  holders?: number | null;
}

function compact(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
}

function price(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: n < 1 ? 6 : 2 });
}

/** Live ticker card (CoinGecko, server-cached 5 min). Slim pending line until data lands. */
export default function TokenCard({ symbol }: { symbol: string }) {
  const [card, setCard] = useState<Card | null>(null);

  useEffect(() => {
    let live = true;
    api<{ card: Card }>(`/chat/tokens/${symbol}`)
      .then((r) => live && setCard(r.card))
      .catch(() => live && setCard({ status: "error" }));
    return () => {
      live = false;
    };
  }, [symbol]);

  if (!card) return <div className="token-card mono-label">LOADING ${symbol}…</div>;

  if (card.status !== "live" && card.status !== "stale") {
    return (
      <div className="token-card">
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.72rem" }}>
          <strong>${symbol}</strong>
          <span className="tier-badge" style={{ marginLeft: "auto" }}>{card.status.toUpperCase()}</span>
        </div>
      </div>
    );
  }

  const chg = card.change24h;
  return (
    <div className="token-card">
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.72rem" }}>
        {card.image && <img src={card.image} alt="" width={22} height={22} style={{ borderRadius: "50%" }} />}
        <strong>${symbol}</strong>
        <span style={{ color: "var(--muted)", fontSize: "0.62rem" }}>{card.name ?? symbol}</span>
        <span
          className="tier-badge"
          style={{
            marginLeft: "auto",
            background: chg === null || chg === undefined ? undefined : chg >= 0 ? "#1a7f37" : "var(--crimson)",
            color: "#fff",
          }}
        >
          {chg === null || chg === undefined ? "—" : `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}% 24H`}
          {card.status === "stale" ? " · STALE" : ""}
        </span>
      </div>
      <div className="token-grid">
        <div><span>PRICE</span><strong>{price(card.price)}</strong></div>
        <div><span>MKT CAP</span><strong>{card.mcap ? "$" + compact(card.mcap) : "—"}</strong></div>
        <div><span>VOL 24H</span><strong>{card.vol24h ? "$" + compact(card.vol24h) : "—"}</strong></div>
        <div><span>HOLDERS</span><strong>—</strong></div>
      </div>
      <p className="fine">Data: CoinGecko · server-cached 5 min · holders n/a on free API</p>
    </div>
  );
}
