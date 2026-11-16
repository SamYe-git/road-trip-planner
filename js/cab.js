// Screen 1: the pixel cab. Pure decoration, except the glovebox, which hands over to the
// Trip archive in app.js through window.pixelCab.onOpen.
(function () {
  'use strict';

  var cv = document.getElementById('cabCanvas');
  var g = cv.getContext('2d');
  var W = 320, H = 180;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Canvas palette (DESIGN.md, Pixel cab)
  var C = {
    ink: '#2a2826', dark: '#1d1b1a',
    sky1: '#a9d7e6', sky2: '#c9e6ee', sky3: '#e6f1ee', sun: '#f3d27a',
    far: '#7d9a8c', near: '#4c5a3a', nearDark: '#3f4c30', trunk: '#5a4630',
    snow: '#f4f2ec', white: '#f4f2ec', paper: '#f4f2ec',
    grass: '#8a9a5b', grass2: '#7a8a4d', road: '#55504b', line: '#d49b1a', gold: '#d49b1a', edge: '#e9e5da',
    tan: '#b0946a', tan2: '#9c8059', tan3: '#c4a97f', velour: '#a88b62',
    red: '#c7361f', blue: '#4f7891', lcd: '#9fd0c0', box: '#3b2f24', mirror: '#8fb4c2',
    slot: '#0b0a09', knob: '#7a736b', knobLight: '#b5aea5', muted: '#8a8580', vent: '#555555',
    mapArt: '#ebe6d9', crease: '#c8bfa9', mapTan: '#e9dcc0', mapGold: '#ead7a8'
  };

  // ---------- 3x5 pixel font: 15 characters per glyph, read row by row ----------
  var F = {
    'A':'.#.#.#####.##.#', 'B':'##.#.###.#.###.', 'C':'.###..#..#...##', 'D':'##.#.##.##.###.', 'E':'####..##.#..###',
    'F':'####..##.#..#..', 'G':'.###..#.##.#.##', 'H':'#.##.#####.##.#', 'I':'###.#..#..#.###', 'J':'..#..#..##.#.#.',
    'K':'#.##.###.#.##.#', 'L':'#..#..#..#..###', 'M':'#.########.##.#', 'N':'##.#.##.##.##.#', 'O':'.#.#.##.##.#.#.',
    'P':'##.#.###.#..#..', 'Q':'.#.#.##.###..##', 'R':'##.#.###.#.##.#', 'S':'.###...#...###.', 'T':'###.#..#..#..#.',
    'U':'#.##.##.##.####', 'V':'#.##.##.##.#.#.', 'W':'#.##.########.#', 'X':'#.##.#.#.#.##.#', 'Y':'#.##.#.#..#..#.',
    'Z':'###..#.#.#..###', '0':'####.##.##.####', '1':'.#.##..#..#.###', '2':'##...#.#.#..###', '3':'##...#.#...###.',
    '4':'#.##.####..#..#', '5':'####..##...###.', '6':'.###..####.####', '7':'###..#.#..#..#.', '8':'####.#####.####',
    '9':'####.####..###.', '.':'.............#.', '-':'......###......', ':':'....#.....#....', '+':'....#.###.#....',
    '/':'..#..#.#.#..#..', ' ':'...............'
  };

  function text(s, x, y, col) {
    g.fillStyle = col;
    for (var i = 0; i < s.length; i++) {
      var gl = F[s[i]] || F[' '];
      for (var p = 0; p < 15; p++) if (gl[p] === '#') g.fillRect(x + i * 4 + (p % 3), y + Math.floor(p / 3), 1, 1);
    }
  }
  function px(x, y, w, h, col) { g.fillStyle = col; g.fillRect(x | 0, y | 0, w | 0, h | 0); }

  // ---------- Scenery ----------

  // A fixed random ridge line, 320 wide, ends blended so it could repeat
  function ridge(seed, base, amp, rough) {
    var a = [], h = base, s = seed;
    function rnd() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    for (var i = 0; i < 320; i++) {
      h += (rnd() - .5) * rough;
      h += (base - h) * .02;
      a.push(Math.max(base - amp, Math.min(base + amp, h)));
    }
    for (var j = 0; j < 20; j++) { var k = 300 + j; a[k] = a[k] + (a[j] - a[k]) * (j / 20); }
    return a;
  }
  var farR = ridge(7, 38, 14, 3.2), nearR = ridge(41, 50, 9, 2.4);

  // Roadside trees and posts, d = distance down the road
  var PROPS = [];
  for (var pi = 0; pi < 24; pi++) PROPS.push({ d: 2 + pi * 2.5, side: pi % 2 ? 1 : -1, kind: pi % 3 === 0 ? 'post' : 'tree', off: (pi * 7) % 10 });

  // ---------- State ----------

  var GEARS = ['P', 'R', 'N', 'D'];
  var GATE = { x: 152, y: 135, w: 26, h: 42 };   // P at the front (top), D nearest the driver
  var WHEEL = { x: 78, y: 164, r: 34 };
  var BOX = { x: 214, y: 99, w: 80, h: 27 };
  function gearY(gr) { return GATE.y + 6 + GEARS.indexOf(gr) * 10; }

  var S = {
    gear: 'P', speed: 0, phase: 0, odo: 21400,
    wheel: 0, wheelTarget: 0, dragging: false, keyTurn: 0,
    knobY: gearY('P'), box: 0, boxOpen: false, hoverBox: false
  };

  // ---------- Drawing ----------

  function drawWindshield() {
    var top = 6, bot = 92, horizon = 62, x, y;
    g.save();
    g.beginPath(); g.rect(14, top, 292, bot - top); g.clip();
    px(0, top, W, 18, C.sky1); px(0, top + 18, W, 14, C.sky2); px(0, top + 32, W, 40, C.sky3);
    for (y = -5; y <= 5; y++) for (x = -5; x <= 5; x++) if (x * x + y * y <= 26) px(250 + x, 22 + y, 1, 1, C.sun);
    // Mountains are far away, so they stay put while driving
    for (x = 0; x < W; x++) {
      var hf = Math.floor(farR[x]);
      px(x, hf, 1, horizon - hf, C.far);
      if (hf < 32) px(x, hf, 1, 2, C.snow);
      var hn = Math.floor(nearR[x]);
      if (hn < horizon) px(x, hn, 1, horizon - hn, C.near);
    }
    // Grass bands and road dashes rush toward the viewer
    for (y = horizon; y < bot; y++) {
      var t = (y - horizon) / (bot - horizon), z = 1 / (t + .06);
      px(0, y, W, 1, (Math.floor(z * .7 - S.phase * .12) % 2 === 0) ? C.grass2 : C.grass);
      var hw = 1 + t * 70, cx = 160;
      px(cx - hw, y, hw * 2, 1, C.road);
      px(cx - hw, y, 1, 1, C.edge); px(cx + hw - 1, y, 1, 1, C.edge);
      if (Math.floor(z * 1.4 - S.phase * .25) % 2 === 0) px(cx - Math.max(1, t * 2), y, Math.max(1, t * 4), 1, C.line);
    }
    // Trees and posts grow and slide out to both sides, far ones first
    PROPS.slice().sort(function (p, q) { return q.d - p.d; }).forEach(function (o) {
      var t = 2 / o.d; if (t > 1.6) return;
      var yb = horizon + t * (bot - horizon), hw = 1 + t * 70;
      var xb = 160 + o.side * (hw + 4 + t * (o.kind === 'post' ? 4 : 14 + o.off));
      var s = t * 26;
      if (o.kind === 'tree') {
        px(xb - Math.max(1, s * .06), yb - s * .25, Math.max(1, s * .12), s * .25, C.trunk);
        for (var r = 0; r < s * .85; r++) {
          var w = (r / (s * .85)) * s * .45 + 1;
          px(xb - w / 2, yb - s + r, w, 1, (r % 4 === 0) ? C.nearDark : C.near);
        }
      } else {
        px(xb - Math.max(1, s * .03), yb - s * .5, Math.max(1, s * .06), s * .5, C.edge);
        px(xb - Math.max(1, s * .03), yb - s * .5, Math.max(1, s * .06), Math.max(1, s * .08), C.red);
      }
    });
    g.restore();
    // Frame, A-pillars and mirror
    px(12, 4, 296, 2, C.ink);
    for (y = 4; y < 94; y++) { var k = Math.floor((94 - y) / 8); px(4 + k, y, 10, 1, C.ink); px(306 - k, y, 10, 1, C.ink); }
    px(146, 6, 28, 7, C.ink); px(148, 7, 24, 4, C.mirror); px(159, 4, 2, 3, C.ink);
  }

  function gauge(cx, cy, r, ang, label) {
    for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++) {
      var d = Math.sqrt(x * x + y * y);
      if (d <= r && d > r - 1.2) px(cx + x, cy + y, 1, 1, C.white);
    }
    var a = Math.max(-2.4, Math.min(.8, ang));
    for (var s = 0; s < r - 2; s += .5) px(cx + Math.cos(a) * s, cy + Math.sin(a) * s, 1, 1, C.red);
    px(cx, cy, 1, 1, C.white);
    if (label) text(label, cx - 1, cy + 2, C.muted);
  }

  function drawDash() {
    var top = 92, x, y, i;
    for (y = top; y < 132; y++) for (x = 0; x < W; x++) {
      var c = ((x + y) % 7 === 0) ? C.tan2 : C.tan;
      if (y < top + 2) c = C.ink; else if (y < top + 4) c = C.tan3;
      if (y > 129) c = C.ink;
      px(x, y, 1, 1, c);
    }
    // Instrument cluster: fuel, speed, temperature, odometer
    px(28, 97, 98, 30, C.ink); px(30, 99, 94, 26, C.dark);
    gauge(46, 110, 9, -.8, 'F');
    gauge(77, 110, 11, -2.4 + Math.abs(S.speed) * 3.2, '');
    gauge(108, 110, 9, -1.3, 'T');
    px(63, 119, 29, 7, C.slot);
    text(String(Math.floor(S.odo)).padStart(6, '0'), 65, 120, C.gold);
    // Vents and radio
    px(136, 97, 22, 9, C.ink); px(162, 97, 22, 9, C.ink);
    for (i = 0; i < 3; i++) { px(138, 99 + i * 2, 18, 1, C.vent); px(164, 99 + i * 2, 18, 1, C.vent); }
    px(136, 109, 48, 16, C.ink); px(140, 112, 32, 9, C.blue);
    text({ P: 'FM 98.5', R: 'REVERSE', N: 'NEUTRAL', D: 'DRIVING' }[S.gear], 142, 114, C.lcd);
    px(175, 113, 6, 6, C.knob); px(176, 114, 4, 4, C.knobLight);
    // Glovebox: interior with folded maps, door hinged at the bottom
    var b = BOX;
    px(b.x - 2, b.y - 2, b.w + 4, b.h + 4, S.hoverBox && !S.boxOpen ? C.gold : C.ink);
    px(b.x, b.y, b.w, b.h, C.box);
    var maps = [C.paper, C.mapTan, C.paper, C.mapGold];
    for (i = 0; i < 4; i++) {
      px(b.x + 6 + i * 17, b.y + 10, 14, 15, maps[i]);
      px(b.x + 6 + i * 17, b.y + 17, 14, 1, C.crease);
      px(b.x + 12 + i * 17, b.y + 10, 1, 15, C.crease);
    }
    var dh = Math.round(b.h * (1 - S.box));
    if (dh > 0) {
      for (y = 0; y < dh; y++) px(b.x, b.y + b.h - dh + y, b.w, 1, ((y + b.x) % 5 === 0) ? C.tan2 : C.tan3);
      px(b.x, b.y + b.h - dh, b.w, 1, C.ink);
      if (dh > 8) {
        var hy = b.y + b.h - dh + Math.floor(dh / 2);
        px(b.x + b.w - 14, hy - 2, 9, 4, C.ink); px(b.x + b.w - 13, hy - 1, 7, 2, C.knob);
      }
    }
    if (S.box > 0) {
      var slab = Math.round(8 * S.box);
      px(b.x - 2, b.y + b.h + 2, b.w + 4, slab, C.ink);
      px(b.x, b.y + b.h + 2, b.w, Math.max(0, slab - 2), C.tan2);
    }
    if (S.box === 0) text('GLOVEBOX', b.x + 24, b.y + 11, C.ink);
    px(298, 98, 18, 12, C.ink);
  }

  function drawConsole() {
    for (var y = 132; y < H; y++) {
      var t = (y - 132) / (H - 132), l = 132 - t * 12, r = 196 + t * 12;
      px(l, y, r - l, 1, (y % 6 === 0) ? C.tan2 : C.tan);
      px(l, y, 1, 1, C.ink); px(r - 1, y, 1, 1, C.ink);
    }
    // Gate plate with a front-to-back slot, then the knob riding in it
    px(GATE.x - 2, GATE.y - 2, GATE.w + 4, GATE.h + 4, C.ink); px(GATE.x, GATE.y, GATE.w, GATE.h, C.dark);
    px(GATE.x + 8, GATE.y + 4, 3, GATE.h - 8, C.slot);
    GEARS.forEach(function (gr) { text(gr, GATE.x + 16, gearY(gr) - 2, gr === S.gear ? C.gold : C.muted); });
    var ky = Math.round(S.knobY), kx = GATE.x + 9;
    px(kx - 1, ky, 3, 5, C.ink);
    for (var y2 = -5; y2 <= 5; y2++) for (var x2 = -5; x2 <= 5; x2++) {
      var d = x2 * x2 + y2 * y2;
      if (d <= 25) px(kx + x2, ky - 2 + y2, 1, 1, d > 16 ? C.slot : (x2 + y2 < -3 ? C.knobLight : C.knob));
    }
  }

  function drawSeat() {
    var y;
    for (y = 140; y < H; y++) {
      var l = 222 - (y - 140) * .3, r = 304 + (y - 140) * .3;
      px(l, y, r - l, 1, (y % 4 === 0) ? C.tan2 : C.velour);
    }
    px(221, 139, 84, 2, C.ink);
    for (y = 141; y < H; y++) { px(248, y, 1, 1, C.tan2); px(278, y, 1, 1, C.tan2); }
    for (y = 150; y < H; y++) px(0, y, 22 - (y - 150) * .2, 1, C.tan);   // door card
  }

  function drawWheel() {
    var w = WHEEL, rad = S.wheel * Math.PI / 180;
    var spokes = [Math.PI, 0, Math.PI / 2].map(function (a) { return a + rad; });
    for (var y = -w.r; y <= w.r; y++) {
      if (w.y + y >= H) continue;
      for (var x = -w.r; x <= w.r; x++) {
        var d = Math.sqrt(x * x + y * y), col = null;
        if (d <= w.r && d >= w.r - 5) col = (d > w.r - 1.2 || d < w.r - 4) ? C.slot : C.dark;
        else if (d < w.r - 5) {
          if (d < 9) col = d > 8 ? C.ink : C.tan;
          else for (var i = 0; i < 3; i++) {
            var ang = Math.atan2(y, x), diff = Math.abs(Math.atan2(Math.sin(ang - spokes[i]), Math.cos(ang - spokes[i])));
            if (diff * d < 2.4) { col = C.dark; break; }
          }
        }
        if (col) px(w.x + x, w.y + y, 1, 1, col);
      }
    }
    // Red marker at 12 o'clock so the turn reads clearly
    var m = rad - Math.PI / 2;
    for (var k = 0; k < 4; k++) px(w.x + Math.cos(m) * (w.r - 2.5) - 1 + (k % 2), w.y + Math.sin(m) * (w.r - 2.5) - 1 + (k >> 1), 1, 1, C.red);
    text('4X4', w.x - 5, w.y - 2, C.ink);
  }

  function frame() {
    requestAnimationFrame(frame);
    if (!cv.offsetParent) return; // Screen 2 is showing: nothing to draw

    // Speed eases toward the gear's target: D forward, R backward and slower, P and N stop
    var target = { P: 0, N: 0, D: 1, R: -.35 }[S.gear];
    S.speed += (target - S.speed) * .03;
    if (Math.abs(S.speed) < .002) S.speed = 0;
    S.odo += Math.abs(S.speed) * .03;
    if (!reduce) {   // with reduced motion, nothing scrolls past the windshield
      S.phase += S.speed * 2.2;
      PROPS.forEach(function (o) {
        o.d -= S.speed * .12;
        if (o.d < 1.2) { o.d += 60; o.off = Math.floor(Math.random() * 10); }
        if (o.d > 61.2) o.d -= 60;
      });
    }
    // The wheel springs back to center once let go
    if (!S.dragging) S.wheelTarget = S.keyTurn ? S.wheelTarget + S.keyTurn * 4 : S.wheelTarget * .88;
    S.wheelTarget = Math.max(-120, Math.min(120, S.wheelTarget));
    S.wheel += (S.wheelTarget - S.wheel) * .35;
    S.knobY += (gearY(S.gear) - S.knobY) * (reduce ? 1 : .3);
    var bt = S.boxOpen ? 1 : 0;
    S.box += (bt - S.box) * (reduce ? 1 : .18);
    if (Math.abs(bt - S.box) < .01) S.box = bt;

    px(0, 0, W, H, C.paper);
    drawWindshield(); drawDash(); drawConsole(); drawSeat(); drawWheel();
  }

  // ---------- Input ----------

  var gearBtns = document.querySelectorAll('.gear');
  function setGear(gr) {
    S.gear = gr;
    gearBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.g === gr)); });
  }
  function gearAt(y) { return GEARS[Math.max(0, Math.min(3, Math.round((y - GATE.y - 6) / 10)))]; }
  gearBtns.forEach(function (b) { b.addEventListener('click', function () { setGear(b.dataset.g); }); });

  // The door drops open, then app.js shows the Trip archive
  function openBox() {
    if (S.boxOpen) return;
    S.boxOpen = true;
    setTimeout(function () { window.pixelCab.onOpen(); }, reduce ? 0 : 350);
  }

  function toCanvas(e) {
    var r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }
  function inWheel(p) { var dx = p.x - WHEEL.x, dy = p.y - WHEEL.y; return dx * dx + dy * dy <= WHEEL.r * WHEEL.r; }
  function inBox(p) { return p.x >= BOX.x && p.x <= BOX.x + BOX.w && p.y >= BOX.y && p.y <= BOX.y + BOX.h; }
  function inGate(p) { return p.x >= GATE.x - 2 && p.x <= GATE.x + GATE.w + 2 && p.y >= GATE.y - 2 && p.y <= GATE.y + GATE.h + 2; }

  var drag = null, shiftDrag = false;
  cv.addEventListener('pointerdown', function (e) {
    var p = toCanvas(e);
    if (inWheel(p)) { S.dragging = true; drag = { x: p.x, start: S.wheelTarget }; cv.setPointerCapture(e.pointerId); return; }
    if (inBox(p)) { openBox(); return; }
    if (inGate(p)) { shiftDrag = true; cv.setPointerCapture(e.pointerId); setGear(gearAt(p.y)); }
  });
  cv.addEventListener('pointermove', function (e) {
    var p = toCanvas(e);
    if (drag) { S.wheelTarget = drag.start + (p.x - drag.x) * 3; return; }
    if (shiftDrag) { setGear(gearAt(p.y)); return; }
    S.hoverBox = inBox(p);
    cv.style.cursor = inWheel(p) ? 'grab' : (inBox(p) || inGate(p)) ? 'pointer' : 'default';
  });
  function endDrag() { S.dragging = false; drag = null; shiftDrag = false; }
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('pointerleave', function () { S.hoverBox = false; });

  cv.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      setGear(GEARS[Math.max(0, Math.min(3, GEARS.indexOf(S.gear) + (e.key === 'ArrowDown' ? 1 : -1)))]);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      S.keyTurn = e.key === 'ArrowLeft' ? -1 : 1;
    } else if (e.key === 'Enter' || e.key === 'g' || e.key === 'G') {
      e.preventDefault();
      openBox();
    }
  });
  cv.addEventListener('keyup', function (e) { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') S.keyTurn = 0; });
  cv.addEventListener('blur', function () { S.keyTurn = 0; });
  document.getElementById('openBox').addEventListener('click', openBox);

  // What app.js uses: onOpen (set by app.js), closeBox, and the palette for the map-card drawings
  window.pixelCab = {
    onOpen: function () {},
    closeBox: function () { S.boxOpen = false; },
    colors: C
  };

  requestAnimationFrame(frame);
})();
