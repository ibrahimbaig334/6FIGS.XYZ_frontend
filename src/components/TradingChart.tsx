"use client";

import { useEffect, useState } from "react";

function toTvSymbol(sym: string): string {
  const s =
    sym
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 10) || "BTC";
  // Binance USDT pairs cover nearly every mentioned token and have the
  // deepest history on TradingView. The widget still allows symbol search.
  return `BINANCE:${s}USDT`;
}

/**
 * Full TradingView advanced chart for the room's token.
 * GROUP CHATS ONLY — the host renders this outside the chatbox as a
 * full-width panel below the talk (never in 1v1 / random / bot tables).
 *
 * - Room has a required token (`pinnedSymbol`, e.g. BTC): the chart is
 *   locked to it, no matter what else is discussed in chat.
 * - Room allows any token: the chart follows the LATEST discussed $TICKER
 *   only — no switcher, no other-token views.
 *
 * Responsive: full-bleed height scales down on phones. Follows the app
 * theme (documentElement "dark" class, localStorage "sixfigs-theme").
 */
export default function TradingChart({
  symbols,
  pinnedSymbol,
}: {
  symbols: string[];
  pinnedSymbol?: string | null;
}) {
  // App default is dark (see layout THEME_SCRIPT) — match it pre-hydration
  // so the first paint already loads the dark widget for most users.
  const [dark, setDark] = useState(true);

  // Track the theme toggle (Header flips documentElement "dark" + storage).
  useEffect(() => {
    const read = () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark");
    setDark(read());
    const obs = new MutationObserver(() => setDark(read()));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  // Active token, derived during render so the chart paints on the very
  // first frame — no placeholder flash, no missed update:
  // pinned room token wins outright, otherwise the latest mention.
  const pinned =
    pinnedSymbol
      ?.trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "") || null;
  const active =
    pinned ?? (symbols.length ? symbols[symbols.length - 1] : null);

  if (!active) {
    return (
      <div className="plate tv-wrap">
        <p className="label">Live market — no token yet</p>
        <p className="fine" style={{ margin: 0 }}>
          Type $BTC, $SOL, $ETH… in table talk and the full TradingView chart
          loads here.
        </p>
      </div>
    );
  }

  const tv = toTvSymbol(active);
  const theme = dark ? "dark" : "light";
  const toolbarbg = dark ? "131722" : "f1f3f6";
  const src =
    `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_${active.toLowerCase()}_${theme}` +
    `&symbol=${encodeURIComponent(tv)}` +
    `&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=${toolbarbg}` +
    `&studies=[]&theme=${theme}&style=1&timezone=Etc%2FUTC&withdateranges=1` +
    `&hidevolume=0&allow_symbol_change=1&calendar=0` +
    `&support_host=https%3A%2F%2Fwww.tradingview.com`;

  return (
    <div className="plate tv-wrap">
      <div className="tv-head">
        <p className="label" style={{ margin: 0 }}>
          Live market · ${active}
        </p>
      </div>
      <div className="tv-frame">
        <iframe
          key={`${active}-${theme}`}
          src={src}
          title={`TradingView chart for ${active}`}
          allowFullScreen
          loading="lazy"
        />
      </div>
      <p className="fine" style={{ margin: 0 }}>
        Powered by TradingView — search any pair inside the chart.
      </p>
    </div>
  );
}
