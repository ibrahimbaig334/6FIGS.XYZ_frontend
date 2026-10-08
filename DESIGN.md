# DESIGN.md — 6figs, "The Table"

The redesign lives on branch `main-v2` of the original frontend repo: the
presentation rebuilt as The Table, the functionality synced from `main`
(wallet-first auth, username sign-off, Reown AppKit). Code wins over docs;
this file is the record of the decisions.

## The thesis, and the one it replaced

### First attempt (dead): "The House Ledger"
Cream card stock on midnight felt, engraved rules, roman-numeral roundels,
wax seals, Cormorant Garamond. It shipped, then died honestly: it is the
trained default for this brief — the first idea any model has for "private
members' club, crypto, luxury." Dark surface + high-contrast serif + mono
labels + cards is the category's average, and the average is what the
rebuild exists to escape. It was also decoration: remove the wordmark and it
could belong to any private club.

Its graveyard, recorded for honesty: **The Vault** (implies custody — 6figs
holds nothing), **The Diplomatic Pouch** (fights the real-time surface),
**The Speakeasy** (the predictable reading of the vibe keywords).

### Winner: "The Table"
The product is a card room, not a dashboard. A room you move through:
a floor of tables, two seats to a table, a board between them. Materials
come from the room's own world — green-black baize, walnut, brass fittings,
cream place cards. Nothing from crypto: no neon, no chips, no card suits,
no stakes. The difference between a casino and a club is restraint.

The thesis decides everything:
- **Layout** — the floor is a field of table scenes (the table seen from
  above, seats on the rim, the name on the felt); the room is one table:
  board center, place cards at the seats, talk at the side.
- **Type is the design** — Bricolage Grotesque (display, warm and
  characterful; weights 300-700 for contrast) with Space Mono for every
  functional label and every number. No serif anywhere.
- **The tier is the card's edge** — plain, brass, gilt, the house's own.
  The quietest flex: visible at an angle, like a gilded edge on a real card.
- **The chop** — every member's identity mark, derived from their id: a
  small stroke glyph in a 3x3 grid, deterministic, unique. Your identity is
  your proof, rendered. The brand wears a hand-drawn chop-6 as the wordmark.
- **The reveal is your cards** — two flip cards (the house's lattice back,
  or your face with chop and tier). Choosing what a connection sees is
  turning your cards. Tactile, granular, reversible.
- **The handshake** — the signature moment. When a match lands, the table
  assembles: the frame sets, the grid draws itself line by line, the two
  place cards slide in, the lamp turns to the move. GSAP timeline in the
  game panel, re-run on rematch. The board's marks draw themselves when
  placed; the winning line is drawn in gilt.
- **The ceremony** — the prove dialog: the three real steps, then the flow
  (wallet picker, account confirm, sign, submit) inside one stage. The
  chop presses when the tier arrives.
- **Motion has weight** — doors open, cards are placed: ease-out-quart for
  UI, a door curve for reveals. Nothing bounces, nothing flashes. GSAP +
  Lenis on the landing only.

### Graveyard of round two (each materially different, each killed)
1. **The Assay Office** — 6figs as a hallmarking office: punched marks,
   fineness stamps, cold-struck metal. Died: an office is not a room, cold
   for a social product, and the punch shares the "struck mark" grammar with
   the Ledger's wax seal — half-divergent.
2. **The Blackout** — the interface as rationed light: near-total darkness,
   only the active thing lit. Died: compatible with the old design (both
   midnight + lamplight) — fails the divergence test outright.
3. **The Classified File** — redaction bars, stamps, typewriter. Died: the
   register implies the operator reads what it hides, the opposite of the
   promise; and paper again.

Divergence check: documents -> rooms, list -> floor, serif -> grotesque,
cream-dominant -> felt-dominant, wax seal -> placed card + chop. The new
winner cannot be retrofitted onto the old design; that was the point.

## Design system (src/app/globals.css)

- **Themes**: midnight is the house default (pre-paint script; no flash);
  daylight is a stored choice. Both WCAG AA on every route (verified).
- **Tokens**: felt `#0c130f`, table felt `#132016`, walnut `#241a12`, card
  `#efe8d6`, ink `#221b10`, brass `#b29254`, gilt `#c9a445`, seal oxblood
  `#8e2f26`, sage for presence. Radius: cards 10-12, controls 6, roundels
  circular. Shadows: two layers, tinted, never hard-offset.
