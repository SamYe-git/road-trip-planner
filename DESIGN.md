# DESIGN: Road Trip Planner

References: `design/pixel-cab-mockup.html` for Screen 1 and the Trip archive, `design/glovebox-mockup.html` for Screen 2. This file covers what `PRD.md` lists for version 1, plus Find along the road (marked *v2*).

## Direction

The page opens in the cab of a 1980s 4x4, drawn as pixel art on a 320×180 canvas in the same paper, graphite, saddle-tan and truck-red colors as the rest of the page. The glovebox opens a dark-wood tray of folded maps, one per saved trip. Unfolding one opens Screen 2, which stays a pencil sketch on drawing paper this round. A road runs across the top with a red 4x4 on it. Stop cards zig-zag down the middle, with each leg drawn as a dashed pencil arrow between them. Mountains and rivers are sketched down both edges. Everything stays in one paper-and-graphite world, so there is a single light theme and no dark mode.

## Tokens

All values come from the mockup's `:root`.

| Token | Value | Used for |
|---|---|---|
| `--paper` | `#f4f2ec` | Page background, inputs, stop cards |
| `--paper-2` | `#e9e5da` | The unfolded map sheet, and the backing behind leg labels |
| `--graphite` | `#2a2826` | Pencil lines, borders, body text, card shadows |
| `--graphite-soft` | `#6d6a63` | Field labels, hints, secondary text, the remove × |
| `--truck-red` | `#c7361f` | The truck body, the primary button, the stop-number badge, the headline accent |
| `--velour` | `#b0946a` | Cab interior (saddle tan), drawings only |
| `--stripe-gold` | `#d49b1a` | Highlights only: focus outline, + pin hover/open, the "earliest" tag |
| `--river` | `#4f7891` | Water in the edge drawings |
| `--pine` | `#4c5a3a` | Ridgelines in the edge drawings |
| `--warn` | `#b5481b` | Error and invalid-input text and borders |
| `--font-display` | `Impact, "Haettenschweiler", "Arial Narrow Bold", "Helvetica Neue", Arial, sans-serif` | Uppercase names and headings: headline, town names, panel titles, summary numbers |
| `--font-hand` | `"Bradley Hand", "Segoe Print", "Chalkboard SE", "Marker Felt", cursive` | Things you'd scribble on a map: leg notes, hints, messages |
| `--font-body` | `"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif` | Body text, inputs, buttons |
| `--font-data` | `ui-monospace, "SF Mono", Menlo, Consolas, monospace` | Numbers and times (tabular), field labels |
| `--space` | `8px` | Base spacing unit |
| `--radius` | `3px` | Inputs, cards, buttons. Pills use `999px` |
| `--box` | `#3b2f24` | Pixel cab: the tray background and the glovebox interior |
| `--box-2` | `#54432f` | Pixel cab: the shelf strip under the map cards |
| `--box-edge` | `#17120d` | Pixel cab: the tray border and the hard shadow under the tray and map cards |
| `--px-hover` | `#fffaf0` | Pixel cab: pixel button hover |
| `--tray-text` | `#e5dccb` | Pixel cab: the note line in the tray footer |
| `--fold` | `#d8d2c3` | Pixel cab: the fold lines across each map card |
| `--map-art` | `#ebe6d9` | Pixel cab: the background of each card's route drawing |

Only system font stacks are used, with nothing loaded from a CDN. The pixel mockup loads Press Start 2P and VT323 from Google Fonts, which the assignment doesn't allow, so they are replaced: text drawn on the canvas uses the 3×5 pixel font in code (see Pixel cab), and HTML text on Screen 1 and in the tray uses `--font-data`, the system monospace stack. The focus style everywhere is a `3px solid var(--stripe-gold)` outline, offset by 3px. The canvas itself uses a 4px gold outline, offset by 4px.

The mockup's own names map to existing tokens: `--ink` is `--graphite`, `--ink-soft` is `--graphite-soft`, `--red` is `--truck-red`, `--gold` is `--stripe-gold`, `--tan` is `--velour`.

## Components

