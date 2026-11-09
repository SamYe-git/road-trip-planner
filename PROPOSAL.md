# Proposal: Road Trip Planner

## What I am building

I want a tool that I can use to plan my road trip and that tells me the drive time between each stop, not just the total time.

The pain point with Google Maps and other navigation apps is that, after I add all my stops, they only show the total time for the whole route. For example, they show the total time from Point A to Point B, but not the time from Point A to Stop 1, from Stop 1 to Stop 2, and so on. Showing that breakdown is the main job of this web tool. People make their plan, the tool calculates the total time and the time for each leg, and they can open their own navigation app from the website to navigate from one stop to the next.

## Who it is for

It is mainly for myself, but also for the wider community of road trip travelers.

## The API

### 1. OSRM (route and drive times)

- Docs: http://project-osrm.org/docs/v5.24.0/api/
- Tested URL: https://router.project-osrm.org/route/v1/driving/-71.27,42.30;-73.98,40.75;-77.04,38.90?overview=false
- Fields:
  - `code`: `"Ok"` means success
  - `routes[0].legs[i].distance`: distance of each leg (meters)
  - `routes[0].legs[i].duration`: drive time of each leg (seconds)
  - `routes[0].distance`, `routes[0].duration`: totals for the whole trip
- Note: coordinates are longitude first, then latitude.

### 2. Open-Meteo Geocoding (place name → coordinates)

- Docs: https://open-meteo.com/en/docs/geocoding-api
- Example URL: https://geocoding-api.open-meteo.com/v1/search?name=Nashville&count=5
- Fields: `results[].name`, `results[].admin1` (state), `results[].country`, `results[].latitude`, `results[].longitude`
- Note: when nothing is found, there is no `results` field at all (the empty state).

### 3. Open-Meteo Forecast (weather when I arrive)

- Docs: https://open-meteo.com/en/docs
- Example URL: https://api.open-meteo.com/v1/forecast?latitude=36.16&longitude=-86.78&hourly=temperature_2m,precipitation_probability,weather_code&temperature_unit=fahrenheit&timezone=auto
- Fields: `hourly.time[]`, `hourly.temperature_2m[]`, `hourly.precipitation_probability[]`, `hourly.weather_code[]` (the arrays line up by index)
- Limit: forecasts only go 16 days ahead.

## What the user chooses

The user chooses the starting point, the destination, and the stops in between, and can search for stops along the road. They can also set a maximum driving time per day, and the tool recommends how many days the trip will take.

## What the page works out

- **Time and distance between every two stops.** Google Maps and Apple Maps only show the total for the whole trip, but this page shows each leg on its own (for example, Dallas → Nashville: 662 mi, 9 h 40 min).
- **Arrival and departure time at each stop.** Starting from my departure time, it adds up the drive time and how long I plan to stay at each stop (gas, lunch, overnight).
- **How the trip splits into days.** Using my daily driving limit, it groups the legs into Day 1, Day 2, and so on, and warns me when a day goes over the limit.
- **When to get gas.** From my car's MPG and tank size, it works out how far one tank can go and tells me which leg I need to fill up before. It also shows the total gas cost and how much each person pays.
- **The weather when I get there.** For each stop, it shows the forecast for the hour I'm expected to arrive, not the weather right now.

## Features

1. Highly customizable trip plans
2. Enter my car's MPG to calculate when I need to stop for gas
3. Forecast the weather at the destination and at every stop

## What I do not know yet

- I need to figure out how to write the JavaScript that works all of this out.
- I need to figure out the user workflow so the tool is user-friendly.
