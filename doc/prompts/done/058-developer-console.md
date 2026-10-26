# 058: Developer console

Status: mostly complete (reviewed 2026-10-26, source `e5078c4`).

## Review checkpoint — 2026-10-26

**Classification:** Mostly complete. **Filed:** `doc/prompts/done/058-developer-console.md`.

**Delivered:** The shared console, world REPL/actions, event log, history/completion and status inspection are available.

**Still outstanding:** Complete the later-stage notification surface, watchers/scenario commands and convenience commands, touch/gamepad access and the developer-access policy.

**Evidence:** 2758b24, 3108b5a. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

## The owner's choice (2026-10-24)

Mostly B. It is a log: anything done in the game that changes the model shows a line. Every object in the game has an identifier now, so a command can switch a particular valve, set a control in the model, or work anything else; other commands work the game itself (noclip on and off), carry the player to another room, and tell them about a room. Not everything at once: first, a console that works as Quake's does, a key that brings down a command prompt with a REPL behind it for simple commands, perhaps with a JavaScript-like syntax, whatever is easy in a TypeScript game. No recording or replaying sessions for now.

## Stage 1: what is built first

### The console

- **Opening it:** the key left of 1 (`Backquote`; on a UK Mac in Safari also `IntlBackslash` when it types `or §), from play or from the free mouse, never while typing in another field, and not on the title screen. It drops down over the top of the view, the log above a`]`prompt, and takes the keyboard: the walker hears nothing while it is down (as when paused), but the world runs on unless`pause` is typed. The same key, or Esc, puts it away; Esc then does not open the pause menu. Opening it frees the mouse; putting it away from play asks for pointer lock again.
- **The REPL:** Enter runs the line, echoed as `] line`; Up and Down walk the history (the last 100 lines, kept per browser in `localStorage`, every read and write guarded); Tab completes the word at the cursor (command names first, then the command's own arguments: room ids, valve and switch tags, motor tags), cycling through the matches on further presses; Page Up and Page Down scroll the log; `;` separates several commands on one line.
- **Two syntaxes, one line at a time.** A line whose first word is a command is a Quake command: words separated by spaces, quotes keeping spaces in one word (`open PL1-F1-IV1`, `goto pool_02`). Any other line is JavaScript, evaluated with the commands as functions in scope (`open("PL1-F1-IV1")`, `goto("pool_02")`), `world` as the world now (frozen, read-only), and `act(action)` to dispatch a world action; the value it gives is printed. It is the developer's tool, run in the player's own page, so plain `Function` evaluation is acceptable; nothing typed is ever saved or sent anywhere.
- **Where it lives:** `src/toolkit/console/` with `logic/` pure and tested (the command line: tokenising, history and completion; the command registry and the commands, given a small `ConsoleHost` interface the app implements, so they import no DOM) and `console-view.ts` (the drop-down). The key is the control scheme's (`isConsoleKey` in `src/toolkit/controls/logic/controls.ts`, and a `consoleOpen` signal beside `paused` and `noclip`); rooms bind nothing.

### The log

- **Every action:** `src/game/events/`: a `GameEvent` (world time, kind `action` / `plant` / `command` / `system`, severity `info` / `notice` / `alarm`, subject, text, who: you or the console), and `describeAction(before, action, after)`, an exhaustive switch over `WorldAction`, so every action has a line and a new action without one fails to compile; it says what was done, and "no change" when nothing changed. Lines read as a plant logbook: the world clock, the subject's tag or id, then the text (`00:41:07  PL1-F1-IV1  valve opened (by you)`).
- **What the plant does by itself:** watchers diffing the world before and after each step: a motor starting, stopping or tripping; a pool tripping at low-low level or recovering; the jacuzzi cabinet's trip; the booster set's trip; the gas zones' alarms; the boiler house's safety shut-off valve; a lighting zone lit or dark. More watchers follow in later stages.
- **Wiring:** the player's `WorldStore` gains `events` (a signal of the last 2,000 lines, a bounded ring) and `log(event)` for the console's own lines; its `dispatch` describes each action, and its clock diffs each step. The log is not part of the world and not saved, so no `WORLD_VERSION` bump; it outlives rooms but not a reload. The attract sequence's scenario stores keep no log that anything shows, and the console always works the player's world, never an attract world.

### First commands

- `help [command]`, `clear`, `echo <text>`, `history`
- `status`: the world clock, the room, paused or not, noclip, the alarms standing
- `rooms [filter]`: room ids and names; `room [id]`: about a room (its name, and the valves, switches and motors it holds); `goto <room>`: go there
- `noclip [on|off]`, `torch [on|off]`, `pause`, `unpause`, `cam` (the camera link, printed)
- `valves [filter]`: every valve with its tag, room and state; `open <tag>`, `close <tag>`; `switches [filter]`, `switch <tag> on|off`; `motors`, `starter <tag> hand|off|auto|start|stop|reset`
- `get <path>`: read the world by a dotted path (`get pools.pool_02.temperature`)
- `act <json>`: dispatch any world action, as JSON
- `condump`: download the log as a text file
- In JavaScript, the same as functions, plus `world` and `act`.

No developer gate in this stage: the console is the owner's tool while the game is built. Whether players get it, and which commands then need `developer 1`, is decided before it ships to them.

### Acceptance (stage 1)

- Pure and tested: `describeAction` for every action type, and "no change"; the watchers firing once on a transition, never on a steady state; the bounded log; tokenising, `;`, quotes, history and completion; `isConsoleKey` on US, UK PC and UK Mac keyboards; every command having help; the JavaScript path printing values and errors.
- In a browser: the key opens and closes it from play and from the free mouse; typing never moves the walker; Esc closes it without opening the pause menu; valves opened by command, and by hand in a room, both log a line; `goto`, `noclip` and `room` work; a pump tripping logs itself.
- The five project checks, the changelog, and the TODO item ticked with its date and commit.

### Later stages

Notify lines over the game while the console is up; more watchers (drain-downs passing levels, chemicals running low, air handling units); `scenario` and `attract` commands; `skip`, `setpoint` and other shortcuts; touch (a Console button in the menu) and gamepad (Back shows the log); the developer gate before players get it.

## Purpose

A Doom/Quake-style drop-down console (the owner, 2026-10-24): the key left of 1 brings it down over the top of the view; text commands typed into it act on the game; and it keeps a running log of what happens in the game, so switching a starter to HAND, opening a valve, pressing a panel's RESET, or a pump tripping on no flow each appear as one line. It is a developer's tool first (driving scenarios, finding a valve by its tag, jumping to a room, dumping a log to attach to a bug), and its log is also, in this game's terms, the building's logbook: a record of who did what to the plant and what the plant did back.

## How the classic consoles worked

- **Doom (1993)** had no console: cheats were typed blind into the game (IDDQD) and messages flashed along the top of the view. The console came with the source ports. ZDoom opens it with the key below Esc, pauses the game while it is down, keeps a command history on the up and down arrows, and completes a partial command or cvar on Tab, cycling through further matches on repeated presses ([ZDoom wiki: Console](https://www.zdoom.org/wiki/Console)). Doomsday binds it to the same key and completes the word left of the cursor ([Doomsday console keyboard reference](https://manual.dengine.net/guide/console_keyboard_reference)); Doom Legacy scrolls its messages with Page Up and Page Down ([Doom Legacy console reference](https://doomlegacy.sourceforge.net/docs/console.html)).
- **Quake (1996)** made the drop-down console the pattern everyone copied. `Con_ToggleConsole_f` switches keyboard focus (`key_dest`) between the game and the console and clears the notify lines; the console slides down at `scr_conspeed`; `con_backscroll` counts how many lines the view is scrolled up from the bottom; and the last few lines are shown over the game for `con_notifytime` seconds (default 3) while the console is up ([WinQuake `console.c`](https://ara-mdk.googlesource.com/platform/external/quake/+/9fd67c44777b350dc56f3e70c88963b0d966ffc7/quake/src/WinQuake/console.c), [Quake console commands](https://www.moddb.com/games/quake/tutorials/quake-console-cmds)). Quake split the language into **commands**, keywords that do something (`map`, `bind`, `quit`), and **cvars**, named variables that hold a value and are read or set by typing their name with or without one; archived cvars are kept in the config, others set again from `autoexec.cfg` ([OpenArena wiki: key bindings](https://openarena.fandom.com/wiki/Key_bindings)). `bind <key> "<cmd>; <cmd>"` ties keys to command strings, though the console key and Esc themselves can only be rebound from a config file (same source). Quake III added `condump <file>`, writing the console's text to a file ([Quake III console commands](https://students.pm.vogu35.ru/pages/pm01/mas/console_commands.htm)).
- **Half-Life and Source** kept Quake's console but disabled it by default, behind an option ([Valve Developer Community: Developer console](https://developer.valvesoftware.com/wiki/Developer_console)). `developer 0` to `2` turns on more verbose output and, at 2, prints the last few console lines at the top of the screen as well. Gameplay-changing cvars are flagged as cheats and work only with `sv_cheats 1`, which also turns achievements off. `con_logfile` writes everything to a file as it is printed, while `condump` writes the current text to a numbered `condumpNNN.txt` on demand; `con_filter_enable` with `con_filter_text` hides or greys lines that do not match (same source).
- **Common ground**, which this game should keep: one key toggles it; it slides down over the upper part of the view, never replacing it; the game takes no input while it is down; up and down recall history; Tab completes and cycles; Page Up and Page Down scroll back; notify lines show the newest events over the game when it is up; commands and settable variables are distinct; some commands are cheats and need a switch; and the log can be dumped to a file.

## Browser specifics

- **The key.** `KeyboardEvent.code` names the physical key after its place on a US keyboard, so the key left of 1 is `Backquote` whatever it is labelled; on a UK PC keyboard that is `and ¬. The UK`#`and`~`key beside Enter reports`Backslash`, and the `\` and `|` key beside left Shift reports `IntlBackslash` ([W3C UI Events code values](https://w3c.github.io/uievents-code/), [MDN code values](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values)). So tilde is not the key to name in the UK: bind the position, `Backquote`, and say "the key left of 1" in help text, never "~".
- **Apple ISO keyboards** (a UK MacBook) put § and ± left of 1 and `and ~ beside left Shift, and macOS swaps the two keys' native codes on ISO keyboards. Chrome and Firefox correct for it when computing`code`, but WebKit/Safari has been reported to leak the swap, giving `IntlBackslash`and`Backquote`the wrong way round ([Mozilla review for bug 1263302](https://reviewboard.mozilla.org/r/116012/diff/), [Chromium change for crbug 600607](https://codereview.chromium.org/1943553002), [WebKit bug 244202](https://bugs.webkit.org/show_bug.cgi?id=244202)). Accept`Backquote`, and also `IntlBackslash`when`event.key`is` or §, so the key left of 1 works on a UK Mac in every browser; Ctrl+` as a second binding costs nothing.
- **Dead keys.** On some layouts (German ^, French ²) the key left of 1 is a dead key that would begin a composed character in the input; `preventDefault()` on its keydown stops the character reaching the console's field, and `event.isComposing` must be ignored so an IME is not interrupted.
- **Pointer lock.** Keyboard events still arrive while the pointer is locked, so the key can open the console from play. On opening, release the lock (`document.exitPointerLock()`) so the mouse can select and scroll the log; a programmatic release is not the Esc release that Chrome follows with its refusal cool-down (`logic/pointer-lock.ts`). On closing, ask for the lock again within the closing keydown, which counts as a user gesture; if it is refused, the existing click-to-look fallback stands. Esc while the console is down closes the console (Source's behaviour), never the pause menu behind it.
- **Focus.** The console's own `<input>` takes focus while it is down; the walker already ignores keys typed into inputs (`typing()` in `input/first-person.ts`). The console key must not open the console while focus is in some other field (a settings box, the pause menu), and when the console has focus its keydown listener (capture phase on the window, as the pause menu's is) stops the game hearing anything but the console key. The field gets `autocomplete="off"`, `autocapitalize="off"`, `spellcheck=false`.

