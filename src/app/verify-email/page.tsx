"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { emailVerify } from "../../lib/api";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("Verifying your email…");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") ?? "";
    if (!token) {
      setStatus("error");
      setMessage("This link is missing its token. Open the link from the email again.");
      return;
    }
    emailVerify(token)
      .then(() => {
        setStatus("ok");
        setMessage("Email verified. Recovery is now active for your account.");
        window.dispatchEvent(new Event("sixfigs-auth"));
      })
      .catch((e: unknown) => {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "This link is invalid or expired.");
      });
  }, []);

  return (
    <section className="page-enter" style={{ padding: "2rem 5vw", display: "grid", placeItems: "center", flex: 1 }}>
      <div className="card" style={{ width: "100%", maxWidth: "460px", display: "flex", flexDirection: "column", gap: "0.7rem", textAlign: "center" }}>
        <p className="mono-label">EMAIL VERIFICATION</p>
        <p className="fine" style={{ margin: 0 }}>
          {message}
        </p>
        <Link className="btn-solid" href="/profile" style={{ textAlign: "center" }}>
          GO TO PROFILE
        </Link>
      </div>
    </section>
  );
}