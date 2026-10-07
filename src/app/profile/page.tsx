"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  clearToken,
  errMsg,
  getToken,
  removeTeeWallet,
  teeRecheck,
  usernameChange,
  usernameSetup,
  Profile,
  TeeEligibility,
  Wallet,
} from "../../lib/api";
import { clearProvedWallets } from "../../lib/teeVerify";
import { handleError } from "../../lib/validate";
import { MAX_WALLETS } from "../../lib/constants";
import { disconnectSocket } from "../../lib/ws";
import { notifyError } from "../../lib/notify";
import TeeConnect from "../../components/TeeConnect";
import TeeProve from "../../components/TeeProve";
import ConfirmDialog from "../../components/ConfirmDialog";
import WalletIcon from "../../components/WalletIcon";
import Loader from "../../components/Loader";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [handle, setHandle] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [savingHandle, setSavingHandle] = useState(false);
  const [proveMode, setProveMode] = useState<"establish" | "add" | null>(
    null,
  );
  const [confirmOne, setConfirmOne] = useState<Wallet | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [banner, setBanner] = useState("");

  useEffect(() => {
    setReady(true);
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

  useEffect(() => {
    load();
  }, [load]);

  async function recheck() {
    if (checking) return;
    setChecking(true);
    try {
      if (profile && isTee(profile.eligibility)) await teeRecheck();
      await load();
      window.dispatchEvent(new Event("sixfigs-auth"));
    } catch (e) {
      console.error("eligibility recheck failed", e);
      notifyError(errMsg(e, "Couldn't recheck your holdings — try again"));
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
      notifyError(errMsg(e, "Couldn't save visibility — try again"));
    }
  }

  async function saveHandle() {
    const herr = handleError(handle);
    if (herr || savingHandle) {
      // No backend call on invalid input — reason goes to the error toast.
      if (herr) notifyError(herr);
      return;
    }
    setSavingHandle(true);
    try {
      await api("/profile/user", { method: "PATCH", body: { handle } });
      await load();
      window.dispatchEvent(new Event("sixfigs-auth"));
    } catch (e) {
      console.error("handle save failed", e);
      notifyError(errMsg(e, "Couldn't save the handle — try again"));
    } finally {
      setSavingHandle(false);
    }
  }

  function disconnect() {
    clearToken();
    disconnectSocket();
    setProfile(null);
    location.href = "/";
  }

  /** Single-wallet removal (tick-confirmed). For a tee account the session
   *  authorizes the enclave to detach the wallet and re-sign the remaining
   *  set; no wallet signature or address is involved. Legacy wallet rows keep
   *  the old disconnect behavior. */
  async function disconnectOne() {
    if (!confirmOne) return;
    if ((profile?.wallets.length ?? 0) <= 1) {
      setConfirmOne(null);
      notifyError("You cannot remove your only wallet");
      return;
    }
    const teeAccount = profile?.eligibility.source === "tee";
    try {
      if (teeAccount) {
        applyProfile(await removeTeeWallet(confirmOne.id));
        setBanner("Wallet removed — your tier now reflects the remaining wallets.");
      } else {
        await api(`/wallet/${confirmOne.id}`, { method: "DELETE" });
        await load();
        setBanner("Wallet disconnected — press CONNECT WALLET to restore your tier.");
      }
      setConfirmOne(null);
      clearProvedWallets();
      window.dispatchEvent(new Event("sixfigs-auth"));
    } catch (e) {
      console.error("wallet disconnect failed", e);
      notifyError(errMsg(e, "Couldn't remove that wallet — try again"));
    }
  }

  /** Disconnect every wallet (tick-confirmed): wipes verification. Press
   *  CONNECT WALLET to start over. */
  async function disconnectAll() {
    try {
      await api("/wallet", { method: "DELETE" });
      setConfirmAll(false);
      clearProvedWallets();
      await load();
      window.dispatchEvent(new Event("sixfigs-auth"));
      setBanner("All wallets disconnected — press CONNECT WALLET to start over.");
    } catch (e) {
      console.error("disconnect-all failed", e);
      notifyError(errMsg(e, "Couldn't disconnect wallets — try again"));
    }
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
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <p className="mono-label">PROFILE — CONNECT WALLET</p>
          <TeeConnect onDone={() => void load()} />
          <p className="fine" style={{ margin: 0 }}>
            <a href="/recover">USE USERNAME INSTEAD ↗</a>
          </p>
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

  return (
    <>
      <ProfileView
        profile={profile}
        checking={checking}
        proveMode={proveMode}
        banner={banner}
        onProve={(mode) => setProveMode(mode)}
        onProveDone={(p) => {
          setProveMode(null);
          applyProfile(p);
          // Header badge reads its own cached profile — tell it to reload
          // (it skips only a login-fast-path window, never this).
          window.dispatchEvent(new Event("sixfigs-auth"));
        }}
        onDismissFlow={() => setProveMode(null)}
        onRecheck={() => void recheck()}
        onCredsChanged={() => void load()}
        onSaveVis={(v) => void saveVis(v)}
        handle={handle}
        setHandle={setHandle}
        savingHandle={savingHandle}
        onSaveHandle={() => void saveHandle()}
        onDisconnectOne={(w) => setConfirmOne(w)}
        onDisconnectAll={() => setConfirmAll(true)}
        onLogout={disconnect}
      />
      {confirmOne && (
        <ConfirmDialog
          title="REMOVE WALLET"
          message={`Remove ${confirmOne.name ?? confirmOne.chain.toUpperCase()}? Your tier is recalculated from the remaining wallets and you can add it back any time.`}
          ackLabel="Yes, remove this wallet from my account — tick to confirm."
          confirmLabel="REMOVE WALLET"
          onConfirm={() => disconnectOne()}
          onClose={() => setConfirmOne(null)}
        />
      )}
      {confirmAll && (
        <ConfirmDialog
          title="DISCONNECT ALL WALLETS"
          message="Disconnect every wallet? Your tier resets immediately — re-prove any time to restore it. Your username sign-in stays untouched."
          ackLabel="Yes, disconnect all my wallets and reset my tier — tick to confirm."
          confirmLabel="DISCONNECT ALL"
          onConfirm={() => disconnectAll()}
          onClose={() => setConfirmAll(false)}
        />
      )}
    </>
  );
}

function isTee(elig: Profile["eligibility"]): elig is TeeEligibility {
  return (elig as { source?: string }).source === "tee";
}

function ProfileView({
  profile,
  checking,
  proveMode,
  banner,
  onProve,
  onProveDone,
  onDismissFlow,
  onRecheck,
  onCredsChanged,
  onSaveVis,
  handle,
  setHandle,
  savingHandle,
  onSaveHandle,
  onDisconnectOne,
  onDisconnectAll,
  onLogout,
}: {
  profile: Profile;
  checking: boolean;
  proveMode: "establish" | "add" | null;
  banner: string;
  onProve: (mode: "establish" | "add") => void;
  onProveDone: (p: Profile) => void;
  onDismissFlow: () => void;
  onRecheck: () => void;
  onCredsChanged: () => void;
  onSaveVis: (v: string) => void;
  handle: string;
  setHandle: (v: string) => void;
  savingHandle: boolean;
  onSaveHandle: () => void;
  onDisconnectOne: (w: Wallet) => void;
  onDisconnectAll: () => void;
  onLogout: () => void;
}) {
  const tee = isTee(profile.eligibility) ? profile.eligibility : null;
  const username = profile.handle ?? `user_${profile.id.slice(-4)}`;
  const hasIdentity = tee !== null;
  const addOnly = hasIdentity && profile.wallets.length > 0;
  // A disconnect zeroes the tier but keeps the enrolled rows: re-verify the
  // same set (or add) to restore it.
  const tierActive = profile.eligibility.tier != null;

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
      <div className="card" style={{ position: "relative", overflow: "hidden" }}>
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
            {tee?.tier ?? "UNVERIFIED"}
          </span>
        </div>

        <p
          style={{
            margin: "0.8rem 0 0",
            fontSize: "clamp(1.4rem, 4vw, 2rem)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
          }}
        >
          {!tee || tee.tier === null
            ? "BELOW $100K — LINK MORE BAGS."
            : tee.topAssets.length > 0
              ? tee.topAssets.join(" · ")
              : "VERIFIED HOLDER"}
        </p>
        <p className="fine" style={{ margin: "0.3rem 0 0" }}>
          {tee ? (
            <>
              BAND {tee.portfolioBand}
              {" · "}
              {tee.verified
                ? `VERIFIED ${new Date(tee.verifiedAt).toLocaleString()}`
                : "UNVERIFIED — PROVE BELOW."}
              {tee.stale && tee.verified ? " · REFRESHING…" : ""}
            </>
          ) : (
            "NO VERIFIED IDENTITY YET — PROVE YOUR WALLETS BELOW."
          )}
        </p>

        {banner && <p className="fine">{banner}</p>}

        <div className="profile-fields">
          <div>
            <p
              className="mono-label"
              style={{ marginBottom: "0.4rem", justifySelf: "center" }}
            >
              HANDLE
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <input
                className="field"
                value={handle}
                onChange={(e) => {
                  setHandle(e.target.value);
                }}
                placeholder="handle (3–24 chars)"
                style={{ maxWidth: "220px" }}
              />
              <button
                className="chip"
                disabled={savingHandle}
                onClick={onSaveHandle}
              >
                {savingHandle ? "SAVING…" : "SAVE"}
              </button>
            </div>
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
                  onClick={() => onSaveVis(v)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="fine" style={{ margin: "0.6rem 0 0" }}>
          VISIBLE = your tier shows up for friends in the 1v1 tab. No amounts
          are ever stored or shown.
        </p>
        <CredentialsCard profile={profile} onChanged={onCredsChanged} />
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
        {profile.wallets.length === 0 ? (
          <p className="fine">
            No wallets enrolled. Prove your first wallet below.
          </p>
        ) : (
          <div className="wallet-grid">
            {profile.wallets.map((w) => {
              const wname = w.name ?? w.chain.toUpperCase();
              return (
                <div key={w.id} className="wallet-row">
                  <WalletIcon
                    name={wname}
                    letter={wname.slice(0, 1).toUpperCase()}
                  />
                  <div className="wallet-info">
                    <strong style={{ fontSize: "1rem" }}>{wname}</strong>
                    <span className="fine" style={{ margin: 0 }}>
                      {`${w.chain.toUpperCase()} · ADDRESS HIDDEN BY DESIGN`}
                    </span>
                  </div>
                  <button
                    className="chip"
                    style={{ marginLeft: "auto" }}
                    title={`Remove ${wname}`}
                    onClick={() => onDisconnectOne(w)}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {proveMode && (
          <TeeProve
            key={proveMode}
            mode={proveMode}
            onDone={onProveDone}
            onDismiss={onDismissFlow}
          />
        )}
        <div className="wallet-actions">
          {proveMode ? (
            <button
              className="btn-solid"
              style={{ padding: "0.6rem 1rem" }}
              disabled
            >
              CONNECTING…
            </button>
          ) : !addOnly || !tierActive ? (
            <button
              className="btn-solid"
              style={{ padding: "0.6rem 1rem" }}
              onClick={() => onProve("establish")}
            >
              CONNECT WALLET ↗
            </button>
          ) : (
            <button
              className="btn-solid"
              style={{ padding: "0.6rem 1rem" }}
              onClick={() => onProve("add")}
            >
              ADD WALLET ↗
            </button>
          )}
            <button
              className="btn-ghost"
              style={{ padding: "0.6rem 1rem", margin: "0 auto" }}
              disabled={checking}
              onClick={onRecheck}
            >
              {checking ? "REFRESHING…" : "REFRESH TIER"}
            </button>
            <button
              className="btn-ghost"
              style={{ padding: "0.6rem 1rem" }}
              onClick={onDisconnectAll}
            >
              DISCONNECT ALL
            </button>
            <button
              className="btn-ghost"
              style={{ padding: "0.6rem 1rem" }}
              onClick={onLogout}
            >
              LOG OUT
            </button>
          </div>
      </div>
    </section>
  );
}

function usernameProblem(v: string): string | null {
  if (!/^[a-zA-Z0-9_.]{3,24}$/.test(v.trim()))
    return "Username: 3–24 chars, letters/numbers/._ only";
  return null;
}

/**
 * Optional device-free sign-in. Set a username + password once, then sign in
 * on any device without connecting wallets. Linking a wallet enables
 * recovery: forget either and a wallet signature re-issues them (/recover).
 */
function CredentialsCard({
  profile,
  onChanged,
}: {
  profile: Profile;
  onChanged: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function setup() {
    const bad = usernameProblem(username);
    if (bad) {
      notifyError(bad);
      return;
    }
    if (password.length < 10) {
      notifyError("Password must be at least 10 characters");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await usernameSetup(username.trim(), password);
      setMsg("Username sign-in enabled.");
      setUsername("");
      setPassword("");
      onChanged();
    } catch (e) {
      console.error("username setup failed", e);
      notifyError(errMsg(e, "Couldn't set username — try again"));
    } finally {
      setBusy(false);
    }
  }

  async function change() {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      await usernameChange(current, next);
      setMsg("Password updated. Other sessions were signed out.");
      setCurrent("");
      setNext("");
    } catch (e) {
      console.error("password change failed", e);
      notifyError(e instanceof Error ? e.message : "Could not change the password");
    } finally {
      setBusy(false);
    }
  }

  const isSet = profile.username != null && profile.username !== "";
  return (
    <div
      style={{
        marginTop: "0.8rem",
        border: "2px solid var(--ink)",
        background: "var(--card)",
        boxShadow: "4px 4px 0 var(--shadow)",
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          flexWrap: "wrap",
          padding: "0.55rem 0.9rem",
          borderBottom: "2px solid var(--ink)",
          background: isSet ? "var(--gold)" : "var(--ink)",
          color: isSet ? "var(--on-dark)" : "var(--paper)",
        }}
      >
        <span
          className="mono-label"
          style={{ margin: 0, color: "inherit", fontSize: "0.7rem" }}
        >
          DEVICE-FREE SIGN-IN
        </span>
        <span
          className="mono-label"
          style={{
            margin: 0,
            marginLeft: "auto",
            color: "inherit",
            fontSize: "0.68rem",
            border: "2px solid currentColor",
            padding: "0.15rem 0.5rem",
          }}
        >
          {isSet ? `@${profile.username}` : "NOT SET"}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.7rem",
          padding: "0.9rem",
        }}
      >
        {!isSet ? (
          <>
            <p className="fine" style={{ margin: 0 }}>
              Sign in on other devices without connecting wallets. Any
              enrolled wallet recovers these if forgotten — the server
              never sees an address, only enclave-sealed proofs.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(200px, 100%), 1fr))",
                gap: "0.5rem",
              }}
            >
              <input
                className="field"
                style={{ width: "100%" }}
                placeholder="username (3–24 chars)"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                className="field"
                style={{ width: "100%" }}
                type="password"
                autoComplete="new-password"
                placeholder="password (10+ chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              className="btn-solid"
              style={{ width: "100%" }}
              disabled={busy}
              onClick={() => void setup()}
            >
              {busy ? "SAVING…" : "ENABLE USERNAME SIGN-IN ↗"}
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(200px, 100%), 1fr))",
                gap: "0.5rem",
              }}
            >
              <input
                className="field"
                style={{ width: "100%" }}
                type="password"
                autoComplete="current-password"
                placeholder="current password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
              <input
                className="field"
                style={{ width: "100%" }}
                type="password"
                autoComplete="new-password"
                placeholder="new password (10+ chars)"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </div>
            <button
              className="btn-solid"
              style={{ width: "100%" }}
              disabled={busy}
              onClick={() => void change()}
            >
              {busy ? "SAVING…" : "UPDATE PASSWORD"}
            </button>
            <div
              style={{
                borderTop: "1px solid var(--line)",
                paddingTop: "0.7rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              <p className="mono-label" style={{ margin: 0, fontSize: "0.66rem" }}>
                WALLET RECOVERY
              </p>
              <p className="fine" style={{ margin: 0 }}>
                Every enrolled wallet doubles as recovery — no setup, no
                linking. Forgot either?{" "}
                <a href="/recover">Recover with a wallet ↗</a>
              </p>
            </div>
          </>
        )}
        {msg && <p className="fine" style={{ margin: 0 }}>{msg}</p>}
      </div>
    </div>
  );
}