# 062: Fewer overlays: controls for the input in use, only when needed

Status: researched and specified 2026-10-25 from the owner's request; not started.

## The request

The owner, 2026-10-25:

- "Get rid of the keyboard controls instructions overlay that is visible at the beginning of the game."
- "When the user is able to use keyboard controls don't show the movement icons in the bottom left."
- "Make sure the dual-stick onscreen controls are only visible when we are on touch interfaces."
- "Research best practice: the goal is to avoid useless overlay and icon clutter."

## What the game does now (checked 2026-10-25)

All of it is built in `src/toolkit/controls/input/first-person.ts`, styled in `src/styles/main.css`.

- **The help line** (`.controls-help`): on entering a room, and whenever the input changes, it shows every binding for the input in use (`controlsHelp(mode)` in `controls/logic/controls.ts`, "WASD: walk · Shift: run · …"), fading after a minute (ten seconds on touch). The same element carries contextual lines: the ladder's "W: climb · S: descend", noclip's flight keys, and, by prompt [061](061-component-information-overlay.md), the component information overlay.
- **The movement pad** (`.hud-movement`, bottom left: the step pad, the two turns and USE) is shown whenever the input is `mouse`, which is also what any key press sets. So a player walking with WASD still sees it. The pause menu's Controls tab has an "On-screen controls" switch (`settings.onScreenControls`, the body class `hide-onscreen-controls`) that hides it.
- **The thumbsticks, CROUCH and INSPECT** are shown only while `data-input='touch'`. The input starts as `touch` when the primary pointer is coarse (`matchMedia('(pointer: coarse)')`) and becomes `touch` on any touch or pen `pointerdown`, `mouse` on a mouse pointer, a walking key or mouse look, and `gamepad` while a gamepad is in use. This is nearly right already; the gaps are below.
- **The full reference** is already in the pause menu's Controls tab (a table of every binding, keyboard and mouse beside gamepad).

## Best practice (research, 2026-10-25)

- **Follow the input in use, not the device.** Show the controls for the input the player last used, and switch at once when they change, since devices are mixed (a touch laptop, a tablet with a keyboard, a gamepad on a PC). Google's ChromeOS games guidance: touch controls cost screen space that is useless to someone on a gamepad or keyboard, so detect the input actually used and adapt; and every input keeps working whatever the screen shows ([ChromeOS: handling input changes](https://chromeos.dev/en/games/handling-input-changes)). Xbox cloud gaming's touch layouts appear only for a player actively using touch and hide when a controller takes over ([Microsoft: getting started with touch](https://learn.microsoft.com/en-us/gaming/game-streaming/ux/getting-started-with-touch)).
- **Device detection is a hint, not a fact.** `pointer` and `hover` describe only the primary pointer; `any-pointer` covers every one; none of them can say whether a keyboard is present, and hybrid devices misreport ([Smashing Magazine: hover and pointer media queries](https://www.smashingmagazine.com/2022/03/guide-hover-pointer-media-queries/); [CSS-IRL: detecting hover-capable devices](https://css-irl.info/detecting-hover-capable-devices/)). A keyboard is proven only by a key press. So the first guess comes from `pointer: coarse` and `navigator.maxTouchPoints`, and every real input event corrects it.
- **Teach in context, not up front.** A wall of bindings at the start is read once, if at all, and then is clutter. Show a hint where and when the action becomes possible (at a ladder, carrying an object, entering noclip), stop showing it once the player has done it, and keep the full list on demand in the pause menu. The Xbox Accessibility Guidelines' UI-context guidance points to contextual in-game help and to letting players choose how much HUD they see ([XAG 114, UI context](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/114)).
- **Keep touch targets usable** where they do show: 44 × 44 pt at least for frequent controls ([Apple HIG: game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls)). The thumbsticks and buttons already meet it; this prompt does not change their size.

## What to build

**1. No controls list at the start.** The help line no longer shows `controlsHelp(mode)` on entering a room or on an input change. The element stays, as the one surface for contextual lines (the ladder, noclip, carrying, prompt 061's component information and its narratives); it is empty and hidden when it has nothing to say. The full list stays in the pause menu's Controls tab, which the title screen and the pause menu already reach. One short first-time hint replaces it, shown once per save on the first room entered and then never again: for the input in use, "Esc: menu and controls" (keyboard), "Start: menu and controls" (gamepad), or "☰: menu and controls" (touch), fading after ten seconds or at the first movement. Whether it has been shown is a per-browser convenience in `localStorage`, read and written in try/catch, never world state.

**2. The movement pad only for a mouse without a keyboard.** The pad is for a player who has only a mouse (or chooses to click their way round). It is shown only while the input is `mouse` and no key has been pressed this session; the first walking, turning or use key hides it for the rest of the session, and it does not come back on mouse movement. A separate input mode keeps this honest: `keyboard` (any key, with or without the mouse) beside `mouse` (pointer only), in `controls/logic/controls.ts`'s `InputMode`, so the scheme's help and the pad follow from the mode rather than from a flag. The pause menu's "On-screen controls" switch becomes three-way: Automatic (the default, as above), Always, Never.

**3. The thumbsticks only on touch.** They, CROUCH and INSPECT stay keyed to `data-input='touch'`, and are tightened so they never show to a player not touching:

- The first guess is `touch` only when the primary pointer is coarse and no fine pointer is present (`(pointer: coarse)` and not `(any-pointer: fine)`), so a touch-screen laptop starts with the mouse layout and switches to the sticks only at its first touch.
- A key press, a mouse pointer event or a gamepad hides them at once (this is already so for the mouse and gamepad; the key press goes to `keyboard`).
- A pen counts as touch, as now.
- On the title screen and in the pause menu they are hidden, as now.

**4. Nothing else on screen by default that the player does not need.** Audit the HUD's remaining items against "does the player need this now?" and list them for the owner, rather than changing them in this prompt: the top-right view tools, the view-link pin and the torch, the crosshair (already shown only with pointer lock, a gamepad, or while holding), the room's name card, the noclip altitude readout.

## Tests

- Pure (`controls/logic/`): the input-mode policy as a function of events (a coarse first guess, a touch laptop's first guess, a key press giving `keyboard`, a mouse pointer giving `mouse`, a touch giving `touch`, a gamepad giving `gamepad`); what is shown for each mode and setting (help line empty; pad only for `mouse` with Automatic, always with Always, never with Never; sticks only for `touch`); the first-time hint shown once.
- Browser, each from a fresh profile: a desktop with keyboard and mouse sees no controls list, no pad after the first key and no sticks; a mouse-only player sees the pad; a phone sees the sticks and no pad; a touch laptop starts without sticks and gains them at the first touch, losing them at the next key press; a gamepad hides both; the ladder and noclip lines still appear; the pause menu still lists every control.

## Acceptance

Starting the game at a desktop and walking with WASD, nothing on screen describes the controls after the one short "Esc: menu and controls" hint, and neither the pad nor the sticks show; on a phone the sticks are there from the start and the pad never is; every binding is still in the pause menu.

## For the owner

- Whether the one short first-time hint ("Esc: menu and controls") is wanted, or no hint at all.
- Whether a mouse-only player should still see the pad automatically (as proposed), or only with the setting on Always.
