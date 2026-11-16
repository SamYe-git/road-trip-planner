(function () {
  'use strict';

  var cab = document.getElementById('cab');
  var sheet = document.getElementById('sheet');
  var cabCanvas = document.getElementById('cabCanvas');

  // Screen 1 -> Screen 2: hide the cab, show the sheet and replay the unfold animation
  function openMap() {
    cab.hidden = true;
    sheet.hidden = false;
    sheet.classList.remove('opening');
    void sheet.offsetWidth; // restart the animation on every open
    sheet.classList.add('opening');
    document.getElementById('from').focus({ preventScroll: true });
  }

  // Screen 2 -> Screen 1
  function foldMap() {
    sheet.hidden = true;
    cab.hidden = false;
    cabCanvas.focus();
  }

  document.getElementById('foldMap').addEventListener('click', foldMap);

  // ---------- Town search (Open-Meteo Geocoding) ----------

  var GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search?count=5&name=';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function townLabel(r) {
    return [r.name, r.admin1, r.country].filter(Boolean).join(', ');
  }

  var US_STATES = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA', 'Colorado': 'CO',
    'Connecticut': 'CT', 'Delaware': 'DE', 'District of Columbia': 'DC', 'Washington, D.C.': 'DC', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS', 'Kentucky': 'KY',
    'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN',
    'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH',
    'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA',
    'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
  };

  // "VT" for a US state, otherwise the full region, or the country when there is no region
  function regionOf(r) {
    if (r.country_code === 'US' && US_STATES[r.admin1]) return US_STATES[r.admin1];
    return r.admin1 || r.country || '';
  }

  // Returns an array of matches ([] when the response has no results field). Throws on a failed request.
  async function searchTowns(q) {
    var response = await fetch(GEO_URL + encodeURIComponent(q));
    if (!response.ok) throw new Error('Geocoding HTTP ' + response.status);
    var data = await response.json();
    return data.results || [];
  }

  // Wires an input, its match list and its error line to the town search.
  // Used by Start, Destination and the add-stop card.
  function townSearch(input, list, err) {
    var field = { picked: null };
    var timer = null;
    var latest = 0; // only the newest search may draw its results

    function showErr(msg) {
      err.textContent = msg;
      err.hidden = false;
    }

    function clearErr() {
      err.hidden = true;
      err.textContent = '';
      input.removeAttribute('aria-invalid');
    }

    function drawPills(matches) {
      list.replaceChildren();
      matches.forEach(function (r) {
        var b = el('button', 'pick', townLabel(r));
        b.type = 'button';
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () {
          field.picked = { name: r.name, region: regionOf(r), label: townLabel(r), lat: r.latitude, lon: r.longitude };
          input.value = r.name;
          list.replaceChildren(); // the pick is made: close the match list
          input.focus();          // the pill is gone, so keep focus on the field
          clearErr();
        });
        list.appendChild(b);
      });
    }

    async function run(q) {
      var mine = ++latest;
      try {
        var matches = await searchTowns(q);
        if (mine !== latest) return;
        if (!matches.length) {
          list.replaceChildren(el('p', 'hint', 'No town called “' + q + '”. Check the spelling.'));
          return;
        }
        drawPills(matches);
      } catch (e) {
        if (mine !== latest) return;
        list.replaceChildren();
        showErr('Couldn’t search towns. Check your connection, then try again.');
      }
    }

    input.addEventListener('input', function () {
      field.picked = null; // typing again un-picks the town
      clearErr();
      clearTimeout(timer);
      latest++; // drop any search still in flight
      var q = input.value.trim();
      if (q.length < 2) { list.replaceChildren(); return; }
      timer = setTimeout(function () { run(q); }, 300);
    });

    field.invalid = function (msg) {
      input.setAttribute('aria-invalid', 'true');
      showErr(msg);
    };
    // Sets the picked town from outside (restoring a saved trip), or clears the field with null
    field.set = function (p) {
      field.picked = p;
      input.value = p ? p.name : '';
      list.replaceChildren();
      clearErr();
    };
    return field;
  }

  function townField(id) {
    return townSearch(document.getElementById(id), document.getElementById(id + 'Results'), document.getElementById(id + 'Err'));
  }

  var start = townField('from');
  var dest = townField('to');

  // ---------- Route (OSRM) ----------

  var OSRM_URL = 'https://router.project-osrm.org/route/v1/driving/';

  // The whole trip lives in these. Change them, then call render().
  var stops = [];               // { name, label, lat, lon }
  var legs = [];                // { distance (m), duration (s) }, legs[i] goes from stops[i] to stops[i + 1]
  var total = { distance: 0, duration: 0 };
  var openLeg = -1;             // which leg's add-stop card is open, -1 for none

  var routeEl = document.getElementById('route');
  var planBtn = document.querySelector('#tripForm .btn-solid');

  function miles(m) { return Math.round(m / 1609.34) + ' mi'; }

  function duration(s) {
    var min = Math.round(s / 60), h = Math.floor(min / 60), r = min % 60;
    if (!h) return r + ' min';
    return h + ' h ' + r + ' min';
  }

  // OSRM wants longitude first: lon,lat;lon,lat;...
  function routeUrl(list) {
    return OSRM_URL + list.map(function (s) { return s.lon + ',' + s.lat; }).join(';') + '?overview=false';
  }

  // Routes the given stops. Only on success do they become the trip; on failure the trip stays as it was.
  async function fetchRoute(next) {
    openLeg = -1;
    sheet.classList.add('loading');
    planBtn.disabled = true;
    panel('loading', 'Plotting your route…', 'Finding each stop and timing every drive.');
    try {
      var response = await fetch(routeUrl(next));
      if (!response.ok) throw new Error('OSRM HTTP ' + response.status);
      var data = await response.json();
      if (data.code !== 'Ok') throw new Error('OSRM code ' + data.code);
      var r = data.routes[0];
      stops = next;
      legs = r.legs.map(function (l) { return { distance: l.distance, duration: l.duration }; });
      total = { distance: r.distance, duration: r.duration };
      render();
    } catch (e) {
      panel('error', 'Couldn’t reach the route service', 'Check your connection, then try again. Your stops are still here.', 'Try again', function () { fetchRoute(next); });
    } finally {
      sheet.classList.remove('loading');
      planBtn.disabled = false;
    }
  }

  // A centered message in the route area (loading, error)
  function panel(cls, title, body, btnText, onBtn) {
    var p = el('div', 'panel ' + cls);
    p.appendChild(el('h2', null, title));
    p.appendChild(el('p', null, body));
    if (btnText) {
      var b = el('button', null, btnText);
      b.type = 'button';
      b.addEventListener('click', onBtn);
      p.appendChild(b);
    }
    routeEl.replaceChildren(p);
  }

  // Dashed pencil arrow between two stop cards, curving toward the next card
  function arrow(flip) {
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 300 74');
    s.setAttribute('preserveAspectRatio', 'none');
    s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(ns, 'path');
    p.setAttribute('d', flip ? 'M250 4 C230 40 120 30 60 66 M60 66 l18 -2 M60 66 l4 -16' : 'M50 4 C70 40 180 30 240 66 M240 66 l-18 -2 M240 66 l-4 -16');
    s.appendChild(p);
    return s;
  }

  // ---------- Find along this leg (OSRM leg shape + Overpass) ----------

  var OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

  var CATEGORIES = [
    { label: 'Gas', tags: ['amenity=fuel'] },
    { label: 'Coffee', tags: ['amenity=cafe'] },
    { label: 'Food', tags: ['amenity=restaurant', 'amenity=fast_food'] },
    { label: 'Hotel', tags: ['tourism=hotel', 'tourism=motel'] },
    { label: 'Rest area', tags: ['highway=rest_area', 'highway=services'] }
  ];

  // Miles between two [lon, lat] points
  function milesBetween(a, b) {
    var rad = Math.PI / 180;
    var dLat = (b[1] - a[1]) * rad, dLon = (b[0] - a[0]) * rad;
    var h = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.pow(Math.sin(dLon / 2), 2);
    return 2 * 3958.8 * Math.asin(Math.sqrt(h));
  }

  // A point about every 5 miles along the line (at most 40), each with its mile from the start
  function samplePoints(coords) {
    var total = 0;
    for (var k = 1; k < coords.length; k++) total += milesBetween(coords[k - 1], coords[k]);
    var step = Math.max(5, total / 38); // 39 points along the way + the end = 40 at most
    var pts = [], run = 0, next = 0;
    coords.forEach(function (c, k) {
      if (k > 0) run += milesBetween(coords[k - 1], c);
      if (run >= next) {
        pts.push({ lat: c[1], lon: c[0], mile: run });
        next = run + step;
      }
    });
    var last = coords[coords.length - 1];
    if (pts[pts.length - 1].mile !== run) pts.push({ lat: last[1], lon: last[0], mile: run });
    return pts;
  }

  // Longer roads are too heavy for Overpass, so only their first 150 miles are searched
  var SEARCH_MILES = 150;

  // The line cut off at the given number of miles
  function firstMiles(coords, max) {
    var out = [coords[0]], run = 0;
    for (var k = 1; k < coords.length && run < max; k++) {
      run += milesBetween(coords[k - 1], coords[k]);
      out.push(coords[k]);
    }
    return out;
  }

  // The road shape of one leg (its first 150 miles), from OSRM, as sampled points. Throws on a failed request.
  async function legShape(a, b) {
    var response = await fetch(OSRM_URL + a.lon + ',' + a.lat + ';' + b.lon + ',' + b.lat + '?overview=full&geometries=geojson');
    if (!response.ok) throw new Error('OSRM HTTP ' + response.status);
    var data = await response.json();
    if (data.code !== 'Ok') throw new Error('OSRM code ' + data.code);
    return samplePoints(firstMiles(data.routes[0].geometry.coordinates, SEARCH_MILES));
  }

  function placesQuery(cat, pts) {
    var around = '(around:3200,' + pts.map(function (p) { return p.lat.toFixed(5) + ',' + p.lon.toFixed(5); }).join(',') + ');';
    var kinds = cat.tags.length > 1 ? ['node', 'way'] : ['node'];
    var parts = cat.tags.map(function (t) {
      var kv = t.split('=');
      return kinds.map(function (kind) { return kind + '["' + kv[0] + '"="' + kv[1] + '"]' + around; }).join('');
    }).join('');
    return '[out:json][timeout:25];(' + parts + ');out center 60;';
  }

  // Places of one category near the sampled points, in the order you reach them (at most 15). Throws on failure.
  async function findPlaces(cat, pts) {
    // A busy server can hold the request for minutes: give up after 30 s and show the error
    var stop = new AbortController();
    var timer = setTimeout(function () { stop.abort(); }, 30000);
    var response;
    try {
      response = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(placesQuery(cat, pts)),
        signal: stop.signal
      });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) throw new Error('Overpass HTTP ' + response.status);
    var data = await response.json();
    if (data.remark) throw new Error('Overpass remark: ' + data.remark);
    return (data.elements || []).map(function (e) {
      var lat = e.lat != null ? e.lat : e.center.lat;   // ways come back with a center
      var lon = e.lon != null ? e.lon : e.center.lon;
      var tags = e.tags || {};
      var near = pts[0], best = Infinity;
      pts.forEach(function (p) {
        var d = milesBetween([lon, lat], [p.lon, p.lat]);
        if (d < best) { best = d; near = p; }
      });
      return {
        name: tags.name || 'Unnamed ' + cat.label.toLowerCase(),
        brand: tags.brand && tags.brand !== tags.name ? tags.brand : '',
        lat: lat, lon: lon, mile: near.mile
      };
    }).sort(function (a, b) { return a.mile - b.mile; }).slice(0, 15);
  }

  // The note card that opens in leg i's gap
  function addCard(i) {
    var box = el('div', 'addcard');
    box.appendChild(el('h4', null, 'Add a stop between ' + stops[i].name + ' and ' + stops[i + 1].name));

    // Tabs: Search a town / Find along this leg
    var tabs = el('div', 'tabs');
    tabs.setAttribute('role', 'tablist');
    var townTab = el('button', 'tab', 'Search a town');
    var alongTab = el('button', 'tab', 'Find along the road');
    [townTab, alongTab].forEach(function (t) {
      t.type = 'button';
      t.setAttribute('role', 'tab');
      tabs.appendChild(t);
    });
    box.appendChild(tabs);

    // Tab 1: town search, unchanged
    var townPane = el('div', 'pane');
    var lab = el('label', null, 'Town or place');
    lab.htmlFor = 'addq';
    townPane.appendChild(lab);
    var input = el('input');
    input.id = 'addq';
    input.autocomplete = 'off';
    townPane.appendChild(input);
    var list = el('div', 'results');
    list.setAttribute('aria-live', 'polite');
    townPane.appendChild(list);
    var err = el('p', 'err');
    err.hidden = true;
    townPane.appendChild(err);

    var town = townSearch(input, list, err);

    var choice = { type: 'stay' };
    townPane.appendChild(typePills(choice, function () {}));
    box.appendChild(townPane);

    // Tab 2: find along this leg
    var alongPane = el('div', 'pane');
    alongPane.hidden = true;
    var cats = el('div', 'chips');
    cats.setAttribute('role', 'group');
    cats.setAttribute('aria-label', 'Category');
    alongPane.appendChild(cats);
    var legMiles = Math.round(legs[i].distance / 1609.34);
    var longRoad = legMiles > SEARCH_MILES;
    if (longRoad) alongPane.appendChild(el('p', 'hint', 'Searching the first ' + SEARCH_MILES + ' miles of the road.'));
    var status = el('div', 'status');
    status.setAttribute('aria-live', 'polite');
    alongPane.appendChild(status);
    var places = el('div', 'places');
    alongPane.appendChild(places);
    var placeChoice = { type: 'quick' };
    alongPane.appendChild(typePills(placeChoice, function () {}));
    box.appendChild(alongPane);

    var shape = null;      // the leg's sampled points, fetched once per open card
    var started = false;   // the shape fetch starts the first time the tab opens
    var picked = null;     // { name, region, lat, lon } of the picked place

    function setBusy(on) {
      cats.querySelectorAll('.chip').forEach(function (c) { c.disabled = on; });
    }

    // Fetches the shape if needed, then (when a category is given) the places. Shows every state in the card.
    async function look(cat) {
      setBusy(true);
      picked = null;
      places.replaceChildren();
      status.replaceChildren(el('p', 'hint', 'Looking along the road…'), el('div', 'dashline'));
      try {
        if (!shape) shape = await legShape(stops[i], stops[i + 1]);
        if (!cat) { status.replaceChildren(); return; }
        var found = await findPlaces(cat, shape);
        status.replaceChildren(); // keep "Looking along the road…" up until the places are back
        if (!found.length) {
          status.replaceChildren(el('p', 'hint', 'No ' + cat.label.toLowerCase() + ' within 2 miles of the road' + (longRoad ? ' in the first ' + SEARCH_MILES + ' miles.' : '.')));
          return;
        }
        drawPlaces(found, cat);
      } catch (e) {
        var again = el('button', 'btn-ghost', 'Try again');
        again.type = 'button';
        again.addEventListener('click', function () { look(cat); });
        var line = el('div', 'addrow');
        line.appendChild(el('p', 'err', 'Couldn’t reach the places service. Try again in a moment.'));
        line.appendChild(again);
        status.replaceChildren(line);
      } finally {
        setBusy(false);
      }
    }

    function drawPlaces(found, cat) {
      found.forEach(function (p) {
        var b = el('button', 'place', p.name);
        b.type = 'button';
        b.setAttribute('aria-pressed', 'false');
        b.appendChild(el('span', null, (p.brand ? p.brand + ' · ' : '') + 'mile ' + Math.round(p.mile) + ' of ' + legMiles));
        b.addEventListener('click', function () {
          picked = { name: p.name, region: cat.label, lat: p.lat, lon: p.lon };
          places.querySelectorAll('.place').forEach(function (r) { r.setAttribute('aria-pressed', String(r === b)); });
          placeErr.hidden = true;
        });
        places.appendChild(b);
      });
    }

    CATEGORIES.forEach(function (cat) {
      var c = el('button', 'chip', cat.label);
      c.type = 'button';
      c.setAttribute('aria-pressed', 'false');
      c.addEventListener('click', function () {
        cats.querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-pressed', String(b === c)); });
        look(cat);
      });
      cats.appendChild(c);
    });

    function showTab(along) {
      townTab.setAttribute('aria-selected', String(!along));
      alongTab.setAttribute('aria-selected', String(along));
      townPane.hidden = along;
      alongPane.hidden = !along;
      placeErr.hidden = true;
      if (along && !started) { started = true; look(null); }
    }
    townTab.addEventListener('click', function () { showTab(false); });
    alongTab.addEventListener('click', function () { showTab(true); });

    var row = el('div', 'addrow');
    var ok = el('button', 'btn-solid', 'Add stop');
    ok.type = 'button';
    ok.addEventListener('click', function () {
      var next = stops.slice();
      if (!alongPane.hidden) {
        if (!picked) { placeErr.hidden = false; return; }
        next.splice(i + 1, 0, Object.assign({}, picked, { type: placeChoice.type, minutes: null, leaveOn: null }));
      } else {
        if (!town.picked) { town.invalid('Pick a town from the list first.'); return; }
        next.splice(i + 1, 0, Object.assign({}, town.picked, { type: choice.type, minutes: null, leaveOn: null }));
      }
      fetchRoute(next);
    });
    var no = el('button', 'btn-ghost', 'Cancel');
    no.type = 'button';
    no.addEventListener('click', function () { openLeg = -1; render(); });
    row.appendChild(ok);
    row.appendChild(no);
    box.appendChild(row);
    var placeErr = el('p', 'err', 'Pick a place from the list first.');
    placeErr.hidden = true;
    box.appendChild(placeErr);

    showTab(false);
    return box;
  }

  // ---------- Arrival and leave times ----------

  var leaveInput = document.getElementById('leave');
  var timeEls = [];             // per stop: { arrive, earliest, leave, stayErr, arrival } filled by render() and updateTimes()

  // "9:40 AM", or "Sat 1:15 AM" when it's no longer the departure day
  function clock(d, startDay) {
    var t = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (d.toDateString() === startDay.toDateString()) return t;
    return d.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + t;
  }

  function stayErrText(arrival, depart) {
    return 'Leave after you arrive (' + clock(new Date(arrival), depart) + ').';
  }

  // Recalculates every arrival and leave time from Leave, the legs, each Quick stop's minutes
  // and each Stay's Leave on. Only touches the time text, so a field being typed in keeps its focus.
  function updateTimes() {
    var depart = leaveInput.value ? new Date(leaveInput.value) : null;  // the day that needs no weekday
    var t = depart ? depart.getTime() : null;  // null once the time is unknown
    var unset = false;          // true after a Stay with no Leave on
    var guess = false;          // true once a Quick stop before this one has no minutes yet
    stops.forEach(function (s, i) {
      var e = timeEls[i];
      if (!e) return;
      e.arrival = null;
      e.day = depart;
      if (i > 0) {
        if (t != null) {
          t += Math.round(legs[i - 1].duration / 60) * 60000; // whole minutes, matching the leg label
          e.arrival = t;
          e.arrive.textContent = 'Arrive ' + clock(new Date(t), depart);
        } else {
          e.arrive.textContent = unset ? 'Set a leave time' : '';
        }
        e.arrive.classList.toggle('unset', t == null && unset);
        e.earliest.hidden = !(t != null && guess);
      }
      if (i > 0 && i < stops.length - 1) {
        if (s.type === 'stay') {
          if (s.leaveOn) {
            var on = new Date(s.leaveOn).getTime();
            if (!depart) depart = new Date(on); // no Leave set: count days from this Leave on
            // A stored Leave on can fall behind the arrival when something earlier changes
            var late = e.arrival != null && on < e.arrival;
            e.stayErr.textContent = late ? stayErrText(e.arrival, depart) : '';
            e.stayErr.hidden = !late;
            t = on;
            unset = false;
            guess = false;      // the times restart from a fixed Leave on
          } else {
            e.stayErr.hidden = true;
            t = null;
            unset = true;
          }
        } else {
          if (s.minutes == null) guess = true;
          if (t != null) t += (s.minutes || 0) * 60000;
        }
      }
      if (e.leave) e.leave.textContent = t != null ? 'Leave ' + clock(new Date(t), depart) : '';
    });
    save(); // every change (route, type, minutes, Leave on, Leave) ends here
  }

  leaveInput.addEventListener('input', updateTimes);

  // The "min here" field on a middle stop
  function minutesField(s, i) {
    var wrap = el('label', 'mins');
    var input = el('input');
    input.type = 'number';
    input.min = '0';
    input.step = '1';
    input.inputMode = 'numeric';
    input.value = s.minutes == null ? '' : String(s.minutes);
    wrap.appendChild(input);
    wrap.appendChild(document.createTextNode(' min here'));
    var err = el('p', 'err', 'Enter minutes as 0 or more.');
    err.hidden = true;

    input.addEventListener('input', function () {
      var raw = input.value.trim();
      var n = Number(raw);
      if (input.validity.badInput || (raw !== '' && !(n >= 0))) {
        input.setAttribute('aria-invalid', 'true');
        err.hidden = false;
        return; // times keep their last valid values
      }
      input.removeAttribute('aria-invalid');
      err.hidden = true;
      s.minutes = raw === '' ? null : n;
      updateTimes();
    });
    return { label: wrap, err: err };
  }

  // The "Leave on" field on a Stay
  function leaveOnField(s, i) {
    var wrap = el('label', 'mins');
    wrap.appendChild(document.createTextNode('Leave on '));
    var input = el('input');
    input.type = 'datetime-local';
    input.value = s.leaveOn || '';
    wrap.appendChild(input);
    var err = el('p', 'err');
    err.hidden = true;

    input.addEventListener('input', function () {
      var arrival = timeEls[i].arrival;
      if (input.value && arrival != null && new Date(input.value).getTime() < arrival) {
        input.setAttribute('aria-invalid', 'true');
        err.textContent = stayErrText(arrival, timeEls[i].day);
        err.hidden = false;
        return; // times keep their last valid values
      }
      input.removeAttribute('aria-invalid');
      s.leaveOn = input.value || null;
      updateTimes();
    });
    return { label: wrap, err: err };
  }

  // Stay / Quick stop pills. obj.type is set on click, then onChange runs.
  function typePills(obj, onChange) {
    var group = el('div', 'chips');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Stop type');
    [['stay', 'Stay'], ['quick', 'Quick stop']].forEach(function (t) {
      var c = el('button', 'chip', t[1]);
      c.type = 'button';
      c.dataset.type = t[0];
      c.setAttribute('aria-pressed', String(obj.type === t[0]));
      c.addEventListener('click', function () {
        obj.type = t[0];
        group.querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-pressed', String(b === c)); });
        onChange();
      });
      group.appendChild(c);
    });
    return group;
  }

  function render() {
    routeEl.replaceChildren();
    timeEls = [];

    var sum = el('div', 'summary');
    [[miles(total.distance), 'total'], [duration(total.duration), 'driving']].forEach(function (x) {
      var d = el('div');
      d.appendChild(el('b', null, x[0]));
      d.appendChild(document.createTextNode(x[1]));
      sum.appendChild(d);
    });
    routeEl.appendChild(sum);

    stops.forEach(function (s, i) {
      var card = el('article', 'stop');
      card.appendChild(el('span', 'num', String(i + 1)));
      card.appendChild(el('h3', null, s.region ? s.name + ', ' + s.region : s.name));

      var middle = i > 0 && i < stops.length - 1;
      var stay = middle && s.type === 'stay';
      if (middle) {
        // Switching type redraws the cards (no OSRM call) and keeps focus on the pill
        card.appendChild(typePills(s, function () {
          render();
          var b = routeEl.querySelectorAll('.stop')[i].querySelector('.chip[data-type="' + s.type + '"]');
          if (b) b.focus();
        }));
      }
      var meta = el('div', 'meta');
      var e = {};
      if (i > 0) {
        var arr = el('span');
        e.earliest = el('span', 'earliest', 'earliest');
        e.earliest.hidden = true;
        e.arrive = el('span');
        arr.appendChild(e.earliest);
        arr.appendChild(e.arrive);
        meta.appendChild(arr);
      }
      var mins = middle ? (stay ? leaveOnField(s, i) : minutesField(s, i)) : null;
      if (mins) meta.appendChild(mins.label);
      if (stay) e.stayErr = mins.err;
      if (i < stops.length - 1 && !stay) {
        e.leave = el('span');
        meta.appendChild(e.leave);
      }
      timeEls[i] = e;
      card.appendChild(meta);
      if (mins) card.appendChild(mins.err);

      if (middle) {
        var x = el('button', 'remove', '×');
        x.type = 'button';
        x.setAttribute('aria-label', 'Remove ' + s.name);
        x.addEventListener('click', function () {
          fetchRoute(stops.filter(function (_, k) { return k !== i; }));
        });
        card.appendChild(x);
      }
      routeEl.appendChild(card);

      if (legs[i]) {
        var leg = el('div', 'leg');
        leg.appendChild(arrow(i % 2 === 1));
        var mid = el('div', 'mid');
        var label = el('div', 'label');
        label.appendChild(el('b', null, duration(legs[i].duration) + ' · ' + miles(legs[i].distance)));
        var a = el('a', null, 'Start directions in Google Maps ↗');
        a.href = legUrl(s, stops[i + 1]);
        a.target = '_blank';
        a.rel = 'noopener';
        label.appendChild(a);
        mid.appendChild(label);
        var plus = el('button', 'plus', '+');
        plus.type = 'button';
        plus.setAttribute('aria-label', 'Add a stop between ' + s.name + ' and ' + stops[i + 1].name);
        plus.setAttribute('aria-expanded', String(openLeg === i));
        plus.addEventListener('click', function () {
          openLeg = openLeg === i ? -1 : i;
          render();
          var q = document.getElementById('addq');
          if (q) q.focus();
        });
        mid.appendChild(plus);
        leg.appendChild(mid);
        routeEl.appendChild(leg);
        if (openLeg === i) routeEl.appendChild(addCard(i));
      }
    });
    routeLink.href = routeMapsUrl();
    routeLink.hidden = false;
    updateTimes();
  }

  // ---------- Google Maps links ----------

  var MAPS_URL = 'https://www.google.com/maps/dir/?api=1&travelmode=driving';
  var routeLink = document.getElementById('routeLink');

  function ll(s) { return s.lat + ',' + s.lon; }

  function legUrl(a, b) {
    return MAPS_URL + '&origin=' + encodeURIComponent(ll(a)) + '&destination=' + encodeURIComponent(ll(b));
  }

  function routeMapsUrl() {
    var url = legUrl(stops[0], stops[stops.length - 1]);
    var mid = stops.slice(1, -1).map(ll);
    if (mid.length) url += '&waypoints=' + encodeURIComponent(mid.join('|'));
    return url;
  }

  // ---------- Saving trips (localStorage) ----------

  var TRIPS_KEY = 'roadTrips';
  var OLD_KEY = 'roadTrip';     // the single saved trip from before the archive
  var currentId = null;         // the archive entry the trip on Screen 2 saves into, null until it first saves

  function validStops(list) {
    return Array.isArray(list) && list.length >= 2 && list.every(function (s) {
      return s && typeof s.lat === 'number' && typeof s.lon === 'number' && typeof s.name === 'string';
    });
  }

  // Every saved trip, oldest first. null when storage is blocked.
  function readTrips() {
    var raw;
    try { raw = localStorage.getItem(TRIPS_KEY); } catch (e) { return null; }
    var list;
    try { list = JSON.parse(raw); } catch (e) { list = null; } // unreadable: start a fresh list
    if (!Array.isArray(list)) return [];
    return list.filter(function (t) { return t && t.id != null && validStops(t.stops); })
      .sort(function (a, b) { return String(a.savedAt).localeCompare(String(b.savedAt)); });
  }

  // Moves the old single saved trip into the list, once
  function moveOldTrip() {
    try {
      var old = JSON.parse(localStorage.getItem(OLD_KEY));
      if (old && validStops(old.stops)) {
        var list = readTrips() || [];
        list.push({ id: Date.now(), savedAt: new Date().toISOString(), leave: old.leave || '', stops: old.stops, legs: { count: old.stops.length - 1, miles: null } });
        localStorage.setItem(TRIPS_KEY, JSON.stringify(list));
      }
      localStorage.removeItem(OLD_KEY);
    } catch (e) { /* storage blocked or the old trip is unreadable: nothing to move */ }
  }

  // Saves the trip on Screen 2 into its own entry
  function save() {
    if (stops.length < 2) return; // nothing to save yet, and never overwrite a trip still being restored
    var list = readTrips();
    if (!list) return;            // storage blocked: the trip just isn't saved
    var entry = {
      id: currentId,
      savedAt: new Date().toISOString(),
      leave: leaveInput.value,
      stops: stops.map(function (s) {
        return { name: s.name, region: s.region, label: s.label, lat: s.lat, lon: s.lon, type: s.type, minutes: s.minutes, leaveOn: s.leaveOn };
      }),
      legs: { count: legs.length, miles: Math.round(total.distance / 1609.34) }
    };
    var i = list.findIndex(function (t) { return t.id === currentId; });
    if (i > -1) {
      var old = list[i];
      var same = JSON.stringify([old.leave, old.stops]) === JSON.stringify([entry.leave, entry.stops]);
      if (same && JSON.stringify(old.legs) === JSON.stringify(entry.legs)) return; // just opening a trip changes nothing
      if (same) entry.savedAt = old.savedAt; // only the legs summary was filled in
      list[i] = entry;
    } else {
      currentId = entry.id = Date.now();
      list.push(entry);
    }
    try { localStorage.setItem(TRIPS_KEY, JSON.stringify(list)); } catch (e) { /* storage full or blocked */ }
  }

  // Clears Screen 2 for a new trip. The trip that was there stays in the archive.
  function newTrip() {
    currentId = null;
    stops = [];
    legs = [];
    total = { distance: 0, duration: 0 };
    openLeg = -1;
    routeEl.replaceChildren();
    routeLink.hidden = true;
    start.set(null);
    dest.set(null);
    leaveInput.value = '';
  }

  document.getElementById('newTrip').addEventListener('click', newTrip);

  document.getElementById('tripForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!start.picked) start.invalid('Add a start first');
    if (!dest.picked) dest.invalid('Add a destination first');
    if (!start.picked || !dest.picked) return;
    // Keep any stops already added between start and destination
    fetchRoute([start.picked].concat(stops.slice(1, -1), [dest.picked]));
  });

  // ---------- Trip archive (the glovebox tray) ----------

  var tray = document.getElementById('tray');
  var shelf = document.getElementById('shelf');
  var trayNote = document.getElementById('trayNote');
  var shelfTrips = [];   // the trips on the shelf, oldest first
  var pickedCard = 0;    // index of the picked card; shelfTrips.length is + NEW TRIP

  // A small pixel route drawing, the same for a trip every time (seeded from its id)
  function routeArt(c, seed) {
    var C = window.pixelCab.colors, x2 = c.getContext('2d'), s = Math.abs(Math.floor(seed)) % 233280;
    function rnd() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    x2.fillStyle = C.mapArt; x2.fillRect(0, 0, 48, 28);
    var shift = rnd() * 6, i, x, y = 22, pts = [];
    x2.fillStyle = C.blue;
    for (i = 0; i < 48; i++) x2.fillRect(i, Math.round(6 + Math.sin(i / 5 + shift) * 2), 1, 1);
    x2.fillStyle = C.near;
    for (i = 0; i < 6; i++) { var mx = Math.floor(rnd() * 44); x2.fillRect(mx, 20, 3, 1); x2.fillRect(mx + 1, 19, 1, 1); }
    x2.fillStyle = C.red;
    for (x = 3; x < 46; x++) {
      y = Math.max(4, Math.min(24, y + Math.round((rnd() - .5) * 3)));
      if (x % 2) x2.fillRect(x, y, 1, 1);
      if (x % 14 === 3) pts.push([x, y]);
    }
    x2.fillStyle = C.ink;
    pts.forEach(function (p) { x2.fillRect(p[0] - 1, p[1] - 1, 3, 3); });
  }

  function tripCard(t, latest) {
    var b = el('button', 'map-card');
    b.type = 'button';
    var c = el('canvas');
    c.width = 48;
    c.height = 28;
    routeArt(c, t.id);
    b.appendChild(c);
    b.appendChild(el('span', 't', t.stops[0].name + ' → ' + t.stops[t.stops.length - 1].name));
    var meta = t.stops.length + ' stops';
    if (t.legs && typeof t.legs.miles === 'number') meta += ' · ' + t.legs.miles.toLocaleString('en-US') + ' mi';
    b.appendChild(el('span', 'm', meta));
    b.appendChild(el('span', 'm', new Date(t.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })));
    if (latest) b.appendChild(el('span', 'badge', 'LATEST'));
    return b;
  }

  function pick(k) {
    pickedCard = k;
    shelf.querySelectorAll('.map-card').forEach(function (b, j) { b.setAttribute('aria-pressed', String(j === k)); });
  }

  function openTray() {
    var list = readTrips();
    shelfTrips = list || [];
    shelf.replaceChildren();
    shelfTrips.forEach(function (t, k) { shelf.appendChild(tripCard(t, k === shelfTrips.length - 1)); });
    var nb = el('button', 'map-card new');
    nb.type = 'button';
    nb.appendChild(el('b', null, '+'));
    nb.appendChild(el('span', null, 'NEW TRIP'));
    shelf.appendChild(nb);
    shelf.querySelectorAll('.map-card').forEach(function (b, k) {
      b.style.animationDelay = (k * 0.08) + 's'; // the cards slide in one after another
      b.addEventListener('click', function () { pick(k); unfold(); }); // clicking a map opens it
    });
    trayNote.textContent = !list ? 'Trips can’t be saved in this browser.'
      : !list.length ? 'No saved trips yet. Start one.'
      : 'Oldest on the left, newest on the right. Pick a map, or start a new one.';
    tray.hidden = false;
    pick(Math.max(0, shelfTrips.length - 1)); // the newest trip, or + NEW TRIP when there are none
    shelf.scrollLeft = shelf.scrollWidth;
    shelf.children[pickedCard].focus({ preventScroll: true });
  }

  function closeTray() {
    tray.hidden = true;
    window.pixelCab.closeBox();
  }

  window.pixelCab.onOpen = openTray;

  document.getElementById('closeTray').addEventListener('click', function () { closeTray(); cabCanvas.focus(); });

  tray.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeTray(); cabCanvas.focus(); return; }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var cards = shelf.querySelectorAll('.map-card');
    var k = Array.prototype.indexOf.call(cards, document.activeElement);
    if (k < 0) return;
    e.preventDefault();
    k = Math.max(0, Math.min(cards.length - 1, k + (e.key === 'ArrowRight' ? 1 : -1)));
    cards[k].focus();
    pick(k);
  });

  // Unfold map: the picked trip on Screen 2, routed again, or an empty form for + NEW TRIP
  function unfold() {
    var t = shelfTrips[pickedCard];
    closeTray();
    newTrip();
    openMap();
    if (!t) return;
    currentId = t.id;
    leaveInput.value = t.leave || '';
    start.set(t.stops[0]);
    dest.set(t.stops[t.stops.length - 1]);
    fetchRoute(t.stops);
  }

  document.getElementById('unfold').addEventListener('click', unfold);

  moveOldTrip();
})();
