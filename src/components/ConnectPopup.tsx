"use client";

import { useState } from "react";
import { api, b58encode, getToken, isDevnet, loginMessage, setToken } from "../lib/api";

type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};
type SolProvider = {
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  signMessage: (msg: Uint8Array) => Promise<{ signature: Uint8Array }>;
};

function eth(): EthProvider | null {
  const w = window as unknown as { ethereum?: EthProvider };
  return w.ethereum ?? null;
}
function sol(): SolProvider | null {
  const w = window as unknown as { solana?: SolProvider };
  return w.solana ?? null;
}

// BTC is not supported in v1 — the button below stays visible but disabled
// (devnet and prod alike) so users see it's coming.
const CHAINS = ["EVM", "SOL"] as ("EVM" | "SOL")[];

export default function ConnectPopup({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [chain, setChain] = useState<(typeof CHAINS)[number]>("EVM");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function finish(token: string) {
    setToken(token);
    onDone();
    onClose();
  }

  async function connectEvm() {
    const p = eth();
    if (!p)
      throw new Error(
        isDevnet
          ? "No EVM wallet found — use MetaMask on Sepolia"
          : "No EVM wallet found",
      );
    const accounts = (await p.request({
      method: "eth_requestAccounts",
    })) as string[];
    const address = accounts[0];
    const { nonce } = await api<{ nonce: string }>("/wallet/nonce", {
      method: "POST",
      body: { chain: "EVM", address },
      auth: false,
    });
    const sig = (await p.request({
      method: "personal_sign",
      params: [loginMessage("EVM", address.toLowerCase(), nonce), address],
    })) as string;
    // Logged in → explicit attach endpoint (can never switch accounts).
    const endpoint = getToken() ? "/wallet/add" : "/wallet/verify";
    const res = await api<{ token: string }>(endpoint, {
      method: "POST",
      body: { chain: "EVM", address, nonce, signature: sig },
    });
    await finish(res.token);
  }

  async function connectSol() {
    const p = sol();
    if (!p)
      throw new Error(
        isDevnet
          ? "No Solana wallet found — use Phantom on devnet"
          : "No Solana wallet found",
      );
    const { publicKey } = await p.connect();
    const address = publicKey.toString();
    const { nonce } = await api<{ nonce: string }>("/wallet/nonce", {
      method: "POST",
      body: { chain: "SOL", address },
      auth: false,
    });
    const { signature } = await p.signMessage(
      new TextEncoder().encode(loginMessage("SOL", address, nonce)),
    );
    const endpoint = getToken() ? "/wallet/add" : "/wallet/verify";
    const res = await api<{ token: string }>(endpoint, {
      method: "POST",
      body: { chain: "SOL", address, nonce, signature: b58encode(signature) },
    });
    await finish(res.token);
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErr("");
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Connect failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-box"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Connect wallet"
        style={{ textAlign: "center", alignItems: "center" }}
      >
        <p className="mono-label" style={{ fontSize: 22 }}>
          CONNECT WALLET
        </p>
        <div
          style={{
            display: "flex",
            gap: "0.4rem",
            margin: "0.6rem 0",
            justifyContent: "center",
          }}
        >
          {CHAINS.map((c) => (
            <button
              key={c}
              className={chain === c ? "btn-solid" : "btn-ghost"}
              style={{ padding: "0.7rem 2rem", fontSize: 13 }}
              onClick={() => setChain(c)}
            >
              {c}
            </button>
          ))}
          <button
            className="btn-ghost"
            style={{
              padding: "0.7rem 2rem",
              opacity: 0.45,
              cursor: "not-allowed",
              fontSize: 13,
            }}
            disabled
            title="BTC support is coming soon"
          >
            BTC
          </button>
        </div>
        {chain === "EVM" && (
          <button
            className="btn-solid"
            disabled={busy}
            onClick={() => run(connectEvm)}
          >
            SIGN IN WITH EVM ↗
          </button>
        )}
        {chain === "SOL" && (
          <button
            className="btn-solid"
            disabled={busy}
            onClick={() => run(connectSol)}
          >
            SIGN IN WITH SOLANA ↗
          </button>
        )}
        {err && (
          <p
            style={{
              color: "var(--crimson)",
              fontFamily: "var(--font-dm-mono)",
              fontSize: "0.78rem",
            }}
          >
            {err}
          </p>
        )}
        <button
          className="btn-ghost"
          style={{ padding: "0.5rem 0.8rem", marginTop: "0.5rem" }}
          onClick={onClose}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
