# 068: Inspect controls, indicators and instruments inside components

Status: specified 2026-10-25 from the owner's request; in progress. Stage 1 done 2026-10-25: the typed part contract (`src/game/plant/part-inspection.ts`), parts winning over their panel, the lounge filter mimic's buttons, lamps and readouts, and installed flowmeters' live readings and paths. Stage 2 done 2026-10-25: PL1-CP1's and PL2-CP1's doors (lamps, ammeters, HAND · OFF · AUTO, RESET, emergency stop; SUPPLY ON, which nothing drove, now lit from the room's supply), and PL1-UV1's status, lamp lit or off, from the world (no fault is modelled, so never "operational"; the unit has no buttons of its own, so the acceptance's "hover its button" cannot apply until it has some). Still to do: a dev0 prototype board, and the audit of other families (cabinet, boiler, valve-panel controls).

## The request

Hovering or aiming at a button, switch, lamp, gauge or display inside a component should explain that **part**, rather than repeat the enclosing component's name. Today aiming at a control on `PL1-CP1` usually reports `PL1-CP1`. The owner wants two lines: a minimal factual first line saying what the part does or currently reads, and an optional second line giving useful context. The second line is omitted if the model does not know that context. This supersedes 061's tag-and-name first-line format for an identified **part**; whole components keep that format, with live status when known.

Examples of the intended wording (tags and values are illustrative; use actual registered identities and world readings):

```text
OPEN button — Commands PL1-PP1-IV1 to open.
PL1-PP1-IV1 is the outflow isolator for pump P-201A.
```

```text
PL1-F2-FT1 — Flow meter, currently reading 45.0 m³/h.
Measures the flow of filtered water exiting Filter 2 into the return header.
```

```text
PL1-UV1: Lounge pool UV unit, currently operational.
This is the control box for the lounge pool's UV disinfection stage.
```

The `PL1-UV1` example is an enclosing unit/control-box view: aiming at one of its individual controls should show that control's purpose instead. “Currently operational” must be derived from the unit's actual running and fault state; a live but unmodelled unit must not be called operational merely because it has power. The contextual line describes what the looked-at housing or control box serves, using the component's model relationship and purpose.

For a display on a mimic, name the selected quantity and its unit, not just “display”. For a lamp, state the condition it indicates and, where available, whether that condition is present now. If a command can be refused by an interlock, say “commands” or “requests”; inspecting must not claim that the valve has already moved. A meter's first line uses the same value, sign, unit and unavailable state as the physical instrument. For a reversible flowmeter, the optional path description follows the actual direction of flow; at zero flow it describes the installed measurement path without inventing a direction.

## Model contract

- Give each meaningful visible part a stable identity beneath its enclosing component: an instance identity for picking, a local part key, and a typed purpose. The hierarchy may be represented as `PL1-CP1.<part key>` internally, but a button does not need its full path printed on the panel or in the hover line. One model part may have several meshes (cap, legend, bezel): they all resolve to the same part. Two copies of a mimic share the same semantic binding but have distinct scene-instance pick keys.
- A command part binds to a structured target and operation in the control model (for example, valve asset plus `open`, pump starter plus `start`, or thermostat plus `setpoint`). The same binding must drive the real action and generate the inspection wording. Do not infer semantics by parsing a painted legend, a mesh name or a button id string, and do not maintain a second handwritten description table alongside the action map.
- A reading part binds to the same world selector and unit that draw the meter or display. Its purpose records the measured quantity and, when known, the model's fluid or electrical commodity and source/destination graph ports. Dynamic value text comes from the current world, not a cached label. A display with modes describes the mode currently selected; a shared readout changes its inspection text when its mode changes.
- A lamp binds to the condition that lights it. A switch or selector binds to the setting it changes. Parts inside a machine inherit that machine's model container and catalogue identity; an independently installed instrument such as `PL1-F2-FT1` keeps its own registered tag. No new plant tag is fabricated for an unregistered part.
- Enclosing components still have their own two-line inspection: registered tag, name and truthful live status first; an optional statement of purpose or of a child housing's relationship to its parent second. A UV control box can therefore identify as `PL1-UV1` and explain which UV stage it controls, while its buttons and displays take precedence when aimed at directly.
- Derive route and equipment context from the enhanced network and catalogue under the owner's [063](063-component-information-remediation.md) source-of-truth rule. If the route, target, commodity or status is not represented there, show the first line that can be proved and omit the unsupported context. A visible functional part with no action or reading binding is a coverage defect to report, not an invitation to invent prose.

## Implementation work

1. Add a pure, typed part-inspection description contract to the control/component model: stable local key; kind (`command`, `setting`, `reading`, `indicator`); target or reading/condition binding; optional graph route context. Keep model lookup and text generation out of Three.js and the DOM. Define how missing or unavailable readings are rendered and where units are formatted.
2. Extend `ComponentIdentity` and the inspection resolver so the nearest marked **part** wins over its marked parent. Its title is the concise factual first line and its `detail` is optional context; the existing 150 ms acquisition, stable target, live updates, first-surface occlusion and overlay precedence remain. Parent-only surfaces still inspect as the parent. Avoid distinct hits for a button's cap and its legend.
3. Prototype on dev0's boards with one command button, one mode-changing display, one lamp and one standalone meter. Then wire `PL1-CP1` and the shared lounge filter mimic from prompt 066: OPEN/SHUT valve buttons, pump START/STOP, status lamps, filter flow readouts, and the separately installed `PL1-F2-FT1` flowmeter. Include `PL1-UV1` as a parent/control-box example with a model-backed operational status and role. Use the same mimic semantics on the control-room copy, while preserving which controls are local only.
4. Audit other functional nested parts (cabinet controls, boiler controls, pump starter selectors, valve panels and instruments), list those still falling back to their parent, and migrate them by component family. Count visible functional parts without a binding or meaningful inspection and make that count shrink; decorative screws, fasteners and unmarked geometry do not need descriptions.
5. Keep [061](061-component-information-overlay.md) stage-2 action narratives separate: hover text describes a control's purpose or live reading; an action narrative reports what the player actually did and whether it was accepted.

## Tests and acceptance

- Pure tests prove command and reading text from their typed binding, context omission when the graph lacks evidence, unit and sign formatting, a selected display mode changing, a live reading changing while still aimed at, and a refused-capable command being described as a request rather than a completed action.
- Scene tests prove that a child part takes precedence over `PL1-CP1`, all meshes of one part have one stable key, an unmarked panel surface still names its parent, a closed cabinet door hides its controls, and duplicate mimic instances do not interfere with one another.
- In the browser, hover and centre aim over an OPEN button on `PL1-CP1`: the first line names its actual valve and command; the optional second explains the valve's role. Hover `PL1-F2-FT1`: the first line identifies the meter and its current m³/h reading; the second describes the actual fluid path. Hover the `PL1-UV1` control box: the first line reports the UV unit's actual operating state, the second explains the controlled UV stage; hover its button and see the button's purpose instead. Change the flow, including reverse backwash, while aiming at the meter and confirm both lines remain truthful without target flicker. Check a display mode change, a lamp state change, an unmarked panel area, and mouse, pointer-lock, touch and gamepad aim.
- Inspection remains read-only, does not trigger a button, and stays within the existing picking-performance budget. Run the project's five checks before committing.
