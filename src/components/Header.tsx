"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError, clearToken, getToken, Profile } from "../lib/api";
import { connectSocket, disconnectSocket } from "../lib/ws";
import SolanaConnect from "./SolanaConnect";

const NAV = [
  { href: "/", label: "HOME" },
  { href: "/profile", label: "PROFILE" },
  { href: "/play", label: "PLAY" },
  { href: "/create", label: "CREATE" },
];

export default function Header() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menu, setMenu] = useState(false);
  const [dark, setDark] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const profileFreshRef = useRef(false);

  // Close the wallet dropdown on outside click / Escape.
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenu(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

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
    } catch (e) {
      // 401 clears the token centrally in api(); network blips keep the session + cached badge.
      if (e instanceof ApiError && e.status === 401) setProfile(null);
    }
  }

  useEffect(() => {
    if (getToken()) {
      connectSocket(); // online immediately on cached session — drives 1v1 presence
    }
    load();
    const h = () => {
      // Login delivers the profile via onDone first — skip the redundant fetch.
      if (!profileFreshRef.current) load();
      profileFreshRef.current = false;
      if (getToken()) {
        disconnectSocket();
        connectSocket(); // session changed → re-auth the socket
      }
    };
    window.addEventListener("sixfigs-auth", h);
    return () => {
      window.removeEventListener("sixfigs-auth", h);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Login success: the response already carries the profile — render the
   *  tier badge immediately (no follow-up fetch → no CONNECT WALLET flash). */
  function authed(p?: Profile) {
    if (p) {
      profileFreshRef.current = true;
      // Flag is short-lived: h consumes it on the login event; clear it so a
      // later unrelated event (recheck/mutation) still triggers a real load.
      window.setTimeout(() => {
        profileFreshRef.current = false;
      }, 1000);
      setProfile(p);
      return;
    }
    load();
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
      <div
        className="masthead-actions"
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          position: "relative",
        }}
      >
        <button
          className="btn-ghost"
          style={{ padding: "0.6rem 0.8rem" }}
          onClick={toggleTheme}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? "☀ LIGHT" : "🌙 DARK"}
        </button>
        {profile ? (
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              className="tier-badge"
              style={{
                cursor: "pointer",
                border: "2px solid var(--ink)",
                padding: "0.65rem 0.9rem",
                fontSize: "0.72rem",
                width: "100%",
              }}
              onClick={() => setMenu(!menu)}
              aria-haspopup="menu"
              aria-expanded={menu}
            >
              {profile.eligibility.tier ?? "UNVERIFIED"} ▾
            </button>
            {menu && (
              <div style={menuBox} className="dropdown" role="menu">
                <a href="/profile">PROFILE</a>
                <button onClick={disconnect}>DISCONNECT</button>
              </div>
            )}
          </div>
        ) : (
          <SolanaConnect onDone={authed} />
        )}
      </div>
    </header>
  );
}

const menuBox: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  top: "110%",
  background: "var(--paper)",
  border: "2px solid var(--ink)",
  boxShadow: "4px 4px 0 var(--shadow)",
  display: "flex",
  flexDirection: "column",
  zIndex: 40,
};