## What the codebase gives it

- **One choke point for actions.** Every change a room makes to the world goes through `WorldStore.dispatch(action)` in `src/toolkit/save/world-store.ts`, which calls the pure `applyAction(world, action)` of `src/game/world.ts` (52 `.dispatch(` calls across the rooms, all through a store from `roomWorld()`). The `WorldAction` union (about 30 kinds: `plant/valve`, `plant/switch`, `motor/starter`, `jacuzzi/cabinet`, `boiler-gas`, `gas/act`, `lighting/zone`, `pool/setpoint`, `plant/full-off` and the rest) is the complete vocabulary of what a player can do to the plant, so a pure `describeAction` with an exhaustive switch gives every one a line, and a new action that has none fails to compile.
- **One choke point for time.** The store's `tick` calls `advance(world, elapsed)`, which runs `stepWorld` in 0.1 s steps; the scenario store (`createScenarioStore`, the attract sequence's) does the same on its own. Everything the plant does by itself happens there, and can be found by diffing the world before and after a step.
- **Derived events worth logging**, each a watched value in the world: a motor starter's `running` and `tripped` (`world.motors.starters[tag]`, `motor-starters.ts`), and each pool's `motors.stopped`; a pool's `tripped` at low-low level (`water-balance.ts`); the booster set's `boosterTripped` and the backwash tank `discharging` (`wet-hall.ts`); the jacuzzi cabinet's `trip` (`'no-flow'`) and `power` (`jacuzzi-cabinet.ts`); the gas zones' latched `a1` and `a2` and `accepted` (`gas.ts`, `gas-detection.ts`); the boiler house's `ssovOpen`, `gasDetected` and `stopPressed` (`boiler-gas.ts`); SLOW START beginning and finishing (`world.startup`); each air handling unit's mode and running (`air-handling.ts`); the Olympic tank's make-up valve `open` (`olympic-tank.ts`); lighting zones lit or dark; a pool's level crossing empty, full or a skimmer edge during a drain-down; a chemical store running low or empty (`chemicals.ts`); and the lounge solenoid valves reaching open or shut (`loungeValvePositions`, which travel over time, so the action says "opening" and the diff later says "open").
- **Plant addressing.** Installed valves have a permanent asset ID and a display tag (`INSTALLED_VALVES` in `installed-valves.ts`, e.g. `PL1-F1-IV1`), and `installedValveByCommandId` resolves a command's id; the identified plant (`identification.ts`, `walkIdentified`) lists every named part with its path. These give `valves`, `open` and `close` their tags and their tab completion.
- **App controls already exposed.** `noclip` and `paused` are signals in `src/toolkit/controls/logic/`; the torch is `torch.toggle()`; `goTo('?room=…')` and `copyCameraLocation()` in `src/main.ts` do room changes and camera links; `?scenario=cold,ozone-leak,drain-pool_01,skip-600` in `main.ts` is already a little command language of world scenarios, and `src/game/attract-scenarios.ts` holds the attract sequence's prepared worlds.
- **Isolation to keep.** The attract sequence's scenario stores must never write into the player's log, and the player's console must never act on an attract world (054's isolation rule). Each store has its own log; the console shows and drives the player's (`worldStore('dev')`), never `roomWorld()` while the title is up.

