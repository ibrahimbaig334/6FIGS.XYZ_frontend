"use client";

import { useEffect, useState } from "react";
import { api, errMsg, getToken, Profile, RoomList } from "../../lib/api";
import {
  ROOM_PUNCH_LINES,
  ROOM_NAME_MAX,
  ROOM_DESC_MAX,
  MAX_ROOMS_PER_USER,
  TIER_ORDER,
  tierRank,
} from "../../lib/constants";
import {
  clampGraphemes,
  inviteCodeError,
  roomDescriptionError,
  roomNameError,
} from "../../lib/validate";
import { notifyError } from "../../lib/notify";
import SelectMenu from "../../components/SelectMenu";
import EmojiPicker from "../../components/EmojiPicker";
import SolanaConnect from "../../components/SolanaConnect";
import Loader from "../../components/Loader";

export default function CreateRoomPage() {
  const [form, setForm] = useState({
    name: "",
    description: "",
    accessType: "tier",
    minTier: "TIER I",
    inviteCode: "",
  });
  const [fieldErrs, setFieldErrs] = useState<{
    name?: string;
    description?: string;
    inviteCode?: string;
  }>({});
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [token, setTokenState] = useState<string | null>(null);
  const [punch, setPunch] = useState(ROOM_PUNCH_LINES[0]);
  // Same display rule as room cards: saved handle, else the generated fallback.
  const [username, setUsername] = useState("");
  const [owned, setOwned] = useState<number | null>(null);
  // Your tier caps the MINIMUM TIER options — a room can never demand more
  // than you hold (higher options are hidden; backend enforces the same).
  const [myTier, setMyTier] = useState<string | null>(null);
  const allowedTiers = myTier ? TIER_ORDER.slice(0, tierRank(myTier)) : [];
  const tierOptions = allowedTiers.map((t) => ({ value: t, label: t }));

  // Specific, actionable limit message (not the generic create failure).
  const roomsFull = owned !== null && owned >= MAX_ROOMS_PER_USER;
  const roomsFullMsg = `Maximum room limit reached (${MAX_ROOMS_PER_USER}) — delete a previous room to create a new one.`;

  useEffect(() => {
    setReady(true);
    setTokenState(getToken());
    // Random punch line after mount (keeps SSR/first paint identical).
    setPunch(
      ROOM_PUNCH_LINES[Math.floor(Math.random() * ROOM_PUNCH_LINES.length)],
    );
    if (getToken()) {
      api<Profile>("/profile/user")
        .then((p) => {
          setUsername(p.handle ?? `user_${p.id.slice(-4)}`);
          setMyTier(p.eligibility.tier);
        })
        .catch(() => {});
      api<RoomList>("/rooms?limit=1")
        .then((r) => setOwned(r.ownedCount ?? 0))
        .catch(() => {});
    }
    const h = () => setTokenState(getToken());
    window.addEventListener("sixfigs-auth", h);
    return () => window.removeEventListener("sixfigs-auth", h);
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
    // Soft grapheme cap: typed and picker-appended text both stop at the
    // limit (emoji = 1 char). Submit validation stays as the backstop.
    const capped =
      k === "name"
        ? clampGraphemes(v, ROOM_NAME_MAX)
        : k === "description"
          ? clampGraphemes(v, ROOM_DESC_MAX)
          : v;
    const next = { ...form, [k]: capped };
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
    if (roomsFull) {
      notifyError(roomsFullMsg);
      return;
    }
    if (
      form.accessType === "tier" &&
      tierRank(form.minTier) > tierRank(myTier)
    ) {
      notifyError(
        myTier
          ? `You are ${myTier} — you cannot require a higher tier`
          : "Verify your holdings in Profile to create a tier room",
      );
      return;
    }
    const fe = validate(form);
    setFieldErrs(fe);
    if (fe.name || fe.description || fe.inviteCode) return; // no backend call on invalid input
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
      console.error("create room failed", err2);
      // 4xx reasons come straight from the backend: room cap, tier cap, bad
      // fields. Anything else gets the fixed fallback — never a raw failure.
      notifyError(errMsg(err2, "Couldn't create room — try again"));
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <section className="page-enter loader-page">
        <Loader />
      </section>
    );
  }

  if (!token) {
    return (
      <section
        className="page-enter"
        style={{
          padding: "2rem 5vw",
          display: "grid",
          placeItems: "center",
          minHeight: "75vh",
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
          <p className="mono-label">CREATE ROOM — CONNECT WALLET</p>
          <p className="fine" style={{ margin: "0.6rem 0 0", fontSize: 14 }}>
            Connect a wallet to spin up your 1v1 room.
          </p>
          <div
            style={{
              marginTop: "1.2rem",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <SolanaConnect
              onDone={() => {
                setTokenState(getToken());
              }}
            />
          </div>
          <p className="fine" style={{ margin: "0.8rem 0 0" }}>
            <a href="/recover">USE USERNAME INSTEAD ↗</a>
          </p>
        </div>
      </section>
    );
  }

  const previewName = form.name.trim() || "Room name";
  const previewDesc = form.description.trim() || "Description";
  const isInvite = form.accessType === "invite";

  return (
    <section className="page-enter" style={{ padding: "2rem 5vw" }}>
      <p className="mono-label">
        <a href="/rooms" style={{ color: "inherit", fontSize: 15 }}>
          ← PRIVATE ROOMS
        </a>
      </p>
      <h2
        style={{
          margin: "0.4rem 0 0.2rem",
          fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
          letterSpacing: "-0.03em",
        }}
      >
        CREATE A ROOM
      </h2>
      <p
        className="fine"
        style={{ margin: "0 0 1rem", fontSize: "0.85rem", fontStyle: "italic" }}
      >
        {punch}
      </p>
      <div className="layout-create">
        <form
          onSubmit={create}
          className="card"
          style={{
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
            />
          </label>
          {fieldErrs.name && (
            <p className="err" style={{ margin: "-0.4rem 0 0" }}>
              {fieldErrs.name}
            </p>
          )}
          <label className="mono-label">
            DESCRIPTION
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginTop: "0.4rem",
                alignItems: "stretch",
              }}
            >
              <input
                className="field"
                style={{ width: "100%" }}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="What is this room about? 🎲"
              />
              <EmojiPicker
                onPick={(e) =>
                  setField("description", `${form.description}${e}`)
                }
              />
            </div>
          </label>
          {fieldErrs.description && (
            <p className="err" style={{ margin: "-0.4rem 0 0" }}>
              {fieldErrs.description}
            </p>
          )}
          <div>
            <p className="mono-label" style={{ marginBottom: "0.4rem" }}>
              VIEW
            </p>
            <SelectMenu
              label="Room view"
              value={form.accessType}
              onChange={(v) => setField("accessType", v)}
              options={[
                { value: "tier", label: "TIER-BASED ENTRY" },
                { value: "invite", label: "INVITE-ONLY" },
              ]}
            />
          </div>
          {form.accessType === "tier" ? (
            <div>
              <p className="mono-label" style={{ marginBottom: "0.4rem" }}>
                MINIMUM TIER
              </p>
              {tierOptions.length > 0 ? (
                <SelectMenu
                  label="Minimum tier"
                  value={form.minTier}
                  onChange={(v) => setField("minTier", v)}
                  options={tierOptions}
                />
              ) : (
                <p className="fine" style={{ margin: 0 }}>
                  {myTier === null
                    ? "Tier options load with your profile."
                    : "Verify your holdings in Profile to create a tier room."}
                </p>
              )}
            </div>
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
          <div>
            <button
              className="btn-solid"
              type="submit"
              disabled={busy}
            >
              {busy ? "CREATING…" : "CREATE ROOM ↗"}
            </button>
          </div>
        </form>
        <div style={{ position: "relative", alignSelf: "center" }}>
          <div className="ticket" aria-hidden="true">
            <div className="ticket-ribbon">PREVIEW</div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span className={isInvite ? "tier-badge t3" : "tier-badge"}>
                {isInvite ? "🔒 INVITE-ONLY" : `✓ ${form.minTier}`}
              </span>
              <span className="fine">
                <span className="dot" /> 0/2 ONLINE
              </span>
            </div>
            <p className="ticket-name">{previewName}</p>
            <p className="fine" style={{ margin: "0.2rem 0 0", fontSize: 20 }}>
              {previewDesc}
            </p>
            <div className="ticket-stub">
              <span>BY {username.toUpperCase()} · ADMIT 1V1</span>
              <span aria-hidden="true">✕ ○ ✕</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
