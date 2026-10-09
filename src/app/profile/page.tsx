"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "@phosphor-icons/react";
import {
  api,
  clearToken,
  errMsg,
  getToken,
  removeTeeWallet,
  resetTeeIdentity,
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
import SignInButton from "../../components/SignInButton";
import TeeProve from "../../components/TeeProve";
import ConfirmDialog from "../../components/ConfirmDialog";
import WalletIcon from "../../components/WalletIcon";
import Loader from "../../components/Loader";
import TierTag from "../../components/TierTag";
import Chop from "../../components/Chop";

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
  const [visPending, setVisPending] = useState<string | null>(null);

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
      notifyError(errMsg(e, "Couldn't recheck your holdings. Try again."));
    } finally {
      setChecking(false);
    }
  }

  async function saveVis(visMode: string) {
    // The card flips on the click; the profile refresh lands behind it.
    // On failure the pending value clears and the stored one shows again.
    setVisPending(visMode);
    try {
      await api("/profile/user", { method: "PATCH", body: { visMode } });
      await load();
    } catch (e) {
      console.error("visibility save failed", e);
      notifyError(errMsg(e, "Couldn't save visibility. Try again."));
    } finally {
      setVisPending(null);
    }
  }

  async function saveHandle() {
    const herr = handleError(handle);
    if (herr || savingHandle) {
      // No backend call on invalid input; the reason goes to the error toast.
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
      notifyError(errMsg(e, "Couldn't save the handle. Try again."));
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

  /** Single-wallet removal (tick-confirmed). The session authorizes the
   *  enclave to detach the wallet and re-sign the remaining set; no wallet
   *  signature or address is involved. */
  async function disconnectOne() {
    if (!confirmOne) return;
    if ((profile?.wallets.length ?? 0) <= 1) {
      setConfirmOne(null);
      notifyError("You cannot remove your only wallet. Use Disconnect all to start over.");
      return;
    }
    try {
      applyProfile(await removeTeeWallet(confirmOne.id));
      setBanner("Wallet removed. Your tier now reflects the remaining wallets.");
      setConfirmOne(null);
      clearProvedWallets();
      window.dispatchEvent(new Event("sixfigs-auth"));
    } catch (e) {
      console.error("wallet disconnect failed", e);
      notifyError(errMsg(e, "Couldn't remove that wallet. Try again."));
    }
  }

  /** Disconnect every wallet (tick-confirmed): wipes verification. The
   *  username sign-in survives. */
  async function disconnectAll() {
    try {
      await resetTeeIdentity();
      setConfirmAll(false);
      clearProvedWallets();
      await load();
      window.dispatchEvent(new Event("sixfigs-auth"));
      setBanner("All wallets disconnected. Connect a wallet to start over.");
    } catch (e) {
      console.error("disconnect-all failed", e);
      notifyError(errMsg(e, "Couldn't disconnect wallets. Try again."));
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
          className="plate auth-card"
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <h1 className="label">The door</h1>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <SignInButton onDone={() => void load()} label="Sign in" />
          </div>
          <p className="fine" style={{ margin: 0 }}>
            New here? Connecting a wallet creates your account and proves
            your tier.
          </p>
        </div>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="page-enter loader-page">
        <Loader label="Setting your place" />
      </section>
    );
  }

  return (
    <>
      <ProfileView
        profile={profile}
        visMode={visPending ?? profile.visMode}
        checking={checking}
        proveMode={proveMode}
        banner={banner}
        onProve={(mode) => setProveMode(mode)}
        onProveDone={(p) => {
          setProveMode(null);
          applyProfile(p);
          // Header badge reads its own cached profile; tell it to reload
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
          title="Remove wallet"
          message={`Remove ${confirmOne.name ?? confirmOne.chain.toUpperCase()}? Your tier is recalculated from the remaining wallets, and you can add it back any time.`}
          ackLabel="Yes, remove this wallet from my account. Tick to confirm."
          confirmLabel="Remove wallet"
          onConfirm={() => disconnectOne()}
          onClose={() => setConfirmOne(null)}
        />
      )}
      {confirmAll && (
        <ConfirmDialog
          title="Disconnect all wallets"
          message="Disconnect every wallet? Your tier resets immediately. Re-prove any time to restore it. Your username sign-in stays untouched."
          ackLabel="Yes, disconnect all my wallets and reset my tier. Tick to confirm."
          confirmLabel="Disconnect all"
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
  visMode,
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
  visMode: string;
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
  const [walletSetDismissed, setWalletSetDismissed] = useState(false);
  const tee = isTee(profile.eligibility) ? profile.eligibility : null;
  const username = profile.handle ?? `user_${profile.id.slice(-4)}`;
  const hasIdentity = tee !== null;
  const addOnly = hasIdentity && profile.wallets.length > 0;
  // A disconnect zeroes the tier but keeps the enrolled rows: re-verify the
  // same set (or add) to restore it.
  const tierActive = profile.eligibility.tier != null;

  // The chop presses when the tier changes while on the page (first
  // verification, a recheck that moves you, a wallet removal). A plain page
  // load does not re-run it.
  const prevTier = useRef<string | null | undefined>(undefined);
  const [pressKey, setPressKey] = useState(0);
  useEffect(() => {
    const t = tee?.tier ?? null;
    if (prevTier.current !== undefined && t !== prevTier.current)
      setPressKey((k) => k + 1);
    prevTier.current = t;
  }, [tee?.tier]);

  return (
    <section className="page-enter shell" style={{ flex: 1 }}>
      <div className="plate">
        <div className="profile-head">
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <Chop id={profile.id} size="lg" />
            <div>
              <p className="label">Your place</p>
              <h1 className="profile-name">{username}</h1>
            </div>
          </div>
          <TierTag tier={tee?.tier ?? null} />
        </div>

        {tee && tee.tier !== null && tee.topAssets.length > 0 ? (
          <p className="fine num" style={{ marginTop: "0.8rem", fontSize: "0.95rem" }}>
            {tee.topAssets.join(", ")}
          </p>
        ) : null}

        <p className="fine" style={{ marginTop: "0.5rem" }}>
          {tee ? (
            <>
              Band {tee.portfolioBand.toUpperCase()}
              {" · "}
              {tee.verified
                ? `verified ${new Date(tee.verifiedAt).toLocaleString()}`
                : "unverified, prove below."}
              {tee.stale && tee.verified ? " · rechecking" : ""}
            </>
          ) : (
            "No verified identity yet. Prove your wallets below."
          )}
        </p>

        {banner && <p className="fine">{banner}</p>}

        <div className="profile-fields">
          <div>
            <p className="label" style={{ marginBottom: "0.45rem" }}>
              Handle
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <input
                className="field"
                value={handle}
                onChange={(e) => {
                  setHandle(e.target.value);
                }}
                placeholder="handle, 3 to 24 characters"
                style={{ maxWidth: "220px" }}
              />
              <button
                className="chip"
                disabled={savingHandle}
                onClick={onSaveHandle}
              >
                {savingHandle ? "Saving" : "Save"}
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "1.2rem" }}>
          <p className="label" style={{ marginBottom: "0.6rem" }}>
            What friends see
          </p>
          <div className="reveal-cards">
            {(["HIDDEN", "VISIBLE"] as const).map((v) => (
              <button
                key={v}
                className={`reveal-card${visMode === v ? " on" : ""}`}
                onClick={() => onSaveVis(v)}
                aria-pressed={visMode === v}
                aria-label={v === "HIDDEN" ? "Hidden: show nothing" : "Tier visible: show your tier"}
              >
                <div className="card-inner">
                  <div className="card-face">
                    {v === "VISIBLE" ? (
                      <>
                        <Chop id={profile.id} size="md" />
                        <span className="who">{tee?.tier ?? "Tier"}</span>
                        <span className="what">shown to connections</span>
                      </>
                    ) : (
                      <>
                        <span className="who">Hidden</span>
                        <span className="what">shown to no one</span>
                      </>
                    )}
                  </div>
                  <div className="card-back" aria-hidden="true" />
                </div>
                <span className="reveal-caption">
                  {v === "HIDDEN" ? "Hidden" : "Tier visible"}
                </span>
              </button>
            ))}
          </div>
          <p className="fine" style={{ marginTop: "0.7rem" }}>
            Turning your cards: visible shows your tier to connections. No
            amounts are ever shown. Reversible any time.
          </p>
        </div>

        <CredentialsCard profile={profile} onChanged={onCredsChanged} />
      </div>

      <div className="plate">
        <div className="topline">
          <p className="label">Wallets</p>
          <span className="fine num">
            {profile.wallets.length}/{MAX_WALLETS}
          </span>
        </div>
        {profile.wallets.length === 1 && !walletSetDismissed && (
          <div
            className="invite-box"
            style={{ marginTop: "0.7rem", justifyContent: "space-between" }}
          >
            <span>
              Your tier reflects the one wallet connected so far. Add your
              other wallets. It can only go up.
            </span>
            <button className="chip" onClick={() => setWalletSetDismissed(true)}>
              Got it
            </button>
          </div>
        )}
        {profile.wallets.length === 0 ? (
          <p className="fine" style={{ marginTop: "0.7rem" }}>
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
                    <strong>{wname}</strong>
                    <span className="fine">
                      {`${w.chain.toUpperCase()} · address hidden by design`}
                    </span>
                  </div>
                  <button
                    className="chip"
                    style={{ marginLeft: "auto" }}
                    title={`Remove ${wname}`}
                    aria-label={`Remove ${wname}`}
                    onClick={() => onDisconnectOne(w)}
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="wallet-actions">
          {!addOnly || !tierActive ? (
            <button className="btn btn-primary" onClick={() => onProve("establish")}>
              Connect wallet
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => onProve("add")}>
              Add wallet
            </button>
          )}
          <button
            className="btn-ghost"
            disabled={checking}
            onClick={onRecheck}
          >
            {checking ? "Refreshing" : "Refresh tier"}
          </button>
          <button className="btn-ghost" onClick={onDisconnectAll}>
            Disconnect all
          </button>
          <button className="btn-ghost" onClick={onLogout}>
            Log out
          </button>
        </div>
      </div>
      {proveMode && (
        <div
          className="veil"
          role="dialog"
          aria-label={proveMode === "add" ? "Add a wallet" : "Connect a wallet"}
        >
          <div
            className="dialog"
            style={{ alignItems: "center", textAlign: "center" }}
          >
            <p className="door-title">
              {proveMode === "add" ? "Add a wallet" : "Connect a wallet"}
            </p>
            <ol className="ceremony-steps">
              <li>
                <span className="step-dot" aria-hidden="true" />
                Your wallet opens a signature request. One plain message.
                Nothing moves: no transaction, no gas.
              </li>
              <li>
                <span className="step-dot" aria-hidden="true" />
                Your browser checks the enclave against the pinned
                fingerprint, then sends the request encrypted.
              </li>
              <li>
                <span className="step-dot" aria-hidden="true" />
                The enclave reads balances and signs the tier. Your addresses
                are forgotten.
              </li>
            </ol>
            <TeeProve
              key={proveMode}
              mode={proveMode}
              busyLabel="Opening your wallet…"
              onDone={onProveDone}
              onDismiss={onDismissFlow}
            />
            <button
              className="btn-ghost btn-sm"
              onClick={onDismissFlow}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function usernameProblem(v: string): string | null {
  if (!/^[a-zA-Z0-9_.]{3,24}$/.test(v.trim()))
    return "Username: 3 to 24 characters, letters, numbers, . and _ only";
  return null;
}

/**
 * Optional device-free sign-in. Set a username + password once, then sign in
 * on any device without connecting wallets. Any enrolled wallet enables
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
      notifyError("Password must be at least 10 characters.");
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
      notifyError(errMsg(e, "Couldn't set username. Try again."));
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
      notifyError(
        e instanceof Error ? e.message : "Could not change the password.",
      );
    } finally {
      setBusy(false);
    }
  }

  const isSet = profile.username != null && profile.username !== "";
  return (
    <div className="ceremony" style={{ borderColor: "var(--line-soft)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          flexWrap: "wrap",
        }}
      >
        <p className="label" style={{ margin: 0 }}>
          Device-free sign-in
        </p>
        <span
          className="tier-tag"
          style={{ marginLeft: "auto" }}
        >
          {isSet ? `@${profile.username}` : "not set"}
        </span>
      </div>
      {!isSet ? (
        <>
          <p className="fine" style={{ margin: 0 }}>
            Sign in on other devices without connecting wallets. Any enrolled
            wallet recovers these if forgotten. The server never sees an
            address, only enclave-sealed proofs.
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
              placeholder="username, 3 to 24 characters"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              className="field"
              style={{ width: "100%" }}
              type="password"
              autoComplete="new-password"
              placeholder="password, 10+ characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="ceremony-actions">
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void setup()}
            >
              {busy ? "Saving" : "Enable username sign-in"}
            </button>
          </div>
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
              placeholder="new password, 10+ characters"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </div>
          <div className="ceremony-actions">
            <button
              className="btn"
              disabled={busy}
              onClick={() => void change()}
            >
              {busy ? "Saving" : "Update password"}
            </button>
          </div>
          <p className="fine" style={{ margin: 0 }}>
            Every enrolled wallet doubles as recovery. Forgot either?{" "}
            <a href="/recover" style={{ color: "inherit" }}>
              Recover with a wallet
            </a>
            .
          </p>
        </>
      )}
      {msg && <p className="fine" style={{ margin: 0 }}>{msg}</p>}
    </div>
  );
}
