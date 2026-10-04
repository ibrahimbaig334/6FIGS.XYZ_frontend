"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  clearToken,
  emailChangePassword,
  emailResendVerification,
  getToken,
  teeRecheck,
  Profile,
  TeeEligibility,
} from "../../lib/api";
import { handleError } from "../../lib/validate";
import { MAX_WALLETS } from "../../lib/constants";
import { disconnectSocket } from "../../lib/ws";
import SolanaConnect from "../../components/SolanaConnect";
import EmailAuth from "../../components/EmailAuth";
import TeeProve from "../../components/TeeProve";
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
  const [showProve, setShowProve] = useState(false);
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
      if (profile && isTee(profile.eligibility)) await teeRecheck();
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

  async function resendVerification() {
    setBanner("");
    try {
      await emailResendVerification();
      setBanner("Verification email sent — check your inbox.");
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Could not send the email");
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
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <p className="mono-label">PROFILE — SIGN IN FIRST</p>
          <EmailAuth onDone={() => void load()} />
          <p className="fine" style={{ margin: "0.4rem 0 0" }}>
            …or link a wallet (legacy sign-in)
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
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

  return (
    <ProfileView
      profile={profile}
      checking={checking}
      showProve={showProve}
      showLink={showLink}
      banner={banner}
      onProve={() => setShowProve(true)}
      onProveDone={(p) => {
        setShowProve(false);
        applyProfile(p);
      }}
      onProveCancel={() => setShowProve(false)}
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
      handleErr={handleErr}
      savingHandle={savingHandle}
      onSaveHandle={() => void saveHandle()}
      onDisconnect={disconnect}
    />
  );
}

function isTee(elig: Profile["eligibility"]): elig is TeeEligibility {
  return (elig as { source?: string }).source === "tee";
}

function ProfileView({
  profile,
  checking,
  showProve,
  showLink,
  banner,
  onProve,
  onProveDone,
  onProveCancel,
  onLink,
  onLinked,
  onRecheck,
  onResendVerification,
  onSaveVis,
  handle,
  setHandle,
  handleErr,
  savingHandle,
  onSaveHandle,
  onDisconnect,
}: {
  profile: Profile;
  checking: boolean;
  showProve: boolean;
  showLink: boolean;
  banner: string;
  onProve: () => void;
  onProveDone: (p: Profile) => void;
  onProveCancel: () => void;
  onLink: () => void;
  onLinked: () => void;
  onRecheck: () => void;
  onResendVerification: () => void;
  onSaveVis: (v: string) => void;
  handle: string;
  setHandle: (v: string) => void;
  handleErr: string;
  savingHandle: boolean;
  onSaveHandle: () => void;
  onDisconnect: () => void;
}) {
  const tee = isTee(profile.eligibility) ? profile.eligibility : null;
  const username = profile.handle ?? `user_${profile.id.slice(-4)}`;
  const enrolledLabels = tee
    ? tee.wallets
        .map((w) => w.label ?? w.family.toUpperCase())
        .filter((l, i, a) => a.indexOf(l) === i)
    : profile.wallets
        .map((w) => w.name ?? w.chain.toUpperCase())
        .filter((l, i, a) => a.indexOf(l) === i);
  const hasIdentity = tee !== null;
  const addOnly = hasIdentity && profile.wallets.length > 0;

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
                </div>
              );
            })}
          </div>
        )}
        {showProve ? (
          <div style={{ marginTop: "0.8rem" }}>
            <TeeProve
              mode={addOnly ? "add" : "establish"}
              enrolledLabels={enrolledLabels}
              onDone={onProveDone}
              onCancel={onProveCancel}
            />
          </div>
        ) : (
          <div className="wallet-actions">
            <button
              className="btn-solid"
              style={{ padding: "0.6rem 1rem" }}
              onClick={onProve}
            >
              {addOnly ? "ADD WALLET ↗" : "PROVE TIER ↗"}
            </button>
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
              onClick={onDisconnect}
            >
              DISCONNECT ALL
            </button>
          </div>
        )}
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
      setMsg(e instanceof Error ? e.message : "Could not change the password");
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