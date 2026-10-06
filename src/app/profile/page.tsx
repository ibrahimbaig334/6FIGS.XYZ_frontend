"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  clearToken,
  emailChangePassword,
  emailResendVerification,
  errMsg,
  getToken,
  teeRecheck,
  Profile,
  TeeEligibility,
  Wallet,
} from "../../lib/api";
import { clearProvedWallets } from "../../lib/teeVerify";
import { handleError } from "../../lib/validate";
import { MAX_WALLETS } from "../../lib/constants";
import { disconnectSocket } from "../../lib/ws";
import { notifyError } from "../../lib/notify";
import EmailAuth from "../../components/EmailAuth";
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
  const [showLink, setShowLink] = useState(false);
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

  async function resendVerification() {
    setBanner("");
    try {
      await emailResendVerification();
      setBanner("Verification email sent — check your inbox.");
    } catch (e) {
      console.error("resend verification failed", e);
      notifyError(e instanceof Error ? e.message : "Could not send the email");
    }
  }

  function disconnect() {
    clearToken();
    disconnectSocket();
    setProfile(null);
    location.href = "/";
  }

  /** Single-wallet disconnect (tick-confirmed): only that wallet leaves —
   *  the rest stay enrolled, the tier resets. Press CONNECT WALLET to
   *  restore the badge. */
  async function disconnectOne() {
    if (!confirmOne) return;
    try {
      await api(`/wallet/${confirmOne.id}`, { method: "DELETE" });
      setConfirmOne(null);
      clearProvedWallets();
      await load();
      window.dispatchEvent(new Event("sixfigs-auth"));
      setBanner("Wallet disconnected — press CONNECT WALLET to restore your tier.");
    } catch (e) {
      console.error("wallet disconnect failed", e);
      notifyError(errMsg(e, "Couldn't disconnect that wallet — try again"));
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
          <p className="mono-label">PROFILE — SIGN IN FIRST</p>
          <EmailAuth onDone={() => void load()} />
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
        showLink={showLink}
        banner={banner}
        onProve={(mode) => setProveMode(mode)}
        onProveDone={(p) => {
          setProveMode(null);
          applyProfile(p);
        }}
        onDismissFlow={() => setProveMode(null)}
        onLink={() => setShowLink((v) => !v)}
        onLinked={() => {
          setShowLink(false);
          void load();
        }}
        onRecheck={() => void recheck()}
        onResendVerification={() => void resendVerification()}
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
          title="DISCONNECT WALLET"
          message={`Disconnect ${confirmOne.name ?? confirmOne.chain.toUpperCase()}? Your tier resets immediately — re-prove your remaining wallets any time to restore it.`}
          ackLabel="Yes, disconnect this wallet and reset my tier — tick to confirm."
          confirmLabel="DISCONNECT WALLET"
          onConfirm={() => disconnectOne()}
          onClose={() => setConfirmOne(null)}
        />
      )}
      {confirmAll && (
        <ConfirmDialog
          title="DISCONNECT ALL WALLETS"
          message="Disconnect every wallet? Your tier resets immediately — re-prove any time to restore it. Your email login stays untouched."
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
  showLink,
  banner,
  onProve,
  onProveDone,
  onDismissFlow,
  onLink,
  onLinked,
  onRecheck,
  onResendVerification,
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
  showLink: boolean;
  banner: string;
  onProve: (mode: "establish" | "add") => void;
  onProveDone: (p: Profile) => void;
  onDismissFlow: () => void;
  onLink: () => void;
  onLinked: () => void;
  onRecheck: () => void;
  onResendVerification: () => void;
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

        {profile.email && profile.emailVerified === false && (
          <div
            style={{
              marginTop: "0.9rem",
              border: "2px solid var(--ink)",
              padding: "0.7rem 0.9rem",
              display: "flex",
              gap: "0.6rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span className="fine" style={{ margin: 0 }}>
              VERIFY YOUR EMAIL TO SECURE RECOVERY.
            </span>
            <button className="chip" onClick={onResendVerification}>
              RESEND LINK
            </button>
          </div>
        )}
        {banner && <p className="fine">{banner}</p>}

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
        {!profile.email && (
          <div style={{ marginTop: "0.8rem" }}>
            <button className="chip" onClick={onLink}>
              {showLink ? "CANCEL" : "LINK EMAIL ↗"}
            </button>
            {showLink && (
              <div style={{ marginTop: "0.6rem", maxWidth: "340px" }}>
                <EmailAuth linkOnly onDone={onLinked} />
              </div>
            )}
          </div>
        )}
        {profile.email && (
          <ChangePasswordForm />
        )}
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
                      {w.chain.toUpperCase()} · ADDRESS HIDDEN BY DESIGN
                    </span>
                  </div>
                  <button
                    className="chip"
                    style={{ marginLeft: "auto" }}
                    title={`Disconnect ${wname}`}
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

function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      await emailChangePassword(current, next);
      setMsg("Password updated. Other sessions were signed out.");
      setCurrent("");
      setNext("");
      setOpen(false);
    } catch (e) {
      console.error("password change failed", e);
      notifyError(e instanceof Error ? e.message : "Could not change the password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: "0.8rem" }}>
      <button className="chip" onClick={() => setOpen((v) => !v)}>
        {open ? "CANCEL" : "CHANGE PASSWORD"}
      </button>
      {open && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            marginTop: "0.6rem",
            maxWidth: "340px",
          }}
        >
          <input
            className="field"
            type="password"
            autoComplete="current-password"
            placeholder="current password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <input
            className="field"
            type="password"
            autoComplete="new-password"
            placeholder="new password (10+ chars)"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <button className="btn-solid" disabled={busy} onClick={() => void submit()}>
            {busy ? "SAVING…" : "UPDATE PASSWORD"}
          </button>
        </div>
      )}
      {msg && <p className="fine">{msg}</p>}
    </div>
  );
}