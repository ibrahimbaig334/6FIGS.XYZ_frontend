"use client";

import { useState } from "react";
import { api, b58encode, isDevnet, loginMessage, setToken } from "../lib/api";

type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};
type SolProvider = {
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  signMessage: (msg: Uint8Array) => Promise<{ signature: Uint8Array }>;
};
type UnisatProvider = {
  requestAccounts: () => Promise<string[]>;
  signMessage: (msg: string) => Promise<string>;
};

function eth(): EthProvider | null {
  const w = window as unknown as { ethereum?: EthProvider };
  return w.ethereum ?? null;
}
function sol(): SolProvider | null {
  const w = window as unknown as { solana?: SolProvider };
  return w.solana ?? null;
}
function unisat(): UnisatProvider | null {
  const w = window as unknown as { unisat?: UnisatProvider };
  return w.unisat ?? null;
}

// Devnet runs Sepolia-ETH + Solana-devnet only — BTC is hidden there.
const CHAINS = (isDevnet ? ["EVM", "SOL"] : ["EVM", "SOL", "BTC"]) as ("EVM" | "SOL" | "BTC")[];

export default function ConnectPopup({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
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
    if (!p) throw new Error(isDevnet ? "No EVM wallet found — use MetaMask on Sepolia" : "No EVM wallet found");
    const accounts = (await p.request({ method: "eth_requestAccounts" })) as string[];
    const address = accounts[0];
    const { nonce } = await api<{ nonce: string }>("/wallet/nonce", { method: "POST", body: { chain: "EVM", address }, auth: false });
    const sig = (await p.request({ method: "personal_sign", params: [loginMessage("EVM", address.toLowerCase(), nonce), address] })) as string;
    const res = await api<{ token: string }>("/wallet/verify", {
      method: "POST",
      body: { chain: "EVM", address, nonce, signature: sig },
      auth: false,
    });
    await finish(res.token);
  }

  async function connectSol() {
    const p = sol();
    if (!p) throw new Error(isDevnet ? "No Solana wallet found — use Phantom on devnet" : "No Solana wallet found");
    const { publicKey } = await p.connect();
    const address = publicKey.toString();
    const { nonce } = await api<{ nonce: string }>("/wallet/nonce", { method: "POST", body: { chain: "SOL", address }, auth: false });
    const { signature } = await p.signMessage(new TextEncoder().encode(loginMessage("SOL", address, nonce)));
    const res = await api<{ token: string }>("/wallet/verify", {
      method: "POST",
      body: { chain: "SOL", address, nonce, signature: b58encode(signature) },
      auth: false,
    });
    await finish(res.token);
  }

  async function connectBtc() {
    const p = unisat();
    if (!p) throw new Error("Install the Unisat wallet extension to connect BTC");
    const accounts = await p.requestAccounts();
    const address = accounts[0];
    const { nonce } = await api<{ nonce: string }>("/wallet/nonce", { method: "POST", body: { chain: "BTC", address }, auth: false });
    const sig = await p.signMessage(loginMessage("BTC", address, nonce));
    const res = await api<{ token: string }>("/wallet/verify", {
      method: "POST",
      body: { chain: "BTC", address, nonce, signature: sig },
      auth: false,
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
      <div className="dialog-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Connect wallet">
        <p className="mono-label">CONNECT WALLET</p>
        <div style={{ display: "flex", gap: "0.4rem", margin: "0.6rem 0" }}>
          {CHAINS.map((c) => (
            <button key={c} className={chain === c ? "btn-solid" : "btn-ghost"} style={{ padding: "0.5rem 0.8rem" }} onClick={() => setChain(c)}>
              {c}
            </button>
          ))}
        </div>
        {chain === "EVM" && <button className="btn-solid" disabled={busy} onClick={() => run(connectEvm)}>SIGN IN WITH EVM ↗</button>}
        {chain === "SOL" && <button className="btn-solid" disabled={busy} onClick={() => run(connectSol)}>SIGN IN WITH SOLANA ↗</button>}
        {chain === "BTC" && (
          <>
            <button className="btn-solid" disabled={busy} onClick={() => run(connectBtc)}>SIGN IN WITH UNISAT ↗</button>
            <p className="fine">Native-segwit (bc1q) only — taproot (bc1p) cannot sign messages.</p>
          </>
        )}
        {err && <p style={{ color: "var(--crimson)", fontFamily: 'var(--font-dm-mono)', fontSize: "0.7rem" }}>{err}</p>}
        <button className="btn-ghost" style={{ padding: "0.5rem 0.8rem", marginTop: "0.5rem" }} onClick={onClose}>CLOSE</button>
      </div>
    </div>
  );
}
