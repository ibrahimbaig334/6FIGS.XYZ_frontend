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

## Round two: the hero legibility fix, the 6, speed, and the waits

- The hero scene rendered as a scramble: `.seat-card` was defined twice in
  globals.css with conflicting layouts, and the "table" was a rounded
  rectangle with no table cues. Rebuilt as a table seen from above: walnut
  rim, felt, two chairs, your portrait place card face-up ("you / when
  verified"), a face-down lattice card across, a chalk-marked mid-game board,
  a brass RESERVED plaque, captioned "A table, kept private." The search and
  countdown veils use the same oval language. The copy no longer promises
  "two" anywhere (hero caption, landing feature line, create ticket stub,
  footer): what carries "private" is the RESERVED plaque, not the seat count,
  so a future group table grows by dealing more place cards around the same
  oval.
- The brand 6 read as a balloon: its stem stood straight on the bowl's right.
  The tail now hooks left off the bowl's upper edge the way a written 6
  does (Chop.tsx, icon.svg/favicon).
- Speed, measured. The wallet stack (AppKit, both adapters, wagmi, viem —
  tens of megabytes of source) rode the initial bundle of every page because
  Web3Providers wrapped the root layout. It now loads on demand: a light
  shell holds the same exports, the stack downloads when the door opens, and
  TeeProve renders its heavy half inside the provider scope once ready. The
  landing's First Load JS is 144 kB; the ~360 kB wallet stack arrives only
  when a wallet flow starts (verified: modal opens, phases narrate, dismiss
  returns to the door, zero errors). Prod landing: DOMContentLoaded ~0.5s,
  fully loaded ~1.5s. Nothing re-wraps, so loading the stack never remounts
  the page or resets its state.
- Submit, measured. "Submitting…" was slow for one honest reason and two
  fixable ones. The honest one: the enclave's /registration does the real
  work (signature checks, balance discovery across chains, CoinGecko
  pricing) — that is the floor and lives inside the enclave, untouched. The
  fixable ones: the /hello attestation round trip (~1.3s to the remote
  enclave) fired inside submit, and the Google JWKS fetch fired inside
  prepare. Now the JWKS warms when the door opens (prewarmTee), the hello
  warms the moment prepare resolves while the user confirms and signs, and
  the independent awaits in the sessioned prepares run as one Promise.all.
  All additive with identical fallbacks: a slow signer just refetches, the
  same as before. The backend adds no round trips (local Ed25519 verify plus
  Postgres writes).
- The waits, redesigned. The Loader's spinner is gone: the house now signs
  its mark (the 6 drawing itself, tail then bowl, looping) under the page's
  own line, or under a rotating house whisper when the page has none
  ("Lighting the lamp.", "Warming your seat.", "Shuffling the deck.",
  "Checking the door."). The prove button narrates its true phase beside a
  drawing mini-chop: connecting, writing the challenge, sign in your wallet,
  sealing it. Static under reduced motion.
- Fonts are self-hosted (src/app/fonts, next/font/local, byte-identical
  latin cuts): builds no longer depend on the Google Fonts CDN, and the page
  makes zero third-party font requests — a privacy product should not phone
  Google. Same families, weights, variables; the design is unchanged.

## Round three: the 6 as one gesture, header weight, docs honesty, door air

- The tail-on-a-circle kept reading as "d" no matter which side it stood
  on — a stick on a closed bowl is a "d". The mark is now a single flowing
  stroke: the arc descends the left and loops the bowl, the way a hand
  writes 6. One gesture, no closed circle, in Chop, the loader mark, and
  the favicon.
- The signed-in header showed a small ghost pill where a solid Sign in
  button stood. The account button is now the same `.btn` box — same
  height, same row as the theme toggle; only the label changes (tier menu).
- Docs start page: the deal card's ragged bold lead-ins are now three
  identical kicker/body rows, every edge aligned. The one-sentence callout
  stays one flowing paragraph, at the body register (it rendered larger
  than body text — a `.docs-callout p` rule was outranking `.label`, also
  fixed) — no verse. The standalone margin note had no base style and
  rendered as plain 16px text; `.doc-note` now speaks one mono voice in
  figures and alone. Body text wraps whole words (`break-word`).
- The door breathed: dialog padding 1.5 to 1.75rem, gap 0.7 to 1rem,
  options roomier, confirm and busy stacks aired to match. Verified on a
  clean production build: door 440x387, options 116px, modal opens,
  dismiss returns, zero errors.
- Environment note: the dev server on this box intermittently serves pages
  without hydrating (clicks dispatch, React never attaches, no errors)
  after repeated kill/restart cycles; a clean production build of the same
  tree verifies fully. Suspect stale dev cache/HMR ghost state, not the
  code — the tree typechecks, lints, builds, and passes every flow.

## Round four: the true 6, docs reverted, plaque voice

- Hand-drawn 6s kept failing: any stick on a circle reads as "d", and blind
  Bézier tuning could not land the letterform. The mark is now cut straight
  from the house typeface (Bricolage Grotesque 650, extracted as outlines):
  the wordmark, the loader (which inks the two contours in sequence), and
  the favicon all use the professional glyph. The house signs its name in
  its own voice; members keep their generative stroke chops.
- Docs start page restored to its original list and single flowing callout.
  The callout speaks as a plaque now (Space Mono with its kicker) instead
  of oversized body text — the only remaining change from the original is
  the font fix that was actually asked for.

## Round five: one seat, name-first rooms, numbered deal, arriving door

- The hero diorama needed three explanations, so it is gone. One member
  card under the lamp: your chop, you, when verified, a RESERVED plaque —
  dealt onto the felt on load (GSAP settle into its lean, still under
  reduced motion). Instantly legible: it is your seat. "Your seat is
  waiting."
- Room cards led with a busy scene and a tiny name on the felt. Now the
  name comes first and large, the scene is a slim atmospheric band, the
  occupancy meter is gone (it duplicated the count), and cards lift on
  hover like the rest of the house.
- The deal lines keep their exact words, set as three numbered display
  rows with hairline rules — numerals align, brass passes AA in both
  themes (light needed a darker cut, #6f511f, verified 5.15:1).
- The door announces itself: display titles ("Sign in", "Proof of bags",
  "Recover with a wallet", "Add/Connect a wallet") replace the whisper
  labels, and every dialog breathes deeper (2rem padding, 1.25rem gaps,
  roomier options).
- The Inside previews were toy glyphs (×/○ text, seal-red O) floating in
  mismatched boxes. The game is now a real hairline board with drawn
  marks (ink X, brass O); the floor list has presence dots and
  right-aligned access; both previews share one centered height. A plate
  override was swallowing the green presence dot — fixed.

## Round six: night mode honestly dark, a constructed 6, living waits

- Night mode kept cream cards — correct by thesis, wrong by expectation.
  The card stock is now dark walnut after hours (light theme untouched):
  every card, dialog, input, tag, toast, and menu flips coherently through
  the tokens, with a full dark-ink-on-walnut override set for text on wood
  (chips, bubbles, nav, callouts, QA markers, legacy adapter buttons).
  Felt scenes get lamplit rims and taken seats glow brass so nothing melts
  together. Contrast re-audited clean in both themes.
- The 6 is compass geometry now: a true circular bowl opened where the
  tail lands, a true circular tail arc up the left — root on the edge
  centered in its gap, verified numerically. No freehand cubics.
- Waits narrate true work: the loader cycles eight house lines including
  the operation voice (reading balances, forgetting addresses, sealing
  nothing but the tier), and the submit phase whispers the same under its
  phase label.
- Deal rows tightened to the article register (0.92rem, 0.55rem rows);
  all three gates share one flex rhythm so button-to-text gaps hold.

## Round seven: the card earns its rows

- The room card's felt band was a 64px empty forehead and the byline sat
  alone as a micro-row. The band is a 30px trim now, and the host credit
  moved into the tags row (right-aligned) — name, tags plus host, desc,
  one action row. 253px down to 217px, nothing removed but air.

## Round eight: the seat, staged — no input

- The hero card's chop was a bad hand: `Chop id="you"` hashed to a dash, a
  bar, a dot and a backslash crowded into the left column — at 52px, the
  largest element on the card read as a broken image, not an identity.
  The resting chop is now the blank lattice: an empty 3x3 of dashed
  hairlines (BlankChop), the board before the marks land. It pairs with
  "when verified" honestly, and it rhymes with the house game's board.
- A typed handle preview was built and killed on sight: an input in the
  hero splits the hero's one job (value prop plus one primary action),
  adds a second task with no intent behind it, opens the mobile keyboard
  over the landing, and read in screenshots as a white button competing
  with the card. The hero stays a still-life. Interactivity, if it comes,
  belongs in a section below with its own intent — never in the hero.
- The still-life was staged. The plaque tucks up under the card's base
  (0.55rem overlap) with a 1.2° counter-lean — hand-placed, never
  machine-level. A ground shadow (theme-aware: ink pool in daylight, brass
  pool at night) and a stronger lamp (26% brass daylight, 18% night) give
  card and plaque one shared ground plane. Card grew 172px to 190px, chop
  52px to 56px.
- The caption is gone ("Your seat is waiting."): the plaque already says
  Reserved and the card says you/when verified. The scene's aria-label
  carries the description for screen readers instead.
- One tactile tell: hovering the still-life straightens the card toward
  level (-4° to -1.5°) and lifts it — pick me up. The entrance tween ends
  with clearProps so CSS owns the settled state (GSAP inline transforms
  would override the hover rule otherwise). Transitions collapse under
  reduced motion.

## Round nine: the seat inks itself

- The blank lattice read as loading, not intention — the card's largest
  element was an absence. Now the lattice is only the opening frame: ~950ms
  after load (once the card has landed) it swaps to a dealt hand that inks
  itself stroke by stroke (55ms cascade, media-gated). The visitor watches
  the identity system work with nothing asked of them. Reduced motion
  renders the dealt hand immediately, no phases.
- The hand is curated, not random: plain "you" hashed to left-column
  scatter, so the hero deals "you-91" — the one "you" derivation found by
  brute force with 5 strokes, 4 kinds, every row and column inked,
  symmetric about the vertical axis. The name on the card stays "you".

## Round ten: the pair, the frame, the assay strip

- The hero card read as one flat UI panel. Now two cards: the house's
  lattice back rests behind the face card, rotated the other way and
  offset, peeking at the rim — the reveal language in miniature, and real
  depth for free. The face keeps the entrance deal and the hover
  straighten-and-lift; the back stays put.
- The face carries an inset hairline frame (6px, card radius holds): the
  engraved-place-card register instead of a bare panel.
- No tier tag on the hero card, deliberately: the edge language means a
  proven tier, and the visitor has proven nothing. The card's edgeless
  state is the honest unverified state, same as invite rooms.
- The tiers strip had a real bug: the landing emits t1..t4
  (tierEdgeClass) but the CSS listened for e1..e4, so every metal rule
  rendered transparent and all four cells looked identical. Unified on
  t1..t4, shared with the room cards. Each cell now carries its metal as
  the bottom rule with a faint wash of the same metal rising behind it
  (8/9/10%) — an assay strip, ascending. No new colors; brass, gilt and
  seal were already the system.
