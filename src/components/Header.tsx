"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CaretDown, Moon, Sun } from "@phosphor-icons/react";
import { api, ApiError, clearToken, getToken, Profile } from "../lib/api";
import { connectSocket, disconnectSocket } from "../lib/ws";
import { disconnectWallets } from "./Web3Providers";
import SignInButton from "./SignInButton";
import { BrandChop } from "./Chop";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/rooms", label: "Rooms" },
  { href: "/play", label: "Play" },
  { href: "/create", label: "Create" },
  { href: "/docs", label: "Docs" },
];

export default function Header() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menu, setMenu] = useState(false);
  const [dark, setDark] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const profileFreshRef = useRef(false);
  const pathname = usePathname();

  // Close the account menu on outside click / Escape.
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

  // Midnight unless the visitor explicitly chose daylight.
  useEffect(() => {
    const d = localStorage.getItem("sixfigs-theme") !== "light";
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
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
      // 401 clears the token centrally in api(); network blips keep the session and the badge.
      if (e instanceof ApiError && e.status === 401) setProfile(null);
    }
  }

  useEffect(() => {
    if (getToken()) {
      connectSocket(); // online immediately on a cached session, drives 1v1 presence
    }
    load();
    const h = () => {
      // Login delivers the profile via onDone first, skip the redundant fetch.
      if (!profileFreshRef.current) load();
      profileFreshRef.current = false;
      if (getToken()) {
        disconnectSocket();
        connectSocket(); // session changed, re-auth the socket
      }
    };
    window.addEventListener("sixfigs-auth", h);
    return () => {
      window.removeEventListener("sixfigs-auth", h);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Login success: the response already carries the profile, so the badge
   *  renders immediately with no follow-up fetch and no flash. */
  function authed(p?: Profile) {
    if (p) {
      profileFreshRef.current = true;
      // Short-lived flag: h consumes it on the login event; a later unrelated
      // event (recheck, mutation) still triggers a real load.
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
    // Drop the wallet connection too: a stale connected wallet would
    // otherwise auto-resume flows meant for a fresh press.
    void disconnectWallets();
    setProfile(null);
    setMenu(false);
    authed();
    location.href = "/";
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="masthead">
      <a href="/" className="wordmark">
        <BrandChop size="md" />
        figs
        <span className="xyz">.XYZ</span>
      </a>
      <nav className="site-nav" aria-label="Primary">
        {NAV.map((n) => (
          <a key={n.href} href={n.href} className={isActive(n.href) ? "active" : ""}>
            {n.label}
          </a>
        ))}
      </nav>
      <div className="masthead-actions">
        <button
          className="btn-ghost theme-toggle"
          onClick={toggleTheme}
          aria-label={dark ? "Switch to daylight" : "Switch to midnight"}
        >
          {dark ? <Sun size={14} /> : <Moon size={14} />}
          {dark ? "Day" : "Night"}
        </button>
        {profile ? (
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              className="btn"
              onClick={() => setMenu(!menu)}
              aria-haspopup="menu"
              aria-expanded={menu}
            >
              {profile.eligibility.tier ?? "Unverified"}
              <CaretDown size={11} aria-hidden="true" />
            </button>
            {menu && (
              <div style={menuBox} className="menu" role="menu">
                <a href="/profile">Profile</a>
                <button onClick={disconnect}>Log out</button>
              </div>
            )}
          </div>
        ) : (
          <SignInButton onDone={authed} label="Sign in" />
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
};
