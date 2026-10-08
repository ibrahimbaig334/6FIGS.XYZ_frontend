import type { Metadata } from "next";
import Script from "next/script";
import { Bricolage_Grotesque, Space_Mono } from "next/font/google";
import "./globals.css";
import Header from "../components/Header";
import ChallengeToast from "../components/ChallengeToast";
import ErrorToast from "../components/ErrorToast";
import Web3Providers from "../components/Web3Providers";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-bricolage",
  display: "swap",
});

const space = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space",
  display: "swap",
});

/* Midnight is the house default. A stored "light" choice is the only way
   back to daylight. Runs before first paint, so there is no flash. */
const THEME_SCRIPT = `try{var t=localStorage.getItem("sixfigs-theme");if(t!=="light")document.documentElement.classList.add("dark")}catch(e){document.documentElement.classList.add("dark")}`;

export const metadata: Metadata = {
  title: "6figs. The room behind the unmarked door.",
  description:
    "A private room for verified holders. Prove your tier, take a seat, play the table.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bricolage.variable} ${space.variable}`}>
        <Script id="sixfigs-theme" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>
        <Web3Providers>
          <a href="#main" className="skip-link">
            Skip to the table
          </a>
          <Header />
          <ChallengeToast />
          <ErrorToast />
          <main id="main">{children}</main>
          <footer className="site-footer">
            <p>6figs.xyz. Set for two. Fair game.</p>
            <nav aria-label="Footer">
              <a href="/docs">Handbook</a>
              <a href="/docs/privacy">Privacy</a>
              <a href="/docs/tiers">Tiers</a>
            </nav>
            <p>&copy; 2026</p>
          </footer>
        </Web3Providers>
      </body>
    </html>
  );
}
