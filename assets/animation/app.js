(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const svg = document.querySelector("#diagram");
  // Status text preserves each Figure 2 context hue and saturation at lower lightness.
  const C = {
    blue: "#b7dee8",
    purple: "#b4a2c7",
    orange: "#fac090",
    blueInk: "hsl(192.245 51.579% 34%)",
    purpleInk: "hsl(269.189 24.832% 34%)",
    orangeInk: "hsl(27.170 91.379% 34%)",
    tile: "#f2f2f1",
    gray: "#a6a6a6",
    ink: "#000000",
    white: "#ffffff",
  };
  // Each query has an explicit input, attention, compute, and output interval.
  const schedule = {
    initialization: { feature: 1, context: 1.8, filled: 2.5, output: 3.5, end: 4.3 },
    tracking: [5, 7.2, 14.1, 16.3, 18.5].map(feature => ({
      feature,
      context: feature + .55,
      filled: feature + 1,
      output: feature + 1.45,
      end: feature + 1.95,
    })),
    loop: { feature: 9.6, context: 10.5, filled: 11.15, output: 12.4, end: 13.6 },
    dense: [
      { feature: 20.9, context: 21.4, filled: 21.9, output: 22.6, end: 22.9 },
      { feature: 23.1, context: 23.6, filled: 24.1, output: 24.8, end: 25.1 },
    ],
    final: 25.4,
    end: 26.8,
  };
  const queries = [schedule.initialization, schedule.initialization, schedule.initialization, ...schedule.tracking];
  const route = [
    [805, 170], [895, 115], [1015, 160], [994, 278],
    [816, 201], [760, 267], [815, 342], [934, 356],
  ];
  const pair = [0, 4];
  const segments = [[0, 1, 2, 3, 4], [3, 4, 5, 6, 7]];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state = {
    time: 0,
    overview: true,
    playing: false,
    tick: 0,
    selected: null,
    hover: null,
    seek: null,
  };
  const cache = [];
  const poses = [];

  function ramp(x, a, b) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  const mix = (a, b, t) => a + (b - a) * t;
  const fx = i => 126 + i * 70;

  function attr(node, values) {
    node._attrs ??= {};
    for (const [key, value] of Object.entries(values)) {
      const next = typeof value === "number"
        ? String(Math.round(value * 1000) / 1000)
        : String(value);
      if (node._attrs[key] !== next) {
        node.setAttribute(key, next);
        node._attrs[key] = next;
      }
    }
  }

  function make(tag, values = {}, parent = svg, content) {
    const node = document.createElementNS(NS, tag);
    attr(node, values);
    if (content !== undefined) node.textContent = content;
    parent.appendChild(node);
    return node;
  }

  function text(x, y, value, size = 20, parent = svg, extra = {}) {
    return make("text", { x, y, "font-size": size, fill: C.ink, ...extra }, parent, value);
  }

  function rect(x, y, width, height, fill, parent = svg, extra = {}) {
    return make("rect", { x, y, width, height, rx: 5, fill, ...extra }, parent);
  }

  function path(stroke, width = 2, parent = svg, extra = {}) {
    return make("path", {
      fill: "none",
      stroke,
      "stroke-width": width,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      ...extra,
    }, parent);
  }

  text(12, 55, "Cached", 24, svg, { "font-weight": "bold" });
  text(12, 82, "Frame", 24, svg, { "font-weight": "bold" });
  text(12, 109, "Features", 24, svg, { "font-weight": "bold" });
  const loopFeatureLine = path(C.orange, 2.5, svg, { "data-kind": "loop-feature-link" });
  attr(loopFeatureLine, { d: `M${fx(pair[0]) + 27} 43 V24 H${fx(pair[1]) + 27} V43`, opacity: 0 });
  const segmentBars = segments.map((ids, index) => {
    const line = path(C.purple, 3);
    attr(line, { d: `M${fx(ids[0]) - 2} ${110 + index * 7} H${fx(ids[4]) + 56}` });
    return line;
  });

  for (let i = 0; i < 8; i += 1) {
    const group = make("g", {
      role: "button", tabindex: 0, "data-frame": i, "aria-label": `Select frame ${i}`,
    });
    const tile = rect(fx(i), 45, 54, 58, C.tile, group, { rx: 10 });
    const label = text(fx(i) + 27, 88, String(i), 34, group, { "text-anchor": "middle" });
    const halo = rect(fx(i) - 4, 41, 62, 66, "none", group, {
      stroke: C.ink, "stroke-width": 1.4, opacity: 0, rx: 12,
    });
    rect(fx(i) - 6, 39, 66, 70, "transparent", group, { class: "hit" });
    cache.push({ group, tile, label, halo });
  }

  function matrix(kind, x, y, n, cell, color, label, target) {
    const group = make("g", {
      role: "button", tabindex: 0, "data-operation": kind, "aria-label": `Explore ${label}`,
    });
    const step = cell + 4;
    const width = n * step - 4;
    rect(x - 10, y - 10, width + 20, width + 20, color, group, { rx: 0 });
    const cells = [];
    for (let row = 0; row < n; row += 1) {
      for (let col = 0; col < n; col += 1) {
        const box = rect(x + col * step, y + row * step, cell, cell, "none", group, {
          stroke: C.white, "stroke-width": 1.1, rx: 4,
        });
        cells.push({ row, col, box });
      }
    }
    rect(x - 13, y - 13, width + 26, width + 26, "transparent", group, { class: "hit", rx: 0 });
    const center = x + width / 2;
    const contextLabel = text(center + 12, 171, kind === "tracking" ? "Live Context" : "Fresh Context", 19, group, {
      "text-anchor": "middle", "font-weight": "bold", "data-label": "context-title",
    });
    const titleWidth = contextLabel.getComputedTextLength();
    const dotX = center - titleWidth / 2 - 4;
    make("circle", { cx: dotX, cy: 165, r: 8, fill: "none", stroke: color, "stroke-width": 1.6 }, group);
    const activityDot = make("circle", { cx: dotX, cy: 165, r: 0, fill: color, "data-kind": "activity-dot" }, group);
    const targetLabel = text(center, 193, target, 14, group, {
      "text-anchor": "middle", "data-label": "target",
    });
    rect(center - 96, 150, 192, 49, "transparent", group, { class: "hit" });
    return { group, cells, targetLabel, activityDot };
  }

  const tracking = matrix("tracking", 43, 212, 8, 20, C.blue, "Front-end: Tracking", "latest frame");
  const dense = matrix("dense", 337, 250.5, 5, 19, C.purple, "Back-end: Dense Optimization", "overlapping segment");
  const loop = matrix("loop", 566, 277, 2, 27, C.orange, "Back-end: Loop-Pair Geometry", "loop candidate pair");

  text(786, 55, "Persistent trajectory", 24, svg, { "font-weight": "bold" });
  const operationStatus = make("g", {
    role: "group", "aria-label": "Current operation", "data-kind": "operation-status",
  });
  const statusLabels = {};
  for (const [kind, role, task, color] of [
    ["initialization", "Front-end", "Initialization", C.blueInk],
    ["tracking", "Front-end", "Tracking", C.blueInk],
    ["loop", "Back-end", "Loop-Pair Geometry", C.orangeInk],
    ["dense", "Back-end", "Dense Optimization", C.purpleInk],
  ]) {
    const group = make("g", { "data-phase": kind, opacity: 0, "aria-hidden": true }, operationStatus);
    const label = text(915, 432, "", 24, group, {
      "text-anchor": "middle", fill: color,
    });
    make("tspan", { "font-weight": "bold" }, label, `${role}: `);
    make("tspan", {}, label, task);
    statusLabels[kind] = group;
  }
  const trackTrace = path(C.blue, 2.7, svg, { "data-kind": "tracking-trajectory" });
  const purpleTrace = path(C.purple, 3, svg, { "data-kind": "batch-optimized-trajectory" });
  const loopConnection = path(C.orange, 1.8, svg, {
    "stroke-dasharray": "5 5", "data-kind": "loop-trajectory-link", opacity: 0,
  });
  const loopRings = pair.map(() => make("circle", {
    r: 24, fill: "none", stroke: C.orange, "stroke-width": 2, opacity: 0,
  }));
  const tip = make("circle", { r: 3.5, fill: C.blue });
  for (let i = 0; i < 8; i += 1) {
    const group = make("g", {
      role: "button", tabindex: 0, "data-frame": i, "aria-label": `Select trajectory frame ${i}`,
    });
    const tile = rect(-13, -13, 26, 26, C.white, group, {
      stroke: C.gray, "stroke-width": 1.3, rx: 4,
    });
    const label = text(0, 5, String(i), 17, group, { "text-anchor": "middle" });
    const halo = rect(-18, -18, 36, 36, "none", group, {
      stroke: C.ink, "stroke-width": 1.3, opacity: 0, rx: 6,
    });
    rect(-22, -22, 44, 44, "transparent", group, { class: "hit" });
    poses.push({ group, tile, label, halo });
  }

  function blend(first, second, t) {
    const rgb = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    const a = rgb(first);
    const b = rgb(second);
    return "#" + a.map((v, i) => (
      Math.round(mix(v, b[i], Math.max(0, Math.min(1, t)))).toString(16).padStart(2, "0")
    )).join("");
  }

  function curve(points, visible) {
    let d = `M${points[0][0]} ${points[0][1]}`;
    let head = points[0];
    for (let i = 0; i < points.length - 1; i += 1) {
      const fraction = Math.max(0, Math.min(1, visible - i));
      if (!fraction) break;
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      const c1 = p1.map((v, k) => v + (p2[k] - p0[k]) * .16);
      const c2 = p2.map((v, k) => v - (p3[k] - p1[k]) * .16);
      const at = (a, b) => a.map((v, k) => mix(v, b[k], fraction));
      const a = at(p1, c1);
      const b = at(c1, c2);
      const c = at(c2, p2);
      const e = at(a, b);
      const g = at(b, c);
      head = at(e, g);
      d += ` C${a[0]} ${a[1]} ${e[0]} ${e[1]} ${head[0]} ${head[1]}`;
    }
    return { d, head };
  }

  function envelope(t, query, fade = .35) {
    return ramp(t, query.feature, query.feature + fade) * (1 - ramp(t, query.end - fade, query.end));
  }

  function working(t, query) {
    return ramp(t, query.context, query.context + .25) * (1 - ramp(t, query.output, query.output + .25));
  }

  function freshContextFill(t, query) {
    // A fresh query discards its KV state immediately after inference returns.
    return ramp(t, query.context, query.filled)
      * (1 - ramp(t, query.output, query.output + .25));
  }

  function render() {
    const overview = state.overview;
    const t = overview ? schedule.end : state.time;
    const selected = state.selected ?? state.hover;
    const init = schedule.initialization;
    const loopQuery = schedule.loop;
    const segmentIndex = t < schedule.dense[1].feature ? 0 : 1;
    const denseQuery = schedule.dense[segmentIndex];
    const ids = segments[segmentIndex];
    const loopWeight = overview ? 0 : envelope(t, loopQuery);
    const denseWeight = overview ? 0 : envelope(t, denseQuery);
    const trackActivity = Math.max(...[init, ...schedule.tracking].map(query => working(t, query)));
    const activities = {
      tracking: trackActivity,
      loop: working(t, loopQuery),
      dense: working(t, denseQuery),
    };
    // The schematic pauses tracking for the loop query, then resumes with frame 5.
    const loopFocus = ramp(t, loopQuery.feature + .35, loopQuery.context) * (1 - ramp(t, loopQuery.end - .4, loopQuery.end + .4));
    const denseFocus = ramp(t, schedule.dense[0].feature, schedule.dense[0].context)
      * (1 - ramp(t, schedule.dense[1].end, schedule.final));
    const foreground = {
      tracking: ramp(t, .8, 1.5) * (1 - ramp(t, schedule.tracking.at(-1).end, schedule.dense[0].feature)) * (1 - loopFocus),
      loop: loopFocus,
      dense: denseFocus,
    };
    const foregroundStrength = Math.max(...Object.values(foreground));
    for (const [kind, context] of Object.entries({ tracking, dense, loop })) {
      const activity = overview ? 0 : activities[kind];
      const background = mix(.5, .35 + .2 * activity, foregroundStrength);
      const opacity = overview ? 1 : mix(background, 1, foreground[kind]);
      attr(context.group, {
        opacity,
        "data-active": activity > .1,
        "data-primary": !overview && foreground[kind] > .5,
      });
      attr(context.activityDot, { r: 6.4 * activity });
    }

    // A single status below the trajectory follows the sequential demonstration.
    const transition = .22;
    const resumedTracking = schedule.tracking[2].feature;
    const denseStart = schedule.dense[0].feature;
    const phaseOpacity = (start, end) => ramp(t, start, start + transition)
      * (1 - ramp(t, end, end + transition));
    const statusWeights = {
      initialization: phaseOpacity(init.feature, 4.6),
      tracking: Math.max(phaseOpacity(4.6, loopQuery.feature), phaseOpacity(resumedTracking, denseStart)),
      loop: phaseOpacity(loopQuery.feature, resumedTracking),
      dense: ramp(t, denseStart, denseStart + transition),
    };
    for (const [kind, group] of Object.entries(statusLabels)) {
      const opacity = overview ? 0 : statusWeights[kind];
      attr(group, { opacity, "aria-hidden": opacity < .05 });
    }

    tracking.targetLabel.textContent = t < 4.6 ? "prefix frames" : "latest frame";
    const prefixReady = t >= init.output ? 1 : 0;
    const loopReady = overview ? 1 : freshContextFill(t, loopQuery);
    const denseReady = overview ? 1 : freshContextFill(t, denseQuery);
    segmentBars.forEach((bar, index) => {
      attr(bar, { opacity: overview ? .8 : index === segmentIndex ? denseWeight : 0 });
    });
    attr(loopFeatureLine, { opacity: overview ? .8 : loopWeight });

    for (let i = 0; i < 8; i += 1) {
      const query = queries[i];
      const available = ramp(t, query.feature, query.feature + .3);
      let color = C.blue;
      let weight = envelope(t, query) * (1 - .65 * Math.max(loopFocus, denseFocus));
      if (pair.includes(i) && loopWeight > .01) {
        color = C.orange;
        weight = loopWeight;
      }
      if (ids.includes(i) && denseWeight > .01) {
        color = C.purple;
        weight = denseWeight;
      }
      attr(cache[i].tile, { fill: blend(C.tile, color, weight) });
      attr(cache[i].label, { opacity: .3 + .7 * available });
      attr(cache[i].halo, { opacity: selected === i ? 1 : 0 });
      const unrelated = Math.max(pair.includes(i) ? 0 : loopFocus, ids.includes(i) ? 0 : denseFocus);
      attr(cache[i].group, {
        "aria-pressed": state.selected === i,
        opacity: selected === i ? 1 : 1 - .4 * unrelated,
      });
    }

    for (const { row, col, box } of tracking.cells) {
      const allowed = row < 3 ? col < 3 : col <= row;
      const query = queries[row];
      const complete = overview ? 1 : ramp(t, query.context, query.filled);
      const relevant = selected === null || selected === row || selected === col;
      attr(box, { fill: allowed ? C.white : "none", "fill-opacity": allowed ? complete * (relevant ? 1 : .28) : 0 });
    }
    for (const { row, col, box } of loop.cells) {
      const relevant = selected === null || selected === pair[row] || selected === pair[col];
      attr(box, { fill: C.white, "fill-opacity": loopReady * (relevant ? 1 : .28) });
    }
    for (const { row, col, box } of dense.cells) {
      const relevant = selected === null || selected === ids[row] || selected === ids[col];
      attr(box, { fill: C.white, "fill-opacity": denseReady * (relevant ? 1 : .28) });
    }

    // Synthetic drift is corrected only after the loop query has returned.
    const correction = ramp(t, loopQuery.output, loopQuery.end);
    const points = route.map(([x, y], i) => [
      x + Math.max(0, i - 1) * 14 * (1 - correction),
      y + Math.max(0, i - 1) * 23 * (1 - correction),
    ]);
    let visible = 2 * prefixReady;
    for (const query of schedule.tracking) {
      visible += ramp(t, query.output, query.end);
    }
    const currentCurve = curve(points, visible);
    attr(trackTrace, {
      d: currentCurve.d,
      opacity: prefixReady * (1 - .2 * Math.max(loopFocus, denseFocus)),
    });
    // Batch optimization exposes the entire result together, never a temporal sweep.
    attr(purpleTrace, { d: currentCurve.d, opacity: !overview && t >= schedule.final ? 1 : 0 });
    attr(tip, {
      cx: currentCurve.head[0], cy: currentCurve.head[1],
      opacity: t > 4.6 && t < schedule.tracking.at(-1).end ? 1 - .6 * Math.max(loopFocus, denseFocus) : 0,
    });
    const loopPoints = pair.map(i => points[i]);
    attr(loopConnection, {
      d: `M${loopPoints[0][0]} ${loopPoints[0][1]} L${loopPoints[1][0]} ${loopPoints[1][1]}`,
      opacity: overview ? .8 : loopWeight * .8,
    });
    loopRings.forEach((ring, index) => {
      const pulse = overview ? 0 : Math.sin((t - loopQuery.feature) * Math.PI * .9) ** 2;
      attr(ring, {
        cx: loopPoints[index][0], cy: loopPoints[index][1],
        r: 23 + pulse * 4,
        opacity: overview ? .8 : loopWeight * (.55 + .35 * pulse),
      });
    });
    for (let i = 0; i < 8; i += 1) {
      const query = queries[i];
      const available = i < 3 ? prefixReady : ramp(t, query.output, query.end);
      const inLoop = pair.includes(i) && loopWeight > .01;
      const inDense = ids.includes(i) && denseWeight > .01;
      const color = inDense ? C.purple : inLoop ? C.orange : C.white;
      const weight = inDense ? denseWeight : inLoop ? loopWeight : 0;
      const unrelated = Math.max(pair.includes(i) ? 0 : loopFocus, ids.includes(i) ? 0 : denseFocus);
      attr(poses[i].group, {
        transform: `translate(${points[i][0]} ${points[i][1]})`,
        opacity: available * (selected === i ? 1 : 1 - .4 * unrelated),
        "aria-hidden": available < .01,
        tabindex: available > .1 ? 0 : -1,
        "aria-pressed": state.selected === i,
      });
      attr(poses[i].tile, { fill: blend(C.white, color, weight), stroke: inLoop || inDense ? color : C.gray });
      attr(poses[i].halo, { opacity: selected === i ? 1 : 0 });
    }

    const play = document.querySelector("#play");
    const playLabel = state.playing ? "Pause"
      : state.time >= schedule.end ? "Replay"
      : !overview && state.time > 0 ? "Resume" : "Play animation";
    const accessibleLabel = playLabel === "Play animation" ? playLabel : `${playLabel} animation`;
    play.setAttribute("aria-label", accessibleLabel);
    play.setAttribute("title", accessibleLabel);
    play.setAttribute("aria-pressed", String(state.playing));
    document.querySelector("#play-label").textContent = playLabel;
    document.querySelector("#play-icon").setAttribute("d", state.playing ? "M5 3H8V17H5ZM12 3H15V17H12Z" : "M6 3 16 10 6 17Z");
    const progress = document.querySelector("#progress");
    progress.max = schedule.end;
    progress.value = state.time;
    progress.style.setProperty("--progress", `${100 * state.time / schedule.end}%`);
    const formatTime = value => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
    document.querySelector("#time").textContent = `${formatTime(state.time)} / ${formatTime(schedule.end)}`;
  }

  function clear() {
    state.selected = null;
    state.hover = null;
  }

  function pause() {
    state.playing = false;
    state.seek = null;
    state.tick = 0;
  }

  function replay() {
    clear();
    state.seek = null;
    state.time = 0;
    state.overview = false;
    state.playing = true;
    state.tick = 0;
    render();
  }

  document.querySelector("#play").addEventListener("click", () => {
    if (state.playing) pause();
    else if (state.overview || state.time >= schedule.end) replay();
    else {
      clear();
      state.seek = null;
      state.playing = true;
      state.tick = 0;
    }
    render();
  });
  document.querySelector("#replay").addEventListener("click", replay);
  document.querySelector("#progress").addEventListener("input", event => {
    pause();
    clear();
    state.seek = null;
    state.overview = false;
    state.time = Number(event.target.value);
    render();
  });

  function select(index) {
    pause();
    state.selected = state.selected === index ? null : index;
    if (!state.overview && state.selected !== null && state.time < queries[index].end) {
      state.seek = { from: state.time, to: queries[index].end, elapsed: 0 };
    }
    render();
  }

  function explore(kind) {
    pause();
    clear();
    const start = kind === "tracking" ? 0 : kind === "loop" ? schedule.loop.feature : schedule.dense[0].feature;
    state.time = start;
    state.overview = false;
    state.seek = null;
    state.playing = true;
    state.tick = 0;
    render();
  }

  function activate(event) {
    const frame = event.target.closest("[data-frame]");
    const operation = event.target.closest("[data-operation]");
    if (frame) select(Number(frame.dataset.frame));
    else if (operation) explore(operation.dataset.operation);
    else {
      clear();
      render();
    }
  }

  svg.addEventListener("click", activate);
  svg.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(event);
    }
    if (event.key === "Escape") {
      clear();
      render();
    }
  });
  svg.addEventListener("pointerover", event => {
    const frame = event.target.closest("[data-frame]");
    if (frame && !state.playing) {
      state.hover = Number(frame.dataset.frame);
      render();
    }
  });
  svg.addEventListener("pointerout", event => {
    if (event.target.closest("[data-frame]")) {
      state.hover = null;
      if (!state.playing) render();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pause();
      render();
    }
  });
  window.addEventListener("message", event => {
    if (event.source !== window.parent || event.data?.type !== "map2slam:pause-animation") return;
    pause();
    render();
  });

  function tick(now) {
    const dt = state.tick ? Math.min((now - state.tick) / 1000, .08) : 0;
    state.tick = now;
    let changed = false;
    if (state.seek) {
      state.seek.elapsed += dt;
      const progress = ramp(state.seek.elapsed, 0, reduced ? .01 : 1.1);
      state.time = mix(state.seek.from, state.seek.to, progress);
      if (progress >= 1) state.seek = null;
      changed = true;
    } else if (state.playing) {
      state.time = Math.min(state.time + dt, schedule.end);
      if (state.time >= schedule.end) pause();
      changed = true;
    }
    if (changed) render();
    requestAnimationFrame(tick);
  }

  render();
  requestAnimationFrame(tick);
})();
