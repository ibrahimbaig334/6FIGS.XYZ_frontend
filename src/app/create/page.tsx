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
import SignInButton from "../../components/SignInButton";
import Loader from "../../components/Loader";
import { tierEdgeClass } from "../../lib/tierEdge";

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
  // Your tier caps the minimum tier options. A room can never demand more
  // than you hold (higher options are hidden; the backend enforces the same).
  const [myTier, setMyTier] = useState<string | null>(null);
  const allowedTiers = myTier ? TIER_ORDER.slice(0, tierRank(myTier)) : [];
  const tierOptions = allowedTiers.map((t) => ({ value: t, label: t }));

  // Specific, actionable limit message (not the generic create failure).
  const roomsFull = owned !== null && owned >= MAX_ROOMS_PER_USER;
  const roomsFullMsg = `The floor is full (${MAX_ROOMS_PER_USER}). Clear a previous table before setting a new one.`;

  useEffect(() => {
    setReady(true);
    setTokenState(getToken());
    // Random punch line after mount (keeps SSR and first paint identical).
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
    // Live re-validate once errors are showing.
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
          ? `You are ${myTier}. You cannot require a higher tier.`
          : "Verify your holdings in Profile to create a tier table.",
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
      // fields. Anything else gets the fixed fallback, never a raw failure.
      notifyError(errMsg(err2, "Couldn't set the table. Try again."));
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
          flex: 1,
        }}
      >
        <div className="plate auth-card">
          <h1 className="label">The door</h1>
          <p className="fine" style={{ margin: 0 }}>
            Log in to set a table of your own.
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <SignInButton
              label="Sign in"
              onDone={() => {
                setTokenState(getToken());
              }}
            />
          </div>
        </div>
      </section>
    );
  }

  const previewName = form.name.trim() || "Table name";
  const previewDesc = form.description.trim() || "Description";
  const isInvite = form.accessType === "invite";

  return (
    <section className="page-enter shell">
      <p className="fine">
        <a href="/rooms" style={{ color: "inherit" }}>
          Back to the floor
        </a>
      </p>
      <div className="topline">
        <h1 style={{ margin: 0 }}>Set a table</h1>
      </div>
      <p className="fine" style={{ fontStyle: "italic" }}>
        {punch}
      </p>
      <div className="create-grid">
        <form onSubmit={create} className="plate create-form">
          <label className="label">
            Name
            <input
              className="field"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="The Long Room"
            />
          </label>
          {fieldErrs.name && <p className="err">{fieldErrs.name}</p>}
          <label className="label">
            Description
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
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="What is this table about?"
              />
              <EmojiPicker
                onPick={(e) =>
                  setField("description", `${form.description}${e}`)
                }
              />
            </div>
          </label>
          {fieldErrs.description && (
            <p className="err">{fieldErrs.description}</p>
          )}
          <div>
            <p className="label" style={{ marginBottom: "0.4rem" }}>
              Entry
            </p>
            <SelectMenu
              label="Room entry"
              value={form.accessType}
              onChange={(v) => setField("accessType", v)}
              options={[
                { value: "tier", label: "Tier based" },
                { value: "invite", label: "Invite only" },
              ]}
            />
          </div>
          {form.accessType === "tier" ? (
            <div>
              <p className="label" style={{ marginBottom: "0.4rem" }}>
                Minimum tier
              </p>
              {tierOptions.length > 0 ? (
                <SelectMenu
                  label="Minimum tier"
                  value={form.minTier}
                  onChange={(v) => setField("minTier", v)}
                  options={tierOptions}
                />
              ) : (
                <p className="fine">
                  {myTier === null
                    ? "Tier options load with your profile."
                    : "Verify your holdings in Profile to create a tier table."}
                </p>
              )}
            </div>
          ) : (
            <>
              <label className="label">
                Invite code
                <input
                  className="field"
                  style={{ marginTop: "0.4rem", width: "100%" }}
                  value={form.inviteCode}
                  onChange={(e) =>
                    setField("inviteCode", e.target.value.toUpperCase())
                  }
                  placeholder="e.g. VELVET"
                  maxLength={32}
                />
              </label>
              {fieldErrs.inviteCode && (
                <p className="err">{fieldErrs.inviteCode}</p>
              )}
            </>
          )}
          <div>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={busy || roomsFull}
            >
              {busy ? "Setting" : "Set the table"}
            </button>
            {roomsFull && <p className="err">{roomsFullMsg}</p>}
          </div>
        </form>
        <div style={{ alignSelf: "center" }}>
          <div className="ticket" aria-hidden="true">
            <p className="label">Preview</p>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: "0.7rem",
              }}
            >
              <span className={`tier-tag ${tierEdgeClass(form.minTier)}`}>
                {isInvite ? "Invite only" : form.minTier}
              </span>
              <span className="fine num">
                <span className="dot" /> 0/2 in the room
              </span>
            </div>
            <p className="ticket-name">{previewName}</p>
            <p className="fine" style={{ marginTop: "0.3rem" }}>
              {previewDesc}
            </p>
            <div className="ticket-stub">
              <span>by {username || "you"}</span>
              <span>private table</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