## Proposal A: action log and a handful of commands (minimal)

- **Event log.** `src/game/events/describe-action.ts`: `describeAction(before: World, action: WorldAction, after: World): GameEvent[]`, pure, an exhaustive switch over `WorldAction`, saying what the action did, not only what was asked (a starter START with no permit says so). `src/game/events/event-log.ts`: `GameEvent { time; kind: 'action' | 'system' | 'command'; subject; text }`, an append to a bounded ring (1,000 lines), and `formatEvent` with the world clock. No derived events.
- **Wiring.** `WorldStore` gains `events: ReadonlySignal<readonly GameEvent[]>`; `dispatch` appends the described action. The log lives for the page only, never in the save.
- **Commands.** `help`, `clear`, `echo`, `noclip [on|off]`, `torch [on|off]`, `pause` / `unpause`, `cam` (print the camera link), `goto <room>`, `condump`.
- **Gating.** Dev only: the console key does nothing unless `?dev` has been visited this session or the URL carries `&console`.
- **Cost and limit.** A day or so. It answers "what did I just switch?" but not "why did the pump stop?", which is most of what a console is for here.

## Proposal B: action and plant events, a command registry, cheats behind `developer` (recommended)

### The event log (pure, `src/game/events/`, tested beside it)

- `event.ts`: `GameEvent { time: number /* world seconds */; kind: 'action' | 'plant' | 'system' | 'command'; severity: 'info' | 'notice' | 'alarm'; subject: string /* a tag, path or room */; text: string; by?: 'player' | 'console' | 'scenario'; room?: string }`.
- `describe-action.ts`: as in A, exhaustive, using `before` and `after` so a press that changes nothing reads "no change" rather than lying.
- `watchers.ts`: a list of watchers, each `{ id, pick: (w: World) => T, describe: (was: T, now: T, world: World) => GameEvent | null }`, one per derived event listed above; `diffWorld(before, after): GameEvent[]` runs them all. Each watcher compares one small picked value, so diffing every 0.1 s step is cheap.
- `advance` gains an optional `onStep(before, after)` (pure, defaulting to nothing), so a long step-through (a hidden tab, a `time/skip`, the hour's catch-up on load) reports every trip and reset at step resolution instead of netting them out. A catch-up longer than a minute logs one system line first ("Caught up 47 min 12 s while the game was closed"), then its events, capped at 200 with a "… and 1,312 more" line.
- `event-log.ts`: the bounded ring (2,000 lines), filtering by kind, severity, subject and text, `formatEvent` and `formatDump` (the condump text: a header with build, version and real date, then one line each).

### Wording, in the game's tone

Plain, dry, specific; tags first, as a plant logbook or a BMS alarm printer would print them; "you" only for the player's own hand. The clock is world time since the world began. `P-101A` and `PL2-P1-IV1` are real tags from the world; the others are placeholders until the plant gives those things tags.

```
00:41:07  PL2-P1-IV1  Olympic pump suction valve opened (by you, plant_pool_02)
00:41:12  P-101A      Olympic duty circulation pump: starter to HAND
00:41:12  P-101A      Olympic duty circulation pump: START pressed, running
00:43:55  P-101A      Olympic duty circulation pump TRIPPED: no flow
00:44:02  JAC-CAB     Jacuzzi treatment cabinet tripped: NO FLOW
00:44:30  JAC-CAB     Jacuzzi treatment cabinet RESET (by you, plant_pool_03)
01:02:18  HYPO-STORE  Chlorine 0.6 ppm: ALARM 1
01:02:51  HYPO-STORE  Chlorine 1.1 ppm: ALARM 2, extract fan running
01:03:10  HYPO-STORE  Alarm accepted (by you)
01:15:00  BOILER-GAS  SSOV closed: gas detected. Heating lost to all pools
01:20:44  pool_01     Lounge pool level 0.15 m down: closed to bathers
01:21:00  pool_01     Lounge pool TRIPPED at low-low level
02:00:00  LTG         Lighting zone olympic_hall off (by console)
```

Severity colours the line (alarm red, notice amber, info the console's plain colour); alarms also show as notify lines over the game while the console is up, as Quake's did, for `con_notifytime` seconds.

### Wiring

- `WorldStore` gains `events: ReadonlySignal<readonly GameEvent[]>` and `dispatch(action, by?: { by; room })` (the second argument optional, so the 52 existing calls are untouched; rooms pass nothing and are logged as the player in the current room, which the console host supplies). `dispatch` appends `describeAction`; `tick` passes `onStep` to `advance` and appends `diffWorld`. The scenario store keeps its own log, which nothing shows.
- The log is not part of `World` and not saved, so no `WORLD_VERSION` bump. It survives room changes (the store outlives rooms) but not a reload.

### The console itself (`src/toolkit/console/`, with `logic/` pure and tested)

- `logic/command-line.ts`: tokenising (quotes, `;` separating several commands, as Quake's), the history ring with up and down, and completion (common prefix on Tab, cycling on further presses, completing command names, cvar names, room IDs, valve and motor tags, scenario names).
- `logic/registry.ts`: a registry of commands and cvars, each with name, help line, argument completer, whether it is a cheat, and a run function given a context (`{ world: WorldStore; app: ConsoleHost; print }`); `ConsoleHost` is the small interface `main.ts` implements (`goTo`, `cameraLink`, `setNoclip`, `currentRoom`, `download`), so the registry imports no DOM.
- `console-view.ts`: the drop-down: a fixed panel over the top 45 per cent of the view (Quake's half screen, less on a phone), sliding down in 150 ms (instant with `prefers-reduced-motion`), a monospaced log, an input line with a `]` prompt as Quake's, Page Up / Page Down and the wheel to scroll back, End to the bottom, a "▼ new lines" marker when scrolled up. Penfold's discreet mark in its top right corner, since it is, in fiction, the building management system's engineering terminal.
- History (the last 100 commands) kept per viewer in `localStorage` under `pool-plant:console-history`, every read and write in try/catch; nothing else is stored.

### Starter commands

Free to everyone:

- `help [command]`, `clear`, `echo <text>`, `history`
- `log [filter] [--alarms] [--since 10m]`: reprint matching lines; `filter <text>` / `filter off`: Source's `con_filter`
- `status`: the world clock, the player's room, paused or not, alarms standing
- `valves [room]`: installed valves with tag, room, run, normal and actual position; `motors [pool]`: starters with mode, running, tripped, current
- `get <path>`: read the world by a dotted path (`get pools.pool_02.temperature`), read-only
- `cam`: print and copy the current camera link; `rooms`: list the room IDs
- `condump [name]`: download the log as `pool-plant-console-2026-10-24T1932.txt` (a Blob and an `<a download>`); `torch [on|off]`; `pause` / `unpause` (the `paused` signal, which stops the world's clock)

Cheats, refused with "needs developer 1" unless the cvar `developer` is 1 or 2:

- `noclip [on|off]`; `goto <room> [x z [yaw]]` (completes room IDs; uses `goTo`)
- `open <tag>` / `close <tag>`: `plant/valve` by tag; `switch <id> on|off`; `starter <tag> hand|off|auto|start|stop`; `reset <thing>` for the panel RESETs
- `act <json>`: dispatch any `WorldAction` as JSON, checked against the union's `type` list, logged "by console"
- `skip <seconds|10m|2h>`: `time/skip`; `ambient <°C>`, `setpoint <pool> <°C>`
- `scenario <name…>`: the `?scenario=` list (`cold`, `misdelivery`, `chlorine-leak`, `ozone-leak`, `gas-clear`, `drain-pool_0N`, `fill-pool_0N`, `skip-N`) applied to the running world; that list moves out of `main.ts` into a pure `src/game/scenarios.ts` returning actions, so the URL and the console share it
- `attract list` / `attract <preset>`: show the current room on an attract preset (`attract-scenarios.ts`) in a scenario store, as the title does, with "attract off" returning to the player's world; never writes the player's save
- `newworld`: the store's `reset()`, after typing it twice ("type newworld again to discard the save")

Cvars: `developer 0|1|2` (2 adds info-level plant events as notify lines too, Source's level 2), `con_notifytime` (seconds, default 4), `con_lines` (scrollback kept, default 2,000). Cvars are session-only, like noclip; none is saved, so a player cannot leave cheats on by accident.

### Controls

- The binding goes in the one scheme: `ControlAction` gains `'console'` in `src/toolkit/controls/logic/controls.ts`, with mouse "`(left of 1): console", touch "Console button in the menu", gamepad "Back: console log" (button 8, read-only, since a pad cannot type; scrolls with the right stick). A pure`isConsoleKey(code, key)`in the same file holds the`Backquote`/`IntlBackslash`rule above and is tested. A`consoleOpen`signal sits in`src/toolkit/controls/logic/`beside`paused`and`noclip`.
- `input/first-person.ts` treats `consoleOpen` as it treats `paused` for input (no walking, looking or use, keys and pad buttons held now counted as held) but the world keeps running unless `pause` is typed, so events can be watched arriving. Rooms bind nothing; the console's keys (Tab, arrows, Page Up) are the console view's own, inside its field, as the pause menu's Q and E are.
- No `bind` command: binding keys belongs to the controls layer alone, and a console that rebinds keys would break the rule. A later "command buttons" panel in the pause menu could serve the same need.

### Who gets it

Everyone. The log is part of the game's fiction (the plant's logbook, which shows a player what their switching did, the control room's job of diagnosis in text), and the free commands only read. Cheats need `developer 1`, typed each session; while it is on, the console's prompt reads `dev]` and the status line says DEVELOPER, and anything done through a cheat is logged "by console", so a bug report's condump shows it.

### Acceptance

- Pure, tested: `describeAction` gives a line for every `WorldAction` type (a test walks the type list) and says "no change" where none happened; each watcher fires once on its transition and not on a steady state; `advance` with `onStep` gives the same world as without it; a trip and reset within one `advance` call both appear; the ring keeps its bound; tokenising, history and completion; `isConsoleKey` for US, UK PC, UK Mac (both browsers' codes), German and French layouts; every registered command has help and refuses its cheats without `developer`.
- Isolation: an attract shot's actions and steps never reach the player's log; console commands never act on an attract world.
- In a browser: the key opens and closes it on a UK keyboard, from pointer-locked play and from free-mouse; typing never moves the walker; Esc closes it and does not open the pause menu; touch opens it from the menu with the on-screen keyboard; a pad's Back shows the log; condump downloads a readable file.
- The five project checks, the changelog, README's controls section, and the TODO items with date and commit.

## Proposal C: a plant event journal in the world, feeding in-world devices (ambitious)

Everything in B, and:

- **Events from inside the step.** `stepWorld` and `applyAction` return their events alongside the world (`{ world, events }`), each module (`motor-starters.ts`, `gas.ts`, `jacuzzi-cabinet.ts`) reporting its own transitions with the cause it knows (a motor tripping knows it was starved for 8 s, which a diff cannot see). Watchers remain for whatever a module does not report.
- **The journal in the world.** `World.journal`: the last 500 plant events, saved, `WORLD_VERSION` bumped with a migration that starts it empty. It survives a reload and a catch-up, so a player returning after an hour can read what went wrong while they were away.
- **In-world readers of the same journal**, each real and working as the project rules ask: a dot-matrix alarm printer in the control room (Penfold, fan-fold paper that tears off, printing each alarm as it comes), an annunciator's first-up history, an event list on a period BMS terminal in the duty manager's office. The console is then one view of the journal among several.
- **Replay.** Record the action stream with world times (`record` / `stoprecord`), and `playdemo` it onto a copy of the starting world: the world is deterministic in fixed steps, so a recorded session reproduces a bug exactly, as Quake's demos did. Recordings download as JSON.
- **Scripts.** `exec <name>` runs a stored list of commands (`doc/console/*.cfg` built in), `alias`, and `wait <seconds>`, for scripted test scenarios and attract shots authored as command lists.
- **Speed.** `timescale 0.1–20`: the store's tick multiplies its elapsed time, for watching a drain-down or a slow fault develop.

Cost: weeks, a world version, touching every plant module, and new control-room equipment that needs the owner's design. Most of its value comes later and can be built on B without rework, since B's `GameEvent`, log and registry are the same.

## Recommendation

Build **B**. A gives a console that cannot explain a trip, which is the most useful thing it can do here; C is the right destination but couples the console to a world version change and to new control-room equipment the owner has not asked for. B keeps the log out of the save, needs no migration, touches rooms not at all (one optional argument on `dispatch`), keeps all input in the one control scheme, and makes every later step of C (module-reported events, a saved journal, the alarm printer, replay) an addition rather than a rewrite. Questions for the owner before starting, one at a time: whether players get the console or only developers; then whether the world keeps running while it is down.

## Remaining (checked 2026-10-26)

- Notify lines over the game while the console is up.
- More watchers: drain-downs passing levels, chemicals running low, air handling units.
- `scenario` and `attract` commands, the `?scenario=` list moved into a pure module both share.
- `skip`, `setpoint` and other shortcuts.
- Touch (a Console button in the menu) and gamepad (Back shows the log).
- A developer gate before players get it.
