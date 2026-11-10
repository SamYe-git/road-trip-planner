# PRD: Road Trip Planner

## Goal

Show the drive time and distance for **every leg** of a road trip, not just the total. Arrival times update as the traveler fills in how long they actually stayed at each stop, and every leg opens in Google Maps for turn-by-turn navigation.

Due Sunday 11/08, deployed on GitHub Pages. Demo at the showcase on Tuesday 11/17.

## Audience and key action

- **Who:** Sam (me), driving Babson (Wellesley, MA) → Concord, NH → Woodstock, NH → Stowe, VT.
- **Key action:** enter a start, a destination and the stops in between, then see each leg's drive time and distance plus the trip total.

## Features

Version 1 is one page with two screens.

### Screen 1: the cab (opening screen)

- The opening screen shows the truck cab with the folded map on the dash.
- Clicking the map (or pressing Enter on it) unfolds it into Screen 2.

### Screen 2: the open map

1. **Trip form**
   - **Start** and **Destination:** type a town, then pick from a list of matches that shows each town's state and country. A town counts only once it has been picked from the list.
   - **Leave:** the departure time.
   - **Plan trip:** looks up the route.
2. **Route.** Stop cards zig-zag down the map, with a leg between each pair of cards.
   - **Summary** at the top: total miles and total drive time.
   - **Each leg** shows drive time and miles (converted from OSRM's seconds and meters), a **+ pin**, and an **"Open this leg in Google Maps"** link.
   - **Each stop card** shows its town with its state or region (for example "Stowe, VT"), so a wrong match is easy to spot. The region comes from the geocoding result's `admin1`, with US states abbreviated. The card also shows the arrival time.
   - **Middle stops** also have:
     - a **type**, either **Stay** or **Quick stop**, which can be switched on the card at any time
     - for a **Quick stop** (gas, food, rest): a **minutes here** number field, and a leave time of arrival + minutes
     - for a **Stay** (a city, overnight or several days): a **Leave on** date-and-time field. The next leg starts at that time.
     - a **×** to remove the stop
   - **Arrival times** start from the Leave time and add each leg's drive time and each Quick stop's minutes. After a Stay, the times restart from its Leave on.
     - An empty minutes field counts as 0.
     - Every arrival after an empty minutes field is tagged **"earliest"**, until a Stay with a Leave on restarts the times.
     - If a Stay's Leave on is empty, every stop after it shows **"Set a leave time"** instead of an arrival time.
     - Editing minutes, Leave on, a stop's type or Leave recalculates the times straight away, without calling OSRM again.
3. **Add a stop.** The + pin on a leg opens a card in that gap.
   - Search a town (Open-Meteo Geocoding) and pick a match.
   - Choose the stop type with two pills, **Stay** (the default) and **Quick stop**.
   - **Add stop** splits the leg in two, fetches the route again and redraws. **Cancel** closes the card.
   - The card has two tabs: **Search a town** (above, the default) and **Find along this leg**.
4. **Find along this leg** (version 2)
   - Category pills: **Gas**, **Coffee**, **Food**, **Hotel**, **Rest area**. Picking one starts the search.
   - The page gets that leg's road shape from OSRM (`overview=full&geometries=geojson`, the leg's two stops only), takes a point about every 5 miles (at most 40 points), and asks the Overpass API for that category within 2 miles of that line (`around:3200` on the points).
   - OpenStreetMap tags: Gas `amenity=fuel`, Coffee `amenity=cafe`, Food `amenity=restaurant` or `amenity=fast_food`, Hotel `tourism=hotel` or `tourism=motel`, Rest area `highway=rest_area` or `highway=services`.
   - Results are listed in the order you reach them, at most 15, each with its name (or "Unnamed {category}"), brand when it differs from the name, and the mile along the leg ("mile 23 of 68").
   - Picking a result and pressing **Add stop** adds it like a town, as a **Quick stop** by default. Its card shows the place name with the category ("MOBIL, GAS").
   - The leg shape is fetched once per open card. Switching categories only calls Overpass again.
5. **Whole-route link:** "Open this route in Google Maps ↗" at the bottom, with every stop included as a waypoint.
6. **Saving**
   - The trip is saved to `localStorage` (stops with coordinates, minutes, Leave time) and restored when the page opens.
   - **Start a new trip** clears it.
   - **Fold the map** returns to Screen 1.

## Content and data

