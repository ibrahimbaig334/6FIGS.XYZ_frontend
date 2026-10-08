"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { api } from "../lib/api";

interface Card {
  status: string;
  name?: string;
  image?: string | null;
  price?: number | null;
  mcap?: number | null;
  vol24h?: number | null;
  change24h?: number | null;
}

function compact(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);
}

function price(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return (
    "$" +
    Number(n).toLocaleString("en-US", { maximumFractionDigits: n < 1 ? 6 : 2 })
  );
}

/** Live ticker card (CoinGecko, server-cached 5 min). A slim pending line
 *  until data lands. Failed lookups render nothing: the chat line stays. */
export default function TokenCard({ symbol }: { symbol: string }) {
  const [card, setCard] = useState<Card | null>(null);
  const [imgOk, setImgOk] = useState(true);

  useEffect(() => {
    let live = true;
    api<{ card: Card }>(`/chat/tokens/${symbol}`)
      .then((r) => live && setCard(r.card))
      .catch(() => live && setCard({ status: "error" }));
    return () => {
      live = false;
    };
  }, [symbol]);

  if (!card)
    return <div className="token-loading">Looking up ${symbol}</div>;

  // Unpriceable / failed lookups render nothing, and per-message fetch
  // failures never touch the error toast.
  if (card.status !== "live" && card.status !== "stale") return null;

  const chg = card.change24h;
  return (
    <div className="token-card">
      <div className="token-head">
        {card.image && imgOk && (
          <Image
            src={card.image}
            alt=""
            width={22}
            height={22}
            style={{ borderRadius: "50%" }}
            onError={() => setImgOk(false)}
          />
        )}
        <strong>${symbol}</strong>
        <span className="fine">{card.name ?? symbol}</span>
        <span
          className={`token-chg${chg != null && chg >= 0 ? " up" : ""}`}
        >
          {chg === null || chg === undefined
            ? "—"
            : `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}% 24h`}
          {card.status === "stale" ? " stale" : ""}
        </span>
      </div>
      <div className="token-grid">
        <div>
          <span>Price</span>
          <strong>{price(card.price)}</strong>
        </div>
        <div>
          <span>Mkt cap</span>
          <strong>{card.mcap ? "$" + compact(card.mcap) : "—"}</strong>
        </div>
        <div>
          <span>Vol 24h</span>
          <strong>{card.vol24h ? "$" + compact(card.vol24h) : "—"}</strong>
        </div>
      </div>
    </div>
  );
}
