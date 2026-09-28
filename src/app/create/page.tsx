"use client";

import { useEffect, useState } from "react";
import { api, getToken } from "../../lib/api";
import {
  inviteCodeError,
  roomDescriptionError,
  roomNameError,
} from "../../lib/validate";
import ConnectPopup from "../../components/ConnectPopup";

export default function CreateRoomPage() {
  const [form, setForm] = useState({
    name: "",
    description: "",
    accessType: "tier",
    minTier: "TIER I",
    inviteCode: "",
  });
  const [err, setErr] = useState("");
  const [fieldErrs, setFieldErrs] = useState<{
    name?: string;
    description?: string;
    inviteCode?: string;
  }>({});
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [popup, setPopup] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  function validate(f: typeof form) {
    return {
      name: roomNameError(f.name) ?? undefined,
      description: roomDescriptionError(f.description) ?? undefined,
      inviteCode:
        f.accessType === "invite"
          ? (inviteCodeError(f.inviteCode) ?? undefined)
          : undefined,
    };
  }

  function setField(k: keyof typeof form, v: string) {
    const next = { ...form, [k]: v };
    setForm(next);
    // live re-validate once errors are showing
    setFieldErrs((prev) => {
      if (!prev.name && !prev.description && !prev.inviteCode) return prev;
      return { ...prev, ...validate(next) };
    });
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const fe = validate(form);
    setFieldErrs(fe);
    if (fe.name || fe.description || fe.inviteCode) return; // no backend call on invalid input
    setErr("");
    setBusy(true);
    try {
      const room = await api<{ id: string; inviteCode?: string }>("/rooms", {
        method: "POST",
        body: form,
      });
      if (room.inviteCode)
        sessionStorage.setItem(`invite:${room.id}`, room.inviteCode);
      location.href = `/rooms/${room.id}`;
    } catch (err2) {
      setErr(err2 instanceof Error ? err2.message : "Create failed");
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <section style={{ padding: "2rem 5vw" }}>
        <p className="mono-label">LOADING…</p>
      </section>
    );
  }

  if (!getToken()) {
    return (
      <section className="page-enter" style={{ padding: "2rem 5vw" }}>
        <div className="card" style={{ maxWidth: "560px" }}>
          <p className="mono-label">CREATE ROOM — CONNECT FIRST</p>
          <button
            className="btn-solid"
            style={{ marginTop: "0.8rem" }}
            onClick={() => setPopup(true)}
          >
            CONNECT WALLET ↗
          </button>
        </div>
        {popup && (
          <ConnectPopup
            onClose={() => setPopup(false)}
            onDone={() => location.reload()}
          />
        )}
      </section>
    );
  }

  return (
    <section className="page-enter" style={{ padding: "2rem 5vw" }}>
      <p className="mono-label">
        <a href="/rooms" style={{ color: "inherit" }}>
          ← PRIVATE ROOMS
        </a>
      </p>
      <h2
        style={{
          margin: "0.4rem 0 1rem",
          fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
          letterSpacing: "-0.03em",
        }}
      >
        CREATE A 1V1 ROOM
      </h2>
      <form
        onSubmit={create}
        className="card"
        style={{
          maxWidth: "640px",
          display: "flex",
          flexDirection: "column",
          gap: "0.9rem",
        }}
      >
        <label className="mono-label">
          NAME
          <input
            className="field"
            style={{ marginTop: "0.4rem", width: "100%" }}
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="HYPE Talks"
            maxLength={48}
          />
        </label>
        {fieldErrs.name && (
          <p className="err" style={{ margin: "-0.4rem 0 0" }}>
            {fieldErrs.name}
          </p>
        )}
        <label className="mono-label">
          DESCRIPTION
          <input
            className="field"
            style={{ marginTop: "0.4rem", width: "100%" }}
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder="What is this room about?"
            maxLength={160}
          />
        </label>
        {fieldErrs.description && (
          <p className="err" style={{ margin: "-0.4rem 0 0" }}>
            {fieldErrs.description}
          </p>
        )}
        <label className="mono-label">
          VIEW
          <select
            className="field"
            style={{ marginTop: "0.4rem", width: "100%" }}
            value={form.accessType}
            onChange={(e) => setForm({ ...form, accessType: e.target.value })}
          >
            <option value="tier">TIER-BASED ENTRY</option>
            <option value="invite">INVITE-ONLY</option>
          </select>
        </label>
        {form.accessType === "tier" ? (
          <label className="mono-label">
            MINIMUM TIER
            <select
              className="field"
              style={{ marginTop: "0.4rem", width: "100%" }}
              value={form.minTier}
              onChange={(e) => setForm({ ...form, minTier: e.target.value })}
            >
              <option>TIER I</option>
              <option>TIER II</option>
              <option>TIER III</option>
            </select>
          </label>
        ) : (
          <>
            <label className="mono-label">
              INVITE CODE
              <input
                className="field"
                style={{ marginTop: "0.4rem", width: "100%" }}
                value={form.inviteCode}
                onChange={(e) =>
                  setField("inviteCode", e.target.value.toUpperCase())
                }
                placeholder="SECRET1"
                maxLength={32}
              />
            </label>
            {fieldErrs.inviteCode && (
              <p className="err" style={{ margin: "-0.4rem 0 0" }}>
                {fieldErrs.inviteCode}
              </p>
            )}
          </>
        )}
        {err && (
          <p
            style={{
              color: "var(--crimson)",
              fontFamily: "var(--font-dm-mono)",
              fontSize: "0.78rem",
              margin: 0,
            }}
          >
            {err}
          </p>
        )}
        <div>
          <button className="btn-solid" type="submit" disabled={busy}>
            {busy ? "CREATING…" : "CREATE ROOM ↗"}
          </button>
        </div>
        <p className="fine" style={{ margin: 0 }}>
          Max 3 rooms each — delete one to make another. 1v1 only: two seats,
          you + one peer.
        </p>
      </form>
    </section>
  );
}
