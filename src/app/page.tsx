const TIERS = [
  { name: "TIER I", min: "$100K+" },
  { name: "TIER II", min: "$500K+" },
  { name: "TIER III", min: "$1M+" },
];

export default function Home() {
  return (
    <section style={{ padding: "clamp(2rem,5vw,4rem) 5vw" }}>
      <p
        style={{
          fontFamily: '"DM Mono", monospace',
          fontSize: "0.66rem",
          letterSpacing: "0.11em",
          margin: 0,
        }}
      >
        PRIVATE MEMBERS&apos; ROOM — VERIFIED HOLDERS ONLY
      </p>
      <h1
        style={{
          fontSize: "clamp(3.5rem,9vw,8rem)",
          lineHeight: 0.85,
          letterSpacing: "-0.06em",
          margin: "1rem 0 0",
        }}
      >
        PROOF OF
        <br />
        <span style={{ color: "var(--crimson)" }}>BAGS.</span>
      </h1>
      <p
        style={{
          maxWidth: "420px",
          fontFamily: '"DM Mono", monospace',
          fontSize: "0.9rem",
          lineHeight: 1.5,
        }}
      >
        Connect a wallet. Prove <strong>≥ $100,000</strong> — nobody, not even us, sees your
        number. Then match, play fair tic-tac-toe, and talk coins.
      </p>
      <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
        <a href="/profile" className="btn-solid">
          VERIFY IN PROFILE ↗
        </a>
        <a href="/play" className="btn-ghost">
          FIND A MATCH
        </a>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 0,
          marginTop: "2rem",
          border: "2px solid var(--ink)",
          background: "var(--paper)",
        }}
      >
        {TIERS.map((t) => (
          <div
            key={t.name}
            style={{
              padding: "1rem 1.4rem",
              borderRight: "2px solid var(--ink)",
              display: "flex",
              flexDirection: "column",
              gap: "0.3rem",
            }}
          >
            <strong style={{ fontFamily: '"DM Mono", monospace', fontSize: "0.66rem" }}>
              {t.name}
            </strong>
            <span style={{ fontWeight: 700, fontSize: "1.4rem" }}>{t.min}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
