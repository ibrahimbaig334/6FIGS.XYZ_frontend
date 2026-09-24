"use client";

import { useEffect, useState } from "react";
import { api, clearToken, getToken, Profile } from "../lib/api";
import { disconnectSocket } from "../lib/ws";
import ConnectPopup from "./ConnectPopup";

const NAV = [
  { href: "/", label: "HOME" },
  { href: "/profile", label: "PROFILE" },
  { href: "/play", label: "PLAY" },
  { href: "/rooms", label: "ROOMS" },
];

export default function Header() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [popup, setPopup] = useState(false);
  const [menu, setMenu] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const d = localStorage.getItem("sixfigs-theme") === "dark";
    setDark(d);
    document.body.classList.toggle("dark", d);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.body.classList.toggle("dark", next);
    localStorage.setItem("sixfigs-theme", next ? "dark" : "light");
  }

  async function load() {
    if (!getToken()) {
      setProfile(null);
      return;
    }
    try {
      setProfile(await api<Profile>("/profile/user"));
    } catch {
      clearToken();
      setProfile(null);
    }
  }

  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener("sixfigs-auth", h);
    return () => window.removeEventListener("sixfigs-auth", h);
  }, []);

  function authed() {
    window.dispatchEvent(new Event("sixfigs-auth"));
  }

  function disconnect() {
    clearToken();
    disconnectSocket();
    setProfile(null);
    setMenu(false);
    authed();
    location.href = "/";
  }

  return (
    <header className="masthead">
      <a href="/" className="wordmark">
        6FIGS<span>.XYZ</span>
      </a>
      <nav className="site-nav" aria-label="Primary">
        {NAV.map((n) => (
          <a key={n.href} href={n.href}>
            {n.label}
          </a>
        ))}
      </nav>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", position: "relative" }}>
        <button
          className="btn-ghost"
          style={{ padding: "0.6rem 0.8rem" }}
          onClick={toggleTheme}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? "☀ LIGHT" : "🌙 DARK"}
        </button>
        {profile ? (
          <>
            <button className="tier-badge" style={{ cursor: "pointer", border: "2px solid var(--ink)" }} onClick={() => setMenu(!menu)}>
              {(profile.handle ?? profile.wallets[0]?.display ?? "YOU")} · {profile.eligibility.tier ?? "UNVERIFIED"} ▾
            </button>
            {menu && (
              <div style={menuBox} className="dropdown">
                <a href="/profile">PROFILE</a>
                <a href="/profile?tab=settings">SETTINGS</a>
                <button onClick={disconnect}>DISCONNECT</button>
              </div>
            )}
          </>
        ) : (
          <button className="btn-solid" style={{ padding: "0.6rem 0.9rem" }} onClick={() => setPopup(true)}>
            CONNECT WALLET ↗
          </button>
        )}
      </div>
      {popup && <ConnectPopup onClose={() => setPopup(false)} onDone={authed} />}
    </header>
  );
}

const menuBox: React.CSSProperties = {
  position: "absolute", right: 0, top: "110%", background: "var(--paper)", border: "2px solid var(--ink)",
  boxShadow: "4px 4px 0 var(--shadow)", display: "flex", flexDirection: "column", zIndex: 40, minWidth: "160px",
};
