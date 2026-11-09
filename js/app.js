(function () {
  'use strict';

  var cab = document.getElementById('cab');
  var sheet = document.getElementById('sheet');
  var mapBtn = document.getElementById('openMap');

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
    mapBtn.focus();
  }

  mapBtn.addEventListener('click', openMap);
  mapBtn.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMap(); }
  });
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
          list.querySelectorAll('.pick').forEach(function (p) { p.setAttribute('aria-pressed', String(p === b)); });
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
    panel('loading', 'Plotting your route…', 'Finding each stop and timing every leg.');
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

  // The note card that opens in leg i's gap
  function addCard(i) {
    var box = el('div', 'addcard');
    box.appendChild(el('h4', null, 'Add a stop between ' + stops[i].name + ' and ' + stops[i + 1].name));
    var lab = el('label', null, 'Town or place');
    lab.htmlFor = 'addq';
    box.appendChild(lab);
    var input = el('input');
    input.id = 'addq';
    input.autocomplete = 'off';
    input.placeholder = 'Try Concord or Woodstock';
    box.appendChild(input);
    var list = el('div', 'results');
    list.setAttribute('aria-live', 'polite');
    box.appendChild(list);
    var err = el('p', 'err');
    err.hidden = true;
    box.appendChild(err);

    var town = townSearch(input, list, err);

    var choice = { type: 'stay' };
    box.appendChild(typePills(choice, function () {}));

    var row = el('div', 'addrow');
    var ok = el('button', 'btn-solid', 'Add stop');
    ok.type = 'button';
    ok.addEventListener('click', function () {
      if (!town.picked) { town.invalid('Pick a town from the list first.'); return; }
      var next = stops.slice();
      next.splice(i + 1, 0, Object.assign({}, town.picked, { type: choice.type, minutes: null, leaveOn: null }));
      fetchRoute(next);
    });
    var no = el('button', 'btn-ghost', 'Cancel');
    no.type = 'button';
    no.addEventListener('click', function () { openLeg = -1; render(); });
    row.appendChild(ok);
    row.appendChild(no);
    box.appendChild(row);
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
        var a = el('a', null, 'Open this leg in Google Maps ↗');
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

  // ---------- Saving the trip (localStorage) ----------

  var SAVE_KEY = 'roadTrip';

  function save() {
    if (stops.length < 2) return; // nothing to save yet, and never overwrite a trip still being restored
    var trip = {
      leave: leaveInput.value,
      stops: stops.map(function (s) {
        return { name: s.name, region: s.region, label: s.label, lat: s.lat, lon: s.lon, type: s.type, minutes: s.minutes, leaveOn: s.leaveOn };
      })
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(trip)); } catch (e) { /* storage blocked: the trip just isn't saved */ }
  }

  function load() {
    try {
      var trip = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!trip || !Array.isArray(trip.stops) || trip.stops.length < 2) return null;
      var ok = trip.stops.every(function (s) { return typeof s.lat === 'number' && typeof s.lon === 'number' && typeof s.name === 'string'; });
      return ok ? trip : null;
    } catch (e) {
      return null;
    }
  }

  function newTrip() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* nothing saved to clear */ }
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

  // On page load, bring back a saved trip and route it again
  var saved = load();
  if (saved) {
    leaveInput.value = saved.leave || '';
    start.set(saved.stops[0]);
    dest.set(saved.stops[saved.stops.length - 1]);
    fetchRoute(saved.stops);
  }
})();
