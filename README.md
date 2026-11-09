# Road Trip Planner

**Live site:** https://samye-git.github.io/road-trip-planner/

## What it does

Google Maps and other navigation apps show only the total drive time once you add several stops. This page shows every leg on its own. You pick a start, a destination and the stops in between, and it shows the drive time and distance for each leg plus the trip total. It also works out when you arrive at and leave each stop, based on your departure time and on how long you stay. A stop is either a Quick stop (gas, food, rest), where you type the minutes, or a Stay (a city or overnight), where you set when you leave. Every leg opens in Google Maps for turn-by-turn directions, and the trip is saved in your browser so it's still there after a reload.

## APIs

- **[OSRM](https://project-osrm.org/docs/v5.24.0/api/)** (public demo server, no key): the driving route, with the distance and duration of every leg.
- **[Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api)** (no key): turns a town name into a list of matches with state and coordinates.
- **Google Maps** directions links (just links, no API) open each leg or the whole route.

## How to use it

1. Open the live site and click the folded map on the dashboard.
2. Type a **Start** and a **Destination**, pick each town from the list of matches, set **Leave** to your departure date and time, then press **Plan trip**.
3. Press the **+** on a leg to add a stop there. Pick the town, choose **Stay** or **Quick stop**, then press **Add stop**.
4. On each stop, enter how long you stayed (Quick stop) or when you leave (Stay). Every arrival time after it updates straight away.
5. Click **Open this leg in Google Maps ↗** to navigate one leg, or **Open this route in Google Maps ↗** for the whole trip.

## Where the agent differed from what I expected

Joshua found a Joshua in Texas, the card only shows the city name and can't be distinguished; and "fill minutes at each station" is not suitable for cities, which was later changed to Stay / Quick stop

## The required question

What the AI gave me. During the PRD interview, I asked for a “search along the road” feature, like Google Maps: pick a category (gas station, coffee, food, hotel) and see places near the route. The agent recommended leaving it out of version 1. It said none of my three APIs can do it. OSRM only routes, and Open-Meteo Geocoding only finds towns. It would need a fourth API (OpenStreetMap’s Overpass) plus code to keep only the results near the route, and it suggested putting it on the Later list.

What I changed. I didn’t accept that at first. Searching along the road is one of the main reasons I wanted this tool, so I pushed back and wrote out how it should work: the Overpass API, the categories, sampling points from the OSRM route and searching about 2 miles around them, a “Find along this leg” tab in the add-stop card, and its own loading, nothing-found and error states.
