# 116: The crosshair says what picking up and putting down will do

The owner, 2026-10-31: cues on the crosshair for picking things up and putting them down, "inspired by the works of Sierra and LucasArts, because they had a sort of context sensitive icon system" (the answer to question 8 of `doc/plans/115/push-pull-cue.md`). Read the root `CLAUDE.md` first (all input through `src/toolkit/controls`, `logic/` folders pure and tested, displays redrawing only on change), then `src/toolkit/controls/CLAUDE.md`, then the plan, `doc/plans/116/pick-up-cues.md`, and Codex's review of it beside it.

## The request

Today anything that can be picked up turns the ring amber (green once mission 115's push and pull cues land), and while carrying the ring turns green over a place the part fits and becomes a red × over one it does not. Nothing says whether a click will lift a thing or not, whether letting go will put it back, set it on a plinth, drop it in a bin or a carton, or just let it fall. The crosshair should say, before the click, what the click will do with a thing you can carry, in the same family as the turn, push and pull arrows: green when it will happen, red when the click will do nothing.

## Prerequisite

Mission 115's second part (`doc/plans/115/push-pull-cue.md`): `logic/use-cue.ts` (from `turn-cue.ts`), `markUsable`, the one-raycast probe at 10 Hz, `input/use-cue-markup.ts`, and the plain green ring. This mission adds to them.

## Scope

In:

- **The cues**: pick up (an up arrow from the ring, with two grips closing on it); put down on a surface, put back in its own place, put into a bin or carton (one down arrow into the ring, with a line, corner brackets or an open bin under it); fit into a socket (today's larger green ring, with four ticks closing on it); each red where the click will do nothing, with today's × in the ring where a place refuses the thing; the plain ring where letting go drops it. A on a gamepad. No inspect glyph.
- **One resolver** in `createObjectHandling`, `resolve(x, y)`, used by the click and asked by the cue, so they cannot disagree; its order is the code's (the plan, section 3).
- **Pure room hooks where asked**: `allowPickup` documented pure, dev4's PULLED LIVE spark moved to the pick-up itself; `useWhileHoldingAt` beside `useWhileHolding` in dev0, dev4 and dev5; a room's `targetFeedback` defined as what its `heldAction` will do, and widened to name the kind of place.
- **`PlacementTarget.cue`**: plinth decks put down, bins put in, sockets and exhibits fit.
- **The engineer's office**: the software boxes (put back, into the Gateway 3000 carton, red when a box's support is away, red lift under another) and the cupboards' drawer items.
- **The help line while carrying**: the thing's name and how to turn it over, by input.
- **Performance**: the per-frame `aimed()` and `targetFeedback()` raycasts move onto the 10 Hz probe; no cached hits; the SVG rebuilt only when its key changes.

Out for now, recorded in `TODO.md` as follow-ups:

- touch: no crosshair until something is carried, so no pick-up cue; while carrying, the cue speaks for the Use button, not an off-centre tap;
- a small picture of the held thing beside the ring (it is already drawn in the hands);
- the chemistry missions' verbs (pour into a hatch, weigh on a scale, fill and dip a sample tube) and an inventory of more than one thing;
- whether a software box and a cupboard item should both go home, or both fall, when let go elsewhere (question 2);
- Hall 5's stale comments about a portable skimmer lid (`hall-5-day-in-the-life.ts`).

## Order of work

1. The pure rule: `CarryGesture`, `CarryAnswer` and `handsCue` in `logic/use-cue.ts`. Tested.
2. dev4's spark moved to the pick-up; `allowPickup` pure.
3. The resolver, with `use`, `release`, `aimed` and `targetFeedback` built on it; `useWhileHoldingAt`; `PlacementTarget.cue`. Every existing carrying test passes unchanged first.
4. The probe in `first-person.ts`; the per-frame calls removed.
5. The glyphs in `use-cue-markup.ts`; tried in dev0 and dev5, screenshotted at scale 1 on light and dark, and shown to the owner (question 1) before any room is changed.
6. The engineer's office: `canPutBack` in `put-back.ts`, the desk's and cupboards' `cue`, its `targetFeedback`.
7. dev4's sockets; the help line; the museum halls, dev1, dev53; rooms passing `objects: scene` checked for detachable parts.
8. Screenshots and the component benchmark (the office and dev4); `TODO.md`, `CHANGELOG.md`, the controls guide.

## Tests

- `use-cue.test.ts`: `handsCue`, keys, the pad's A.
- `object-handling.test.ts`: the resolver's order against what `use` then does (the room's first refusal; `targetFeedback` ahead of a `useWhileCarrying` part; an aimed target ahead of a nearby bin; an aimed wrong-kind bin refused; a drop); the lift green, red, or absent for a fixed part; asking a thousand times changes nothing and calls no acting hook.
- `put-back.test.ts`: `canPutBack` agrees with `putBack` and changes nothing.
- The office: its `targetFeedback` and `heldAction` agree for every box, aim and state.
- dev4: aiming at a live card does not spark; pulling it does.

## Acceptance

- Not carrying: the green lift over what can be picked up; red over what cannot be now, where a click does nothing else; never a lift over a fixed part.
- Carrying: the cue shows where the thing will go (put down, put back, into a bin or carton, fit), red with the × where the place refuses it, the plain ring where it will drop, and a control's own cue where the click works a control instead.
- The engineer's office says, before the click, whether a box will go back or into the carton.
- Every room that works today works unchanged; `'accept'` and `'reject'` still honoured.
- No per-frame raycast for the cue; the probe at most ten times a second; asking it changes nothing.
- Typecheck, lint, format, tests and build pass.

## Questions for the owner, to ask one at a time

1. (With the dev0 screenshots.) One arrow, up to lift and down to let go, with a mark under the ring for the kind of place (a line, corner brackets, a bin, ticks for a socket), or the simpler set: a lift, the socket ring, and one down arrow for everything else?
2. (Gameplay, not blocking.) A software box let go anywhere goes back to its shelf, but a cupboard item let go anywhere but its drawer falls on the floor: should they agree, and which way?
3. Should the help line, while you carry something, name it and say how to turn it over ("10 A fuse cartridge · hold X: turn it over")?
