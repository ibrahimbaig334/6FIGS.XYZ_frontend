"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  clearToken,
  getToken,
  getTiers,
  Profile,
  TierInfo,
} from "../../lib/api";
import { handleError } from "../../lib/validate";
import { MAX_WALLETS } from "../../lib/constants";
import { disconnectSocket } from "../../lib/ws";
import SolanaConnect from "../../components/SolanaConnect";
import WalletIcon from "../../components/WalletIcon";
import Loader from "../../components/Loader";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [handle, setHandle] = useState("");
  const [handleErr, setHandleErr] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [savingHandle, setSavingHandle] = useState(false);
  const [tiers, setTiers] = useState<TierInfo[]>([]);

  useEffect(() => {
    setReady(true);
    getTiers().then((t) => setTiers(t.tiers));
  }, []);

  const applyProfile = (p: Profile) => {
    setProfile(p);
    setHandle(p.handle ?? "");
    setLoading(false);
  };

  const load = useCallback(async () => {
    if (!getToken()) {
      setProfile(null);
      return;
    }
    try {
      applyProfile(await api<Profile>("/profile/user"));
    } catch (e) {
      console.error("profile load failed", e);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Connect done: use the profile from the login response when present —
   *  no dispatch (Header/create get their own copy from their own instance). */
  const onConnected = (p?: Profile) => {
    if (p) applyProfile(p);
    else void load();
  };

  useEffect(() => {
    load();
  }, [load]);

  async function recheck() {
    if (checking) return;
    setChecking(true);
    try {
      await api("/eligibility/check", { method: "POST" });
      await load();
      window.dispatchEvent(new Event("sixfigs-auth"));
    } catch (e) {
      console.error("eligibility recheck failed", e);
    } finally {
      setChecking(false);
    }
  }

  async function saveVis(visMode: string) {
    try {
      await api("/profile/user", { method: "PATCH", body: { visMode } });
      await load();
    } catch (e) {
      console.error("visibility save failed", e);
    }
  }

  async function saveHandle() {
    const herr = handleError(handle);
    setHandleErr(herr ?? "");
    if (herr || savingHandle) return; // no backend call on invalid input
    setSavingHandle(true);
    try {
      await api("/profile/user", { method: "PATCH", body: { handle } });
      await load();
      window.dispatchEvent(new Event("sixfigs-auth"));
    } catch (e) {
      console.error("handle save failed", e);
    } finally {
      setSavingHandle(false);
    }
  }

  async function removeWallet(id: string) {
    try {
      await api(`/wallet/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      console.error("remove wallet failed", e);
    }
  }

  function disconnect() {
    clearToken();
    disconnectSocket();
    setProfile(null);
    location.href = "/";
  }

  // Mounted guard (see rooms page): localStorage token is client-only.
  if (!ready) {
    return (
      <section className="page-enter loader-page">
        <Loader />
      </section>
    );
  }

  if (!getToken() || (!profile && !loading)) {
    return (
      <section
        className="page-enter"
        style={{
          padding: "2rem 5vw",
          flex: 1,
          display: "grid",
          placeItems: "center",
        }}
      >
        <div
          className="card"
          style={{
            width: "100%",
            maxWidth: "520px",
            textAlign: "center",
            padding: "2.5rem 2rem",
          }}
        >
          <p className="mono-label">PROFILE — CONNECT FIRST</p>
          <p
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: "0.85rem",
              margin: "0.6rem 0 0",
            }}
          >
            Link a wallet to open your profile. Below $100K you can still link
            more wallets here.
          </p>
          <div
            style={{
              marginTop: "1.2rem",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <SolanaConnect onDone={onConnected} />
          </div>
        </div>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="page-enter loader-page">
        <Loader label="LOADING PROFILE…" />
      </section>
    );
  }

  const elig = profile.eligibility;
  const username = profile.handle ?? `user_${profile.id.slice(-4)}`;
  const full = profile.wallets.length >= MAX_WALLETS;

  // Next tier + log-scale progress (thresholds span orders of magnitude).
  const sortedTiers = [...tiers].sort((a, b) => a.min - b.min);
  const next = sortedTiers.find((t) => elig.total < t.min) ?? null;
  const scaleMax = Math.max(...sortedTiers.map((t) => t.min), 1) * 1.5;
  const pos = (v: number) =>
    v <= 0 ? 0 : Math.min(1, Math.log10(v) / Math.log10(scaleMax));
  const pct = Math.round(pos(elig.total) * 100);

  return (
    <section
      className="page-enter"
      style={{
        padding: "2rem 5vw",
        margin: "0 auto",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div
        className="card"
        style={{ position: "relative", overflow: "hidden" }}
      >
        <div
          style={{
            display: "flex",
            gap: "0.8rem",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p className="mono-label" style={{ fontSize: 20 }}>
              PROFILE PAGE
            </p>
            <h2
              style={{
                margin: "0.3rem 0 0",
                fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
                letterSpacing: "-0.03em",
                overflowWrap: "anywhere",
              }}
            >
              {username}
            </h2>
          </div>
          <span
            className="tier-badge"
            style={{ alignSelf: "center", padding: "7px 30px" }}
          >
            {elig.tier ?? "UNVERIFIED"}
          </span>
        </div>

        <p
          style={{
            margin: "0.8rem 0 0",
            fontSize: "clamp(2rem, 6vw, 3rem)",
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          ${elig.total.toLocaleString()}
        </p>
        <p className="fine" style={{ margin: "0.3rem 0 0" }}>
          {next ? (
            <>
              NEED <strong>${(next.min - elig.total).toLocaleString()}</strong>{" "}
              MORE FOR {next.name}
            </>
          ) : (
            "MAX TIER — TOP OF THE HILL."
          )}
          {" · "}
          {elig.expiresAt
            ? `Refreshes ${new Date(elig.expiresAt).toLocaleString()}.`
            : "Unverified — run PROVE below."}
        </p>

        <div
          style={{
            position: "relative",
            height: "16px",
            border: "2px solid var(--ink)",
            background: "var(--input)",
            marginTop: "0.9rem",
          }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progress to next tier"
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: `${pct}%`,
              background: "var(--gold)",
              transition: "width 0.5s ease",
            }}
          />
          {sortedTiers.map((t) => (
            <span
              key={t.name}
              title={`${t.name} — $${t.min.toLocaleString()}`}
              style={{
                position: "absolute",
                left: `${pos(t.min) * 100}%`,
                top: -5,
                bottom: -5,
                width: 3,
                background: "var(--ink)",
              }}
            />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            gap: "0.8rem",
            flexWrap: "wrap",
            marginTop: "0.4rem",
          }}
        >
          {sortedTiers.map((t) => (
            <span key={t.name} className="fine">
              {t.name} &gt; ${t.min.toLocaleString()}
            </span>
          ))}
          {sortedTiers.length === 0 && (
            <span className="fine">loading tiers…</span>
          )}
        </div>

        <div className="profile-fields">
          <div>
            <p
              className="mono-label"
              style={{ marginBottom: "0.4rem", justifySelf: "center" }}
            >
              USERNAME
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <input
                className="field"
                value={handle}
                onChange={(e) => {
                  setHandle(e.target.value);
                  if (handleErr)
                    setHandleErr(handleError(e.target.value) ?? "");
                }}
                placeholder="handle (3–24 chars)"
                style={{ maxWidth: "220px" }}
              />
              <button
                className="chip"
                disabled={savingHandle}
                onClick={saveHandle}
              >
                {savingHandle ? "SAVING…" : "SAVE"}
              </button>
            </div>
            {handleErr && <p className="err">{handleErr}</p>}
          </div>
          <div className="vis-block">
            <p
              className="mono-label"
              style={{ marginBottom: "0.4rem", justifySelf: "center" }}
            >
              VISIBILITY
            </p>
            <div className="vis-chips">
              {(["HIDDEN", "VISIBLE"] as const).map((v) => (
                <button
                  key={v}
                  className={profile.visMode === v ? "chip active" : "chip"}
                  style={{ padding: "0.9rem 1rem" }}
                  onClick={() => saveVis(v)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="fine" style={{ margin: "0.6rem 0 0" }}>
          VISIBLE = your holdings % show up for friends in the 1v1 tab.
        </p>
      </div>

      <div className="card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            flexWrap: "wrap",
          }}
        >
          <p className="mono-label" style={{ fontSize: 20 }}>
            WALLETS
          </p>
          <span className="fine" style={{ marginLeft: "auto" }}>
            {profile.wallets.length}/{MAX_WALLETS}
          </span>
        </div>
        <div className="wallet-grid">
          {profile.wallets.map((w) => {
            const live = elig.balances.find((b) => b.walletId === w.id);
            const usd = live?.usd ?? 0;
            const pct =
              elig.total > 0 ? Math.round((usd / elig.total) * 100) : 0;
            const wname = w.name ?? "Solana Wallet";
            return (
              <div key={w.id} className="wallet-row">
                <WalletIcon
                  name={wname}
                  letter={wname.slice(0, 1).toUpperCase()}
                />
                <div className="wallet-info">
                  <strong style={{ fontSize: "1rem" }}>{wname}</strong>
                  <span className="fine" style={{ margin: 0 }}>
                    SOL {pct}% · ${Math.round(usd).toLocaleString()} OF $
                    {Math.round(elig.total).toLocaleString()}
                  </span>
                </div>
                <button
                  className="chip"
                  style={{ marginLeft: "auto" }}
                  onClick={() => removeWallet(w.id)}
                >
                  ✕
                </button>
              </div>
            );
          })}
          {/* Exactly ONE dotted connect card under the list (up to 20 wallets —
              20 dashed boxes would look bad). */}
          {!full && (
            <div className="wallet-slot-empty">
              <SolanaConnect onDone={onConnected} />
            </div>
          )}
        </div>
        <div className="wallet-actions">
          {full ? (
            <p className="fine" style={{ margin: 0 }}>
              Wallet limit reached ({MAX_WALLETS})
            </p>
          ) : (
            <SolanaConnect onDone={onConnected} />
          )}
          <button
            className="btn-ghost"
            style={{ padding: "0.6rem 1rem", margin: "0 auto" }}
            disabled={checking}
            onClick={recheck}
          >
            {checking ? "CHECKING…" : "PROVE COMBINED TOTAL ↗"}
          </button>
          <button
            className="btn-ghost"
            style={{ padding: "0.6rem 1rem" }}
            onClick={disconnect}
          >
            DISCONNECT ALL
          </button>
        </div>
      </div>
    </section>
  );
}
