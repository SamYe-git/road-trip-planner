# AGENTS.md

Rules for any agent working on this project.

1. Read `PRD.md` and `DESIGN.md` before any change. Build only what `PRD.md` lists for version 1. Anything on its Later list is off limits unless I ask.
2. Use the simplest code that works, and add nothing I did not ask for.
3. Plain HTML, CSS and JavaScript only: `index.html`, `css/styles.css`, `js/app.js`. No frameworks, no libraries, no npm, no build step, and nothing loaded from a CDN.
4. Styles use only the `:root` tokens from `DESIGN.md`. If a value is missing, stop and ask me.
5. Data comes from four sources, with no key:
   - OSRM (`router.project-osrm.org`). Coordinates go longitude first.
   - Open-Meteo Geocoding.
   - Overpass (`overpass-api.de/api/interpreter`, POST `data=`), for Find along this leg. Check `response.ok`, and treat a `remark` field in the answer as an error.
   - Google Maps, as links only, with no API.

   Never put an API key anywhere in the repo.
6. Every `fetch` sits inside `try/catch` and checks `response.ok` (and OSRM's `code === "Ok"`). Every state from `PRD.md` must show on the page itself, never with `alert()`.
7. Put text from the user or an API on the page with `textContent`, never `innerHTML`.
8. Work one piece at a time. After each piece, tell me how to test it with Live Server, and wait for me before starting the next one. Do not commit for me.
