import type { Metadata } from "next";
import { DM_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Header from "../components/Header";

const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-grotesk", display: "swap" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono", display: "swap" });

export const metadata: Metadata = {
  title: "6FIGS.XYZ — Proof of Bags. Room for Holders.",
  description:
    "A private members' room for verified six-figure-plus crypto holders. Proof of bags, then match, play, chat.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${grotesk.variable} ${dmMono.variable}`}>
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
            fontFamily: "var(--font-dm-mono)",
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