**Header (trip HUD).** The same on both screens. Three skewed stripes (gold, red, graphite) sit at the right, and a 2px graphite rule runs underneath, as before.
- **Eyebrow:** "Road trip planner", small monospace uppercase (`--font-data` 12px, `--graphite-soft`, letter-spacing .14em), always shown above the headline.
- **Line 1** (`h1`): `--font-display` uppercase, weight 400, line-height .92, `text-wrap: balance`, in `--graphite`. Size `clamp(30px, 7vw, 76px)`, the old headline's size with a smaller floor so "NEXT STOP: CONCORD, NH" fits at 400px wide. Long town names wrap instead of overflowing (`overflow-wrap: anywhere`). The town after "NEXT STOP:" is in `--truck-red`, like the old second line.
- **Line 2:** `--font-data` 16px, `--graphite`, tabular numbers, margin 8px above. Its states use the stop-card styles:
  - the **earliest** tag: the same `--stripe-gold` monospace uppercase tag (10px, graphite text) before "arrive"
  - "Set a leave time": the same hand font in `--graphite-soft`
  - "Drive time and miles for every stop of your road trip.": `--graphite-soft`
- **Stop counter**, under line 2: **‹**, "STOP 1 OF 3" and **›** in a row with 8px gaps. The text is `--font-data` 12px uppercase, letter-spacing .14em, `--graphite-soft`. The buttons are small ghost buttons, 28px square: 1.5px `--graphite` border, `--radius`, transparent, `--font-data` 16px. Disabled at the first and last leg (opacity .4). Hidden when there is no trip.
- **Live region:** line 1 and line 2 sit together in one `aria-live="polite"` wrapper, so screen readers hear the new stop and arrival. The ‹ › buttons sit outside it. Their labels are "Previous stop" and "Next stop".
- All headline text is set with `textContent`.

**Current leg.** The current leg's end card gets a `3px solid var(--stripe-gold)` outline, offset 3px, on top of its usual shadow. Stop cards and leg connectors show `cursor: pointer`, since clicking them picks the leg.

**Cab.** Replaced by the pixel cab below. The SVG cab and the folded map on the dash are removed.

