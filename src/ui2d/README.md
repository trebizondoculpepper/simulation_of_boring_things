# ui2d: a 2D touch-panel kit

A small, framework-free kit of user-interface components drawn with the Canvas 2D API: elbows, bars, sidebar frames, pill buttons, toggles, segmented selectors, labels, numeric read-outs, bar gauges, trends, alarm banners, lists, a page stack, a line diagram and a simple layout system. It depends on nothing but the DOM's canvas types and plain TypeScript: no Three.js, no game code, no framework. It knows nothing of swimming pools or of any one look; its look is a `Theme`, and the colour-blocked look on black it ships with (`BLOCK_THEME`) is one theme among possible others. It could be lifted out of this repository and used elsewhere as it is.

## Contents

- `geometry.ts`: rectangles, the stacking layout, the outlines of elbows and pills, trend points, fitting a drawing into a rectangle, blinking. Pure.
- `theme.ts`: the `Theme` (palette and roles, background and ink, font list, capitals, proportions, press hold, blink periods) and `BLOCK_THEME`.
- `node.ts`: `UiNode`, the base of the component tree, and `UiRoot`, which hosts a tree on one surface.
- `components.ts`: the components.
- `ui2d.test.ts`: the tests (layout, hit-testing, page and selector state, dirty flags).

## The API

A tree of nodes is laid out in a pixel rectangle, paints itself to a `CanvasRenderingContext2D`, says when it needs painting again, and takes presses in its own pixel coordinates.

```ts
import {
  BLOCK_THEME,
  Button,
  Frame,
  Label,
  PageStack,
  UiRoot,
  pageButton,
} from './index';

const pages = new PageStack({
  STATUS: new Label('All well'),
  TRENDS: new Label('…'),
});
const frame = new Frame({
  title: 'Filtration',
  sidebar: [pageButton(pages, 'STATUS'), pageButton(pages, 'TRENDS')],
  content: pages,
});
const root = new UiRoot(frame, BLOCK_THEME, {
  width: 1024,
  height: 576,
  onSound: (sound) => playBleep(sound), // 'confirm' | 'deny' | 'page' | 'alert'
  onAction: (action) => console.log(action),
});

// Each frame of the host:
root.tick(seconds);
if (root.needsPaint) root.paint(context);

// A touch, in the surface's pixels:
root.tap(x, y); // a press that releases itself after the theme's hold
root.press(x, y); // or press …
root.release(); // … and release
```

- **Layout:** `layout(rect, theme)` gives a node its rectangle; containers lay their children in it. `Stack` (a row or a column, each child by its `size` in pixels or its `grow` share), `Place` (children by fractions of the node), `Frame` (the sidebar layout: elbows top and bottom left, a title bar and a footer bar, sidebar slots, the content) and `PageStack` (one page shown at a time).
- **Painting:** `UiRoot.paint` clears the surface to the theme's background and paints the tree; nothing is painted unless asked. Setters (`setLabel`, `setLit`, `set`, `select`, `show`) mark a node and its ancestors dirty only when the value changes; blinking and moving flows mark themselves dirty as `tick` passes their steps. A host repaints only while `needsPaint`.
- **Input:** a press is a point in the surface's pixels. The topmost pressable node under it answers with an outcome: an action id (its `id`, or a button's `action`) and a sound. The kit plays no sounds: it asks the host for them through `onSound`. A handler's answer is the sound: nothing for `'confirm'`, `'deny'` to refuse (an interlock, a disabled button), `'page'` for a page change, or null for silence.
- **Components:** `Elbow`, `Bar` (with a title on a black ground), `Button` (pill, half-pill or square; lit, pressed, disabled, flashing; a second line), `Toggle`, `Segmented` (one of several, its choice refusable), `Label`, `Readout`, `Gauge` (blocks, horizontal or vertical, with marks), `Trend` (a band behind its line), `Banner` (flashing alarm words), `List` (rows, pressable), `PageStack` with `pageButton`, and `Diagram` (pipes with moving flows, symbols filled when on, hollow when off, flashing in a fault, pressable).
- **Theme:** colours by role (`primary`, `secondary`, `tertiary`, `accent`, `info`, `ok`, `warning`, `alert`, `lit`, `dim`, `track`, `frame`) or by palette name, or any CSS colour; the font is a family list whose first face the host loads (a canvas falls back to the next if it has not).

## Credits

The kit is this project's own code, written for it, taking its design language from two MIT-licensed libraries. Their notices are kept here and in the repository's `CREDITS.md`; what was taken is recorded in `doc/reuse-inventory.md`.

- **joernweissenborn/lcars** (https://github.com/joernweissenborn/lcars), a CSS framework: its palette (`lcars/stylus/lcars_colors.styl`, the named colours in `BLOCK_THEME`, its highlight hopbush as the pressed colour), its proportions (`lcars_variables.styl`, `lcars_element.styl`, `lcars_elbow.styl`, `lcars_bar.styl`: an element 30 by 12 base spacings, a bar half an element high, an elbow 1.5 elements high with an outer radius of half an element's width, rounded ends of half the height, a black title block cut into a bar, a label set low and to the right in its block, an element's second line).

  > The MIT License (MIT). Copyright (c) 2014 Garrett - original edition and some remaining portions. Copyright (c) 2020 Jörn Weißenborn (joernweissenborn) all other portions. Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

- **agent-P/LCARS-Javascript-Framework** (https://github.com/agent-P/LCARS-Javascript-Framework), SVG components in JavaScript: the elbow's outline (`LCARSCorner.prototype.drawShape` in `js/LCARS_Components.js`: a column and an arm joined by a broad outer quadratic curve and a tight inner one, adapted into `elbowPath`), its button proportions (150 by 60 with 5 between, the same as the CSS library's), its label inset low and to the right, and its blink periods (0.5 s for an error, 0.75 s for a warning).

  > MIT License. Copyright (c) 2019 Perry Spagnola. Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

No code, artwork, sounds or fonts were copied from either library, and none from louh/lcars (GPL) or crstmkt/LCARS-SDK (no licence), which were not used. The kit carries no film or television names, logos or artwork. Its theme names the Antonio typeface (SIL Open Font Licence) first; the host supplies the font file.