- **Curves**: `--ease-out cubic-bezier(.23,1,.32,1)`,
  `--ease-quart cubic-bezier(.25,1,.5,1)`,
  `--ease-door cubic-bezier(.77,0,.175,1)`. `prefers-reduced-motion` keeps
  opacity and color, drops movement.
- **Browser surfaces**: themed selection, caret, scrollbars, focus rings,
  tabular numerals on data.
- **Icons**: Phosphor, one weight. No emoji in the UI (the emoji picker's
  content is chat text). No unicode standing in for icons. No eyebrows, no
  arrows appended to buttons, no em-dashes in visible copy.

## Functionality synced from main (wallet-first auth)

Taken from main as-is (integration, not design): `api.ts` (usernameSetup/
Login/Change/Reset, teeLogin, teeIdentify, resetTeeIdentity; Profile.
username), `teeVerify.ts` (onceByKey, prepareSetPublic, submitSetSessionless,
submitSignedOnly), `Web3Providers` (Reown AppKit: wagmi + Solana adapters,
verified modal opener, diagnostics), `PickerScrim`, `TeeProve` (modes
establish/add/identify, sessionless login, account confirm, watchdog, stall
fallback), `AuthModal`/`SignInButton` flows, the `/recover` page logic, and
main's docs terminology. Email auth, its components, verify-email,
reset-password, and walletAddresses are deleted, matching main.

Re-expressed in The Table (logic kept, presentation rebuilt):
- **TeeProve** — its visible pieces restyled (account confirm, busy state,
  stall fallback) to house classes and copy; all flow logic untouched.
- **AuthModal** — the door: two hairline option cards on the dialog stock.
- **SignInButton** — one house button, every gate.
- **recover** — my place-card presentation over main's two flows.
- **profile** — main's wallet-first logic (SignInButton gate, prove dialog,
  CredentialsCard, 1-wallet nudge, resetTeeIdentity, onCredsChanged) inside
  the existing Table design (place card, chop, reveal flip cards).
  The reveal flip is optimistic: the card turns on the click, the save
  lands behind it.
- **Web3Providers** — one config touch: the picker's themeMode follows the
  app's stored theme (was pinned light) so it doesn't glare against either
  surface.

## Logic touched (logged, none silent)

1. `src/lib/api.ts` — one string: errMsg's network fallback ("Can't reach
   the server. Try again."). Behavior identical.
2. `src/lib/constants.ts` — copy values only: punch lines, chat suggestions,
   emoji set rewritten to the house register. Exports and logic untouched.
3. `Header.tsx` — theme class moved to documentElement, midnight default;
   disconnect() also drops the wallet connection (from main); active nav.
4. `profile/page.tsx` — page-local presentation state: visPending (optimistic
   reveal), pressKey (the chop press on tier change). Prove flow untouched.
5. `room page` — removed `popup`, dead state in the original.
6. Docs — accuracy: EVM claim corrected to Solana+EVM wallets as the new
   stack actually supports; "zero-knowledge" removed; auth terminology
   synced to wallet-first; em-dashes and UI emojis removed.

## Found in the code, left unsurfaced

- The mission described a per-connection portfolio reveal (hidden /
  category / full). The code has a global visMode (HIDDEN | VISIBLE) gating
  tier visibility to connections. The UI shows exactly that (the two cards).
  The granular reveal remains a product gap, not a design one.
- The pinned image digest is surfaced on the landing when configured; the
  prove dialog states the real steps; no flow shows a feature the code
  lacks.

## Verification log

- `tsc --noEmit`, `next build`, `next lint` clean (one pre-existing warning
  in TeeProve's cleanup).
- Playwright against the real backend (local Postgres/Redis, devnet) and the
  configured enclave/Reown env: 13 routes x 2 themes — zero contrast
  violations (WCAG AA), zero em-dashes, zero UI emojis, zero banned words,
  zero horizontal overflow; the door, recover, credentials, reveal and gate
  surfaces audited clean.
- Full flows, two live sessions: floor, invite join by code, seated room,
  chat with live token cards, alternating moves, rematch, presence, mobile.
  Zero runtime errors.
- Hostile review, three critics, two passes: the first found four issues
  (dim table names, dense chops, an unroled hero image, non-optimistic
  reveal) — all fixed; the second found one (docs pager arrows) — fixed;
  the third pass produced nothing new.
