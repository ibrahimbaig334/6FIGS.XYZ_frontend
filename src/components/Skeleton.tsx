"use client";

/** Shimmer skeleton blocks for loading states. */
export function Skel({
  w = "100%",
  h = "1rem",
  style,
}: {
  w?: string;
  h?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="skel"
      style={{ width: w, height: h, ...style }}
      aria-hidden="true"
    />
  );
}

export function CardSkel() {
  return (
    <div className="card" aria-hidden="true">
      <Skel w="40%" h="0.8rem" />
      <Skel h="1.4rem" style={{ marginTop: "0.7rem" }} />
      <Skel w="70%" style={{ marginTop: "0.5rem" }} />
      <Skel w="35%" h="2.2rem" style={{ marginTop: "0.8rem" }} />
    </div>
  );
}

export function RowSkel() {
  return (
    <div className="peer-row" aria-hidden="true">
      <Skel w="2.4rem" h="2.4rem" style={{ borderRadius: "50%" }} />
      <div style={{ flex: 1 }}>
        <Skel w="30%" />
        <Skel w="55%" style={{ marginTop: "0.4rem" }} />
      </div>
      <Skel w="5rem" h="2.2rem" />
    </div>
  );
}

export function ChatSkel() {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}
      aria-hidden="true"
    >
      <Skel w="70%" h="2.6rem" />
      <Skel w="55%" h="2.6rem" style={{ alignSelf: "flex-end" }} />
      <Skel w="78%" h="2.6rem" />
    </div>
  );
}
