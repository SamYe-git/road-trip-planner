# DESIGN: Road Trip Planner

Reference: `design/glovebox-mockup.html`. This file covers what `PRD.md` lists for version 1, plus Find along this leg (marked *v2*).

## Direction

Pencil sketch on drawing paper. The page opens in the cab of a 1980s 4x4, drawn in graphite with a saddle-tan and charcoal interior, and a folded map lies on the dash. Clicking the map unfolds it into one large sheet. A road runs across the top with a red 4x4 on it. Stop cards zig-zag down the middle, with each leg drawn as a dashed pencil arrow between them. Mountains and rivers are sketched down both edges. Everything stays in one paper-and-graphite world, so there is a single light theme and no dark mode.

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

Only system font stacks are used, with nothing loaded from a CDN. The focus style everywhere is a `3px solid var(--stripe-gold)` outline, offset by 3px.

## Components

**Header.** A small monospace eyebrow, then the headline "Every leg. Not just the total." in `--font-display` uppercase with the second line in `--truck-red`. Three skewed stripes (gold, red, graphite) sit at the right, and a 2px graphite rule runs underneath.

**Cab and folded map.** A full-width inline SVG drawing of the cab. The folded map on the passenger side of the dash is the button (`role="button"`, `tabindex="0"`). It opens the sheet on click, Enter or Space. On hover the map paper lightens to `#fbf8ef`. The handwritten caption under the drawing reads "Click the map (or press Enter on it)."

