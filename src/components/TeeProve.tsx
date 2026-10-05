"use client";

import { useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type {
  PreparedAddition,
  PreparedRegistration,
  PreparedRemoval,
  RegistrationClient,
} from "@sixfigs/tee/client";
import { base58Encode } from "@sixfigs/tee/shared";
import { MAX_WALLETS } from "../lib/constants";
import type { Profile } from "../lib/api";
import {
  prepareSet,
  prepareWalletAddition,
  prepareWalletRemoval,
  submitSet,
  submitWalletAddition,
  submitWalletRemoval,
  type TeeWalletInput,
} from "../lib/teeVerify";

type ProveMode = "establish" | "add" | "remove";

/** The removed wallet is entered by address; it is never connected or signed. */
function descriptorFromAddress(address: string): TeeWalletInput {
  const trimmed = address.trim();
  if (trimmed.startsWith("0x")) {
    return { family: "evm", chainId: 0, address: trimmed };
  }
  return { family: "solana", chainId: 0, address: trimmed };
}

function descriptorKey(wallet: TeeWalletInput): string {
  return `${wallet.family}:${wallet.address.toLowerCase()}`;
}

type SigState = Record<string, { status: "pending" | "signed" | "failed"; note?: string }>;

/**
 * Guided tee flow. "establish" enrolls a full new set: every staged wallet
 * signs the membership message. "add" extends an existing account: only the
 * new wallets sign a compact consent, and the enclave merges them into the
 * escrowed set. Removal is not a product path and has no UI.
 */
export default function TeeProve({
  mode,
  enrolledLabels,
  onDone,
  onCancel,
}: {
  mode: ProveMode;
  /** Labels of currently enrolled wallets, for context while adding/removing. */
  enrolledLabels: string[];
  onDone: (profile: Profile) => void;
  onCancel: () => void;
}) {
  const { publicKey, signMessage, wallet, connected } = useWallet();
  const [wallets, setWallets] = useState<TeeWalletInput[]>([]);
  const [removeAddress, setRemoveAddress] = useState("");
  const [client, setClient] = useState<RegistrationClient | null>(null);
  const [prepared, setPrepared] = useState<
    | { kind: "establish"; value: PreparedRegistration }
    | { kind: "add"; value: PreparedAddition }
    | { kind: "remove"; value: PreparedRemoval }
    | null
  >(null);
  const [sigs, setSigs] = useState<SigState>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const connectedAddress = publicKey?.toString() ?? null;
  const sigStore = useRef<Record<string, string>>({});

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
    if (wallets.some((w) => descriptorKey(w) === key)) {
      setErr("That wallet is already staged");
      return;
    }
    if (wallets.length >= MAX_WALLETS) {
      setErr(`Wallet limit reached (${MAX_WALLETS})`);
      return;
    }
    setErr("");
    setWallets((prev) => [...prev, entry]);
  }

  function drop(address: string) {
    const key = `solana:${address.toLowerCase()}`;
    setWallets((prev) => prev.filter((w) => descriptorKey(w) !== key));
  }

  async function startSigning() {
    if (wallets.length === 0 || busy) return;
    setBusy(true);
    setErr("");
    try {
      if (mode === "remove") {
        if (removeAddress.trim().length < 8) {
          setErr("Enter the address of the wallet you want to remove");
          setBusy(false);
          return;
        }
        const { client: c, prepared: p } = await prepareWalletRemoval({
          kept: wallets,
          remove: [descriptorFromAddress(removeAddress)],
        });
        setClient(c);
        setPrepared({ kind: "remove", value: p });
      } else if (mode === "add") {
        const { client: c, prepared: p } = await prepareWalletAddition({
          added: wallets,
        });
        setClient(c);
        setPrepared({ kind: "add", value: p });
      } else {
        const { client: c, prepared: p } = await prepareSet({ wallets });
        setClient(c);
        setPrepared({ kind: "establish", value: p });
      }
      const init: SigState = {};
      for (const w of wallets) init[descriptorKey(w)] = { status: "pending" };
      setSigs(init);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not prepare — try again");
    } finally {
      setBusy(false);
    }
  }

  function messageFor(target: TeeWalletInput): string | null {
    if (!prepared) return null;
    if (prepared.kind === "establish" || prepared.kind === "remove") {
      return prepared.value.message;
    }
    return prepared.value.addMessages[descriptorKey(target)] ?? null;
  }

  async function signRow(target: TeeWalletInput) {
    if (!prepared || !signMessage) {
      setErr("Wallet cannot sign — connect it in your extension");
      return;
    }
    const key = descriptorKey(target);
    const message = messageFor(target);
    if (!message) {
      setErr("No message for that wallet — restart the flow");
      return;
    }
    try {
      const raw = (await signMessage(
        new TextEncoder().encode(message),
      )) as unknown as Uint8Array | { signature: Uint8Array };
      sigStore.current[key] = base58Encode(
        raw instanceof Uint8Array ? raw : raw.signature,
      );
      setSigs((prev) => ({ ...prev, [key]: { status: "signed" } }));
    } catch {
      setSigs((prev) => ({
        ...prev,
        [key]: { status: "failed", note: "Signature declined — nothing was submitted" },
      }));
    }
  }

  const allSigned =
    wallets.length > 0 &&
    wallets.every((w) => sigs[descriptorKey(w)]?.status === "signed");
  const ready = prepared !== null && allSigned;

  async function submit() {
    if (!client || !prepared || !ready || busy) return;
    setBusy(true);
    setErr("");
    try {
      for (const w of wallets) {
        if (!sigStore.current[descriptorKey(w)]) {
          setErr("A signature went missing — restart the flow");
          setBusy(false);
          return;
        }
      }
      let profile: Profile;
      if (prepared.kind === "remove") {
        profile = await submitWalletRemoval({
          client,
          prepared: prepared.value,
          signatures: { ...sigStore.current },
        });
      } else if (prepared.kind === "add") {
        profile = await submitWalletAddition({
          client,
          prepared: prepared.value,
          signatures: { ...sigStore.current },
        });
      } else {
        profile = await submitSet({
          client,
          prepared: prepared.value,
          wallets,
          signatures: { ...sigStore.current },
        });
      }
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
            {mode === "add"
              ? `Currently enrolled: ${enrolledLabels.join(", ")}. Connect the new wallet only — it signs one short message; the rest stay untouched.`
              : mode === "remove"
                ? `Currently enrolled: ${enrolledLabels.join(", ")}. Enter the wallet to remove (it need not be connected), then connect every wallet you keep and sign once each.`
                : "Connect each wallet to enroll, then sign once each. Your addresses never leave the enclave's encryption."}
          </p>
          {mode === "remove" && (
            <input
              className="field"
              placeholder="address of the wallet to remove"
              value={removeAddress}
              onChange={(e) => setRemoveAddress(e.target.value)}
            />
          )}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className="btn-solid" onClick={addConnected} disabled={!connected}>
              {mode === "remove" ? "ADD KEPT WALLET" : "ADD CONNECTED WALLET"}
            </button>
          </div>
          {!connected && (
            <p className="fine" style={{ margin: 0 }}>
              Connect a wallet with the button above first (adapter popup).
            </p>
          )}
          {wallets.length === 0 ? (
            <p className="fine" style={{ margin: 0 }}>
              Nothing staged yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {wallets.map((w) => (
                <Row
                  key={descriptorKey(w)}
                  label={`${w.label ?? "Wallet"} · ${w.address.slice(0, 6)}…${w.address.slice(-4)}`}
                  onDrop={() => drop(w.address)}
                />
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn-solid" disabled={wallets.length === 0 || busy} onClick={() => void startSigning()}>
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
            {mode === "add"
              ? "Sign with the new wallet below. Nothing on your existing wallets is touched."
              : mode === "remove"
                ? "Every kept wallet signs the same removal message. The wallet being removed is not signed for."
                : "Sign with each wallet below. Switch wallets in your extension — press SIGN only when the connected wallet matches the row."}
          </p>
          {wallets.map((w) => (
            <SignRow
              key={descriptorKey(w)}
              label={`${w.label ?? "Wallet"} · ${w.address.slice(0, 6)}…${w.address.slice(-4)}`}
              state={sigs[descriptorKey(w)]?.status ?? "pending"}
              note={sigs[descriptorKey(w)]?.note}
              connected={connectedAddress === w.address}
              onSign={() => void signRow(w)}
            />
          ))}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn-solid" disabled={!ready || busy} onClick={() => void submit()}>
              {busy ? "SUBMITTING…" : mode === "add"
                  ? "ADD WALLET"
                  : mode === "remove"
                    ? "REMOVE WALLET"
                    : "SUBMIT SET"}
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