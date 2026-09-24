import type { Metadata } from "next";
import "./globals.css";
import Header from "../components/Header";

export const metadata: Metadata = {
  title: "6FIGS.XYZ — Proof of Bags. Room for Holders.",
  description:
    "A private members' room for verified six-figure-plus crypto holders. Proof of bags, then match, play, chat.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="ticker" aria-hidden="true">
          <div className="ticker-inner">
            PROOF OF BAGS ✕ SIX FIGURES OR NOTHING ✕ NO BALANCES SHOWN ✕ FAIR TIC-TAC-TOE ✕ 1V1 CHAT + 1V1 ROOMS ✕&nbsp;PROOF OF BAGS ✕ SIX FIGURES OR NOTHING ✕ NO BALANCES SHOWN ✕ FAIR TIC-TAC-TOE ✕ 1V1 CHAT + 1V1 ROOMS ✕&nbsp;
          </div>
        </div>
        <Header />
        <main>{children}</main>
        <footer
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
            background: "var(--ink)",
            color: "var(--paper)",
            padding: "1.5rem 3vw",
            fontFamily: '"DM Mono", monospace',
            fontSize: "0.58rem",
          }}
        >
          <p style={{ margin: 0 }}>6FIGS.XYZ — VERIFIED BAGS. FAIR GAMES. NO NUMBERS SHOWN.</p>
          <p style={{ margin: 0 }}>© 2026</p>
        </footer>
      </body>
    </html>
  );
}
