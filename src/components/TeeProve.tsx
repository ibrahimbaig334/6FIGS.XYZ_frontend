"use client";

import { useMemo, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { PreparedRegistration } from "@sixfigs/tee/client";
import { base58Encode } from "@sixfigs/tee/shared";
import { MAX_WALLETS } from "../lib/constants";
import type { Profile } from "../lib/api";
import { prepareSet, submitSet, type TeeWalletInput } from "../lib/teeVerify";

function descriptorKey(wallet: TeeWalletInput): string {
  return `${wallet.family}:${wallet.address.toLowerCase()}`;
}

type SigState = Record<string, { status: "pending" | "signed" | "failed"; note?: string }>;

/**
 * Guided tee transition. The user assembles the new wallet set from
 * freshly-connected wallets (the server never tells the browser old
 * addresses), then every enrolled wallet signs once and the whole set is
 * submitted together. Partial sets are never submitted.
 */
export default function TeeProve({
  keepLabels,
  onDone,
  onCancel,
}: {
  /** Labels of currently enrolled wallets, for reference while assembling. */
  keepLabels: string[];
  onDone: (profile: Profile) => void;
  onCancel: () => void;
}) {
  const { publicKey, signMessage, wallet, connected } = useWallet();
  const [keep, setKeep] = useState<TeeWalletInput[]>([]);
  const [remove, setRemove] = useState<TeeWalletInput[]>([]);
  const [staged, setStaged] = useState<"keep" | "remove">("keep");
  const [client, setClient] = useState<Awaited<ReturnType<typeof prepareSet>>["client"] | null>(null);
  const [prepared, setPrepared] = useState<PreparedRegistration | null>(null);
  const [sigs, setSigs] = useState<SigState>({});
  const [removalSigs, setRemovalSigs] = useState<SigState>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const connectedAddress = publicKey?.toString() ?? null;
  const sigStore = useRef<Record<string, string>>({});

  const removalMessages = useMemo(() => prepared?.removalMessages ?? {}, [prepared]);

  function addConnected() {
    if (!connected || !connectedAddress) {
      setErr("Connect a wallet in your extension first");
      return;
    }
    const entry: TeeWalletInput = {
      family: "solana",
      chainId: 0,
      address: connectedAddress,
      label: wallet?.adapter.name ?? "Solana Wallet",
    };
    const key = descriptorKey(entry);
    if (
      keep.some((w) => descriptorKey(w) === key) ||
      remove.some((w) => descriptorKey(w) === key)
    ) {
      setErr("That wallet is already in the set");
      return;
    }
    if (keep.length + remove.length >= MAX_WALLETS) {
      setErr(`Wallet limit reached (${MAX_WALLETS})`);
      return;
    }
    setErr("");
    if (staged === "keep") setKeep((prev) => [...prev, entry]);
    else setRemove((prev) => [...prev, entry]);
  }

  function drop(bucket: "keep" | "remove", address: string) {
    const key = `${"solana"}:${address.toLowerCase()}`;
    if (bucket === "keep") setKeep((prev) => prev.filter((w) => descriptorKey(w) !== key));
    else setRemove((prev) => prev.filter((w) => descriptorKey(w) !== key));
  }

  async function startSigning() {
    if (keep.length === 0 || busy) return;
    setBusy(true);
    setErr("");
    try {
      const { client: c, prepared: p } = await prepareSet({
        wallets: keep,
        remove: remove.length > 0 ? remove : undefined,
      });
      setClient(c);
      setPrepared(p);
      const init: SigState = {};
      for (const w of keep) init[descriptorKey(w)] = { status: "pending" };
      setSigs(init);
      const rinit: SigState = {};
      for (const w of remove) rinit[descriptorKey(w)] = { status: "pending" };
      setRemovalSigs(rinit);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not prepare — try again");
    } finally {
      setBusy(false);
    }
  }

  async function signRow(kind: "keep" | "remove", target: TeeWalletInput) {
    if (!prepared || !signMessage) {
      setErr("Wallet cannot sign — connect it in your extension");
      return;
    }
    const key = descriptorKey(target);
    const message =
      kind === "keep" ? prepared.message : (removalMessages[key] ?? null);
    if (!message) {
      setErr("No message for that wallet — restart the flow");
      return;
    }
    try {
      const raw = (await signMessage(
        new TextEncoder().encode(message),
      )) as unknown as Uint8Array | { signature: Uint8Array };
      const signature = base58Encode(
        raw instanceof Uint8Array ? raw : raw.signature,
      );
      if (kind === "keep") setSigs((prev) => ({ ...prev, [key]: { status: "signed" } }));
      else setRemovalSigs((prev) => ({ ...prev, [key]: { status: "signed" } }));
      sigStore.current[key] = signature;
    } catch {
      const note = "Signature declined — nothing was submitted";
      if (kind === "keep") setSigs((prev) => ({ ...prev, [key]: { status: "failed", note } }));
      else setRemovalSigs((prev) => ({ ...prev, [key]: { status: "failed", note } }));
    }
  }

  const allKeepSigned = keep.length > 0 && keep.every((w) => sigs[descriptorKey(w)]?.status === "signed");
  const allRemoveSigned = remove.every((w) => removalSigs[descriptorKey(w)]?.status === "signed");
  const ready = prepared !== null && allKeepSigned && allRemoveSigned;

  async function submit() {
    if (!client || !prepared || !ready || busy) return;
    const signatures: Record<string, string> = {};
    const removalSignatures: Record<string, string> = {};
    for (const w of keep) {
      const sig = sigStore.current[descriptorKey(w)];
      if (!sig) {
        setErr("A signature went missing — restart the flow");
        return;
      }
      signatures[descriptorKey(w)] = sig;
    }
    for (const w of remove) {
      const sig = sigStore.current[descriptorKey(w)];
      if (!sig) {
        setErr("A signature went missing — restart the flow");
        return;
      }
      removalSignatures[descriptorKey(w)] = sig;
    }
    setBusy(true);
    setErr("");
    try {
      const profile = await submitSet({
        client,
        prepared,
        keep,
        signatures,
        ...(remove.length > 0 ? { removalSignatures } : {}),
      });
      onDone(profile);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Submit failed — try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
      {!prepared && (
        <>
          <p className="fine" style={{ margin: 0 }}>
            {keepLabels.length > 0
              ? `Currently enrolled: ${keepLabels.join(", ")}. Reconnect every wallet below — kept and removed — then sign once each.`
              : "Connect each wallet to enroll, then sign once each. Your addresses never leave the enclave's encryption."}
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {(["keep", "remove"] as const).map((b) => (
              <button
                key={b}
                className={staged === b ? "chip active" : "chip"}
                onClick={() => setStaged(b)}
              >
                {b === "keep" ? "STAGE: KEEP" : "STAGE: REMOVE"}
              </button>
            ))}
            <button className="btn-solid" onClick={addConnected} disabled={!connected}>
              ADD CONNECTED WALLET
            </button>
          </div>
          {!connected && (
            <p className="fine" style={{ margin: 0 }}>
              Connect a wallet with the button above first (adapter popup).
            </p>
          )}
          {keep.length === 0 && remove.length === 0 ? (
            <p className="fine" style={{ margin: 0 }}>
              Nothing staged yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {keep.map((w) => (
                <Row key={descriptorKey(w)} label={`${w.label ?? "Wallet"} · ${w.address.slice(0, 6)}…${w.address.slice(-4)} · KEEP`} onDrop={() => drop("keep", w.address)} />
              ))}
              {remove.map((w) => (
                <Row key={descriptorKey(w)} label={`${w.label ?? "Wallet"} · ${w.address.slice(0, 6)}…${w.address.slice(-4)} · REMOVE`} onDrop={() => drop("remove", w.address)} />
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn-solid" disabled={keep.length === 0 || busy} onClick={() => void startSigning()}>
              {busy ? "PREPARING…" : "START SIGNING"}
            </button>
            <button className="btn-ghost" onClick={onCancel}>
              CANCEL
            </button>
          </div>
        </>
      )}

      {prepared && (
        <>
          <p className="fine" style={{ margin: 0 }}>
            Sign with each wallet below. Switch wallets in your extension — press
            SIGN only when the connected wallet matches the row.
          </p>
          {keep.map((w) => (
            <SignRow
              key={descriptorKey(w)}
              label={`${w.label ?? "Wallet"} · ${w.address.slice(0, 6)}…${w.address.slice(-4)}`}
              state={sigs[descriptorKey(w)]?.status ?? "pending"}
              note={sigs[descriptorKey(w)]?.note}
              connected={connectedAddress === w.address}
              onSign={() => void signRow("keep", w)}
            />
          ))}
          {remove.map((w) => (
            <SignRow
              key={descriptorKey(w)}
              label={`${w.label ?? "Wallet"} · removal consent`}
              state={removalSigs[descriptorKey(w)]?.status ?? "pending"}
              note={removalSigs[descriptorKey(w)]?.note}
              connected={connectedAddress === w.address}
              onSign={() => void signRow("remove", w)}
            />
          ))}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn-solid" disabled={!ready || busy} onClick={() => void submit()}>
              {busy ? "SUBMITTING…" : "SUBMIT SET"}
            </button>
            <button className="btn-ghost" onClick={onCancel}>
              CANCEL
            </button>
          </div>
        </>
      )}
      {err && <p className="err">{err}</p>}
    </div>
  );
}

function Row({ label, onDrop }: { label: string; onDrop: () => void }) {
  return (
    <div className="wallet-row">
      <div className="wallet-info">
        <strong style={{ fontSize: "0.95rem" }}>{label}</strong>
      </div>
      <button className="chip" style={{ marginLeft: "auto" }} onClick={onDrop}>
        ✕
      </button>
    </div>
  );
}

function SignRow({
  label,
  state,
  note,
  connected,
  onSign,
}: {
  label: string;
  state: "pending" | "signed" | "failed";
  note?: string;
  connected: boolean;
  onSign: () => void;
}) {
  return (
    <div className="wallet-row">
      <div className="wallet-info">
        <strong style={{ fontSize: "0.95rem" }}>{label}</strong>
        <span className="fine" style={{ margin: 0 }}>
          {state === "signed" ? "SIGNED ✓" : state === "failed" ? (note ?? "DECLINED") : connected ? "READY — PRESS SIGN" : "CONNECT THIS WALLET FIRST"}
        </span>
      </div>
      {state !== "signed" && (
        <button className="chip" style={{ marginLeft: "auto" }} onClick={onSign}>
          SIGN
        </button>
      )}
    </div>
  );
}
