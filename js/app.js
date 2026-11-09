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

  // Wires one form field (Start or Destination) to the town search.
  function townField(id, missingMsg) {
    var input = document.getElementById(id);
    var list = document.getElementById(id + 'Results');
    var err = document.getElementById(id + 'Err');
    var field = { picked: null, input: input };
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
          field.picked = { name: townLabel(r), lat: r.latitude, lon: r.longitude };
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

    field.invalid = function () {
      input.setAttribute('aria-invalid', 'true');
      showErr(missingMsg);
    };
    return field;
  }

  var start = townField('from', 'Add a start first');
  var dest = townField('to', 'Add a destination first');

  document.getElementById('tripForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!start.picked) start.invalid();
    if (!dest.picked) dest.invalid();
    if (!start.picked || !dest.picked) return;
    // Piece 2: no route request yet, just show what was picked
    console.log('Start:', start.picked);
    console.log('Destination:', dest.picked);
  });
})();