**Trip form.** A row of fields along the top of the sheet below the road, on a grid with columns at least 140px wide and a dashed `--graphite-soft` rule underneath.
- Each field has a monospace uppercase label (11px, `--graphite-soft`) and an input with a 1.5px graphite border on `--paper`.
- The fields are **Start**, **Destination** (no placeholder text) and **Leave** (a `datetime-local` input, prefilled with today and the next full hour). The Leave input is only as wide as its value (`width: fit-content`), so the calendar button sits right after the time instead of at the far edge of the column.
- **Use my location** *(v2)*: the first pill in Start's match list while Start is focused and empty, in the same pill style with a small pin drawn before the text. Hidden when location was refused.
- **Match list** *(new, same style as the mockup's add-stop results)*: after typing in Start or Destination, the matches appear under that field as pill buttons, for example "Concord, New Hampshire, United States". Picking one fills the field with the town name and closes the list.
- **Plan trip** *(new)*: a `--truck-red` solid button at the end of the row, in the same style as Add stop.

**Summary.** A centered row above the first stop showing total miles and total drive time. Each number is in `--font-display` at 26px, with its caption in `--font-data` at 13px below it.

**Stop cards.**
- A `--paper` card, 68% wide, with a 1.8px graphite border and a hard `3px 3px 0` graphite shadow. Cards alternate left/right, tilted -0.6° and +0.6°.
- The **town** is in `--font-display` uppercase at 21px, followed by its region in the same line ("STOWE, VT"). A red number badge sits at the top right.
- A monospace meta line shows "Arrive 9:40 AM" and, on Quick stops, "Leave 10:40 AM".
- **Type pills** *(new)*: on middle stops only, two small pills, **Stay** and **Quick stop**, under the town, in the mockup's chip style at 12px. The current type is filled graphite.
- **Time here** *(v2)*: on Quick stops only, two small `<select>` dropdowns in the meta line, styled like the form inputs with a drawn ▾ arrow: hours ("–", 0 h to 12 h) and minutes ("–", 0 to 55 min, every 5). Labelled "here" in the monospace label style.
- **Leave on** *(new)*: on Stays only, a date-and-time input in the meta line, in the same input style, labelled "Leave on" in the monospace label style. It replaces both "min here" and the Leave text.
- **"Set a leave time"** *(new)*: in place of the arrival time on stops after a Stay with no Leave on, in hand font, `--graphite-soft`.
- **"earliest" tag** *(new)*: a `--stripe-gold` monospace uppercase tag (10px, graphite text) placed before an arrival time that comes after a Quick stop with no time set, for example `EARLIEST` Arrive 1:40 PM.
- **Remove ×**: on middle stops, at the bottom right in `--graphite-soft`, turning `--warn` on hover. Its label is "Remove {town}".

**Leg connectors.** A 74px gap holding a dashed pencil arrow that curves toward the next card. In the middle sits a `--paper-2` label with "2 h 10 min · 128 mi" in bold monospace, then the **+ pin**: a 34px dashed-outline circle that turns solid gold when hovered or open. Below the label, **"Start directions in Google Maps ↗"** *(new)* is a small handwritten underlined link in graphite. It opens in a new tab.

**Add-stop card.** It opens in the gap of the leg whose + was pressed.
- A `#fffdf6` note card, 84% wide, with a 2px dashed graphite border, tilted -0.4°.
- Its heading reads "Add a stop between {A} and {B}" (display font, 17px).
- **Town or place** input, with no placeholder text. Matches appear as pills, and hints and errors show in hand font.
- **Add stop** is a solid red button and **Cancel** is a ghost button.
- **Stop type** *(new)*: two pills, **Stay** (selected by default) and **Quick stop**, between the matches and the buttons, in the mockup's chip style.
- **Tabs** *(v2)*: under the heading, two tabs, **Search a town** and **Find along the road**, in monospace uppercase 12px. The active tab is graphite text with a 2px graphite underline; the other is `--graphite-soft`.
- **Category pills** *(v2)*: on Find along the road, five pills (**Gas**, **Coffee**, **Food**, **Hotel**, **Rest area**) in the chip style. The picked one fills graphite.
- **Place results** *(v2)*: a list of up to 15 rows, each a button: the name in `--font-body` bold, then the brand and "mile 23 of 68" in `--font-data` 12px `--graphite-soft`. The picked row gets a graphite left bar and a `--paper-2` background. The list scrolls inside the card past about 6 rows (max-height 280px).
- On this tab the Stop type pills default to **Quick stop**.
- **Long-road note** *(new)*: on a leg over 150 miles, a line under the category pills in hand font, `--graphite-soft`: "Searching the first 150 miles of the road."

**Sheet footer.** Separated by a 1.5px graphite rule. On the left is **"Start directions for the whole route in Google Maps ↗"** (bold graphite link). On the right are two ghost buttons: **Start a new trip** *(new, same ghost style)* and **Fold the map**, which returns to the cab.

## Pixel cab

Screen 1 and the Trip archive. Screen 2 keeps its current look this round.

**Stage.** A frame around the canvas: 4px `--graphite` border, hard `6px 6px 0` `--graphite` shadow, `--graphite` background.

**Canvas.** `<canvas>` with `width="320" height="180"`, shown at `width: 100%`, `aspect-ratio: 320 / 180`, `image-rendering: pixelated`, `touch-action: none`. Cursor: `grab` over the wheel, `pointer` over the glovebox and shifter, default elsewhere.

**Canvas palette.** Canvas drawing can't use CSS variables directly, so these live as one named object at the top of `js/cab.js`. Values come from the mockup.

| Name | Value | Used for |
|---|---|---|
| `ink` | `#2a2826` | Outlines, windshield frame, A-pillars (same as `--graphite`) |
| `dark` | `#1d1b1a` | Cluster face, wheel rim, shifter plate |
| `sky1` / `sky2` / `sky3` | `#a9d7e6` / `#c9e6ee` / `#e6f1ee` | Sky bands, top to bottom |
| `sun` | `#f3d27a` | Sun |
| `far` | `#7d9a8c` | Far ridge |
| `near` | `#4c5a3a` | Near ridge, tree foliage (same as `--pine`) |
| `nearDark` | `#3f4c30` | Tree foliage shading |
| `trunk` | `#5a4630` | Tree trunks |
| `snow` / `white` | `#f4f2ec` | Snow caps, gauge rings (same as `--paper`) |
| `grass` / `grass2` | `#8a9a5b` / `#7a8a4d` | Alternating grass bands |
| `road` | `#55504b` | Road |
| `line` / `gold` | `#d49b1a` | Center dashes, odometer digits, current gear letter, glovebox hover (same as `--stripe-gold`) |
| `edge` | `#e9e5da` | Road edge, posts (same as `--paper-2`) |
| `tan` / `tan2` / `tan3` | `#b0946a` / `#9c8059` / `#c4a97f` | Dash, console, door (base, shade, highlight) |
| `velour` | `#a88b62` | Seat |
| `red` | `#c7361f` | Needles, post caps, wheel marker (same as `--truck-red`) |
| `blue` | `#4f7891` | Radio display, rivers on the card drawings (same as `--river`) |
| `lcd` | `#9fd0c0` | Radio text |
| `box` | `#3b2f24` | Glovebox interior (same as `--box`) |
| `mirror` | `#8fb4c2` | Rear-view mirror glass |
| `slot` | `#0b0a09` | Shifter slot, knob edge, odometer window, wheel rim edge |
| `paper` | `#f4f2ec` | Canvas background, maps inside the glovebox (same as `--paper`) |
| `mapTan` / `mapGold` | `#e9dcc0` / `#ead7a8` | The other maps inside the glovebox |
| `crease` | `#c8bfa9` | Fold lines on the glovebox maps |
| `mapArt` | `#ebe6d9` | Background of each map card's route drawing (same as `--map-art`) |
| `knob` / `knobLight` | `#7a736b` / `#b5aea5` | Shifter knob and its highlight, radio knob, glovebox handle |
| `muted` | `#8a8580` | Gear letters not selected, F and T on the gauges |
| `vent` | `#555555` | Vent slats |

**Pixel font.** A 3×5 font drawn in code: each glyph is a 15-character string of `#` and `.` read row by row, drawn as 1×1 canvas pixels with a 4px advance (3 wide + 1 gap). It covers A–Z, 0–9 and `. - : + /` and space. Used for the odometer, radio, gear letters, "GLOVEBOX" and "4X4". Canvas text is decoration only; the canvas `aria-label` carries the meaning.

**Pixel button** (`.px-btn`). `--font-data`, 14px, bold, uppercase. `--paper` background, `--graphite` text, 3px `--graphite` border, no radius, padding `8px 10px`, hard `3px 3px 0` `--graphite` shadow.
- Hover: background `--px-hover`.
- Active (pressed): `translate(3px, 3px)` and no shadow, so it moves into its shadow.
- `aria-pressed="true"` (the current gear): `--graphite` background, `--paper` text.
- Solid (Unfold map): `--truck-red` background, `--paper` text.
- Focus: the standard gold outline.

**Controls row** under the canvas: a "GEAR" label (`--font-data` 12px bold, `--graphite-soft`), the four gear buttons, **Open glovebox**, and a hint line in `--font-data` 16px `--graphite-soft`: "Drag the wheel (or ← →) to steer · drag the shifter back to D (or ↓) to drive · click the glovebox." Wraps on narrow screens with gaps of 10px by 18px.

**Tray.** Laid over the canvas (4% in from the sides, 8% from the top).
- `--box` background, `--paper` text, 4px `--box-edge` border, ring of 4px `--velour` and hard `8px 8px 0 4px` `--box-edge` shadow. Padding `14px 14px 16px`, gaps of 12px.
- Head: "GLOVEBOX · TRIP ARCHIVE" in `--font-data` 16px bold `--stripe-gold`, and a small **Close ×** pixel button on the right.
- Shelf: a row of cards that scrolls sideways with snap, with an 8px `--box-2` strip along the bottom like a shelf edge.
- Footer: a note line in `--font-data` 16px `--tray-text` (also where the empty and storage-blocked lines go), and the red **Unfold map** button on the right.

**Map card** (`.map`, a button). 150px wide, `--paper` with two `--fold` lines crossing at the middle, 3px `--graphite` border, hard `4px 4px 0` `--box-edge` shadow, padding 8px, gap 4px.
- Route drawing: a 48×28 canvas, scaled up pixelated, on `--map-art` with a 2px `--graphite` border. It shows a river, small ridges, a red dotted route and graphite stop dots, seeded from the trip's id so each trip keeps its own drawing.
- Name: "{START} → {DESTINATION}" in `--font-data` 13px bold uppercase.
- Meta: "4 stops · 214 mi", then the saved date "Nov 9, 2026", in `--font-data` 16px `--graphite-soft`, tabular numbers.
- **LATEST** badge on the newest: `--truck-red` with `--paper` text, `--font-data` 11px bold, 2px `--graphite` border, sitting over the top right corner.
- Hover and picked: lifts 6px. Picked also gets a 3px `--stripe-gold` outline, offset 2px.

**+ NEW TRIP slot.** Same size, transparent, 3px dashed `--velour` border, no shadow, at least 160px tall, centered: a 28px `--stripe-gold` "+" over "NEW TRIP" in `--font-data` 13px bold `--paper`.

## States

| State | What the page shows | Where | Wording |
|---|---|---|---|
| Empty: nothing chosen | Screen 1, the pixel cab in Park | Whole page | Hint under the canvas: "Drag the wheel (or ← →) to steer · drag the shifter back to D (or ↓) to drive · click the glovebox." |
| Empty: archive | Only the + NEW TRIP slot, picked | Tray footer note | "No saved trips yet. Start one." |
| Storage blocked | Only the + NEW TRIP slot, picked | Tray footer note | "Trips can't be saved in this browser." |
| Empty: no town matches | No pills | Under the input, in hand font, `--graphite-soft` | "No town called "{query}". Check the spelling." |
| Empty: Stay with no Leave on | Arrival times after it are replaced | Stop cards after that Stay, hand font, `--graphite-soft` | "Set a leave time" |
| Empty: nothing along the leg | No rows | Inside the add-stop card, hand font, `--graphite-soft` | "No {category} within 2 miles of the road." On a leg over 150 miles: "…of the road in the first 150 miles." |
| Loading: along the leg | Pencil-dash line that fills left to right, category pills disabled | Inside the add-stop card | "Looking along the road…" |
| Error: places | One line in `--warn` hand font and a ghost **Try again** button, card stays open | Inside the add-stop card | "Couldn't reach the places service. Try again in a moment." |
| Invalid: no place picked | Line under the buttons | Inside the add-stop card | "Pick a place from the list first." |
| Empty: no trip (headline) | Line 1 and line 2, no leg counter | Header | **WHERE TO?** / "Drive time and miles for every stop of your road trip." |
| Loading | Route area replaced by a centered panel, truck drives across the road. Headline line 1 changes; line 2 and the counter stay | Route area, header | **Plotting your route…** / "Finding each stop and timing every drive." Headline: **PLOTTING ROUTE…** |
| Ideal (headline) | Next stop, its leg and arrival, stop counter with ‹ › | Header | **NEXT STOP: CONCORD, NH** / "1 h 25 min · 68 mi · arrive 9:40 AM" / "STOP 1 OF 3" |
| Error: route | Centered panel, title in `--warn`, graphite **Try again** button. The headline goes back to what it showed before loading | Route area | **Couldn't reach the route service** / "Check your connection, then try again. Your stops are still here." |
| Error: town search | Card stays open, one line in `--warn` hand font | Inside the search card or under the field | "Couldn't search towns. Check your connection, then try again." *(new wording, not in PRD)* |
| Invalid: no destination | Destination input gets a `--warn` border with a soft glow, and a panel appears | Under the field, plus the route area | Under the field: "Add a destination first". Panel: **Where are you headed?** / "Add a destination, and the map will draw the legs." |
| Invalid: no start | As above, on Start | Under the field | "Add a start first" |
| Invalid: no town picked | Line under the buttons | Inside the add-stop card | "Pick a town from the list first." |
| Invalid: Leave on before arrival | Leave on input gets a `--warn` border, and times keep their last valid values | Under the meta line, in hand font | "Leave after you arrive (Sat 1:15 PM)." with the stop's arrival time |
| Ideal | Summary, zig-zag stop cards, legs with time · miles, + pin and Maps link, footer | Sheet | Times from OSRM and the Leave time |

## Motion

- **Map unfolding:** 0.7s, `perspective(900px) rotateX(-70deg) scaleY(.3)` → none, from the top edge.
- **Loading:** the truck drives left to right across the road, in a 2.2s linear loop.
- **Pixel cab:** the canvas redraws every animation frame. Speed eases toward the gear's target (D forward, R backward at about a third, P and N stop). The wheel springs back to center, and the shifter knob glides to its gear.
- **Glovebox:** the door drops open in about 0.35s, then the tray appears with `scaleY(.1)` → none in `.35s steps(6)`, from the top right.
- **Map cards:** each slides in from 30px left in `.4s steps(4)`, one after another, 0.08s apart.
- **Headline:** changes instantly, with no animation.
- Nothing else moves.
- Under `prefers-reduced-motion: reduce`, all of these are off: the sheet just appears, the truck stays parked, nothing scrolls past the windshield (the odometer and gauges still follow the gear), the glovebox door is open at once, and the tray and cards appear without animation.

## Phone (≤ 640px)

- The cab canvas scales as one picture at 100% width.
- The tray sits below the canvas instead of on top of it, with no outer shadow. Map cards shrink to 128px wide.
- The route column grows to 80% of the sheet, and stop cards to 88% of that, keeping the left/right zig-zag and tilt.
- The mountain edges shrink to 12% strips at 0.6 opacity, and the truck shrinks to 110px.
- Side padding is at least 16px (or the safe-area inset).
- Nothing scrolls sideways.
