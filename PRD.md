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
   - **Each stop card** shows its town and arrival time. Middle stops also show:
     - a **minutes here** number field, editable at any time
     - the leave time (arrival + minutes)
     - a **×** to remove the stop
   - **Arrival times** start from the Leave time and add each leg's drive time and each stop's minutes.
     - An empty minutes field counts as 0.
     - Every arrival after an empty minutes field is tagged **"earliest"**.
     - Editing minutes recalculates the times straight away, without calling OSRM again.
3. **Add a stop.** The + pin on a leg opens a card in that gap.
   - Search a town (Open-Meteo Geocoding) and pick a match.
   - **Add stop** splits the leg in two, fetches the route again and redraws. **Cancel** closes the card.
4. **Whole-route link:** "Open this route in Google Maps ↗" at the bottom, with every stop included as a waypoint.
5. **Saving**
   - The trip is saved to `localStorage` (stops with coordinates, minutes, Leave time) and restored when the page opens.
   - **Start a new trip** clears it.
   - **Fold the map** returns to Screen 1.

## Content and data

| Item | Have / missing | From whom |
|---|---|---|
| OSRM route API: `code`, `routes[0].legs[i].distance`, `routes[0].legs[i].duration`, `routes[0].distance`, `routes[0].duration` (coordinates go longitude first) | Have, URL tested in the browser (`PROPOSAL.md`) | OSRM public server |
| OSRM CORS check from a GitHub Pages site | **Missing**, not yet run | Sam, Console check from the assignment |
| Open-Meteo Geocoding: `results[].name`, `admin1`, `country`, `latitude`, `longitude`. No `results` field when nothing matches | Have, CORS-safe per the assignment | Open-Meteo |
| Test route: Wellesley, MA → Concord, NH → Woodstock, NH → Stowe, VT | Have | Sam |
| Minutes at each stop | Entered by the user during the trip, no defaults | User |
| Visual design | Have `design/glovebox-mockup.html`. The sketch PDFs are in `design/` | Sam |
| `DESIGN.md` | **Missing**, required by the assignment | Sam, based on the mockup |

## Look

Follows `DESIGN.md` (to be written from `design/glovebox-mockup.html`).

## States

- **Empty**
  - Before anything is chosen: Screen 1, the folded map in the cab.
  - When a town search finds nothing (no `results` field): "No town called "…". Check the spelling."
- **Loading:** "Plotting your route…" with "Finding each stop and timing every leg." The truck drives across the road at the top.
- **Error**
  - OSRM fails, or answers with a `code` other than `"Ok"`: "Couldn't reach the route service. Check your connection, then try again. Your stops are still here." It has a **Try again** button.
  - A town search fails: a one-line message inside the search card, with the card left open.
  - In both cases the trip on screen and in `localStorage` stays as it was.
- **Ideal:** the summary, every stop card with its arrival time, every leg with time, miles, + pin and Maps link, and the whole-route link.
- **Invalid input**, refused before any request:
  - Plan trip without a picked start or destination: "Add a destination first" (or the start equivalent).
  - Add stop with no town picked: "Pick a town from the list first."
  - Minutes that are negative or not a number: "Enter minutes as 0 or more."

The partial state is left out because OSRM returns every leg or none.

## Checks

1. Plan Wellesley → Stowe and see the drive time, distance and total.
2. Add Concord, NH and Woodstock, NH with the + pins, and see three legs and the new total.
3. Enter 60 minutes at Woodstock. The Stowe arrival moves 60 minutes later and loses its "earliest" tag.
4. Open one leg in Google Maps.
5. Reload the page and find the trip still there.

## Out of scope

- Servers, API keys, accounts or logins, and any database beyond `localStorage`.
- Frameworks, libraries and anything loaded from a CDN (the assignment allows plain HTML, CSS and JS only).
- Turn-by-turn navigation inside the page (Google Maps handles it).

## Later

- **Find along this leg:** category search (gas, coffee, food, hotel, rest area) with the OpenStreetMap Overpass API, using `around:` on sampled OSRM route geometry. It needs a CORS check first, plus its own loading, nothing-found, error and invalid-input states.
- **Day splitting** by max driving time per day, with an over-limit warning, overnight stops, and "Day 1 / Day 2" headers.
- **Gas:** MPG and tank size to show when to fill up, plus total cost split per person (needs a price per gallon, which is missing).
- **Weather on arrival** from the Open-Meteo Forecast for the arrival hour (16-day limit).
- Drag to reorder stops.
- Locking the minutes field until the stop is actually reached.