**Trip form.** A row of fields along the top of the sheet below the road, on a grid with columns at least 140px wide and a dashed `--graphite-soft` rule underneath.
- Each field has a monospace uppercase label (11px, `--graphite-soft`) and an input with a 1.5px graphite border on `--paper`.
- The fields are **Start**, **Destination** and **Leave** (a `time` input).
- **Match list** *(new, same style as the mockup's add-stop results)*: after typing in Start or Destination, the matches appear under that field as pill buttons, for example "Concord, New Hampshire, United States". The picked pill fills with graphite.
- **Plan trip** *(new)*: a `--truck-red` solid button at the end of the row, in the same style as Add stop.

**Summary.** A centered row above the first stop showing total miles and total drive time. Each number is in `--font-display` at 26px, with its caption in `--font-data` at 13px below it.

**Stop cards.**
- A `--paper` card, 68% wide, with a 1.8px graphite border and a hard `3px 3px 0` graphite shadow. Cards alternate left/right, tilted -0.6° and +0.6°.
- The **town** is in `--font-display` uppercase at 21px, followed by its region in the same line ("STOWE, VT"). A red number badge sits at the top right.
- A monospace meta line shows "Arrive 9:40 AM" and, on Quick stops, "Leave 10:40 AM".
- **Type pills** *(new)*: on middle stops only, two small pills, **Stay** and **Quick stop**, under the town, in the mockup's chip style at 12px. The current type is filled graphite.
- **Minutes here** *(new)*: on Quick stops only, a small number input (about 6ch wide) in the meta line, styled like the form inputs, labelled "min here" in the monospace label style.
- **Leave on** *(new)*: on Stays only, a date-and-time input in the meta line, in the same input style, labelled "Leave on" in the monospace label style. It replaces both "min here" and the Leave text.
- **"Set a leave time"** *(new)*: in place of the arrival time on stops after a Stay with no Leave on, in hand font, `--graphite-soft`.
- **"earliest" tag** *(new)*: a `--stripe-gold` monospace uppercase tag (10px, graphite text) placed before an arrival time that comes after an empty minutes field, for example `EARLIEST` Arrive 1:40 PM.
- **Remove ×**: on middle stops, at the bottom right in `--graphite-soft`, turning `--warn` on hover. Its label is "Remove {town}".

**Leg connectors.** A 74px gap holding a dashed pencil arrow that curves toward the next card. In the middle sits a `--paper-2` label with "2 h 10 min · 128 mi" in bold monospace, then the **+ pin**: a 34px dashed-outline circle that turns solid gold when hovered or open. Below the label, **"Open this leg in Google Maps ↗"** *(new)* is a small handwritten underlined link in graphite. It opens in a new tab.

**Add-stop card.** It opens in the gap of the leg whose + was pressed.
- A `#fffdf6` note card, 84% wide, with a 2px dashed graphite border, tilted -0.4°.
- Its heading reads "Add a stop between {A} and {B}" (display font, 17px).
- **Town or place** input, with the placeholder "Try Concord or Woodstock". Matches appear as pills, and hints and errors show in hand font.
- **Add stop** is a solid red button and **Cancel** is a ghost button.
- **Stop type** *(new)*: two pills, **Stay** (selected by default) and **Quick stop**, between the matches and the buttons, in the mockup's chip style.
- **Tabs** *(v2)*: under the heading, two tabs, **Search a town** and **Find along this leg**, in monospace uppercase 12px. The active tab is graphite text with a 2px graphite underline; the other is `--graphite-soft`.
- **Category pills** *(v2)*: on Find along this leg, five pills (**Gas**, **Coffee**, **Food**, **Hotel**, **Rest area**) in the chip style. The picked one fills graphite.
- **Place results** *(v2)*: a list of up to 15 rows, each a button: the name in `--font-body` bold, then the brand and "mile 23 of 68" in `--font-data` 12px `--graphite-soft`. The picked row gets a graphite left bar and a `--paper-2` background. The list scrolls inside the card past about 6 rows (max-height 280px).
- On this tab the Stop type pills default to **Quick stop**.

**Sheet footer.** Separated by a 1.5px graphite rule. On the left is **"Open this route in Google Maps ↗"** (bold graphite link). On the right are two ghost buttons: **Start a new trip** *(new, same ghost style)* and **Fold the map**, which returns to the cab.

## States

| State | What the page shows | Where | Wording |
|---|---|---|---|
| Empty: nothing chosen | Screen 1, the cab with the folded map | Whole page | Caption: "Click the map (or press Enter on it)." |
| Empty: no town matches | No pills | Under the input, in hand font, `--graphite-soft` | "No town called "{query}". Check the spelling." |
| Empty: Stay with no Leave on | Arrival times after it are replaced | Stop cards after that Stay, hand font, `--graphite-soft` | "Set a leave time" |
| Empty: nothing along the leg | No rows | Inside the add-stop card, hand font, `--graphite-soft` | "No {category} within 2 miles of this leg." |
| Loading: along the leg | Pencil-dash line that fills left to right, category pills disabled | Inside the add-stop card | "Looking along this leg…" |
| Error: places | One line in `--warn` hand font and a ghost **Try again** button, card stays open | Inside the add-stop card | "Couldn't reach the places service. Try again in a moment." |
| Invalid: no place picked | Line under the buttons | Inside the add-stop card | "Pick a place from the list first." |
| Loading | Route area replaced by a centered panel, truck drives across the road | Route area | **Plotting your route…** / "Finding each stop and timing every leg." |
| Error: route | Centered panel, title in `--warn`, graphite **Try again** button | Route area | **Couldn't reach the route service** / "Check your connection, then try again. Your stops are still here." |
| Error: town search | Card stays open, one line in `--warn` hand font | Inside the search card or under the field | "Couldn't search towns. Check your connection, then try again." *(new wording, not in PRD)* |
| Invalid: no destination | Destination input gets a `--warn` border with a soft glow, and a panel appears | Under the field, plus the route area | Under the field: "Add a destination first". Panel: **Where are you headed?** / "Add a destination, and the map will draw the legs." |
| Invalid: no start | As above, on Start | Under the field | "Add a start first" |
| Invalid: no town picked | Line under the buttons | Inside the add-stop card | "Pick a town from the list first." |
| Invalid: bad minutes | Minutes input gets a `--warn` border | Under the meta line, in hand font | "Enter minutes as 0 or more." |
| Invalid: Leave on before arrival | Leave on input gets a `--warn` border, and times keep their last valid values | Under the meta line, in hand font | "Leave after you arrive (Sat 1:15 PM)." with the stop's arrival time |
| Ideal | Summary, zig-zag stop cards, legs with time · miles, + pin and Maps link, footer | Sheet | Times from OSRM and the Leave time |

## Motion

- **Map unfolding:** 0.7s, `perspective(900px) rotateX(-70deg) scaleY(.3)` → none, from the top edge.
- **Loading:** the truck drives left to right across the road, in a 2.2s linear loop.
- Nothing else moves. The mockup's pulse on the folded map is left out.
- Under `prefers-reduced-motion: reduce`, both animations are off: the sheet just appears and the truck stays parked.

## Phone (≤ 640px)

- The cab SVG scales as one picture at 100% width.
- The route column grows to 80% of the sheet, and stop cards to 88% of that, keeping the left/right zig-zag and tilt.
- The mountain edges shrink to 12% strips at 0.6 opacity, and the truck shrinks to 110px.
- Side padding is at least 16px (or the safe-area inset).
- Nothing scrolls sideways.
