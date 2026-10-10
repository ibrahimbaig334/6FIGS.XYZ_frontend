"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { api, getToken, getTiers, Profile, TierInfo } from "../lib/api";
import { tierEdgeClass } from "../lib/tierEdge";
import Chop, { BlankChop } from "../components/Chop";

const DIGEST = (process.env.NEXT_PUBLIC_IMAGE_DIGEST ?? "").trim();

const EDGE_LABEL: Record<string, string> = {
  t1: "TIER I",
  t2: "TIER II",
  t3: "TIER III",
  t4: "TIER IV",
};

/* Your seat number at the table: the one "you" derivation that deals a
   balanced, composed hand (5 strokes, 4 kinds, every row and column inked,
   symmetric). Plain "you" hashed to left-column scatter. */
const HERO_CHOP_ID = "you-91";

export default function Home() {
  const [tier, setTier] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [tiers, setTiers] = useState<TierInfo[]>([]);
  const [dealt, setDealt] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReady(true);
    getTiers().then((t) => setTiers(t.tiers));
    if (!getToken()) return;
    api<Profile>("/profile/user")
      .then((p) => setTier(p.eligibility.tier))
      .catch(() => setTier(null));
  }, []);

  // The room's one choreographed moment: on load the lamp warms and the
  // set table fades in; sections reveal as you scroll. Reduced motion
  // collapses everything to still.
  useEffect(() => {
    // The chop inks itself once the card has landed. Still under reduced
    // motion: the dealt hand renders immediately, no phases.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDealt(true);
      return;
    }
    const t = setTimeout(() => setDealt(true), 950);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ duration: 1.1 });
    const raf = (t: number) => {
      lenis.raf(t);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
    lenis.on("scroll", ScrollTrigger.update);
    const q = gsap.utils.selector(root);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hero-copy > *",
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.09, ease: "power3.out" },
      );
      gsap.fromTo(
        ".hero-seat",
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.85, delay: 0.25, ease: "power3.out" },
      );
      // The deal: your card slides onto the felt and settles into its lean.
      // clearProps hands the settled state back to CSS so the hover tell
      // (straighten and lift) can take over after the entrance.
      gsap.fromTo(
        ".hero-card",
        { opacity: 0, y: 30, rotate: -11 },
        {
          opacity: 1,
          y: 0,
          rotate: -4,
          duration: 0.9,
          delay: 0.4,
          ease: "power3.out",
          clearProps: "all",
        },
      );
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 22 },
          {
            opacity: 1,
            y: 0,
            duration: 0.75,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 86%" },
          },
        );
      });
    }, root);
    return () => {
      ctx.revert();
      lenis.destroy();
    };
  }, []);

  const locked = ready && !tier;

  return (
    <div ref={root}>
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>The room behind the unmarked door.</h1>
            <p className="fine hero-sub">
              Prove your tier from your wallet. Balances are read in a sealed
              enclave, then forgotten. Only the tier is public.
            </p>
            <div className="hero-ctas">
              <a href="/profile" className="btn btn-primary">
                Come in
              </a>
              <a href="/docs/how-it-works" className="btn-ghost">
                How it works
              </a>
            </div>
          </div>
          <div className="hero-seat">
            <div className="hero-lamp" aria-hidden="true" />
            <div
              className="hero-still"
              role="img"
              aria-label="Your reserved seat: a member card under the lamp, inking its chop"
            >
              <div className="hero-ground" aria-hidden="true" />
              <div className="hero-card-stack">
                <div className="hero-card-back card-back" aria-hidden="true" />
                <div className="place-card hero-card">
                  {dealt ? (
                    <Chop id={HERO_CHOP_ID} size="lg" deal />
                  ) : (
                    <BlankChop size="lg" />
                  )}
                  <span className="who">you</span>
                  <span className="what">when verified</span>
                </div>
              </div>
              <span className="hero-plate">Reserved</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section reveal">
        <h2>The tiers</h2>
        <div className="tier-strip">
          {tiers.map((t) => (
            <div
              className={`tier-cell ${tierEdgeClass(t.name)}`}
              key={t.name}
              style={{ background: "var(--card)", color: "var(--tx)" }}
            >
              <span className="tier-min num">${t.min.toLocaleString()}+</span>
              <span className="label" style={{ color: "var(--tx-dim)" }}>
                {EDGE_LABEL[tierEdgeClass(t.name)] ?? t.name}
              </span>
            </div>
          ))}
        </div>
        <p className="fine" style={{ marginTop: "1rem", maxWidth: "62ch" }}>
          Tiers are lower bounds. The tier is a card you carry; the number never
          leaves the enclave.
        </p>
      </section>

      <section className="landing-section reveal">
        <h2>What verification involves</h2>
        <div className="verify-grid">
          <div className="steps">
            <div className="step">
              <span className="step-num num">01</span>
              <div>
                <h3>You present your proof.</h3>
                <p className="fine">
                  Your wallet opens a signature request: one plain message per
                  wallet. No transaction, no gas, no approvals. The request can
                  never touch your funds.
                </p>
              </div>
            </div>
            <div className="step">
              <span className="step-num num">02</span>
              <div>
                <h3>The room is sealed.</h3>
                <p className="fine">
                  Your browser checks the enclave&apos;s attestation against a
                  pinned, public fingerprint before anything is sent. Then
                  signatures and addresses travel encrypted, to the enclave
                  only.
                </p>
              </div>
            </div>
            <div className="step">
              <span className="step-num num">03</span>
              <div>
                <h3>Your place is set.</h3>
                <p className="fine">
                  The enclave prices your holdings, signs the tier, and forgets
                  your addresses. The server seats the tier. No address, no
                  amount, anywhere.
                </p>
              </div>
            </div>
          </div>
          <div className="cert">
            <p className="label">The fingerprint is public</p>
            <p className="fine" style={{ marginTop: "0.6rem" }}>
              The enclave runs a pinned code image on Google&apos;s Confidential
              Space. If the image ever changed, every browser would notice
              before sending anything.
            </p>
            {DIGEST && (
              <p className="digest num" style={{ marginTop: "0.8rem" }}>
                {DIGEST}
              </p>
            )}
            <p className="fine" style={{ marginTop: "0.6rem" }}>
              You can read exactly what the enclave does with your data. The
              answer: compute the tier, sign it, forget the addresses.
            </p>
            <a
              href="/docs/privacy"
              className="btn-ghost btn-sm"
              style={{ marginTop: "1rem" }}
            >
              Privacy and trust
            </a>
          </div>
        </div>
      </section>

      <section className="landing-section reveal">
        <h2>Inside</h2>
        <div className="inside-grid">
          <div className="plate feature-plate">
            <h3>The floor</h3>
            <div className={locked ? "veil-locked" : undefined}>
              <div
                className={locked ? "veiled" : undefined}
                aria-hidden={locked}
              >
                <div className="mini-dir">
                  <span>
                    <i className="dot on" aria-hidden="true" />
                    <b>The Long Room</b>
                    <em>invite only</em>
                  </span>
                  <span>
                    <i className="dot on" aria-hidden="true" />
                    <b>Quiet Hours</b>
                    <em>TIER II</em>
                  </span>
                  <span>
                    <i className="dot" aria-hidden="true" />
                    <b>Third Chair</b>
                    <em>TIER I</em>
                  </span>
                </div>
              </div>
              {locked && (
                <div className="veil-note">
                  <span>Members only</span>
                </div>
              )}
            </div>
            <p className="fine">
              Private round tables. Tier-gated or invite-only. The game opens
              into the same table talk.
            </p>
            <a href="/rooms" className="btn btn-primary">
              Walk the floor
            </a>
          </div>
          <div className="plate feature-plate">
            <h3>The game</h3>
            <div className={locked ? "veil-locked" : undefined}>
              <div
                className={locked ? "veiled" : undefined}
                aria-hidden={locked}
              >
                <div className="mini-board" aria-hidden="true">
                  {["x", "o", "", "o", "x", "", "", "x", "o"].map((c, i) => (
                    <span
                      key={i}
                      className={`mini-cell${c === "o" ? " mark-o" : ""}`}
                    >
                      {c === "x" && (
                        <svg viewBox="0 0 24 24">
                          <path d="M5 5 L19 19" />
                          <path d="M19 5 L5 19" />
                        </svg>
                      )}
                      {c === "o" && (
                        <svg viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="7.5" />
                        </svg>
                      )}
                    </span>
                  ))}
                </div>
              </div>
              {locked && (
                <div className="veil-note">
                  <span>Members only</span>
                </div>
              )}
            </div>
            <p className="fine">
              Tic-tac-toe against a verified stranger or an existing connection.
              Fair game, no stakes. The game opens into chat.
            </p>
            <a href="/play" className="btn btn-primary">
              Take a seat
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
