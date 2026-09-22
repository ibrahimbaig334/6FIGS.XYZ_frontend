"use client";

import { useState } from "react";
import { api, b58encode, loginMessage, setToken } from "../lib/api";

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

export default function ConnectPopup({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [chain, setChain] = useState<"EVM" | "SOL" | "BTC">("EVM");
  const [btcAddr, setBtcAddr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function finish(token: string) {
    setToken(token);
    onDone();
    onClose();
  }

  async function connectEvm() {
    const p = eth();
    if (!p) throw new Error("No EVM wallet found — use a mock wallet below");
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
    if (!p) throw new Error("No Solana wallet found — use a mock wallet below");
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
    if (!btcAddr.trim()) throw new Error("Enter a BTC address");
    const res = await api<{ token: string }>("/wallet/link", { method: "POST", body: { chain: "BTC", address: btcAddr.trim() } });
    await finish(res.token);
  }

  async function connectMock(mockChain: "EVM" | "SOL") {
    const address =
      mockChain === "EVM"
        ? `0x${Array.from({ length: 40 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`
        : b58encode(crypto.getRandomValues(new Uint8Array(32)));
    const res = await api<{ token: string }>("/wallet/link", { method: "POST", body: { chain: mockChain, address } });
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
    <div style={overlay} onClick={onClose}>
      <div style={box} onClick={(e) => e.stopPropagation()}>
        <p className="mono-label">CONNECT WALLET</p>
        <div style={{ display: "flex", gap: "0.4rem", margin: "0.6rem 0" }}>
          {(["EVM", "SOL", "BTC"] as const).map((c) => (
            <button key={c} className={chain === c ? "btn-solid" : "btn-ghost"} style={{ padding: "0.5rem 0.8rem" }} onClick={() => setChain(c)}>
              {c}
            </button>
          ))}
        </div>
        {chain === "EVM" && <button className="btn-solid" disabled={busy} onClick={() => run(connectEvm)}>SIGN IN WITH EVM ↗</button>}
        {chain === "SOL" && <button className="btn-solid" disabled={busy} onClick={() => run(connectSol)}>SIGN IN WITH SOLANA ↗</button>}
        {chain === "BTC" && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input value={btcAddr} onChange={(e) => setBtcAddr(e.target.value)} placeholder="bc1q…" style={input} />
            <button className="btn-solid" disabled={busy} onClick={() => run(connectBtc)}>LINK</button>
          </div>
        )}
        <p className="fine">Devnet: no extension? Use a mock wallet (link-only, no signature).</p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn-ghost" style={{ padding: "0.5rem 0.8rem" }} disabled={busy} onClick={() => run(() => connectMock("EVM"))}>MOCK EVM</button>
          <button className="btn-ghost" style={{ padding: "0.5rem 0.8rem" }} disabled={busy} onClick={() => run(() => connectMock("SOL"))}>MOCK SOL</button>
        </div>
        {err && <p style={{ color: "var(--crimson)", fontFamily: '"DM Mono", monospace', fontSize: "0.7rem" }}>{err}</p>}
        <button className="btn-ghost" style={{ padding: "0.5rem 0.8rem", marginTop: "0.5rem" }} onClick={onClose}>CLOSE</button>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(18,18,18,0.5)", display: "grid", placeItems: "center", zIndex: 50,
};
const box: React.CSSProperties = {
  background: "var(--paper)", border: "2px solid var(--ink)", boxShadow: "8px 8px 0 var(--shadow)",
  padding: "1.2rem", width: "min(420px, 90vw)", display: "flex", flexDirection: "column", gap: "0.6rem",
};
const input: React.CSSProperties = {
  flex: 1, padding: "0.7rem", border: "2px solid var(--ink)", fontFamily: '"DM Mono", monospace', fontSize: "0.75rem",
};
