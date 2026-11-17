# PRD: Road Trip Planner

## Goal

Show the drive time and distance for **every leg** of a road trip, not just the total. Arrival times update as the traveler fills in how long they actually stayed at each stop, and every leg opens in Google Maps for turn-by-turn navigation.

Due Sunday 11/08, deployed on GitHub Pages. Demo at the showcase on Tuesday 11/17.

## Audience and key action

- **Who:** Sam (me), driving Babson (Wellesley, MA) → Concord, NH → Woodstock, NH → Stowe, VT.
- **Key action:** enter a start, a destination and the stops in between, then see each leg's drive time and distance plus the trip total.

## Features

Version 1 is one page with two screens.

### Headline (trip HUD)

The big headline at the top of the page changes with the trip, like a game HUD. It replaces "Let the journey start." The small "Road trip planner" eyebrow stays above it.

- **No trip yet** (the cab screen, or Screen 2 with an empty form):
  - Line 1: "WHERE TO?"
  - Line 2: "Drive time and miles for every stop of your road trip."
  - No leg counter.
- **Route loading:** line 1 becomes "PLOTTING ROUTE…". Line 2 and the counter stay as they were.
- **Trip planned:**
  - Line 1: "NEXT STOP:" then the town of the current leg's end, with the same town + region label as its stop card, e.g. "NEXT STOP: CONCORD, NH".
  - Line 2: that leg's drive time and miles, then its arrival, by the same rules as the stop card:
    - "1 h 25 min · 68 mi · arrive 9:40 AM" (with the weekday when it's not the departure day, as on the card)
    - with the **earliest** tag before "arrive" when the card has it
    - "1 h 25 min · 68 mi · Set a leave time" when the card shows "Set a leave time"
    - "1 h 25 min · 68 mi" alone when Leave is empty and there is no arrival time
  - A small counter, "STOP 1 OF 3", with **‹** and **›** buttons beside it.
- **Which leg it shows:**
  - Leg 1 by default. Every new route (Plan trip, adding or removing a stop, unfolding a saved trip) goes back to leg 1.
  - Clicking a stop card makes the leg that ends at that stop the current one (the start card picks leg 1). Clicking a leg connector makes that leg the current one.
  - The current leg's end card (its "next stop") gets a gold outline.
  - **‹ ›** step to the previous and next leg, and stop at the first and last (the button is disabled there).
  - ← → do the same while Screen 2 is showing and focus is not in an input, select or textarea.
  - The headline updates straight away when a Quick stop's time, a Stay's Leave on, a stop's type or Leave changes, with no new OSRM call.
- **Fold the map** and **Start a new trip** put it back to "WHERE TO?".
- An error, or an invalid input, leaves the headline as it was before.

### Screen 1: the pixel cab (opening screen)

The opening screen is a pixel-art truck cab you can play with. Everything except the glovebox is decoration and doesn't affect the trip.

- **Canvas:** 320×180, scaled up to the page width with `image-rendering: pixelated`. Through the windshield: sky, sun, two mountain ridges, a road with a dashed center line, grass bands, and trees and posts on both sides. Below it: the dash with speedometer, fuel and temperature gauges, odometer, radio, glovebox, the shifter on the console, the seat and the steering wheel.
- **Steering wheel:** drag it, or hold ← →. It springs back to center when released. Only the wheel turns, not the road.
- **Shifter:** the knob moves front to back through **P R N D**. Change gear by dragging the knob, clicking a letter, ↑ ↓, or the **P R N D** buttons under the canvas.
  - In **D**, the trees and posts on both sides grow and slide past, the road dashes and grass bands rush toward you, and the far mountains stay still.
  - In **R** the scene runs backward, more slowly.
  - In **P** and **N** the scene coasts to a stop.
  - The speedometer needle, the odometer and the radio text follow the gear (radio: "FM 98.5" in P, "REVERSE", "NEUTRAL", "DRIVING").
- **Glovebox:** clicking it (or the **Open glovebox** button under the canvas) drops the door open, then the **Trip archive** tray appears. The glovebox outline turns gold on hover.
- **Keyboard:** the canvas is in the Tab order with a visible focus outline and an `aria-label` that explains the controls. With it focused: ← → steer, ↑ ↓ shift, **G** or **Enter** opens the glovebox.
- The folded map on the dash is removed. The glovebox is now the way into Screen 2.

### Trip archive (the glovebox tray)

- Every saved trip shows as a folded map card, oldest on the left and newest on the right. The newest is tagged **LATEST**. A **+ NEW TRIP** slot comes last.
- Each card shows a small pixel route drawing, "{start} → {destination}", the number of stops, total miles, and the date it was saved (for example "4 stops · 214 mi", "Nov 9, 2026").
- The tray opens with the newest trip picked and the shelf scrolled to the right end.
- Clicking a card (or Enter on it) opens Screen 2 with that trip straight away, routed again with OSRM. **+ NEW TRIP** opens Screen 2 with an empty form. ← → only move the pick, and **Unfold map** opens the picked card.
- ← → move between cards, **Esc** or **Close ×** closes the tray and returns focus to the canvas.
- On a phone (≤ 640px) the tray sits below the canvas instead of on top of it.

### Screen 2: the open map

1. **Trip form**
   - **Start** and **Destination:** type a town (suggestions appear from the second letter, about 150 ms after typing stops, nearest towns first: near the user's location if known, otherwise near the other picked field), then pick from a list of matches that shows each town's state and country. A town counts only once it has been picked from the list. The fields start empty, with no placeholder text.
   - **Use my location:** the page asks for the browser's location when it opens. While the Start field is focused and empty, a **Use my location** pill sits at the top of its match list. Picking it fills Start with the user's coordinates, named by a reverse lookup (or "My location" if the lookup fails). If location was refused or isn't available, the pill doesn't appear.
   - **Leave:** the departure date and time. It starts filled with today's date and the next full hour, so only small changes are needed.
   - **Plan trip:** looks up the route.
2. **Route.** Stop cards zig-zag down the map, with a leg between each pair of cards.
   - **Summary** at the top: total miles and total drive time.
   - **Each leg** shows drive time and miles (converted from OSRM's seconds and meters), a **+ pin**, and an **"Start directions in Google Maps"** link.
   - **Each stop card** shows its town with its state or region (for example "Stowe, VT"), so a wrong match is easy to spot. The region comes from the town search result's `state` (or `country` when there is no state), with US states abbreviated. The card also shows the arrival time.
   - **Middle stops** also have:
     - a **type**, either **Stay** or **Quick stop**, which can be switched on the card at any time
     - for a **Quick stop** (gas, food, rest): a **time here** picked with two dropdowns, **hours** (–, 0 to 12) and **minutes** (–, 0 to 55 in steps of 5), and a leave time of arrival + that time. The trip stores it as total minutes.
     - for a **Stay** (a city, overnight or several days): a **Leave on** date-and-time field. The next leg starts at that time.
     - a **×** to remove the stop
   - **Arrival times** start from the Leave time and add each leg's drive time and each Quick stop's minutes. After a Stay, the times restart from its Leave on.
     - A Quick stop whose hours and minutes are both "–" counts as 0. If only one is set, the other counts as 0.
     - Every arrival after a Quick stop with no time set is tagged **"earliest"**, until a Stay with a Leave on restarts the times.
     - If a Stay's Leave on is empty, every stop after it shows **"Set a leave time"** instead of an arrival time.
     - Editing the time here, Leave on, a stop's type or Leave recalculates the times straight away, without calling OSRM again.
3. **Add a stop.** The + pin on a leg opens a card in that gap.
   - Search a town (Photon) and pick a match. Results are biased toward the middle of that leg.
   - Choose the stop type with two pills, **Stay** (the default) and **Quick stop**.
   - **Add stop** splits the leg in two, fetches the route again and redraws. **Cancel** closes the card.
   - The card has two tabs: **Search a town** (above, the default) and **Find along the road**.
4. **Find along the road** (version 2)
   - Category pills: **Gas**, **Coffee**, **Food**, **Hotel**, **Rest area**. Picking one starts the search.
   - The page gets that leg's road shape from OSRM (`overview=full&geometries=geojson`, the leg's two stops only), takes a point about every 5 miles (at most 40 points), and asks the Overpass API for that category within 2 miles of that line (`around:3200` on the points).
   - On a leg longer than 150 miles, only its first 150 miles are searched (a longer line is too heavy for Overpass and times out). The card says "Searching the first 150 miles of the road." under the category pills.
   - The Overpass request gives up after 30 seconds and shows the error below.
   - OpenStreetMap tags: Gas `amenity=fuel`, Coffee `amenity=cafe`, Food `amenity=restaurant` or `amenity=fast_food`, Hotel `tourism=hotel` or `tourism=motel`, Rest area `highway=rest_area` or `highway=services`.
   - Results are listed in the order you reach them, at most 15, each with its name (or "Unnamed {category}"), brand when it differs from the name, and the mile along the leg ("mile 23 of 68").
   - Picking a result and pressing **Add stop** adds it like a town, as a **Quick stop** by default. Its card shows the place name with the category ("MOBIL, GAS").
   - The leg shape is fetched once per open card. Switching categories only calls Overpass again.
5. **Whole-route link:** "Start directions for the whole route in Google Maps ↗" at the bottom, with every stop included as a waypoint.
6. **Saving**
   - `localStorage` holds a list of trips. Each entry has an `id`, `savedAt`, the stops (with coordinates, type, minutes and Leave on), a legs summary (number of legs and total miles, so the archive card needs no route call), and the Leave time.
   - The trip on Screen 2 saves into its own entry every time it changes, once it has a start and a destination. Saving updates `savedAt`.
   - The old single saved trip (key `roadTrip`) is moved into the list once, the first time the page opens, then removed.
   - The page always opens on Screen 1. A saved trip comes back by picking it in the Trip archive.
   - **Start a new trip** clears the form and starts a new entry. The trip that was on screen stays in the archive.
   - **Fold the map** returns to the cab.

## Content and data

| Item | Have / missing | From whom |
|---|---|---|
| OSRM route API: `code`, `routes[0].legs[i].distance`, `routes[0].legs[i].duration`, `routes[0].distance`, `routes[0].duration` (coordinates go longitude first) | Have, URL tested in the browser (`PROPOSAL.md`) | OSRM public server |
| OSRM CORS check from a GitHub Pages site | **Missing**, not yet run | Sam, Console check from the assignment |
| Photon town search (`https://photon.komoot.io/api/?q=…&limit=6&layer=city&lat=…&lon=…`): `features[].properties.name`, `state`, `country`, `countrycode`, `features[].geometry.coordinates` (longitude first). Empty `features` when nothing matches. It matches partial words, and `lat`/`lon` rank nearby towns first, so "Welle" near Boston finds Wellesley. Replaces Open-Meteo Geocoding, which only matched whole words | Have, CORS and partial-word test in the browser on 11/09 | Photon (komoot, OpenStreetMap data) |
| Photon reverse lookup (`https://photon.komoot.io/reverse?lat=…&lon=…`): names the town for Use my location | Same server as above | Photon |
| Overpass API (`https://overpass-api.de/api/interpreter`, POST `data=`): `elements[].lat`, `lon`, `tags.name`, `tags.brand`. Empty `elements` when nothing matches. A `remark` field means the query timed out | Have, CORS tested from the live site on 11/09 (got a Mobil near Wellesley) | OpenStreetMap / Overpass |
| Test route: Wellesley, MA → Concord, NH → Woodstock, NH → Stowe, VT | Have | Sam |
| Time at each Quick stop, Leave on for each Stay | Entered by the user, no defaults | User |
| The user's location | Browser Geolocation API, asked once when the page opens. Optional | User's browser |
| US state abbreviations (for "Stowe, VT") | Have, a fixed list in the code | Standard USPS codes |
| Visual design | Have `design/glovebox-mockup.html` (Screen 2) and `design/pixel-cab-mockup.html` (Screen 1 and the Trip archive). The sketch PDFs are in `design/` | Sam |
| `DESIGN.md` | **Missing**, required by the assignment | Sam, based on the mockup |

## Look

Follows `DESIGN.md` (to be written from `design/glovebox-mockup.html`).

## States

- **Empty**
  - Before anything is chosen: Screen 1, the pixel cab in Park.
  - Empty archive: the tray shows only **+ NEW TRIP**, with the line "No saved trips yet. Start one."
  - When a town search finds nothing (no `results` field): "No town called "…". Check the spelling."
  - When Find along the road finds nothing: "No {category} within 2 miles of the road." (on a leg over 150 miles: "…of the road in the first 150 miles.")
  - When a Stay has no Leave on: every stop after it shows "Set a leave time" in place of its arrival time.
- **Loading:** "Plotting your route…" with "Finding each stop and timing every drive." The truck drives across the road at the top, and the headline reads "PLOTTING ROUTE…".
  - Find along the road: "Looking along the road…" inside the add-stop card, with the category pills disabled until it finishes.
- **Error**
  - OSRM fails, or answers with a `code` other than `"Ok"`: "Couldn't reach the route service. Check your connection, then try again. Your stops are still here." It has a **Try again** button.
  - A town search fails: a one-line message inside the search card, with the card left open.
  - Find along the road fails (network, not `response.ok`, a `remark` in the answer, or no answer within 30 seconds): "Couldn't reach the places service. Try again in a moment." with a **Try again** button, inside the card. The card stays open.
  - In both cases the trip on screen and in `localStorage` stays as it was. After a route error, the headline goes back to what it showed before loading.
  - Storage blocked (`localStorage` throws on read or write): the tray shows only **+ NEW TRIP**, with the line "Trips can't be saved in this browser." Planning still works, it just isn't kept.
- **Ideal:** the summary, every stop card with its arrival time, every leg with time, miles, + pin and Maps link, and the whole-route link.
- **Invalid input**, refused before any request:
  - Plan trip without a picked start or destination: "Add a destination first" (or the start equivalent).
  - Add stop with no town picked: "Pick a town from the list first."
  - Add stop on the Find along the road tab with no place picked: "Pick a place from the list first."
  - A Stay's Leave on earlier than its arrival: "Leave after you arrive ({arrival time})."
  - In that last case, the times keep their last valid values.
  - None of these change the headline.

The partial state is left out because OSRM returns every leg or none.

## Checks

1. Plan Wellesley → Stowe and see the drive time, distance and total.
2. Add Concord, NH and Woodstock, NH with the + pins, and see three legs and the new total.
3. Make Concord a Stay with a Leave on time, and Woodstock a Quick stop with 1 h 0 min. Woodstock's arrival is counted from Concord's Leave on, and Stowe's arrival is Woodstock's arrival + 60 minutes + the last leg, with no "earliest" tag.
4. Open one leg in Google Maps.
5. Reload the page, open the glovebox, and find the trip as the LATEST card. Unfold it and see the same stops, types and times.
6. On the Concord → Woodstock leg, open Find along the road, pick Gas, add the first result, and see it become a Quick stop with four legs.
7. Drag the steering wheel (and hold ← →): it turns, and springs back to center when released. The road doesn't move.
8. Shift to D by dragging the knob, clicking the letter, pressing ↓, and the D button: trees and posts slide past, the road dashes rush in, the mountains stay still, and the speedometer, odometer and radio follow. Shift to R and see it run backward. With reduced motion turned on, nothing scrolls past.
9. Plan two different trips (Start a new trip in between). Open the glovebox: both are there, oldest on the left. Pick the older one, press Unfold map, and see that trip on Screen 2.
10. With Wellesley → Concord → Woodstock → Stowe planned, the headline reads "NEXT STOP: CONCORD, NH" and "STOP 1 OF 3". Click Woodstock's card: it gets the gold outline and the headline shows leg 2. Press → and ←, then ‹ ›, and see it step through the legs. Change Woodstock's time here and see leg 3's arrival in the headline change without a reload. Press Start a new trip and see "WHERE TO?".

## Out of scope

- Servers, API keys, accounts or logins, and any database beyond `localStorage`.
- Frameworks, libraries and anything loaded from a CDN (the assignment allows plain HTML, CSS and JS only).
- Turn-by-turn navigation inside the page (Google Maps handles it).

## Later

- **Day splitting** by max driving time per day, with an over-limit warning and "Day 1 / Day 2" headers. (Overnight stops are covered in version 1 by the Stay type.)
- **Gas:** MPG and tank size to show when to fill up, plus total cost split per person (needs a price per gallon, which is missing).
- **Weather on arrival** from the Open-Meteo Forecast for the arrival hour (16-day limit).
- Drag to reorder stops.
- Locking the time-here dropdowns until the stop is actually reached.