| Item | Have / missing | From whom |
|---|---|---|
| OSRM route API: `code`, `routes[0].legs[i].distance`, `routes[0].legs[i].duration`, `routes[0].distance`, `routes[0].duration` (coordinates go longitude first) | Have, URL tested in the browser (`PROPOSAL.md`) | OSRM public server |
| OSRM CORS check from a GitHub Pages site | **Missing**, not yet run | Sam, Console check from the assignment |
| Open-Meteo Geocoding: `results[].name`, `admin1`, `country`, `latitude`, `longitude`. No `results` field when nothing matches | Have, CORS-safe per the assignment | Open-Meteo |
| Overpass API (`https://overpass-api.de/api/interpreter`, POST `data=`): `elements[].lat`, `lon`, `tags.name`, `tags.brand`. Empty `elements` when nothing matches. A `remark` field means the query timed out | Have, CORS tested from the live site on 11/09 (got a Mobil near Wellesley) | OpenStreetMap / Overpass |
| Test route: Wellesley, MA → Concord, NH → Woodstock, NH → Stowe, VT | Have | Sam |
| Minutes at each Quick stop, Leave on for each Stay | Entered by the user, no defaults | User |
| US state abbreviations (for "Stowe, VT") | Have, a fixed list in the code | Standard USPS codes |
| Visual design | Have `design/glovebox-mockup.html`. The sketch PDFs are in `design/` | Sam |
| `DESIGN.md` | **Missing**, required by the assignment | Sam, based on the mockup |

## Look

Follows `DESIGN.md` (to be written from `design/glovebox-mockup.html`).

## States

- **Empty**
  - Before anything is chosen: Screen 1, the folded map in the cab.
  - When a town search finds nothing (no `results` field): "No town called "…". Check the spelling."
  - When Find along this leg finds nothing: "No {category} within 2 miles of this leg."
  - When a Stay has no Leave on: every stop after it shows "Set a leave time" in place of its arrival time.
- **Loading:** "Plotting your route…" with "Finding each stop and timing every leg." The truck drives across the road at the top.
  - Find along this leg: "Looking along this leg…" inside the add-stop card, with the category pills disabled until it finishes.
- **Error**
  - OSRM fails, or answers with a `code` other than `"Ok"`: "Couldn't reach the route service. Check your connection, then try again. Your stops are still here." It has a **Try again** button.
  - A town search fails: a one-line message inside the search card, with the card left open.
  - Find along this leg fails (network, not `response.ok`, or a `remark` in the answer): "Couldn't reach the places service. Try again in a moment." with a **Try again** button, inside the card. The card stays open.
  - In both cases the trip on screen and in `localStorage` stays as it was.
- **Ideal:** the summary, every stop card with its arrival time, every leg with time, miles, + pin and Maps link, and the whole-route link.
- **Invalid input**, refused before any request:
  - Plan trip without a picked start or destination: "Add a destination first" (or the start equivalent).
  - Add stop with no town picked: "Pick a town from the list first."
  - Add stop on the Find along this leg tab with no place picked: "Pick a place from the list first."
  - Minutes that are negative or not a number: "Enter minutes as 0 or more."
  - A Stay's Leave on earlier than its arrival: "Leave after you arrive ({arrival time})."
  - In both of the last two cases, the times keep their last valid values.

The partial state is left out because OSRM returns every leg or none.

## Checks

1. Plan Wellesley → Stowe and see the drive time, distance and total.
2. Add Concord, NH and Woodstock, NH with the + pins, and see three legs and the new total.
3. Make Concord a Stay with a Leave on time, and Woodstock a Quick stop with 60 minutes. Woodstock's arrival is counted from Concord's Leave on, and Stowe's arrival is Woodstock's arrival + 60 minutes + the last leg, with no "earliest" tag.
4. Open one leg in Google Maps.
5. Reload the page and find the trip still there.
6. On the Concord → Woodstock leg, open Find along this leg, pick Gas, add the first result, and see it become a Quick stop with four legs.

## Out of scope

- Servers, API keys, accounts or logins, and any database beyond `localStorage`.
- Frameworks, libraries and anything loaded from a CDN (the assignment allows plain HTML, CSS and JS only).
- Turn-by-turn navigation inside the page (Google Maps handles it).

## Later

- **Day splitting** by max driving time per day, with an over-limit warning and "Day 1 / Day 2" headers. (Overnight stops are covered in version 1 by the Stay type.)
- **Gas:** MPG and tank size to show when to fill up, plus total cost split per person (needs a price per gallon, which is missing).
- **Weather on arrival** from the Open-Meteo Forecast for the arrival hour (16-day limit).
- Drag to reorder stops.
- Locking the minutes field until the stop is actually reached.
