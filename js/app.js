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
          field.picked = { name: r.name, label: townLabel(r), lat: r.latitude, lon: r.longitude };
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

    var row = el('div', 'addrow');
    var ok = el('button', 'btn-solid', 'Add stop');
    ok.type = 'button';
    ok.addEventListener('click', function () {
      if (!town.picked) { town.invalid('Pick a town from the list first.'); return; }
      var next = stops.slice();
      next.splice(i + 1, 0, town.picked);
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

  function render() {
    routeEl.replaceChildren();

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
      card.appendChild(el('h3', null, s.name));
      if (i > 0 && i < stops.length - 1) {
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
  }

  document.getElementById('tripForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!start.picked) start.invalid('Add a start first');
    if (!dest.picked) dest.invalid('Add a destination first');
    if (!start.picked || !dest.picked) return;
    // Keep any stops already added between start and destination
    fetchRoute([start.picked].concat(stops.slice(1, -1), [dest.picked]));
  });
})();
