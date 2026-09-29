"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  ApiError,
  clearToken,
  getToken,
  getTiers,
  Profile,
  TierInfo,
} from "../../lib/api";
import { handleError } from "../../lib/validate";
import { MAX_WALLETS } from "../../lib/constants";
import { disconnectSocket } from "../../lib/ws";
import ConnectPopup from "../../components/ConnectPopup";
import Loader from "../../components/Loader";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [popup, setPopup] = useState(false);
  const [err, setErr] = useState("");
  const [handle, setHandle] = useState("");
  const [handleErr, setHandleErr] = useState("");
  const [removeErr, setRemoveErr] = useState<{
    id: string;
    msg: string;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<TierInfo[]>([]);

  useEffect(() => {
    setReady(true);
    getTiers().then((t) => setTiers(t.tiers));
  }, []);

  const load = useCallback(async () => {
    if (!getToken()) {
      setProfile(null);
      return;
    }
    try {
      const p = await api<Profile>("/profile/user");
      setProfile(p);
      setHandle(p.handle ?? "");
      setErr("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) {
        setErr("Server unreachable — showing last saved data.");
      } else {
        setErr(e instanceof Error ? e.message : "Load failed");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function recheck() {
    try {
      await api("/eligibility/check", { method: "POST" });
      await load();
      window.dispatchEvent(new Event("sixfigs-auth"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Check failed");
    }
  }

  async function saveVis(visMode: string) {
    try {
      await api("/profile/user", { method: "PATCH", body: { visMode } });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function saveHandle() {
    const herr = handleError(handle);
    setHandleErr(herr ?? "");
    if (herr) return; // no backend call on invalid input
    try {
      await api("/profile/user", { method: "PATCH", body: { handle } });
      await load();
      window.dispatchEvent(new Event("sixfigs-auth"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function removeWallet(id: string) {
    setRemoveErr(null);
    try {
      await api(`/wallet/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setRemoveErr({
        id,
        msg: e instanceof Error ? e.message : "Remove failed",
      });
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
          <button
            className="btn-solid"
            style={{ marginTop: "1.2rem" }}
            onClick={() => setPopup(true)}
          >
            CONNECT WALLET ↗
          </button>
          {err && <p style={{ color: "var(--crimson)" }}>{err}</p>}
        </div>
        {popup && (
          <ConnectPopup
            onClose={() => setPopup(false)}
            onDone={() => {
              load();
              window.dispatchEvent(new Event("sixfigs-auth"));
            }}
          />
        )}
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
                display: "flex",
                gap: 20,
              }}
            >
              {username}{" "}
              <span
                className="tier-badge"
                style={{ alignSelf: "center", padding: "7px 30px" }}
              >
                {elig.tier ?? "UNVERIFIED"}
              </span>
            </h2>
          </div>
          <button
            className="btn-ghost btn-sm"
            onClick={() => setPopup(true)}
            disabled={full}
            title={
              full
                ? `Wallet limit reached (${MAX_WALLETS}) — remove one to add another`
                : "Connect more wallets"
            }
          >
            CONNECT MORE WALLETS +
          </button>
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

        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            marginTop: "1rem",
          }}
        >
          <div>
            <p className="mono-label" style={{ marginBottom: "0.4rem" }}>
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
              <button className="chip" onClick={saveHandle}>
                SAVE
              </button>
            </div>
            {handleErr && <p className="err">{handleErr}</p>}
          </div>
          <div>
            <p className="mono-label" style={{ marginBottom: "0.4rem" }}>
              VISIBILITY
            </p>
            <div style={{ display: "flex", gap: "1rem" }}>
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

      {err && <p className="err">{err}</p>}

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
        {profile.wallets.map((w) => {
          const live = elig.balances.find((b) => b.walletId === w.id);
          return (
            <div key={w.id}>
              <div
                className="wallet-row"
                style={{
                  marginBottom: removeErr?.id === w.id ? "0.3rem" : "0.6rem",
                  marginTop: "0.6rem",
                }}
              >
                <span
                  className={"chain-badge"}
                  style={{ padding: "0.4rem 2.5rem", fontSize: 15 }}
                >
                  {w.chain}
                </span>
                <span className="mono-label" style={{ fontSize: 18 }}>
                  ${Math.round(live?.usd ?? 0).toLocaleString()} LIVE
                </span>
                <button
                  className="chip"
                  style={{ marginLeft: "auto" }}
                  onClick={() => removeWallet(w.id)}
                >
                  ✕
                </button>
              </div>
              {removeErr?.id === w.id && (
                <p className="err" style={{ margin: "0 0 0.6rem" }}>
                  {removeErr.msg}
                </p>
              )}
            </div>
          );
        })}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            className="btn-ghost"
            style={{ padding: "0.7rem 1rem" }}
            onClick={recheck}
          >
            PROVE COMBINED TOTAL ↗
          </button>
          <button
            className="btn-ghost"
            style={{ padding: "0.7rem 1rem" }}
            onClick={disconnect}
          >
            DISCONNECT ALL
          </button>
        </div>
        {full && (
          <p className="fine" style={{ marginBottom: 0 }}>
            Wallet limit reached ({MAX_WALLETS}) — remove one to add another.
          </p>
        )}
      </div>
      {popup && (
        <ConnectPopup
          onClose={() => setPopup(false)}
          onDone={() => {
            load();
            window.dispatchEvent(new Event("sixfigs-auth"));
          }}
        />
      )}
    </section>
  );
}
